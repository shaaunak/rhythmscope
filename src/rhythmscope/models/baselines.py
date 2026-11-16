"""
Baseline models for ECG arrhythmia classification.

1. Majority Class Baseline:
   Provides the empirical sanity check baseline. A naive accuracy of ~80-90% is achieved simply
   because Normal (N) beats dominate the dataset. Its Macro F1, however, is poor (~0.22).

2. Classical Random Forest on RR Interval Features:
   Evaluates purely temporal rhythm features (Pre-RR, Post-RR, Local-RR, RR-Ratio)
   without visual/morphological waveform features.
"""

import pickle
from pathlib import Path
from typing import Dict, Any, Tuple
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, f1_score

class MajorityBaseline:
    """Always predicts the most frequent class in the training partition."""
    def __init__(self):
        self.majority_class: int = 0
        self.num_classes: int = 4
        
    def fit(self, y_train: np.ndarray):
        counts = np.bincount(y_train)
        self.majority_class = int(np.argmax(counts))
        self.num_classes = len(counts)
        return self
        
    def predict(self, X: np.ndarray) -> np.ndarray:
        n = len(X)
        return np.full((n,), self.majority_class, dtype=np.int64)
        
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        n = len(X)
        probs = np.zeros((n, self.num_classes), dtype=np.float32)
        probs[:, self.majority_class] = 1.0
        return probs

def train_random_forest_baseline(
    X_train_rr: np.ndarray,
    y_train: np.ndarray,
    n_estimators: int = 150,
    max_depth: int = 12,
    random_state: int = 42
) -> RandomForestClassifier:
    """Trains a Random Forest classifier on RR intervals with balanced weighting."""
    rf = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        min_samples_split=5,
        class_weight="balanced",
        random_state=random_state,
        n_jobs=-1
    )
    rf.fit(X_train_rr, y_train)
    return rf
