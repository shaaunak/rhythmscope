"""
Comprehensive evaluation suite for RhythmScope.
Evaluates:
1. Classical DS1/DS2 Benchmark (historical literature comparison)
2. Strict Patient-Disjoint Benchmark (headline metric for unseen patients)
Across:
- Majority-Class Baseline
- RR-Interval Random Forest
- Waveform-Only 1D CNN
- Hybrid 1D CNN + RR Features

Reports:
- Macro F1, Weighted F1, Accuracy
- Per-class Precision, Recall (Sensitivity), F1-Score, Support
- Confusion Matrices (Raw and Normalized)
- Patient-level 95% Bootstrap Confidence Intervals
- Real-world failure cases and misclassifications
- Latency and checkpoint file sizes
- Historical de Chazal et al. (2004) baseline comparison
"""

import time
import json
import pickle
from pathlib import Path
import logging
from typing import Dict, Any, List, Tuple
import numpy as np
import torch
import torch.nn.functional as F
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_recall_fscore_support,
    confusion_matrix
)

from rhythmscope.models.baselines import MajorityBaseline
from rhythmscope.models.cnn import WaveformCNN
from rhythmscope.models.hybrid import HybridECGNet
from rhythmscope.evaluation.bootstrap import compute_patient_bootstrap_ci
from rhythmscope.data.splits import HEADLINE_CLASSES

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Historical de Chazal et al. (2004) reference results on DS2 (classical):
# Reported: S-Sensitivity = 75.9%, S-PPV = 38.5%, V-Sensitivity = 77.7%, V-PPV = 81.8%
DE_CHAZAL_REFERENCE = {
    "paper": "de Chazal et al. (2004) IEEE TBME",
    "protocol": "Classical DS1 / DS2 (includes record 202)",
    "features": "ECG morphology (wavelets/intervals) + RR intervals + Linear Discriminants",
    "metrics": {
        "s_sensitivity": 0.759,
        "s_ppv": 0.385,
        "v_sensitivity": 0.777,
        "v_ppv": 0.818
    }
}

def load_trained_models(ckpt_dir: str = "artifacts/checkpoints", device: str = "cpu"):
    ck_path = Path(ckpt_dir)
    dev = torch.device(device)
    
    with open(ck_path / "majority.pkl", "rb") as f:
        majority = pickle.load(f)
        
    with open(ck_path / "random_forest.pkl", "rb") as f:
        rf = pickle.load(f)
        
    cnn = WaveformCNN(num_classes=len(HEADLINE_CLASSES))
    cnn.load_state_dict(torch.load(ck_path / "waveform_cnn.pt", map_location=dev))
    cnn.to(dev).eval()
    
    hybrid = HybridECGNet(num_classes=len(HEADLINE_CLASSES))
    hybrid.load_state_dict(torch.load(ck_path / "hybrid_cnn.pt", map_location=dev))
    hybrid.to(dev).eval()
    
    return {
        "majority": majority,
        "random_forest": rf,
        "waveform_cnn": cnn,
        "hybrid_cnn": hybrid
    }

def measure_latency_and_size(model: Any, is_torch: bool, is_hybrid: bool, device: str = "cpu") -> Tuple[float, float]:
    """Measures single-beat inference latency in milliseconds and checkpoint size in KB."""
    dev = torch.device(device)
    dummy_wf = torch.randn(1, 252).to(dev)
    dummy_rr = torch.randn(1, 4).to(dev)
    dummy_np_rr = np.random.randn(1, 4).astype(np.float32)
    
    # Measure latency over 500 iterations
    latencies = []
    if is_torch:
        model.eval()
        with torch.no_grad():
            for _ in range(50): # warmup
                if is_hybrid:
                    _ = model(dummy_wf, dummy_rr)
                else:
                    _ = model(dummy_wf)
            for _ in range(300):
                t0 = time.perf_counter()
                if is_hybrid:
                    _ = model(dummy_wf, dummy_rr)
                else:
                    _ = model(dummy_wf)
                latencies.append((time.perf_counter() - t0) * 1000.0)
    else:
        for _ in range(50):
            _ = model.predict(dummy_np_rr)
        for _ in range(300):
            t0 = time.perf_counter()
            _ = model.predict(dummy_np_rr)
            latencies.append((time.perf_counter() - t0) * 1000.0)
            
    mean_latency = float(np.mean(latencies))
    return mean_latency

def evaluate_model_on_split(
    model_name: str,
    model: Any,
    waveforms: np.ndarray,
    features: np.ndarray,
    labels: np.ndarray,
    records: np.ndarray,
    device: str = "cpu"
) -> Dict[str, Any]:
    dev = torch.device(device)
    n = len(labels)
    
    is_torch = "cnn" in model_name
    is_hybrid = model_name == "hybrid_cnn"
    
    t0 = time.time()
    if is_torch:
        model.eval()
        batch_size = 256
        all_probs = []
        with torch.no_grad():
            for i in range(0, n, batch_size):
                b_wf = torch.from_numpy(waveforms[i:i+batch_size]).float().to(dev)
                if is_hybrid:
                    b_rr = torch.from_numpy(features[i:i+batch_size]).float().to(dev)
                    logits = model(b_wf, b_rr)
                else:
                    logits = model(b_wf)
                p = F.softmax(logits, dim=1).cpu().numpy()
                all_probs.append(p)
        probs = np.concatenate(all_probs, axis=0)
        preds = np.argmax(probs, axis=1)
    else:
        if model_name == "majority":
            preds = model.predict(features)
            probs = model.predict_proba(features)
        else: # Random Forest
            preds = model.predict(features)
            probs = model.predict_proba(features)
            
    eval_time = time.time() - t0
    
    acc = float(accuracy_score(labels, preds))
    macro_f1 = float(f1_score(labels, preds, average="macro", zero_division=0))
    weighted_f1 = float(f1_score(labels, preds, average="weighted", zero_division=0))
    
    prec, rec, f1, supp = precision_recall_fscore_support(labels, preds, labels=[0, 1, 2, 3], zero_division=0)
    
    per_class = {}
    for i, cls in enumerate(HEADLINE_CLASSES):
        per_class[cls] = {
            "precision": round(float(prec[i]), 4),
            "recall": round(float(rec[i]), 4), # Sensitivity
            "f1_score": round(float(f1[i]), 4),
            "support": int(supp[i])
        }
        
    cm = confusion_matrix(labels, preds, labels=[0, 1, 2, 3])
    cm_norm = (cm.astype(np.float64) / (cm.sum(axis=1, keepdims=True) + 1e-8)).round(4)
    
    # Patient-level Bootstrap Confidence Intervals
    bootstrap_ci = compute_patient_bootstrap_ci(records, labels, preds, n_bootstraps=300)
    
    return {
        "accuracy": round(acc, 4),
        "macro_f1": round(macro_f1, 4),
        "weighted_f1": round(weighted_f1, 4),
        "s_sensitivity": round(float(rec[1]), 4),
        "s_ppv": round(float(prec[1]), 4),
        "v_sensitivity": round(float(rec[2]), 4),
        "v_ppv": round(float(prec[2]), 4),
        "per_class": per_class,
        "confusion_matrix": cm.tolist(),
        "normalized_confusion_matrix": cm_norm.tolist(),
        "bootstrap_ci": bootstrap_ci,
        "eval_time_seconds": round(eval_time, 2),
        "preds": preds,
        "probs": probs
    }

def run_complete_evaluation(
    processed_dir: str = "data/processed",
    ckpt_dir: str = "artifacts/checkpoints",
    reports_dir: str = "reports"
):
    proc_path = Path(processed_dir)
    rep_path = Path(reports_dir)
    rep_path.mkdir(parents=True, exist_ok=True)
    
    device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Loading trained models on {device}...")
    models = load_trained_models(ckpt_dir, device=device)
    
    # Load test sets
    logger.info("Loading test sets...")
    classical_test = np.load(proc_path / "test_classical.npz")
    strict_test = np.load(proc_path / "test_strict.npz")
    
    splits_to_eval = [
        ("classical_ds2", classical_test),
        ("strict_patient_disjoint", strict_test)
    ]
    
    benchmark_results = {
        "de_chazal_reference": DE_CHAZAL_REFERENCE,
        "classes": HEADLINE_CLASSES,
        "splits": {}
    }
    
    # Store test predictions for failure analysis and web app sampling
    test_predictions_store = {}
    
    for split_key, split_data in splits_to_eval:
        logger.info(f"\n================ EVALUATING SPLIT: {split_key} ({len(split_data['labels'])} beats) ================")
        split_results = {}
        test_predictions_store[split_key] = {}
        
        for model_name, model in models.items():
            logger.info(f"Evaluating {model_name}...")
            res = evaluate_model_on_split(
                model_name,
                model,
                split_data["waveforms"],
                split_data["features"],
                split_data["labels"],
                split_data["records"],
                device=device
            )
            
            # Save predictions and probabilities for beat explorer
            test_predictions_store[split_key][model_name] = {
                "preds": res.pop("preds"),
                "probs": res.pop("probs")
            }
            
            # Measure latency
            is_torch = "cnn" in model_name
            is_hybrid = model_name == "hybrid_cnn"
            latency_ms = measure_latency_and_size(model, is_torch, is_hybrid, device=device)
            res["latency_ms"] = round(latency_ms, 3)
            
            # Checkpoint file size
            if is_torch:
                f_name = "hybrid_cnn.pt" if is_hybrid else "waveform_cnn.pt"
            else:
                f_name = "random_forest.pkl" if model_name == "random_forest" else "majority.pkl"
            f_path = Path(ckpt_dir) / f_name
            res["checkpoint_size_kb"] = round(f_path.stat().st_size / 1024.0, 1) if f_path.exists() else 0.0
            
            split_results[model_name] = res
            logger.info(f"[{model_name}] Macro F1: {res['macro_f1']} | S-Sens: {res['s_sensitivity']} | V-Sens: {res['v_sensitivity']}")
            
        benchmark_results["splits"][split_key] = split_results
        
    with open(rep_path / "benchmark_results.json", "w") as f:
        json.dump(benchmark_results, f, indent=2)
    logger.info(f"Saved benchmark results to {rep_path / 'benchmark_results.json'}")
    
    # ------------------------------------------------------------------
    # SAMPLE REPRESENTATIVE BEATS & GENUINE FAILURES FOR FRONTEND
    # ------------------------------------------------------------------
    logger.info("Extracting curated beat gallery and genuine failure cases...")
    strict_data = strict_test
    y_true = strict_data["labels"]
    records = strict_data["records"]
    samples_idx = strict_data["samples"]
    raw_wf = strict_data["raw_waveforms"]
    raw_feat = strict_data["raw_features"]
    
    hybrid_preds = test_predictions_store["strict_patient_disjoint"]["hybrid_cnn"]["preds"]
    hybrid_probs = test_predictions_store["strict_patient_disjoint"]["hybrid_cnn"]["probs"]
    cnn_preds = test_predictions_store["strict_patient_disjoint"]["waveform_cnn"]["preds"]
    rf_preds = test_predictions_store["strict_patient_disjoint"]["random_forest"]["preds"]
    
    # Identify failures
    misclassified_indices = np.where(hybrid_preds != y_true)[0]
    correct_indices = np.where(hybrid_preds == y_true)[0]
    
    curated_beats = []
    
    # Sample 40 misclassified beats (genuine failures)
    rng = np.random.RandomState(42)
    sample_fail_indices = rng.choice(misclassified_indices, size=min(40, len(misclassified_indices)), replace=False)
    # Sample 60 correct beats spanning all classes
    sample_corr_indices = rng.choice(correct_indices, size=min(60, len(correct_indices)), replace=False)
    
    all_sample_indices = np.concatenate([sample_fail_indices, sample_corr_indices])
    
    for idx in all_sample_indices:
        b_idx = int(idx)
        curated_beats.append({
            "beat_id": b_idx,
            "record": str(records[b_idx]),
            "r_peak_sample": int(samples_idx[b_idx]),
            "true_class": HEADLINE_CLASSES[int(y_true[b_idx])],
            "hybrid_prediction": HEADLINE_CLASSES[int(hybrid_preds[b_idx])],
            "waveform_cnn_prediction": HEADLINE_CLASSES[int(cnn_preds[b_idx])],
            "rf_prediction": HEADLINE_CLASSES[int(rf_preds[b_idx])],
            "is_correct": bool(hybrid_preds[b_idx] == y_true[b_idx]),
            "probabilities": {cls_name: float(hybrid_probs[b_idx][c]) for c, cls_name in enumerate(HEADLINE_CLASSES)},
            "rr_features": {
                "pre_rr": float(raw_feat[b_idx][0]),
                "post_rr": float(raw_feat[b_idx][1]),
                "local_rr_avg": float(raw_feat[b_idx][2]),
                "rr_ratio": float(raw_feat[b_idx][3])
            },
            "waveform": raw_wf[b_idx].tolist() # 252 points
        })
        
    with open(rep_path / "sample_beats.json", "w") as f:
        json.dump(curated_beats, f, indent=2)
    logger.info(f"Saved {len(curated_beats)} curated beats (with real failures) to {rep_path / 'sample_beats.json'}")
    
    return benchmark_results

if __name__ == "__main__":
    run_complete_evaluation()
