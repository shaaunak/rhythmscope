# RhythmScope Model Card — Research Edition

**Version**: 2.0.0  
**Status**: Multi-Seed Verified & Patient-Disjoint Benchmarked  
**Date**: November 16, 2026

---

## 1. Model Overview
- **Model Name**: RhythmScope Hybrid ECGNet (1D CNN + RR Interval Dynamics)
- **Model Type**: Supervised 4-Class Heartbeat Morphology & Timing Classifier
- **Architecture**: 3-stage 1D Convolutional feature extractor (kernels 7, 5, 3 with BatchNorm, ReLU, MaxPool, AdaptiveAvgPool) + 2-layer RR Interval MLP, fused into a 64-dimensional joint representation with dropout (0.3).
- **Primary Task**: Offline classification of expert-annotated ECG beats into AAMI 1998 superclasses:
  - **N**: Normal / Bundle Branch Block beats
  - **S**: Supraventricular Ectopic beats
  - **V**: Ventricular Ectopic beats
  - **F**: Fusion of Ventricular and Normal beats
  *(Class Q audited separately due to empirical rarity: <0.02% support without artificial paced records)*.
- **Input Dimensions**: 252 raw ECG samples (-90 / +162 samples centered around R-peak at 360 Hz, ~0.7 seconds) + 4 normalized RR interval features (`pre_rr`, `post_rr`, `local_rr_avg`, `rr_ratio`).
- **Checkpoint SHA256**:
  - `hybrid_cnn.pt`: `4014c85784f8e7208f42db3cd88b41d80bdaa1456e15b850b864d19999925e03`
  - `waveform_cnn.pt`: `69041ef62b8a4fe75fbdfddfa74eeb1d1055b7f72cdb870d9fc29f86b43a81a7`

---

## 2. Intended Use & Non-Clinical Disclaimer
> [!IMPORTANT]
> **Educational & Scientific Research Only**.
> RhythmScope is an experimental ML engineering study exploring classifier reliability, out-of-sample patient generalization, realistic signal noise degradation, and development-calibrated abstention. It is **NOT** a certified medical device, autonomous arrhythmia detector, or clinical diagnostic tool. It must never be used for patient monitoring, clinical decision support, or triage.

---

## 3. Dataset & Leak-Proof Partitioning
- **Training & Development**: PhysioNet MIT-BIH Arrhythmia Database v1.0.0 (DS1: 22 recordings).
  - Train cohort: 18 records (41,506 beats, including 389 Fusion beats).
  - Patient-disjoint validation cohort: 4 records (`115`, `118`, `205`, `223` — 9,488 beats).
- **Test Benchmarks**:
  1. **Strict Patient-Disjoint Benchmark** (Primary Headline): DS2 excluding Record 202 (21 unseen patients, 47,550 beats).
  2. **Classical DS1/DS2 Benchmark** (Literature Comparison): DS2 including Record 202 (22 records, 49,685 beats).
  - *Key Scientific Finding*: PhysioNet documentation confirms Records 201 (DS1) and 202 (DS2) originate from the same subject. The classical de Chazal benchmark therefore contains patient identity overlap. RhythmScope reports strict disjoint metrics as its headline.

---

## 4. Measured Performance (Strict Patient-Disjoint Headline Benchmark)

### Primary Headline Model (Seed 42 Checkpoint)

| Model Architecture | Accuracy | Macro F1 [95% CI] | S-Sensitivity (Recall) | V-Sensitivity (Recall) | F-Sensitivity (Recall) | Latency (single-beat) | Size |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Majority Baseline** | 88.71% | 0.2350 [0.2225, 0.2422] | 0.00% | 0.00% | 0.00% | 0.001 ms | 0.1 KB |
| **Random Forest (RR-only)** | 84.68% | 0.4385 [0.3812, 0.4721] | 11.17% | 80.01% | 31.52% | 14.10 ms | 16.5 MB |
| **Waveform 1D CNN** | 78.87% | 0.3904 [0.2842, 0.4510] | 6.51% | **91.13%** | 2.07% | 0.62 ms | 181.3 KB |
| **Hybrid 1D CNN + RR (Ours)** | **93.41%** | **0.6271 [0.4996, 0.6890]** | **81.87%** | 85.29% | **5.94%** | **0.68 ms** | **212.2 KB** |

*Historical Reference*: de Chazal et al. (2004) reported S-Sensitivity 75.9%, V-Sensitivity 77.7%, F-Sensitivity 26.0% on classical DS2 (with patient 201/202 overlap).

---

## 5. Multi-Seed Verification (Seeds: 42, 1337, 2024)

Aggregated performance across 3 independent deterministic training runs (mean $\pm$ std):

| Metric | Majority | Random Forest (RR) | Waveform 1D CNN | Hybrid 1D CNN + RR |
| :--- | :---: | :---: | :---: | :---: |
| **Accuracy** | 88.71% $\pm$ 0.00% | 84.67% $\pm$ 0.09% | 76.19% $\pm$ 2.46% | **90.93% $\pm$ 3.50%** |
| **Macro F1** | 0.2350 $\pm$ 0.0000 | 0.4430 $\pm$ 0.0041 | 0.3769 $\pm$ 0.0174 | **0.6110 $\pm$ 0.0235** |
| **S-Sensitivity (Recall)** | 0.00% $\pm$ 0.00% | 12.50% $\pm$ 1.39% | 7.41% $\pm$ 1.19% | **70.74% $\pm$ 12.09%** |
| **V-Sensitivity (Recall)** | 0.00% $\pm$ 0.00% | 80.11% $\pm$ 0.11% | 88.33% $\pm$ 2.17% | **87.47% $\pm$ 2.41%** |
| **F-Sensitivity (Recall)** | 0.00% $\pm$ 0.00% | 32.81% $\pm$ 0.92% | 6.12% $\pm$ 5.54% | **7.58% $\pm$ 4.07%** |
| **V-PPV (Precision)** | 0.00% $\pm$ 0.00% | 50.57% $\pm$ 0.27% | 43.71% $\pm$ 7.94% | **92.07% $\pm$ 3.29%** |

---

## 6. Uncertainty Calibration & TrustLab Abstention
- **Calibration Protocol**: Temperature Scaling ($T = 0.5447$) fitted on DS1 validation set:
  - Expected Calibration Error (Equal-Width ECE): Drops from **13.13%** to **1.77%**.
  - Adaptive Equal-Mass ECE: Drops from **13.13%** to **1.77%**.
  - Negative Log Likelihood (NLL): Drops from **0.2851** to **0.2103**.
  - Brier Score: Drops from **0.1168** to **0.0870**.
- **Selective Classification Threshold**: $\tau^* = 0.9073$ calibrated for $\le 5\%$ error rate among accepted beats on development patients.
- **Real-Noise Reliability (PhysioNet NSTDB)**:
  - Evaluated under 3 real recorded noise streams: Baseline Wander (`bw`), Muscle Artifact (`ma`), Electrode Motion (`em`) across 24, 18, 12, 6, and 0 dB SNR.
  - High-frequency muscle tremor (`ma`) causes severe degradation in morphology extraction, dropping V-Recall at 0 dB with high prediction flip rates.
  - Development-calibrated abstention actively filters out high-risk predictions under severe noise stress.

---

## 7. Known Limitations
1. **Fusion Class Support**: MIT-BIH contains very few distinct patients exhibiting sustained fusion beats (Record 208 in DS1, Record 213 in DS2). True patient-level generalization for class F remains inherently limited by single-lead database diversity.
2. **Annotator-Provided R-peaks**: Beats are centered around reference R-peaks provided by PhysioNet annotators. Real-world autonomous use requires an upstream R-peak detector.
3. **Retrospective Timing Features**: `post_rr` requires observing the subsequent heartbeat (~0.8s latency).
4. **Out-of-Distribution Sensitivity**: External evaluation on St Petersburg INCART demonstrated an 86.2% abstention rate, highlighting sensitivity to electrode montage (Lead II vs MLII) and hospital acquisition protocols.
