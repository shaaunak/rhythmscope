# RhythmScope — Engineering & Research Guide

**Mission:** Build a rigorous, reproducible ECG heartbeat classification research platform with an interactive research studio. **Educational research only; not a diagnostic device.**

## Architecture & Workflow

1. Core codebase and models reside in the root repository.
2. `AGENTS.md` defines persistent project guidelines and scientific integrity constraints.
3. Preprocessing, model architectures, and calibration protocols are systematically documented and tested.
4. Run testing and verification suites before deploying or publishing benchmarks.
5. All benchmarks adhere to strict patient-disjoint partitions with zero train/test leakage.

## Reference Links

- PhysioNet MIT-BIH Arrhythmia Database: https://physionet.org/content/mitdb/1.0.0/
- PhysioNet MIT-BIH Noise Stress Test Database (NSTDB): https://physionet.org/content/nstdb/1.0.0/
- WFDB Python Library: https://wfdb.readthedocs.io/
- PyTorch Documentation: https://pytorch.org/docs/

## Guardrails & Non-Negotiable Standards

- No fabricated evaluation metrics, data counts, model predictions, training logs, or artificial scores.
- No random beat-level train/test split. Records 201 and 202 are documented by PhysioNet as sharing subject identity and must remain patient-separated.
- No test-set selection of hyperparameters; no fitted preprocessing from validation/test patients.
- No assumption that every dataset record's first lead is MLII (verify lead configuration metadata).
- No clinical diagnosis, health advice, or falsely calibrated confidence.
- Strict patient-level train/validation separation, train-only scalers/feature statistics, and frozen test sets.

## Verification & Reproducibility Gates

For each completed phase, record executed commands and their outputs in `docs/PROGRESS.md`; save structured evidence under `reports/`, and commit the completed milestone. A blocked step is marked BLOCKED with the reason, rather than reported as successful.

## Research Signature: TrustLab

The defining differentiator of RhythmScope is **TrustLab**: an out-of-distribution generalization and real-noise reliability suite with development-calibrated abstention, an interactive Failure Atlas, and cryptographic experiment provenance.
