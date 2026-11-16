# RhythmScope Progress Log & Audit Tracker

## Project Overview
- **Project**: RhythmScope: Patient-Independent ECG Heartbeat Classification & Model Reliability Studio
- **Defining Signature**: **TrustLab — Beyond the Prediction**
- **Core Research Question**: *"How does an ECG classifier behave on unseen patients, under realistic signal corruption, and when it is uncertain?"*
- **Datasets**: 
  - PhysioNet MIT-BIH Arrhythmia Database v1.0.0 (48 half-hour 2-lead ECG records at 360 Hz)
  - PhysioNet MIT-BIH Noise Stress Test Database (NSTDB: recorded `bw`, `ma`, `em` noise streams at 360 Hz)
  - PhysioNet St Petersburg INCART 12-lead Arrhythmia Database (cross-dataset transfer evaluation)
- **Key Scientific Discovery**: PhysioNet documentation confirms Records 201 (DS1) and 202 (DS2) originate from the identical individual. Consequently, classical DS1/DS2 benchmarks suffer from patient leakage. RhythmScope implements both:
  1. **Strict Patient-Disjoint Benchmark** (DS1 vs DS2 with 202 excluded: 21 unseen patients, 47,550 beats — our primary headline metric).
  2. **Classical Benchmark** (DS1 vs DS2 with 202 included: 22 records, 49,685 beats — historical literature comparison).

---

## Milestone Acceptance Gates (6/6 Complete — Research Edition Verified)

### Phase 1 — Foundation and Data Audit [COMPLETE]
- [x] Initialized Python / PyTorch repository structure with configs, pyproject.toml, and Makefile
- [x] Implemented data download utilities for MIT-BIH using `wfdb`
- [x] Executed comprehensive data audit (`reports/data_audit.json`):
  - Lead identification (handled reversed lead orders like Record 114 MLII vs V5)
  - Patient identities and demographic overlap (Records 201 & 202)
  - AAMI 1998 class mappings (N, S, V, F) and paced record exclusions (102, 104, 107, 217)
  - Exact beat count distribution for DS1, DS2, and Q class rarity (<0.02% support)
- [x] Constructed leak-proof splits (DS1 train: 41,500 beats; DS1 val: 9,494 beats; DS2 classical: 49,685 beats; DS2 strict: 47,550 beats)
- [x] Implemented unit tests for data integrity and leak verification (`tests/test_data_and_splits.py`)

### Phase 2 — Signal-Processing Pipeline [COMPLETE]
- [x] SOS (second-order sections) Butterworth bandpass filtering (0.5 – 40 Hz) for baseline wander and high-frequency noise removal
- [x] 252-sample heartbeat window segmentation centered around reference R-peaks (-90 / +162 samples at 360 Hz, ~0.7s)
- [x] RR interval feature extraction (`pre_rr`, `post_rr`, `local_rr_avg`, `rr_ratio`), distinguishing retrospective vs causal features
- [x] Train-only normalization (Z-score fitted exclusively on DS1 training patients; saved to `data/processed/scaler_params.json`)
- [x] Unit tests for signal filtering and window slicing (`tests/test_signals.py`)

### Phase 3 — Baselines and Deep Learning [COMPLETE]
- [x] Trained Majority-class baseline (`artifacts/checkpoints/majority.pkl`, SHA256: `0c6b336c...`)
- [x] Trained RR-interval Random Forest baseline (`artifacts/checkpoints/random_forest.pkl`, SHA256: `c86cbfbf...`)
- [x] Trained Waveform-only 1D CNN (`artifacts/checkpoints/waveform_cnn.pt`, SHA256: `c6df2f4e...`)
- [x] Trained 1D CNN + RR Hybrid Model (`artifacts/checkpoints/hybrid_cnn.pt`, SHA256: `f2cd8cbf...`)

### Phase 3A — Development-Only Calibration & Abstention [COMPLETE]
- [x] Calibrated exclusively on DS1 development records (`115`, `119`, `208`, `223` — 9,494 beats) with zero access to DS2
- [x] Fitted optimal Temperature Scaling ($T = 0.6399$):
  - Expected Calibration Error (ECE): **11.76% → 2.11%**
  - Multi-class Brier score: **0.1501 → 0.1292**
- [x] Calibrated Selective Classification abstention policy (Geifman & El-Yaniv):
  - Balanced Threshold: $\tau = 0.9073$ (Target selective error rate $\le 5\%$)
  - Conservative Threshold: $\tau = 0.9500$ (Target selective error rate $\le 3\%$)
  - Realized development coverage: N: 86.7%, S: 12.0%, V: 44.5%, F: 34.7%
- [x] Saved frozen protocol to `reports/calibration_protocol.json` and unit tests in `tests/test_calibration.py`

### Phase 4 — Frozen Scientific Evaluation [COMPLETE]
- [x] Froze experiment configuration in `reports/final_protocol.json` (Commit: `3291fc2`, Seed: 42)
- [x] Executed full evaluation across all 4 architectures on both Strict and Classical test sets
- [x] Measured headline metrics on Strict Patient-Disjoint test set (21 unseen patients, 47,550 beats):
  - **Hybrid CNN + RR**: Accuracy = **92.70%**, Macro F1 = **0.5696** (95% CI: `[0.4593, 0.6181]`), S-Recall = **53.70%**, V-Recall = **87.07%**, Latency = **0.68 ms**, Size = **212 KB**
  - **Random Forest**: Accuracy = 87.28%, Macro F1 = 0.4198 (95% CI: `[0.3763, 0.4529]`), S-Recall = 25.48%, V-Recall = 55.89%
  - **Waveform CNN**: Accuracy = 73.69%, Macro F1 = 0.3011, S-Recall = 0.00%, V-Recall = 95.94%
  - **Majority Baseline**: Accuracy = 88.71%, Macro F1 = 0.2350
- [x] Extracted 100 curated beats spanning all classes and genuine failure cases (`reports/sample_beats.json`)
- [x] Authored comprehensive Model Card (`docs/MODEL_CARD.md`)

### Phase 4A — TrustLab Real-Noise Reliability Benchmark [COMPLETE]
- [x] Downloaded and cached PhysioNet NSTDB noise streams (`bw`, `ma`, `em`: 650,000 samples @ 360 Hz each)
- [x] Evaluated 15 pre-registered stress conditions (3 noise streams $\times$ 5 SNR levels: 24, 18, 12, 6, 0 dB) on 5,000 strict test beats
- [x] Discovered key scientific findings:
  - High-frequency Muscle Artifact (`ma`) degrades morphology most severely: at 0 dB SNR, V-Recall drops from 85.8% to **7.2%**, with a **55.3% prediction flip rate**
  - Under Electrode Motion (`em`) at 0 dB SNR, calibrated abstention rate rises to **60.8%**, actively filtering out high-risk predictions
  - Random Forest predictions remain constant under waveform noise because annotator R-peaks are fixed (revealing an important clinical artifact)
- [x] Saved machine-readable `reports/trustlab_metrics.json`, 20 paired clean/noisy traces (`reports/trustlab_paired_examples.json`), and `reports/trustlab_receipt.json`
- [x] Passing unit tests in `tests/test_noise_stress.py`

### Phase 4B — Cross-Dataset Transfer Audit on INCART [COMPLETE]
- [x] Audited PhysioNet St Petersburg INCART 12-lead database (75 records from 32 patients, native 257 Hz)
- [x] Implemented rational polyphase resampling (257 Hz → 360 Hz) and annotation sample re-indexing
- [x] Evaluated frozen MIT-BIH Hybrid CNN on Lead II:
  - Model correctly abstains on **86.2% of beats** due to high uncertainty
  - Confirms that electrode geometry (Modified Lead II chest patch vs standard limb Lead II) and patient population differences (CAD/ischemia vs inpatient arrhythmias) cause massive domain shift
- [x] Saved transparent evidence report in `reports/incart_transfer_report.json`

### Phase 5 — Production-Grade FastAPI Backend [COMPLETE]
- [x] Built FastAPI application (`api/main.py`) with complete OpenAPI documentation:
  - `/health/live` & `/health/ready` probes
  - `/api/records` & `/api/records/{id}/strip` (continuous 360 Hz ECG streaming)
  - `/api/models` (active checkpoints, SHA-256 hashes, latency)
  - `/api/benchmark` (strict vs classical evaluation data)
  - `/api/calibration` (temperature, ECE, selective risk-coverage curves)
  - `/api/trustlab/metrics`, `/api/trustlab/paired-examples`, `/api/trustlab/receipt`
  - `/api/trustlab/simulate-noise` (live noise injection & real-time inference)
  - `/api/failures/atlas` (filterable failure cards)
  - `/api/beats/{id}/explain` (Captum Integrated Gradients & perturbation impact)
  - `/api/predict` (multi-model prediction endpoint)
- [x] Unit and integration tests in `tests/test_api.py` (9 passing tests)

### Phase 6 & 6A — Premium Editorial Research Experience [COMPLETE]
- [x] Created Next.js + TypeScript + Tailwind CSS research laboratory:
  1. **TrustLab: Beyond the Prediction** (Centerpiece interactive demonstration):
     - Real held-out beat selector
     - Recorded PhysioNet NSTDB noise stream selector (`clean`, `bw`, `ma`, `em`)
     - Measured SNR selector (24, 18, 12, 6, 0 dB)
     - High-precision medical SVG ECG Waveform with voltage calibration pulse, R-peak alignment, and clean vs noisy dual overlay
     - Multi-model comparator (Hybrid vs Waveform CNN vs Random Forest)
     - Development-calibrated abstention indicator (`ACCEPTED`, `BORDERLINE`, `ABSTAINED`)
     - Real prediction flip detector
     - 15-scenario measured degradation table
  2. **Failure Atlas**:
     - Gallery of real misclassifications from the 21 unseen strict patients
     - Filtering by True Class, Predicted Class, and Record ID
     - Deep-dive diagnostic card with sample coordinates and multi-model breakdown
  3. **ECG Explorer**:
     - Continuous 360 Hz rhythm strip player with pan/zoom and time scrubbing
     - Real annotator beat markers and model prediction overlays
  4. **Model Arena**:
     - Side-by-side performance matrix for Strict Patient-Disjoint vs Classical DS2
     - Historical de Chazal et al. (2004) baseline comparison
     - Normalized confusion matrix heatmaps
  5. **Explainability Studio**:
     - Captum Integrated Gradients attribution along 252 samples
     - P-wave, QRS complex, and T-wave segment occlusion impact
  6. **Reliability Passport**:
     - 4 evaluated reliability pillars
     - Scientific limitations & prominent non-clinical disclaimer
  7. **Auditable Experiment Receipt**:
     - Modal drawer with full SHA-256 hashes, dataset hashes, commit SHA (`3291fc2`), seed (42), and BibTeX citation
- [x] Production Next.js build verified (`npm run build` succeeds with 0 errors, 4/4 static routes generated)

---

## Complete Test Suite Status
All **24 unit and integration tests** pass cleanly:
```
============================= test session starts ==============================
tests/test_api.py .........                                              [ 37%]
tests/test_calibration.py .....                                          [ 58%]
tests/test_data_and_splits.py ....                                       [ 75%]
tests/test_noise_stress.py ....                                          [ 91%]
tests/test_signals.py ..                                                 [100%]
======================== 24 passed, 4 warnings in 6.84s ========================
```

---

## Checkpoint & Manifest SHA-256 Hashes
- `hybrid_cnn.pt`: `f2cd8cbfc10213620e4fd5664448c9e5e70c570b0c2228dc6d76c2d1a645c2cf`
- `waveform_cnn.pt`: `c6df2f4ebaab99dcae9df09fce7127ce6cbe569eac0850ba917d0c365c609830`
- `random_forest.pkl`: `c86cbfbfe9cc62bbec9c205147d784d83674ce3859d9c13650833fa847570b64`
- `majority.pkl`: `0c6b336c711d9c4f0a66dd222dd58ced52e7b646772d9600f0d96b7e23519846`
- `test_strict.npz`: `a84c23b09ca3ea769f863cf2d2474b3fd0361915919e299ed7436e11acacf223`
- `test_classical.npz`: `7e14a7e8a27dcd4e8fca636f3a99e3759255c0352d0ee7866e2c32e526df524e`
- `train.npz`: `3f0e42509f2831e5a226d17180a7e1645d7fa6dae2ea084d691fd6726454a81b`
- `val.npz`: `d07d378e62b5087f8c981721e9732493ff5dbc96acd032c446c2317955eb16d7`
