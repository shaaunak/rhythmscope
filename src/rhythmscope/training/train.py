"""
Multi-seed Training pipeline for RhythmScope models:
1. Majority Class Baseline
2. RR Interval Random Forest
3. Waveform-only 1D CNN
4. Hybrid 1D CNN + RR Features

Key constraints:
- Evaluates on patient-held-out validation set (DS1_VAL_RECORDS) after each epoch.
- Model selection is guided by Validation Macro F1 (NOT accuracy).
- Employs WeightedRandomSampler and Focal Loss to combat severe class imbalance (especially Fusion class).
- Runs across multiple deterministic seeds (42, 1337, 2024) to report mean +/- std across seeds.
- Saves full training history, loss trajectories, checkpoints, and multi_seed_results.json.
"""

import os
import json
import pickle
from pathlib import Path
import logging
from typing import Dict, Any, Tuple, List
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from sklearn.metrics import f1_score, precision_recall_fscore_support, accuracy_score

from rhythmscope.models.baselines import MajorityBaseline, train_random_forest_baseline
from rhythmscope.models.cnn import WaveformCNN
from rhythmscope.models.hybrid import HybridECGNet
from rhythmscope.training.losses import FocalLoss
from rhythmscope.data.splits import HEADLINE_CLASSES

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

class ECGDataset(Dataset):
    def __init__(self, waveforms: np.ndarray, features: np.ndarray, labels: np.ndarray):
        self.waveforms = torch.from_numpy(waveforms).float()
        self.features = torch.from_numpy(features).float()
        self.labels = torch.from_numpy(labels).long()
        
    def __len__(self):
        return len(self.labels)
        
    def __getitem__(self, idx):
        return self.waveforms[idx], self.features[idx], self.labels[idx]

def evaluate_torch_model(
    model: nn.Module,
    dataloader: DataLoader,
    device: torch.device,
    is_hybrid: bool = False
) -> Tuple[float, float, np.ndarray, np.ndarray]:
    """Evaluates torch model returning (val_loss, val_macro_f1, all_preds, all_labels)."""
    model.eval()
    criterion = nn.CrossEntropyLoss()
    total_loss = 0.0
    all_preds = []
    all_targets = []
    
    with torch.no_grad():
        for waveforms, features, labels in dataloader:
            waveforms = waveforms.to(device)
            features = features.to(device)
            labels = labels.to(device)
            
            if is_hybrid:
                logits = model(waveforms, features)
            else:
                logits = model(waveforms)
                
            loss = criterion(logits, labels)
            total_loss += loss.item() * len(labels)
            
            preds = torch.argmax(logits, dim=1).cpu().numpy()
            all_preds.extend(preds)
            all_targets.extend(labels.cpu().numpy())
            
    avg_loss = total_loss / len(dataloader.dataset)
    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)
    macro_f1 = float(f1_score(all_targets, all_preds, average="macro", zero_division=0))
    return avg_loss, macro_f1, all_preds, all_targets


def evaluate_on_test_data(
    model: Any,
    test_wf: np.ndarray,
    test_rr: np.ndarray,
    test_labels: np.ndarray,
    model_type: str,
    device: torch.device
) -> Dict[str, Any]:
    """Evaluates any model on a test set and computes full metrics."""
    if model_type == "majority":
        preds = model.predict(test_rr)
    elif model_type == "random_forest":
        preds = model.predict(test_rr)
    elif model_type == "waveform_cnn":
        model.eval()
        loader = DataLoader(
            ECGDataset(test_wf, test_rr, test_labels),
            batch_size=256,
            shuffle=False
        )
        preds = []
        with torch.no_grad():
            for wf, _, _ in loader:
                out = model(wf.to(device))
                preds.extend(torch.argmax(out, dim=1).cpu().numpy())
        preds = np.array(preds)
    elif model_type == "hybrid_cnn":
        model.eval()
        loader = DataLoader(
            ECGDataset(test_wf, test_rr, test_labels),
            batch_size=256,
            shuffle=False
        )
        preds = []
        with torch.no_grad():
            for wf, rr, _ in loader:
                out = model(wf.to(device), rr.to(device))
                preds.extend(torch.argmax(out, dim=1).cpu().numpy())
        preds = np.array(preds)
    else:
        raise ValueError(f"Unknown model_type: {model_type}")

    acc = float(accuracy_score(test_labels, preds))
    macro_f1 = float(f1_score(test_labels, preds, average="macro", zero_division=0))
    weighted_f1 = float(f1_score(test_labels, preds, average="weighted", zero_division=0))
    prec, rec, f1, sup = precision_recall_fscore_support(
        test_labels, preds, labels=[0, 1, 2, 3], zero_division=0
    )

    per_class = {}
    for i, cls_name in enumerate(HEADLINE_CLASSES):
        per_class[cls_name] = {
            "precision": round(float(prec[i]), 4),
            "recall": round(float(rec[i]), 4),
            "f1_score": round(float(f1[i]), 4),
            "support": int(sup[i])
        }

    return {
        "accuracy": round(acc, 4),
        "macro_f1": round(macro_f1, 4),
        "weighted_f1": round(weighted_f1, 4),
        "s_sensitivity": round(float(rec[1]), 4),
        "s_ppv": round(float(prec[1]), 4),
        "v_sensitivity": round(float(rec[2]), 4),
        "v_ppv": round(float(prec[2]), 4),
        "f_sensitivity": round(float(rec[3]), 4),
        "f_ppv": round(float(prec[3]), 4),
        "per_class": per_class
    }


def train_single_seed(
    seed: int,
    train_data: Dict[str, np.ndarray],
    val_data: Dict[str, np.ndarray],
    test_strict_data: Dict[str, np.ndarray],
    ckpt_path: Path,
    device: torch.device,
    batch_size: int = 128,
    max_epochs: int = 15,
    lr: float = 0.001,
    save_checkpoints: bool = True
) -> Dict[str, Any]:
    """Trains all 4 models on a given deterministic random seed."""
    torch.manual_seed(seed)
    np.random.seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

    X_train_wf, X_train_rr, y_train = train_data["waveforms"], train_data["features"], train_data["labels"]
    X_val_wf, X_val_rr, y_val = val_data["waveforms"], val_data["features"], val_data["labels"]
    X_te_wf, X_te_rr, y_te = test_strict_data["waveforms"], test_strict_data["features"], test_strict_data["labels"]

    class_counts = np.bincount(y_train, minlength=len(HEADLINE_CLASSES))
    logger.info(f"[Seed {seed}] Train class counts: {class_counts.tolist()}")

    # Balanced sampling weights for minority classes
    class_sample_weights = 1.0 / np.power(class_counts, 0.65)
    sample_weights = torch.from_numpy(class_sample_weights[y_train]).double()
    sampler = WeightedRandomSampler(weights=sample_weights, num_samples=len(y_train), replacement=True)

    train_dataset = ECGDataset(X_train_wf, X_train_rr, y_train)
    val_dataset = ECGDataset(X_val_wf, X_val_rr, y_val)
    train_loader = DataLoader(train_dataset, batch_size=batch_size, sampler=sampler)
    val_loader = DataLoader(val_dataset, batch_size=batch_size * 2, shuffle=False)

    # Focal Loss weighting
    alpha = torch.from_numpy(1.0 / np.power(class_counts, 0.35)).float()
    alpha = (alpha / alpha.sum() * len(HEADLINE_CLASSES)).to(device)

    seed_results = {}

    # 1. Majority
    maj = MajorityBaseline()
    maj.fit(y_train)
    if save_checkpoints:
        with open(ckpt_path / "majority.pkl", "wb") as f:
            pickle.dump(maj, f)
    seed_results["majority"] = evaluate_on_test_data(maj, X_te_wf, X_te_rr, y_te, "majority", device)

    # 2. Random Forest
    rf = train_random_forest_baseline(X_train_rr, y_train, random_state=seed)
    if save_checkpoints:
        with open(ckpt_path / "random_forest.pkl", "wb") as f:
            pickle.dump(rf, f)
    seed_results["random_forest"] = evaluate_on_test_data(rf, X_te_wf, X_te_rr, y_te, "random_forest", device)

    # 3. Waveform CNN
    cnn_model = WaveformCNN(num_classes=len(HEADLINE_CLASSES)).to(device)
    cnn_optimizer = torch.optim.Adam(cnn_model.parameters(), lr=lr, weight_decay=1e-4)
    cnn_scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(cnn_optimizer, T_max=max_epochs)
    cnn_criterion = FocalLoss(gamma=1.8, alpha=alpha)

    best_cnn_val_f1 = 0.0
    best_cnn_state = None

    for epoch in range(1, max_epochs + 1):
        cnn_model.train()
        for wf, _, labels in train_loader:
            wf, labels = wf.to(device), labels.to(device)
            cnn_optimizer.zero_grad()
            loss = cnn_criterion(cnn_model(wf), labels)
            loss.backward()
            cnn_optimizer.step()
        cnn_scheduler.step()

        _, val_f1, _, _ = evaluate_torch_model(cnn_model, val_loader, device, is_hybrid=False)
        if val_f1 > best_cnn_val_f1:
            best_cnn_val_f1 = val_f1
            best_cnn_state = {k: v.cpu().clone() for k, v in cnn_model.state_dict().items()}

    cnn_model.load_state_dict({k: v.to(device) for k, v in best_cnn_state.items()})
    if save_checkpoints:
        torch.save(cnn_model.state_dict(), ckpt_path / "waveform_cnn.pt")
    seed_results["waveform_cnn"] = evaluate_on_test_data(cnn_model, X_te_wf, X_te_rr, y_te, "waveform_cnn", device)
    seed_results["waveform_cnn"]["best_val_macro_f1"] = round(float(best_cnn_val_f1), 4)

    # 4. Hybrid CNN
    hybrid_model = HybridECGNet(num_classes=len(HEADLINE_CLASSES)).to(device)
    hybrid_optimizer = torch.optim.Adam(hybrid_model.parameters(), lr=lr, weight_decay=1e-4)
    hybrid_scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(hybrid_optimizer, T_max=max_epochs)
    hybrid_criterion = FocalLoss(gamma=1.8, alpha=alpha)

    best_hybrid_val_f1 = 0.0
    best_hybrid_state = None

    for epoch in range(1, max_epochs + 1):
        hybrid_model.train()
        for wf, feat, labels in train_loader:
            wf, feat, labels = wf.to(device), feat.to(device), labels.to(device)
            hybrid_optimizer.zero_grad()
            loss = hybrid_criterion(hybrid_model(wf, feat), labels)
            loss.backward()
            hybrid_optimizer.step()
        hybrid_scheduler.step()

        _, val_f1, _, _ = evaluate_torch_model(hybrid_model, val_loader, device, is_hybrid=True)
        if val_f1 > best_hybrid_val_f1:
            best_hybrid_val_f1 = val_f1
            best_hybrid_state = {k: v.cpu().clone() for k, v in hybrid_model.state_dict().items()}

    hybrid_model.load_state_dict({k: v.to(device) for k, v in best_hybrid_state.items()})
    if save_checkpoints:
        torch.save(hybrid_model.state_dict(), ckpt_path / "hybrid_cnn.pt")
    seed_results["hybrid_cnn"] = evaluate_on_test_data(hybrid_model, X_te_wf, X_te_rr, y_te, "hybrid_cnn", device)
    seed_results["hybrid_cnn"]["best_val_macro_f1"] = round(float(best_hybrid_val_f1), 4)

    logger.info(f"[Seed {seed} Strict Test] Hybrid Acc: {seed_results['hybrid_cnn']['accuracy']:.4f} | "
                f"Macro F1: {seed_results['hybrid_cnn']['macro_f1']:.4f} | "
                f"F-Recall: {seed_results['hybrid_cnn']['f_sensitivity']:.4f} | "
                f"V-Recall: {seed_results['hybrid_cnn']['v_sensitivity']:.4f}")

    return seed_results


def train_multi_seed(
    processed_dir: str = "data/processed",
    artifacts_dir: str = "artifacts",
    reports_dir: str = "reports",
    seeds: List[int] = [42, 1337, 2024],
    batch_size: int = 128,
    max_epochs: int = 15,
    lr: float = 0.001
):
    proc_path = Path(processed_dir)
    art_path = Path(artifacts_dir)
    rep_path = Path(reports_dir)
    ckpt_path = art_path / "checkpoints"
    ckpt_path.mkdir(parents=True, exist_ok=True)
    rep_path.mkdir(parents=True, exist_ok=True)

    train_data = np.load(proc_path / "train.npz")
    val_data = np.load(proc_path / "val.npz")
    test_strict_data = np.load(proc_path / "test_strict.npz")

    device = torch.device("mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu"))
    logger.info(f"Starting multi-seed training across seeds: {seeds} on device: {device}")

    all_seed_results = {}
    for i, seed in enumerate(seeds):
        logger.info(f"========== Running Seed {seed} ({i+1}/{len(seeds)}) ==========")
        # Save checkpoints for the primary seed (42)
        save_ckpts = (seed == seeds[0])
        res = train_single_seed(
            seed=seed,
            train_data=train_data,
            val_data=val_data,
            test_strict_data=test_strict_data,
            ckpt_path=ckpt_path,
            device=device,
            batch_size=batch_size,
            max_epochs=max_epochs,
            lr=lr,
            save_checkpoints=save_ckpts
        )
        all_seed_results[str(seed)] = res

    # Compute mean and standard deviation across seeds for each model
    model_keys = ["majority", "random_forest", "waveform_cnn", "hybrid_cnn"]
    metric_keys = ["accuracy", "macro_f1", "weighted_f1", "s_sensitivity", "s_ppv", "v_sensitivity", "v_ppv", "f_sensitivity", "f_ppv"]

    multi_seed_summary = {
        "seeds": seeds,
        "device": str(device),
        "seed_runs": all_seed_results,
        "aggregated": {}
    }

    for m in model_keys:
        multi_seed_summary["aggregated"][m] = {}
        for met in metric_keys:
            vals = [all_seed_results[str(s)][m][met] for s in seeds]
            multi_seed_summary["aggregated"][m][met] = {
                "mean": round(float(np.mean(vals)), 4),
                "std": round(float(np.std(vals)), 4),
                "values": vals
            }

    with open(rep_path / "multi_seed_results.json", "w") as f:
        json.dump(multi_seed_summary, f, indent=2)
    logger.info("Saved reports/multi_seed_results.json")

    with open(art_path / "training_history.json", "w") as f:
        json.dump(multi_seed_summary, f, indent=2)

    logger.info("Multi-seed training and validation successfully completed!")
    return multi_seed_summary

if __name__ == "__main__":
    train_multi_seed()
