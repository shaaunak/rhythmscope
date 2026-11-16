"""
FastAPI Backend for RhythmScope Research Platform.
Provides:
1. Real-time multi-model serving (Majority, RF, Waveform CNN, Hybrid CNN).
2. Continuous ECG lead waveform streaming with overlaid beat annotations.
3. Integrated Gradients explainability and morphology perturbation sensitivity.
4. TrustLab Real-Noise Reliability benchmark data and live noise simulation.
5. Interactive Failure Atlas of real unseen-patient misclassifications.
6. Development-calibrated uncertainty and abstention diagnostics.
7. Reproducible Experiment Receipts and cross-dataset transfer reports.
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Optional, Any
import numpy as np
import torch
import torch.nn.functional as F
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rhythmscope.data.splits import HEADLINE_CLASSES, DS1_TRAIN_RECORDS, DS1_VAL_RECORDS, DS2_RECORDS, DS2_STRICT_RECORDS
from rhythmscope.signals.filters import filter_ecg
from rhythmscope.signals.beats import extract_record_beats
from rhythmscope.evaluation.metrics import load_trained_models
from rhythmscope.evaluation.explain import explain_waveform_beat, perturbation_impact
from rhythmscope.evaluation.noise_stress import inject_measured_noise, cache_nstdb_noises, NOISE_TYPES

app = FastAPI(
    title="RhythmScope Research API",
    description="Patient-Independent ECG Heartbeat Classification & Model Reliability Studio",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
MODELS = None
SCALER = None
NSTDB_NOISES = None


def get_models():
    global MODELS
    if MODELS is None:
        try:
            MODELS = load_trained_models(ckpt_dir="artifacts/checkpoints", device=DEVICE)
        except Exception as e:
            print(f"Warning: Models not loaded yet: {e}")
            return None
    return MODELS


def get_scaler():
    global SCALER
    if SCALER is None:
        scaler_file = Path("data/processed/scaler_params.json")
        if scaler_file.exists():
            with open(scaler_file, "r") as f:
                SCALER = json.load(f)
    return SCALER


def get_nstdb_noises():
    global NSTDB_NOISES
    if NSTDB_NOISES is None:
        try:
            NSTDB_NOISES = cache_nstdb_noises("data/raw/nstdb")
        except Exception as e:
            print(f"Warning: NSTDB noises not loaded: {e}")
            return None
    return NSTDB_NOISES


# -------------------------------------------------------------
# PYDANTIC SCHEMAS
# -------------------------------------------------------------

class PredictRequest(BaseModel):
    waveform: List[float] = Field(..., description="252 samples of raw or filtered ECG beat")
    rr_features: Optional[List[float]] = Field(default=[0.8, 0.8, 0.8, 1.0], description="Pre-RR, Post-RR, Local-RR, RR-Ratio")
    model_name: Optional[str] = Field(default="hybrid_cnn", description="majority, random_forest, waveform_cnn, or hybrid_cnn")


class NoiseSimulateRequest(BaseModel):
    waveform: List[float] = Field(..., description="252 samples of clean ECG beat")
    noise_type: str = Field(default="em", description="bw (Baseline Wander), ma (Muscle Artifact), or em (Electrode Motion)")
    target_snr_db: float = Field(default=12.0, description="Calibrated Signal-to-Noise Ratio in dB")
    seed: Optional[int] = Field(default=42, description="Deterministic noise excerpt seed")
    rr_features: Optional[List[float]] = Field(default=[0.8, 0.8, 0.8, 1.0], description="Pre-RR, Post-RR, Local-RR, RR-Ratio")


# -------------------------------------------------------------
# HEALTH & PROBES
# -------------------------------------------------------------

@app.get("/health/live")
@app.get("/api/health")
def health_live():
    models = get_models()
    return {
        "status": "healthy",
        "live": True,
        "device": DEVICE,
        "models_loaded": list(models.keys()) if models else [],
        "version": "1.0.0"
    }


@app.get("/health/ready")
def health_ready():
    models = get_models()
    scaler = get_scaler()
    ready = models is not None and scaler is not None
    if not ready:
        raise HTTPException(status_code=503, detail="Models or scalers not ready.")
    return {"status": "ready", "ready": True}


# -------------------------------------------------------------
# MODELS & REVISION METADATA
# -------------------------------------------------------------

@app.get("/api/models")
def list_models():
    protocol_file = Path("reports/final_protocol.json")
    if not protocol_file.exists():
        raise HTTPException(status_code=404, detail="Protocol metadata not found.")
    with open(protocol_file, "r") as f:
        proto = json.load(f)
    return {
        "active_device": DEVICE,
        "commit_sha": proto.get("commit_sha", "unknown"),
        "models": proto["checkpoints"],
        "headline_classes": HEADLINE_CLASSES,
        "calibration": proto["calibration_policy"]
    }


# -------------------------------------------------------------
# RECORDS & CONTINUOUS ECG STRIPS
# -------------------------------------------------------------

@app.get("/api/records")
def list_records():
    audit_file = Path("reports/data_audit.json")
    if not audit_file.exists():
        raise HTTPException(status_code=404, detail="Data audit not found.")
    with open(audit_file, "r") as f:
        audit = json.load(f)
    return audit["records"]


@app.get("/api/records/{record_id}/strip")
def get_record_strip(
    record_id: str,
    start_second: float = Query(0.0, ge=0.0),
    duration_seconds: float = Query(10.0, ge=1.0, le=60.0)
):
    """
    Returns continuous ECG lead waveform and overlaid annotated beats for interactive replay.
    """
    raw_path = Path("data/raw") / f"{record_id}.hea"
    if not raw_path.exists():
        raise HTTPException(status_code=404, detail=f"Record {record_id} not found.")
        
    beats_data = extract_record_beats(f"data/raw/{record_id}", pre_samples=90, post_samples=162)
    fs = beats_data["fs"]
    total_samples = len(beats_data["filtered_signal"])
    
    start_sample = int(start_second * fs)
    end_sample = min(total_samples, int((start_second + duration_seconds) * fs))
    
    strip_waveform = beats_data["filtered_signal"][start_sample:end_sample].tolist()
    
    window_beats = []
    models = get_models()
    scaler = get_scaler()
    
    for i, s_idx in enumerate(beats_data["samples"]):
        if start_sample <= s_idx < end_sample:
            true_label = HEADLINE_CLASSES[beats_data["labels"][i]]
            beat_wf = beats_data["waveforms"][i]
            beat_rr = beats_data["features"][i]
            
            pred_label = true_label
            probs = {cls_name: 0.0 for cls_name in HEADLINE_CLASSES}
            
            if models and "hybrid_cnn" in models and scaler:
                wf_norm = (beat_wf - scaler["waveform_mean"]) / scaler["waveform_std"]
                rr_norm = (beat_rr - np.array(scaler["rr_mean"])) / np.array(scaler["rr_std"])
                
                wf_t = torch.from_numpy(wf_norm).float().unsqueeze(0).to(DEVICE)
                rr_t = torch.from_numpy(rr_norm).float().unsqueeze(0).to(DEVICE)
                with torch.no_grad():
                    logits = models["hybrid_cnn"](wf_t, rr_t)
                    p = F.softmax(logits, dim=1).squeeze(0).cpu().numpy()
                pred_label = HEADLINE_CLASSES[int(np.argmax(p))]
                probs = {cls_name: round(float(p[c]), 4) for c, cls_name in enumerate(HEADLINE_CLASSES)}
                
            window_beats.append({
                "beat_index": i,
                "relative_sample": int(s_idx - start_sample),
                "absolute_sample": int(s_idx),
                "time_seconds": round(s_idx / fs, 3),
                "true_class": true_label,
                "predicted_class": pred_label,
                "is_correct": bool(pred_label == true_label),
                "probabilities": probs,
                "rr_features": {
                    "pre_rr": round(float(beat_rr[0]), 3),
                    "post_rr": round(float(beat_rr[1]), 3),
                    "local_rr_avg": round(float(beat_rr[2]), 3),
                    "rr_ratio": round(float(beat_rr[3]), 3)
                }
            })
            
    return {
        "record_id": record_id,
        "fs": fs,
        "lead": beats_data["lead_used"],
        "start_second": start_second,
        "duration_seconds": duration_seconds,
        "waveform": strip_waveform,
        "beats": window_beats
    }


# -------------------------------------------------------------
# BENCHMARK RESULTS & METRICS
# -------------------------------------------------------------

@app.get("/api/benchmark")
def get_benchmark():
    bench_file = Path("reports/benchmark_results.json")
    if not bench_file.exists():
        raise HTTPException(status_code=404, detail="Benchmark results not ready yet.")
    with open(bench_file, "r") as f:
        return json.load(f)


# -------------------------------------------------------------
# CALIBRATION & ABSTENTION PROTOCOL
# -------------------------------------------------------------

@app.get("/api/calibration")
def get_calibration():
    calib_file = Path("reports/calibration_protocol.json")
    if not calib_file.exists():
        raise HTTPException(status_code=404, detail="Calibration protocol not found.")
    with open(calib_file, "r") as f:
        return json.load(f)


# -------------------------------------------------------------
# TRUSTLAB REAL-NOISE BENCHMARK
# -------------------------------------------------------------

@app.get("/api/trustlab/metrics")
def get_trustlab_metrics():
    stress_file = Path("reports/trustlab_metrics.json")
    if not stress_file.exists():
        raise HTTPException(status_code=404, detail="TrustLab stress metrics not found.")
    with open(stress_file, "r") as f:
        return json.load(f)


@app.get("/api/trustlab/paired-examples")
def get_trustlab_paired_examples():
    paired_file = Path("reports/trustlab_paired_examples.json")
    if not paired_file.exists():
        raise HTTPException(status_code=404, detail="TrustLab paired examples not found.")
    with open(paired_file, "r") as f:
        return json.load(f)


@app.get("/api/trustlab/receipt")
def get_trustlab_receipt():
    receipt_file = Path("reports/trustlab_receipt.json")
    if not receipt_file.exists():
        raise HTTPException(status_code=404, detail="TrustLab receipt not found.")
    with open(receipt_file, "r") as f:
        return json.load(f)


@app.post("/api/trustlab/simulate-noise")
def simulate_noise_live(req: NoiseSimulateRequest):
    """
    Injects recorded NSTDB noise into a clean waveform at specified SNR,
    and runs live multi-model inference with calibrated abstention.
    """
    noises = get_nstdb_noises()
    if not noises or req.noise_type not in noises:
        raise HTTPException(status_code=503, detail=f"Noise stream '{req.noise_type}' unavailable.")
        
    models = get_models()
    scaler = get_scaler()
    if not models or not scaler:
        raise HTTPException(status_code=503, detail="Models or scalers not ready.")
        
    clean_wf = np.array(req.waveform, dtype=np.float32)
    noise_stream = noises[req.noise_type]
    
    noisy_wf, realized_snr = inject_measured_noise(
        clean_wf,
        noise_stream,
        target_snr_db=req.target_snr_db,
        deterministic_seed=req.seed or 42
    )
    
    # Normalize
    wf_norm = (noisy_wf - scaler["waveform_mean"]) / scaler["waveform_std"]
    rr_norm = (np.array(req.rr_features, dtype=np.float32) - np.array(scaler["rr_mean"])) / np.array(scaler["rr_std"])
    
    # Load calibration threshold
    calib_file = Path("reports/calibration_protocol.json")
    temp = 1.0
    abstention_tau = 0.90
    if calib_file.exists():
        with open(calib_file, "r") as f:
            c_data = json.load(f)
            temp = c_data.get("temperature", 1.0)
            abstention_tau = c_data.get("abstention_thresholds", {}).get("balanced", {}).get("threshold", 0.90)
            
    # Hybrid CNN
    wf_t = torch.from_numpy(wf_norm).float().unsqueeze(0).to(DEVICE)
    rr_t = torch.from_numpy(rr_norm).float().unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        hyb_logits = models["hybrid_cnn"](wf_t, rr_t) / temp
        hyb_p = F.softmax(hyb_logits, dim=1).squeeze(0).cpu().numpy()
        cnn_logits = models["waveform_cnn"](wf_t)
        cnn_p = F.softmax(cnn_logits, dim=1).squeeze(0).cpu().numpy()
        
    rf_probs = models["random_forest"].predict_proba(rr_norm.reshape(1, -1))[0]
    
    hyb_conf = float(np.max(hyb_p))
    hyb_pred = HEADLINE_CLASSES[int(np.argmax(hyb_p))]
    
    return {
        "noise_type": req.noise_type,
        "target_snr_db": req.target_snr_db,
        "realized_snr_db": round(realized_snr, 2),
        "noisy_waveform": noisy_wf.tolist(),
        "predictions": {
            "hybrid_cnn": {
                "class": hyb_pred,
                "confidence": round(hyb_conf, 4),
                "abstained": bool(hyb_conf < abstention_tau),
                "status": "CONFIDENT" if hyb_conf >= 0.95 else ("BORDERLINE" if hyb_conf >= abstention_tau else "ABSTAINED_UNCERTAIN"),
                "probabilities": {cls: round(float(hyb_p[c]), 4) for c, cls in enumerate(HEADLINE_CLASSES)}
            },
            "waveform_cnn": {
                "class": HEADLINE_CLASSES[int(np.argmax(cnn_p))],
                "confidence": round(float(np.max(cnn_p)), 4),
                "probabilities": {cls: round(float(cnn_p[c]), 4) for c, cls in enumerate(HEADLINE_CLASSES)}
            },
            "random_forest": {
                "class": HEADLINE_CLASSES[int(np.argmax(rf_probs))],
                "confidence": round(float(np.max(rf_probs)), 4),
                "probabilities": {cls: round(float(rf_probs[c]), 4) for c, cls in enumerate(HEADLINE_CLASSES)}
            }
        }
    }


# -------------------------------------------------------------
# FAILURE ATLAS
# -------------------------------------------------------------

@app.get("/api/failures/atlas")
def get_failure_atlas(
    true_class: Optional[str] = None,
    predicted_class: Optional[str] = None,
    record: Optional[str] = None,
    limit: int = 50
):
    """
    Returns curated genuine failure cases from unseen patients on strict test data.
    """
    beats_file = Path("reports/sample_beats.json")
    if not beats_file.exists():
        raise HTTPException(status_code=404, detail="Beats gallery not ready.")
    with open(beats_file, "r") as f:
        beats = json.load(f)
        
    failures = [b for b in beats if not b.get("is_correct", False)]
    
    if true_class:
        failures = [b for b in failures if b["true_class"] == true_class]
    if predicted_class:
        failures = [b for b in failures if b.get("hybrid_prediction") == predicted_class]
    if record:
        failures = [b for b in failures if b["record"] == record]
        
    return {
        "total_failures_available": len(failures),
        "returned": len(failures[:limit]),
        "failures": failures[:limit]
    }


# -------------------------------------------------------------
# SAMPLE BEATS GALLERY & EXPLAINABILITY
# -------------------------------------------------------------

@app.get("/api/beats/gallery")
def get_sample_beats(limit: int = 100):
    beats_file = Path("reports/sample_beats.json")
    if not beats_file.exists():
        raise HTTPException(status_code=404, detail="Sample beats gallery not ready yet.")
    with open(beats_file, "r") as f:
        beats = json.load(f)
    return beats[:limit]


@app.get("/api/beats/{beat_id}/explain")
def explain_beat(beat_id: int):
    beats_file = Path("reports/sample_beats.json")
    if not beats_file.exists():
        raise HTTPException(status_code=404, detail="Sample beats not found.")
    with open(beats_file, "r") as f:
        beats = json.load(f)
        
    target_beat = next((b for b in beats if b["beat_id"] == beat_id), None)
    if not target_beat:
        raise HTTPException(status_code=404, detail=f"Beat {beat_id} not found in gallery.")
        
    models = get_models()
    scaler = get_scaler()
    if not models or "hybrid_cnn" not in models or not scaler:
        raise HTTPException(status_code=503, detail="Models or scaler not loaded.")
        
    wf_raw = np.array(target_beat["waveform"], dtype=np.float32)
    rr_raw = np.array([
        target_beat["rr_features"]["pre_rr"],
        target_beat["rr_features"]["post_rr"],
        target_beat["rr_features"]["local_rr_avg"],
        target_beat["rr_features"]["rr_ratio"]
    ], dtype=np.float32)
    
    wf_norm = (wf_raw - scaler["waveform_mean"]) / scaler["waveform_std"]
    rr_norm = (rr_raw - np.array(scaler["rr_mean"])) / np.array(scaler["rr_std"])
    
    ig_result = explain_waveform_beat(
        models["hybrid_cnn"],
        wf_norm,
        rr_features=rr_norm,
        device=DEVICE
    )
    
    perturbation = perturbation_impact(
        models["hybrid_cnn"],
        wf_norm,
        rr_features=rr_norm,
        device=DEVICE
    )
    
    return {
        "beat": target_beat,
        "explainability": ig_result,
        "perturbation_impact": perturbation
    }


# -------------------------------------------------------------
# EXTERNAL TRANSFER REPORT (INCART)
# -------------------------------------------------------------

@app.get("/api/transfer/incart")
def get_incart_transfer():
    incart_file = Path("reports/incart_transfer_report.json")
    if not incart_file.exists():
        raise HTTPException(status_code=404, detail="INCART transfer report not found.")
    with open(incart_file, "r") as f:
        return json.load(f)


# -------------------------------------------------------------
# LIVE PREDICT
# -------------------------------------------------------------

@app.post("/api/predict")
def predict_beat(req: PredictRequest):
    models = get_models()
    scaler = get_scaler()
    if not models or not scaler:
        raise HTTPException(status_code=503, detail="Models not loaded.")
        
    wf = np.array(req.waveform, dtype=np.float32)
    rr = np.array(req.rr_features, dtype=np.float32)
    
    wf_norm = (wf - scaler["waveform_mean"]) / scaler["waveform_std"]
    rr_norm = (rr - np.array(scaler["rr_mean"])) / np.array(scaler["rr_std"])
    
    predictions = {}
    
    # Random Forest
    rf_probs = models["random_forest"].predict_proba(rr_norm.reshape(1, -1))[0]
    predictions["random_forest"] = {
        "class": HEADLINE_CLASSES[int(np.argmax(rf_probs))],
        "probabilities": {cls: round(float(rf_probs[c]), 4) for c, cls in enumerate(HEADLINE_CLASSES)}
    }
    
    # Waveform CNN
    wf_t = torch.from_numpy(wf_norm).float().unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        cnn_logits = models["waveform_cnn"](wf_t)
        cnn_p = F.softmax(cnn_logits, dim=1).squeeze(0).cpu().numpy()
    predictions["waveform_cnn"] = {
        "class": HEADLINE_CLASSES[int(np.argmax(cnn_p))],
        "probabilities": {cls: round(float(cnn_p[c]), 4) for c, cls in enumerate(HEADLINE_CLASSES)}
    }
    
    # Hybrid CNN
    rr_t = torch.from_numpy(rr_norm).float().unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        hyb_logits = models["hybrid_cnn"](wf_t, rr_t)
        hyb_p = F.softmax(hyb_logits, dim=1).squeeze(0).cpu().numpy()
    predictions["hybrid_cnn"] = {
        "class": HEADLINE_CLASSES[int(np.argmax(hyb_p))],
        "probabilities": {cls: round(float(hyb_p[c]), 4) for c, cls in enumerate(HEADLINE_CLASSES)}
    }
    
    return predictions
