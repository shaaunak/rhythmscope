# RhythmScope Progress Log & Audit Tracker

## Project Overview
- **Project**: RhythmScope: Patient-Independent ECG Heartbeat Classification & Model Evaluation Studio
- **Dataset**: PhysioNet MIT-BIH Arrhythmia Database (48 half-hour 2-lead ECG records at 360 Hz)
- **Primary Scientific Question**: Evaluating genuine out-of-sample patient generalization for ECG arrhythmia classification under strict patient-disjoint partitions vs. classical DS1/DS2 benchmarks.
- **Key Discovery**: PhysioNet documentation reveals Records 201 (DS1) and 202 (DS2) originate from the identical patient. Consequently, classical DS1/DS2 is not strictly patient-independent. RhythmScope implements both:
  1. **Classical Benchmark** (DS1 vs DS2 with 202 included, for historical literature comparison).
  2. **Strict Patient-Disjoint Benchmark** (DS1 vs DS2 with 202 excluded, as our headline generalization metric).

---

## Milestone Acceptance Gates (0/6 Complete)

### Phase 1 — Foundation and Data Audit
- [ ] Initialize Python / PyTorch repository structure with configs, pyproject.toml, and Makefile
- [ ] Implement data download utilities for MIT-BIH using `wfdb`
- [ ] Execute comprehensive data audit:
  - Lead identification (handling reversed lead orders like Record 114 MLII vs V5)
  - Patient identities and demographic overlap (Records 201 & 202)
  - AAMI 1998 class mappings (N, S, V, F, Q) and paced record exclusions (102, 104, 107, 217)
  - Exact beat count distribution for DS1, DS2, and Q rarity
- [ ] Construct leak-proof splits (DS1 train, DS1 patient-stratified validation, DS2 test, DS2-strict test)
- [ ] Implement unit tests for data integrity and leak verification

### Phase 2 — Signal-Processing Pipeline
- [ ] SOS (second-order sections) Butterworth bandpass filtering (0.5 – 40 Hz) for baseline wander and high-frequency noise removal
- [ ] 252-sample heartbeat window segmentation centered around reference R-peaks (~0.7s at 360 Hz)
- [ ] RR interval feature extraction (pre-RR, post-RR, local average RR, ratio), distinguishing retrospective vs online features
- [ ] Train-only normalization (Z-score / robust scaling fitted exclusively on training patient folds)
- [ ] Save processed manifest datasets and validation visual checks

### Phase 3 — Baselines and Deep Learning
- [ ] Train Majority-class baseline (sanity check)
- [ ] Train RR-interval Random Forest baseline (classical feature-based ML)
- [ ] Train Waveform-only 1D CNN (evaluates raw morphology representations)
- [ ] Train 1D CNN + RR Hybrid Model (primary architecture)
- [ ] Loss experiments: Class-weighted cross-entropy and Focal Loss for extreme S and F imbalance

### Phase 4 — Evaluation and Explainability
- [ ] Model freezing & evaluation on Classical and Strict Patient-Disjoint test sets
- [ ] Comprehensive metrics: Macro F1, Per-class Precision, Recall, F1, Support
- [ ] Patient-level bootstrap confidence intervals (95% CI)
- [ ] Real failure case extraction & error characterization
- [ ] Waveform explainability via Integrated Gradients (Captum) and perturbation analysis

### Phase 5 — API and Premium Frontend
- [ ] FastAPI backend serving model inferences, record segments, and explainability heatmaps
- [ ] Next.js + Tailwind CSS frontend:
  - ECG Explorer with interactive beat playback, lead switching, and annotation overlays
  - Model Arena: Side-by-side performance comparator
  - Explainability Studio: Integrated Gradients attribution along the 252-sample window
  - Failure Investigator: Patient breakdown, misclassified beat gallery, confusion diagnostics
  - Research Report & Model Registry
- [ ] Editorial research aesthetic (warm off-white `#FBFBF9`, navy typography, teal waveforms `#0D9488`, coral `#F43F5E` misclassifications)

### Phase 6 — Release and Portfolio
- [ ] End-to-end integration tests & Pytest suite
- [ ] Model Card, Dataset Card, Limitations, and Architecture documentation
- [ ] Reproducibility scripts & instructions

---

## Log of Completed Actions
*(Updated live as milestones execute)*
