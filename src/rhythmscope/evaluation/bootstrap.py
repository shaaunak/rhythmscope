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
    s_recalls = []
    v_recalls = []
    
    for _ in range(n_bootstraps):
        sampled_records = rng.choice(unique_records, size=n_patients, replace=True)
        sampled_idx_list = [patient_indices[rec] for rec in sampled_records]
        if not sampled_idx_list:
            continue
        sampled_indices = np.concatenate(sampled_idx_list)
        
        b_true = y_true[sampled_indices]
        b_pred = y_pred[sampled_indices]
        
        # Macro F1
        f1_macro = f1_score(b_true, b_pred, average="macro", zero_division=0)
        macro_f1s.append(f1_macro)
        
        # Per class recall: 1 is S, 2 is V
        _, rec, _, _ = precision_recall_fscore_support(b_true, b_pred, labels=[0, 1, 2, 3], zero_division=0)
        s_recalls.append(rec[1])
        v_recalls.append(rec[2])
        
    alpha = (1.0 - confidence_level) / 2.0
    
    def summarize(vals):
        arr = np.array(vals)
        return {
            "mean": float(np.mean(arr)),
            "std": float(np.std(arr)),
            "ci_lower": float(np.percentile(arr, alpha * 100)),
            "ci_upper": float(np.percentile(arr, (1.0 - alpha) * 100))
        }
        
    return {
        "macro_f1": summarize(macro_f1s),
        "s_recall": summarize(s_recalls),
        "v_recall": summarize(v_recalls)
    }
