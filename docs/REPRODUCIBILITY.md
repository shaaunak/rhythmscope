# RhythmScope — Scientific Reproducibility Guide

**Standard**: Fully Deterministic Multi-Seed Verification  
**Document Revision**: 2.0.0  
**Status**: Verified

---

## 1. System Requirements & Hardware

- **Operating System**: macOS (Apple Silicon M1/M2/M3/M4 via `mps`) or Linux (x86_64 via CUDA or CPU).
- **Python Version**: Python 3.11 or 3.12 (strictly pinned).
- **Compute Accelerators**: PyTorch Metal Performance Shaders (`mps`) or NVIDIA CUDA (`cuda:0`). Automatic fallback to multi-core CPU.
- **Node.js**: Node 18+ or 20+ (for Next.js frontend).

---

## 2. End-to-End Execution Sequence

To regenerate all datasets, model checkpoints, statistical evaluations, and calibration reports from scratch:

```bash
# 1. Clone repository and install dependencies
git clone https://github.com/shaaunak/rhythmscope.git
cd rhythmscope
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e .

# 2. Download raw PhysioNet records and NSTDB noise streams
python -m rhythmscope.data.download

# 3. Extract beat windows, compute RR intervals, fit train-only scalers
python -m rhythmscope.signals.beats

# 4. Audit dataset partitions and generate split manifests
python -m rhythmscope.data.audit

# 5. Train all models across deterministic multi-seed protocol (42, 1337, 2024)
python -m rhythmscope.training.train

# 6. Fit temperature calibration and selective abstention on held-out validation
python -m rhythmscope.evaluation.calibration

# 7. Evaluate test benchmarks, patient-level bootstrap CIs, and de Chazal comparison
python -m rhythmscope.evaluation.metrics

# 8. Run TrustLab biological noise stress testing (bw, ma, em across 24-0 dB SNR)
python -m rhythmscope.evaluation.noise_stress

# 9. Audit external cohort transfer on PhysioNet INCART
python -m rhythmscope.evaluation.external_transfer

# 10. Run automated test suite
pytest tests/
```

---

## 3. Data & Checkpoint Artifact Integrity

The pipeline generates the following verified artifacts with sha256 checksum tracking:

| File Path | Description | Partition |
|---|---|---|
| `data/processed/train.npz` | Normalized training beat windows & RR features | 18 patients, 41,506 beats |
| `data/processed/val.npz` | Held-out validation partition | 4 patients, 9,488 beats |
| `data/processed/test_strict.npz` | Strict patient-disjoint test partition | 21 patients, 47,550 beats |
| `data/processed/test_classical.npz` | Classical de Chazal benchmark test partition | 22 patients, 49,685 beats |
| `data/processed/scaler_params.json` | Train-only fitted waveform and RR z-score parameters | DS1_TRAIN only |
| `artifacts/checkpoints/hybrid_cnn.pt` | Multimodal 1D CNN + RR network weights | Trained weights |
| `artifacts/checkpoints/waveform_cnn.pt` | Waveform-only 1D CNN network weights | Trained weights |
| `artifacts/checkpoints/random_forest.pkl` | 150-tree Random Forest baseline | Trained weights |
| `artifacts/checkpoints/majority.pkl` | Majority class baseline | Prior statistics |
| `reports/split_manifest.json` | Complete per-record and per-patient split manifest | 48 records |
| `reports/patient_overlap_audit.json` | Mathematical verification of zero patient leakage | Verified |
| `reports/multi_seed_results.json` | Multi-seed (42, 1337, 2024) aggregated performance | 3 seeds |
| `reports/calibration_protocol.json` | Temperature scaling & selective risk-coverage curves | Calibrated |

---

## 4. Reproducibility Receipts

Every evaluated prediction trace displayed in RhythmScope includes a **reproducibility receipt**:
- **Dataset Version**: PhysioNet MIT-BIH Arrhythmia Database v1.0.0 (AAMI EC57 mapping).
- **Split Manifest**: `reports/split_manifest.json` (SHA256 logged).
- **Signal Processing Revision**: 3rd-order Butterworth SOS bandpass (0.5 - 40.0 Hz).
- **Checkpoint Hash**: SHA256 of loaded `.pt` weights.
- **Evaluation Mode**: Strict Patient-Disjoint (excluding Record 202) vs Classical DS2.
- **Random Seeds**: 42 (primary), 1337, 2024.
