"""
Training pipeline for RhythmScope models:
1. Majority Class Baseline
2. RR Interval Random Forest
3. Waveform-only 1D CNN
4. Hybrid 1D CNN + RR Features

Key constraints:
- Evaluates on patient-held-out validation set (DS1_VAL_RECORDS) after each epoch.
- Model selection is guided by Validation Macro F1 (NOT accuracy).
- Saves full training history, loss trajectories, and model checkpoints.
"""

import os
import json
import pickle
from pathlib import Path
import logging
from typing import Dict, Any, Tuple
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.metrics import f1_score, classification_report

from rhythmscope.models.baselines import MajorityBaseline, train_random_forest_baseline
from rhythmscope.models.cnn import WaveformCNN
from rhythmscope.models.hybrid import HybridECGNet
from rhythmscope.training.losses import FocalLoss, compute_effective_class_weights
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

def train_all_models(
    processed_dir: str = "data/processed",
    artifacts_dir: str = "artifacts",
    batch_size: int = 128,
    max_epochs: int = 20,
    lr: float = 0.001
):
    proc_path = Path(processed_dir)
    art_path = Path(artifacts_dir)
    ckpt_path = art_path / "checkpoints"
    ckpt_path.mkdir(parents=True, exist_ok=True)
    
    # Load processed numpy data
    train_data = np.load(proc_path / "train.npz")
    val_data = np.load(proc_path / "val.npz")
    
    X_train_wf, X_train_rr, y_train = train_data["waveforms"], train_data["features"], train_data["labels"]
    X_val_wf, X_val_rr, y_val = val_data["waveforms"], val_data["features"], val_data["labels"]
    
    logger.info(f"Loaded train data: {len(y_train)} beats. Val data: {len(y_val)} beats.")
    
    # Compute class counts for focal loss weighting
    class_counts = torch.from_numpy(np.bincount(y_train, minlength=len(HEADLINE_CLASSES)))
    logger.info(f"Training class distribution: {dict(zip(HEADLINE_CLASSES, class_counts.tolist()))}")
    alpha_weights = compute_effective_class_weights(class_counts, beta=0.999)
    
    device = torch.device("mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu"))
    logger.info(f"Using compute device: {device}")
    
    # Dataloaders
    train_dataset = ECGDataset(X_train_wf, X_train_rr, y_train)
    val_dataset = ECGDataset(X_val_wf, X_val_rr, y_val)
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    
    training_history = {}
    
    # ----------------------------------------------------
    # 1. MAJORITY CLASS BASELINE
    # ----------------------------------------------------
    logger.info("--- Fitting Majority Class Baseline ---")
    majority_model = MajorityBaseline()
    majority_model.fit(y_train)
    majority_val_preds = majority_model.predict(X_val_rr)
    maj_f1 = f1_score(y_val, majority_val_preds, average="macro", zero_division=0)
    logger.info(f"Majority Baseline Val Macro F1: {maj_f1:.4f}")
    with open(ckpt_path / "majority.pkl", "wb") as f:
        pickle.dump(majority_model, f)
        
    training_history["majority"] = {
        "val_macro_f1": float(maj_f1),
        "majority_class": int(majority_model.majority_class)
    }
    
    # ----------------------------------------------------
    # 2. RANDOM FOREST ON RR INTERVALS
    # ----------------------------------------------------
    logger.info("--- Training Random Forest Baseline on RR Features ---")
    rf_model = train_random_forest_baseline(X_train_rr, y_train)
    rf_val_preds = rf_model.predict(X_val_rr)
    rf_f1 = f1_score(y_val, rf_val_preds, average="macro", zero_division=0)
    logger.info(f"Random Forest Val Macro F1: {rf_f1:.4f}")
    with open(ckpt_path / "random_forest.pkl", "wb") as f:
        pickle.dump(rf_model, f)
        
    training_history["random_forest"] = {
        "val_macro_f1": float(rf_f1),
        "feature_importances": rf_model.feature_importances_.tolist()
    }
    
    # ----------------------------------------------------
    # 3. WAVEFORM-ONLY 1D CNN
    # ----------------------------------------------------
    logger.info("--- Training Waveform-Only 1D CNN ---")
    cnn_model = WaveformCNN(num_classes=len(HEADLINE_CLASSES)).to(device)
    optimizer = torch.optim.Adam(cnn_model.parameters(), lr=lr, weight_decay=1e-4)
    criterion = FocalLoss(gamma=2.0, alpha=alpha_weights.to(device))
    
    best_cnn_f1 = 0.0
    cnn_history = []
    
    for epoch in range(1, max_epochs + 1):
        cnn_model.train()
        running_loss = 0.0
        for wf, _, labels in train_loader:
            wf = wf.to(device)
            labels = labels.to(device)
            
            optimizer.zero_grad()
            logits = cnn_model(wf)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * len(labels)
            
        train_loss = running_loss / len(train_dataset)
        val_loss, val_f1, _, _ = evaluate_torch_model(cnn_model, val_loader, device, is_hybrid=False)
        cnn_history.append({"epoch": epoch, "train_loss": train_loss, "val_loss": val_loss, "val_macro_f1": val_f1})
        logger.info(f"[CNN Epoch {epoch:02d}/{max_epochs:02d}] Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Val Macro F1: {val_f1:.4f}")
        
        if val_f1 > best_cnn_f1:
            best_cnn_f1 = val_f1
            torch.save(cnn_model.state_dict(), ckpt_path / "waveform_cnn.pt")
            
    training_history["waveform_cnn"] = {
        "best_val_macro_f1": float(best_cnn_f1),
        "history": cnn_history
    }
    
    # ----------------------------------------------------
    # 4. HYBRID 1D CNN + RR FEATURES
    # ----------------------------------------------------
    logger.info("--- Training Hybrid 1D CNN + RR Feature Network ---")
    hybrid_model = HybridECGNet(num_classes=len(HEADLINE_CLASSES)).to(device)
    hybrid_optimizer = torch.optim.Adam(hybrid_model.parameters(), lr=lr, weight_decay=1e-4)
    hybrid_criterion = FocalLoss(gamma=2.0, alpha=alpha_weights.to(device))
    
    best_hybrid_f1 = 0.0
    hybrid_history = []
    
    for epoch in range(1, max_epochs + 1):
        hybrid_model.train()
        running_loss = 0.0
        for wf, feat, labels in train_loader:
            wf = wf.to(device)
            feat = feat.to(device)
            labels = labels.to(device)
            
            hybrid_optimizer.zero_grad()
            logits = hybrid_model(wf, feat)
            loss = hybrid_criterion(logits, labels)
            loss.backward()
            hybrid_optimizer.step()
            running_loss += loss.item() * len(labels)
            
        train_loss = running_loss / len(train_dataset)
        val_loss, val_f1, _, _ = evaluate_torch_model(hybrid_model, val_loader, device, is_hybrid=True)
        hybrid_history.append({"epoch": epoch, "train_loss": train_loss, "val_loss": val_loss, "val_macro_f1": val_f1})
        logger.info(f"[Hybrid Epoch {epoch:02d}/{max_epochs:02d}] Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Val Macro F1: {val_f1:.4f}")
        
        if val_f1 > best_hybrid_f1:
            best_hybrid_f1 = val_f1
            torch.save(hybrid_model.state_dict(), ckpt_path / "hybrid_cnn.pt")
            
    training_history["hybrid_cnn"] = {
        "best_val_macro_f1": float(best_hybrid_f1),
        "history": hybrid_history
    }
    
    with open(art_path / "training_history.json", "w") as f:
        json.dump(training_history, f, indent=2)
        
    logger.info("All model trainings successfully completed and checkpoints saved!")
    return training_history

if __name__ == "__main__":
    train_all_models()
