# RhythmScope — Comprehensive Repository Audit & Engineering Remediation Report

**Date**: November 16, 2026  
**Auditor**: RhythmScope ML & Signal Processing Engineering Team  
**Scope**: Entire codebase (`src/`, `api/`, `tests/`, `reports/`, `configs/`, `data/`, `docs/`, `app/`)  
**Target Repository**: [https://github.com/shaaunak/rhythmscope](https://github.com/shaaunak/rhythmscope)  
**Standard**: PhysioNet MIT-BIH Arrhythmia & AAMI EC57 / 1998 Standards

---

## Executive Summary

A full forensic audit of the initial RhythmScope codebase revealed 10 concrete issues spanning severe class representation imbalance, split partitioning discrepancies, calibration mechanics, security vulnerabilities (`torch.load`), and documentation drift. 

Every audit finding, its empirical evidence, severity, implemented remediation, and verified outcome are detailed below.

---

## Detailed Audit Findings & Remediation Matrix

### 1. Fusion Class (F) Complete Failure (Severity: P0 — Critical)
- **Finding**: The baseline model reported on strict patient-disjoint test set:
  - Fusion (F) Precision: `0.0000` (0.0%)
  - Fusion (F) Recall: `0.0000` (0.0%)
  - Fusion (F) F1-Score: `0.0000` (0.0%)
  - True F support: 387 beats. Zero beats were classified as Fusion.
- **Root Cause**:
  1. **Partition Asymmetry**: In the original `splits.py`, `DS1_VAL_RECORDS` was configured as `["115", "119", "208", "223"]`. An empirical audit of DS1 beats showed that Record 208 contains **372 out of 414** total Fusion beats in DS1 (89.8%). Placing Record 208 in validation starved the training set down to only **28 F beats** out of 41,506 beats (0.067%).
  2. **Unbalanced Batch Sampling**: Standard shuffling in `DataLoader` with batch size 128 meant an average of 0.086 F beats per batch—almost every gradient step contained zero F examples.
  3. **Loss Function Attenuation**: Class-balanced effective weight formula with $\beta=0.999$ under-weighted the extreme rarity of Fusion relative to Normal beats.
- **Remediation**:
  1. Re-partitioned DS1 development records so Record 208 remains in `DS1_TRAIN_RECORDS` (yielding 389 F beats in training). Configured `DS1_VAL_RECORDS = ["115", "118", "205", "223"]` (yielding 25 F beats in validation, plus balanced N, S, and V representations).
  2. Implemented `WeightedRandomSampler` with smoothed power weighting $w_c \propto 1 / N_c^{0.65}$ ensuring every batch contains representation of all 4 classes (~9 F beats per batch).
  3. Optimized Multi-Class Focal Loss with $\gamma = 1.8$ and power-calibrated class weighting $\alpha_c \propto 1 / N_c^{0.35}$.
  4. Added Cosine Annealing learning rate schedule (`CosineAnnealingLR`).
- **Verification**:
  - Training on the leak-proof partition yields genuine, reproducible F-class recall and precision substantially above 0% across multiple random seeds, while maintaining high N and V performance (V Recall > 90%).

---

### 2. Dataset Split & True Patient Overlap Audit (Severity: P1 — High)
- **Finding**: PhysioNet documentation confirms that MIT-BIH recordings **201 and 202** originate from the same patient (68-year-old male). In the classical de Chazal (2004) split, Record 201 is in DS1 and Record 202 is in DS2. Evaluating DS2 without accounting for this violates true patient independence.
- **Remediation**:
  1. Strictly distinguished between:
     - **Classical Benchmark (DS1 / DS2)**: 22 records in DS1, 22 records in DS2 (retaining Record 202 solely for historical literature comparison against de Chazal 2004).
     - **Strict Patient-Disjoint Benchmark (DS1 / DS2 Strict)**: 21 records in DS2 Strict, completely excluding Record 202.
  2. Generated `reports/split_manifest.json` mapping all 48 records to patient ID, split, age, sex, lead configuration, beat count, and exclusion rationale.
  3. Generated `reports/patient_overlap_audit.json` programmatically verifying that the pairwise patient intersection between `train`, `val`, and `test_strict` is exactly empty:
     $$\text{Train} \cap \text{Val} = \emptyset, \quad \text{Train} \cap \text{TestStrict} = \emptyset, \quad \text{Val} \cap \text{TestStrict} = \emptyset$$
  4. Wrote `docs/DATASET_METHODOLOGY.md` detailing the entire cohort, exclusions, and sampling conventions.
- **Verification**: Automated test `test_patient_leakage_guarantee` and `test_patient_overlap_audit_json` pass in CI.

---

### 3. Temperature Calibration Mechanics & Value Audit (Severity: P1 — High)
- **Finding**: Baseline report showed temperature parameter $T = 0.6399 < 1.0$. Why did $T$ drop below 1?
- **Root Cause**:
  - Neural networks trained with standard Cross-Entropy typically become overconfident, resulting in $T > 1.0$.
  - However, when models are trained with Multi-Class Focal Loss ($\gamma = 2.0$) and high weight decay, well-classified examples are down-weighted, preventing logits from growing large. On unseen validation beats, the unscaled probabilities are slightly underconfident (higher entropy). Minimizing Negative Log Likelihood (NLL) pushes $T < 1.0$ to sharpen the output distribution toward true one-hot targets.
- **Remediation**:
  1. Performed temperature optimization strictly on held-out development validation data (`val.npz`). Never exposed test sets during calibration.
  2. Added both **10 equal-width bins** and **10 equal-mass (quantile) bins** to compute Expected Calibration Error (ECE).
  3. Evaluated multi-class Brier score and Negative Log Likelihood (NLL) before and after temperature scaling.
  4. Documented the full statistical rationale in `docs/CALIBRATION_AND_ABSTENTION.md` and saved `reports/calibration_protocol.json`.
- **Verification**: `test_calibration.py` passes all unit tests; temperature optimization reduces validation NLL monotonically.

---

### 4. Selective Classification & Abstention Policy (Severity: P1 — High)
- **Finding**: Abstention threshold $\tau = 0.9073$ was selected on development data, but its behavior under patient shift and class-specific abstention breakdown needed explicit verification.
- **Remediation**:
  1. Evaluated coverage $\Phi(\tau)$ and empirical selective risk $\mathcal{R}(\tau)$ on the untouched test set using development-frozen thresholds.
  2. Evaluated class-wise abstention rates, demonstrating that ambiguous beats (such as borderline PVCs and fusion waveforms) have significantly higher abstention rates than clean sinus beats.
  3. Clarified in documentation that conformal prediction guarantees require exchangeability, which does not hold identically across independent patient recording sessions; therefore, abstention is framed as an empirical safety mechanism rather than a theoretical clinical guarantee.
- **Verification**: Generated `reports/calibration_protocol.json` with paired coverage-risk tables and class-wise abstention figures.

---

### 5. Multi-Seed Training & Clustered Bootstrap Confidence Intervals (Severity: P1 — High)
- **Finding**: Single-seed results lacked statistical variance estimation and did not account for patient-level clustering.
- **Remediation**:
  1. Upgraded `train.py` to support multi-seed execution across 3 independent deterministic seeds (`42, 1337, 2024`).
  2. Computed mean $\pm$ standard deviation across seeds for all 4 models (Majority, Random Forest, Waveform CNN, Hybrid CNN).
  3. Upgraded `src/rhythmscope/evaluation/bootstrap.py` to perform **patient-clustered bootstrapping** (sampling entire patient recordings with replacement, 1,000 iterations) for Accuracy, Macro F1, S-Sensitivity, S-PPV, V-Sensitivity, V-PPV, F-Sensitivity, and F-PPV.
- **Verification**: Saved `reports/multi_seed_results.json` and updated `reports/benchmark_results.json`.

---

### 6. Security Vulnerability: Insecure `torch.load` Calls (Severity: P2 — Medium / Security)
- **Finding**: `torch.load` calls in `metrics.py` and `train.py` lacked `weights_only=True`, posing arbitrary code execution risks via malicious pickle deserialization.
- **Remediation**: Audited all `torch.load` calls across the repository and explicitly added `weights_only=True`.
- **Verification**: `git grep -n "torch.load"` confirms 100% compliance across all source files.

---

### 7. Lead Order Anomaly & Record 114 Polarity (Severity: P2 — Medium)
- **Finding**: In MIT-BIH, Record 114 features inverted lead order: lead 0 is `V5` and lead 1 is `MLII`. Naive indexing of channel 0 would load V5 instead of MLII.
- **Remediation**: `src/rhythmscope/signals/beats.py` explicitly searches for `"MLII"` in `sig_names` before falling back to `"II"` or channel 0.
- **Verification**: Unit test `test_record_114_lead_configuration` confirms lead `MLII` (channel 1) is selected for Record 114.

---

### 8. Noise Stress Benchmarking Nomenclature & Realism (Severity: P2 — Medium)
- **Finding**: Noise stress testing must not use artificial Gaussian or acoustic noise, but real biological noise from PhysioNet NSTDB (`bw`: baseline wander, `ma`: muscle artifact, `em`: electrode motion).
- **Remediation**: Verified `src/rhythmscope/evaluation/noise_stress.py` uses genuine NSTDB `.npy` recordings, correctly computes AC signal power, injects noise at calibrated SNRs (24, 18, 12, 6, 0 dB), and records flip rates. Removed all confusing nomenclature.
- **Verification**: `test_noise_stress.py` passes all unit tests; `reports/trustlab_metrics.json` verified.

---

### 9. INCART External Cohort Domain Shift Audit (Severity: P2 — Medium)
- **Finding**: Hybrid model had an 86.2% abstention rate on the St Petersburg INCART database.
- **Remediation**: Documented the root causes:
  1. **Electrode Geometry**: MIT-BIH uses Modified Lead II (MLII, bipolar chest electrodes); INCART uses standard limb Lead II from 12-lead montage.
  2. **Sampling Rate**: Polyphase resampling from 257 Hz to 360 Hz introduces minor interpolation artifacts in high-frequency QRS notches.
  3. **Patient Population**: INCART consists of hospitalized coronary artery disease patients with active myocardial ischemia and ST-T segment depression.
  4. Framed INCART as an exploratory out-of-distribution stress audit rather than claiming clinical transferability.
- **Verification**: Documented in `docs/DATASET_METHODOLOGY.md` and `reports/incart_transfer_report.json`.

---

### 10. Automated CI & Reproducibility Infrastructure (Severity: P2 — Medium)
- **Finding**: Missing GitHub Actions workflow, lockfile pinning, and complete reproducibility documentation.
- **Remediation**:
  1. Created `.github/workflows/ci.yml` running pytest across all test suites, typechecks, and frontend builds.
  2. Created comprehensive documentation: `MODEL_CARD.md`, `CITATION.cff`, `docs/EXPERIMENT_PROTOCOL.md`, `docs/LIMITATIONS.md`, `docs/REPRODUCIBILITY.md`.
  3. Verified `Makefile` and `pyproject.toml` configurations.
- **Verification**: All 24+ tests passing, Next.js build succeeds, CI workflow configured.
