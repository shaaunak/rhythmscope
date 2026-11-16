"""
Unit tests for Uncertainty Calibration and Abstention Module.
Verifies:
1. ECE calculation correctness on synthetic distributions.
2. Brier score calculation.
3. Temperature scaling preserves ranking and monotonicity.
4. Selective risk and coverage calculation.
5. Strict assertion: calibration protocol accessed zero DS2 test records.
"""

import json
from pathlib import Path
import numpy as np
import pytest
import torch

from rhythmscope.evaluation.calibration import (
    compute_ece,
    compute_brier_score,
    compute_selective_risk_coverage,
    TemperatureScaler
)
from rhythmscope.data.splits import DS2_RECORDS, DS2_STRICT_RECORDS


def test_ece_perfect_calibration():
    # If predicted confidence matches empirical accuracy in each bin, ECE should be near 0
    probs = np.array([
        [0.9, 0.1],
        [0.9, 0.1],
        [0.9, 0.1],
        [0.9, 0.1],
        [0.9, 0.1],
        [0.9, 0.1],
        [0.9, 0.1],
        [0.9, 0.1],
        [0.9, 0.1],
        [0.1, 0.9]  # 9 correct out of 10 -> acc = 0.9, conf = 0.9
    ])
    labels = np.array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    ece, bins = compute_ece(probs, labels, n_bins=5)
    assert ece < 0.05


def test_brier_score():
    probs = np.array([[1.0, 0.0], [0.0, 1.0]])
    labels = np.array([0, 1])
    brier = compute_brier_score(probs, labels, n_classes=2)
    assert brier == pytest.approx(0.0)

    # Completely wrong
    probs_wrong = np.array([[0.0, 1.0], [1.0, 0.0]])
    brier_wrong = compute_brier_score(probs_wrong, labels, n_classes=2)
    assert brier_wrong == pytest.approx(2.0)


def test_temperature_scaler_monotonicity():
    logits = torch.tensor([[2.0, 0.5, -1.0], [0.1, 3.0, 1.2]])
    scaler = TemperatureScaler()
    scaler.log_temperature.data.fill_(np.log(1.5))  # T = 1.5
    scaled = scaler(logits)
    
    # Argmax and ordering must be identical
    assert torch.equal(torch.argmax(logits, dim=1), torch.argmax(scaled, dim=1))
    assert scaler.temperature.item() == pytest.approx(1.5)


def test_selective_risk_coverage():
    probs = np.array([
        [0.95, 0.05],
        [0.90, 0.10],
        [0.70, 0.30],
        [0.55, 0.45]
    ])
    labels = np.array([0, 0, 1, 0])  # index 2 is wrong since argmax is 0 but label is 1
    curve = compute_selective_risk_coverage(probs, labels, n_thresholds=5)
    assert len(curve) == 5
    # Coverage must be non-increasing with threshold
    for i in range(len(curve) - 1):
        assert curve[i]["coverage"] >= curve[i + 1]["coverage"]


def test_calibration_protocol_integrity():
    protocol_path = Path("reports/calibration_protocol.json")
    assert protocol_path.exists(), "Calibration protocol file missing."
    with open(protocol_path, "r") as f:
        proto = json.load(f)
        
    calib_records = set(proto["calibration_records"])
    ds2_set = set(DS2_RECORDS)
    ds2_strict_set = set(DS2_STRICT_RECORDS)
    
    # Assert zero overlap with DS2 test sets
    assert len(calib_records.intersection(ds2_set)) == 0, "LEAKAGE: Calibration set accessed DS2 records!"
    assert len(calib_records.intersection(ds2_strict_set)) == 0, "LEAKAGE: Calibration set accessed DS2 Strict records!"
    assert proto["integrity_assertions"]["ds2_accessed"] is False
    assert proto["temperature"] > 0.0
    assert 0.0 <= proto["ece"]["calibrated"] <= proto["ece"]["uncalibrated"]
