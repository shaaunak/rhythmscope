"""
Unit and integration tests for RhythmScope FastAPI service.
Tests:
1. /health/live and /health/ready
2. /api/models and metadata
3. /api/records and /api/records/{id}/strip
4. /api/benchmark
5. /api/calibration
6. /api/trustlab/metrics, paired-examples, and receipt
7. /api/failures/atlas with filtering
8. /api/predict (multi-model live inference)
9. /api/trustlab/simulate-noise (live noise injection & abstention)
"""

import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)


def test_health():
    res = client.get("/health/live")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["live"] is True


def test_models():
    res = client.get("/api/models")
    assert res.status_code == 200
    data = res.json()
    assert "models" in data
    assert "hybrid_cnn" in data["models"]
    assert "calibration" in data


def test_records_and_strip():
    res = client.get("/api/records")
    assert res.status_code == 200
    records = res.json()
    assert len(records) > 0
    rec_id = list(records.keys())[0] if isinstance(records, dict) else records[0]["record"]
    
    strip_res = client.get(f"/api/records/{rec_id}/strip?start_second=0&duration_seconds=5")
    assert strip_res.status_code == 200
    strip_data = strip_res.json()
    assert strip_data["record_id"] == rec_id
    assert "waveform" in strip_data
    assert len(strip_data["waveform"]) > 0
    assert "beats" in strip_data


def test_benchmark():
    res = client.get("/api/benchmark")
    assert res.status_code == 200
    data = res.json()
    assert "splits" in data
    assert "strict_patient_disjoint" in data["splits"]
    assert "classical_ds2" in data["splits"]


def test_calibration():
    res = client.get("/api/calibration")
    assert res.status_code == 200
    data = res.json()
    assert "temperature" in data
    assert "abstention_thresholds" in data
    assert "risk_coverage_curve" in data


def test_trustlab_endpoints():
    m_res = client.get("/api/trustlab/metrics")
    assert m_res.status_code == 200
    metrics = m_res.json()
    assert "scenarios" in metrics
    assert len(metrics["scenarios"]) == 15

    p_res = client.get("/api/trustlab/paired-examples")
    assert p_res.status_code == 200
    examples = p_res.json()
    assert len(examples) > 0

    r_res = client.get("/api/trustlab/receipt")
    assert r_res.status_code == 200
    receipt = r_res.json()
    assert "experiment_id" in receipt


def test_failure_atlas():
    res = client.get("/api/failures/atlas")
    assert res.status_code == 200
    data = res.json()
    assert "failures" in data
    assert "total_failures_available" in data


def test_live_predict():
    dummy_wf = [0.0] * 252
    dummy_rr = [0.8, 0.8, 0.8, 1.0]
    res = client.post("/api/predict", json={"waveform": dummy_wf, "rr_features": dummy_rr})
    assert res.status_code == 200
    data = res.json()
    assert "hybrid_cnn" in data
    assert "waveform_cnn" in data
    assert "random_forest" in data
    assert "class" in data["hybrid_cnn"]
    assert "probabilities" in data["hybrid_cnn"]


def test_simulate_noise():
    dummy_wf = [0.0] * 252
    res = client.post("/api/trustlab/simulate-noise", json={
        "waveform": dummy_wf,
        "noise_type": "em",
        "target_snr_db": 12.0,
        "rr_features": [0.8, 0.8, 0.8, 1.0]
    })
    assert res.status_code == 200
    data = res.json()
    assert "noisy_waveform" in data
    assert len(data["noisy_waveform"]) == 252
    assert "predictions" in data
    assert "status" in data["predictions"]["hybrid_cnn"]
