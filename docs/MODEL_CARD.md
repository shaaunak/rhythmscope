# RhythmScope Model Card — Research Edition

## Model Overview
- **Model Name**: RhythmScope Hybrid ECGNet (1D CNN + RR Interval Dynamics)
- **Model Type**: Supervised 4-Class Heartbeat Morphology & Timing Classifier
- **Architecture**: 3-stage 1D Convolutional feature extractor (kernels 7, 5, 3 with BatchNorm, ReLU, MaxPool, AdaptiveAvgPool) + 2-layer RR Interval MLP, fused into a 64-dimensional joint representation with dropout (0.3).
- **Primary Task**: Offline classification of expert-annotated ECG beats into AAMI 1998 superclasses:
  - **N**: Normal / Bundle Branch Block beats
  - **S**: Supraventricular Ectopic beats
  - **V**: Ventricular Ectopic beats
  - **F**: Fusion of Ventricular and Normal beats
  *(Class Q excluded due to empirical rarity: <0.02% support without artificial paced records)*.
- **Input Dimensions**: 252 raw ECG samples (-90 / +162 samples centered around R-peak at 360 Hz, ~0.7 seconds) + 4 normalized RR interval features (`pre_rr`, `post_rr`, `local_rr_avg`, `rr_ratio`).
- **Checkpoint SHA256**: `f2cd8cbfc10213620e4fd5664448c9e5e70c570b0c2228dc6d76c2d1a645c2cf`

---

## Intended Use & Non-Clinical Disclaimer
> [!IMPORTANT]
> **Educational & Scientific Research Only**.
> RhythmScope is an experimental ML engineering study exploring classifier reliability, out-of-sample patient generalization, realistic signal noise degradation, and development-calibrated abstention. It is **NOT** a certified medical device, autonomous arrhythmia detector, or clinical diagnostic tool. It must never be used for patient monitoring, clinical decision support, or triage.

---

## Dataset & Leak-Proof Partitioning
- **Training & Development**: PhysioNet MIT-BIH Arrhythmia Database v1.0.0 (DS1: 22 recordings).
  - Train cohort: 18 records (41,500 beats).
  - Patient-disjoint validation cohort: 4 records (`115`, `119`, `208`, `223` — 9,494 beats).
- **Test Benchmarks**:
  1. **Strict Patient-Disjoint Benchmark** (Primary Headline): DS2 excluding Record 202 (21 unseen patients, 47,550 beats).
  2. **Classical DS1/DS2 Benchmark** (Literature Comparison): DS2 including Record 202 (22 records, 49,685 beats).
  - *Key Scientific Finding*: PhysioNet documentation confirms Records 201 (DS1) and 202 (DS2) come from the same subject. The classical de Chazal benchmark therefore contains patient overlap. RhythmScope reports strict disjoint metrics as its primary headline.

---

## Measured Performance (Strict Patient-Disjoint Test Set)

| Model Architecture | Accuracy | Macro F1 (95% CI) | S-Sensitivity (Recall) | V-Sensitivity (Recall) | Single-Beat Latency | Checkpoint Size |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Majority Baseline** | 88.71% | 0.2350 [0.2225, 0.2422] | 0.00% | 0.00% | 0.001 ms | 0.1 KB |
| **Random Forest (RR-only)** | 87.28% | 0.4198 [0.3763, 0.4529] | 25.48% | 55.89% | 14.26 ms | 13.7 MB |
| **Waveform 1D CNN** | 73.69% | 0.3011 [0.2366, 0.3771] | 0.00% | **95.94%** | 0.62 ms | 181.3 KB |
| **Hybrid 1D CNN + RR (Ours)** | **92.70%** | **0.5696 [0.4593, 0.6181]** | **53.70%** | 87.07% | **0.68 ms** | **212.2 KB** |

*Historical Reference*: de Chazal et al. (2004) reported S-Sensitivity 75.9%, V-Sensitivity 77.7% on classical DS2 (with patient 201/202 overlap).

---

## Uncertainty & Abstention (TrustLab)
- **Calibration Protocol**: Temperature Scaling ($T = 0.6399$) fitted on DS1 validation set, reducing Expected Calibration Error (ECE) from 11.76% to **2.11%**.
- **Selective Classification Threshold**: $\tau^* = 0.9073$ calibrated for $\le 5\%$ error rate among accepted beats on development patients.
- **Real-Noise Reliability (PhysioNet NSTDB)**:
  - Evaluated under 3 real recorded noise streams: Baseline Wander (`bw`), Muscle Artifact (`ma`), Electrode Motion (`em`) across 24, 18, 12, 6, and 0 dB SNR.
  - High-frequency muscle tremor (`ma`) causes catastrophic failure in morphology extraction, dropping V-Recall from 85.8% to 7.2% at 0 dB with a 55.3% prediction flip rate.
  - Development-calibrated abstention increases from 52.8% to 60.8% under severe Electrode Motion (`em`), actively filtering out high-risk predictions.

---

## Limitations
1. **Annotator-Provided R-peaks**: Beats are centered around reference R-peaks provided by PhysioNet annotators. In a real-time autonomous system, R-peak detector jitter and false peaks will introduce additional error.
2. **Retrospective Timing Features**: `post_rr` requires observing the subsequent heartbeat (~0.8s latency), rendering the full hybrid model retrospective rather than purely causal.
3. **Severe Class Imbalance**: Ectopic supraventricular (S) and fusion (F) classes exhibit high inter-patient morphological variance and low clinical prevalence in ambulatory recordings.
4. **Out-of-Distribution Sensitivity**: Cross-dataset evaluation on St Petersburg INCART demonstrated an 86.2% abstention rate, highlighting sensitivity to electrode montage (Lead II vs MLII) and clinical cohort differences.
