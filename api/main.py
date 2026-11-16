"""
FastAPI Backend for RhythmScope Studio.
Provides real-time model serving, interactive ECG strip browsing,
Integrated Gradients explainability, benchmark metrics, and failure diagnostics.
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

app = FastAPI(
    title="RhythmScope API",
    description="Patient-Independent ECG Heartbeat Classification & Model Evaluation Studio",
    version="0.1.0"
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

class PredictRequest(BaseModel):
    waveform: List[float] = Field(..., description="252 samples of normalized or raw ECG beat")
    rr_features: Optional[List[float]] = Field(default=[0.8, 0.8, 0.8, 1.0], description="Pre-RR, Post-RR, Local-RR, RR-Ratio")
    model_name: Optional[str] = Field(default="hybrid_cnn", description="majority, random_forest, waveform_cnn, or hybrid_cnn")

@app.get("/api/health")
def health():
    models = get_models()
    return {
        "status": "healthy",
        "device": DEVICE,
        "models_loaded": list(models.keys()) if models else [],
        "version": "0.1.0"
    }

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
    
    # Filter beats falling in this window
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
                probs = {cls_name: float(p[c]) for c, cls_name in enumerate(HEADLINE_CLASSES)}
                
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

@app.get("/api/benchmark")
def get_benchmark():
    bench_file = Path("reports/benchmark_results.json")
    if not bench_file.exists():
        raise HTTPException(status_code=404, detail="Benchmark results not ready yet.")
    with open(bench_file, "r") as f:
        return json.load(f)

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
    
    # Compute Integrated Gradients
    ig_result = explain_waveform_beat(
        models["hybrid_cnn"],
        wf_norm,
        rr_features=rr_norm,
        device=DEVICE
    )
    
    # Compute Segment Perturbation Impact
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
        "probabilities": {cls: float(rf_probs[c]) for c, cls in enumerate(HEADLINE_CLASSES)}
    }
    
    # Waveform CNN
    wf_t = torch.from_numpy(wf_norm).float().unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        cnn_logits = models["waveform_cnn"](wf_t)
        cnn_p = F.softmax(cnn_logits, dim=1).squeeze(0).cpu().numpy()
    predictions["waveform_cnn"] = {
        "class": HEADLINE_CLASSES[int(np.argmax(cnn_p))],
        "probabilities": {cls: float(cnn_p[c]) for c, cls in enumerate(HEADLINE_CLASSES)}
    }
    
    # Hybrid CNN
    rr_t = torch.from_numpy(rr_norm).float().unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        hyb_logits = models["hybrid_cnn"](wf_t, rr_t)
        hyb_p = F.softmax(hyb_logits, dim=1).squeeze(0).cpu().numpy()
    predictions["hybrid_cnn"] = {
        "class": HEADLINE_CLASSES[int(np.argmax(hyb_p))],
        "probabilities": {cls: float(hyb_p[c]) for c, cls in enumerate(HEADLINE_CLASSES)}
    }
    
    return predictions
