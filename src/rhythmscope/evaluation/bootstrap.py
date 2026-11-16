"""
Patient-level bootstrap confidence interval calculation for ECG evaluation.

Statistical rationale:
ECG beats from the same patient are correlated (shared physiology, lead placement, heart geometry).
Naive beat-level bootstrapping dramatically underestimates variance and yields artificially narrow CIs.
RhythmScope performs clustered patient-level bootstrapping:
In each iteration, full patient recordings are sampled with replacement, and metrics are computed.
"""

from typing import Dict, List, Tuple
import numpy as np
from sklearn.metrics import f1_score, precision_recall_fscore_support

def compute_patient_bootstrap_ci(
    records: np.ndarray,
    y_true: np.ndarray,
    y_pred: np.ndarray,
    n_bootstraps: int = 500,
    confidence_level: float = 0.95,
    random_state: int = 42
) -> Dict[str, Dict[str, float]]:
    """
    Computes patient-level bootstrap confidence intervals for:
    - Macro F1
    - S Sensitivity (Recall)
    - V Sensitivity (Recall)
    """
    rng = np.random.RandomState(random_state)
    unique_records = np.unique(records)
    n_patients = len(unique_records)
    
    # Pre-index beats by patient record for rapid sampling
    patient_indices = {rec: np.where(records == rec)[0] for rec in unique_records}
    
    macro_f1s = []
    accuracies = []
    s_recalls = []
    v_recalls = []
    f_recalls = []
    s_precisions = []
    v_precisions = []
    f_precisions = []
    
    for _ in range(n_bootstraps):
        sampled_records = rng.choice(unique_records, size=n_patients, replace=True)
        sampled_idx_list = [patient_indices[rec] for rec in sampled_records]
        if not sampled_idx_list:
            continue
        sampled_indices = np.concatenate(sampled_idx_list)
        
        b_true = y_true[sampled_indices]
        b_pred = y_pred[sampled_indices]
        
        # Accuracy & Macro F1
        acc = float(np.mean(b_true == b_pred))
        f1_macro = float(f1_score(b_true, b_pred, average="macro", zero_division=0))
        accuracies.append(acc)
        macro_f1s.append(f1_macro)
        
        # Per class precision and recall: 0=N, 1=S, 2=V, 3=F
        prec, rec, _, _ = precision_recall_fscore_support(b_true, b_pred, labels=[0, 1, 2, 3], zero_division=0)
        s_recalls.append(rec[1])
        v_recalls.append(rec[2])
        f_recalls.append(rec[3])
        s_precisions.append(prec[1])
        v_precisions.append(prec[2])
        f_precisions.append(prec[3])
        
    alpha = (1.0 - confidence_level) / 2.0
    
    def summarize(vals):
        arr = np.array(vals)
        return {
            "mean": round(float(np.mean(arr)), 4),
            "std": round(float(np.std(arr)), 4),
            "ci_lower": round(float(np.percentile(arr, alpha * 100)), 4),
            "ci_upper": round(float(np.percentile(arr, (1.0 - alpha) * 100)), 4)
        }
        
    return {
        "accuracy": summarize(accuracies),
        "macro_f1": summarize(macro_f1s),
        "s_recall": summarize(s_recalls),
        "s_precision": summarize(s_precisions),
        "v_recall": summarize(v_recalls),
        "v_precision": summarize(v_precisions),
        "f_recall": summarize(f_recalls),
        "f_precision": summarize(f_precisions)
    }
