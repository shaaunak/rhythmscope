# RhythmScope — Pre-Registered Experimentation Protocol

**Version**: 2.0.0  
**Status**: Pre-registered & Fully Implemented  
**Lead Authors**: RhythmScope ML Engineering & Cardiovascular Research Team

---

## 1. Primary Research Question

> **Can a deep multimodal ECG model reliably detect cardiac arrhythmias across unseen patients and extreme class imbalance, and can its uncertainty be calibrated to safely abstain under biological noise stress rather than outputting misleading high-confidence errors?**

---

## 2. Model Architectures & Feature Spaces

RhythmScope evaluates 4 distinct model families across identical patient splits:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                MODEL SUITE EVALUATED                                   │
├──────────────────────┬────────────────────────┬────────────────────────────────────────┤
│ Model                │ Input Modality         │ Description                            │
├──────────────────────┼────────────────────────┼────────────────────────────────────────┤
│ 1. Majority Baseline │ Prior Label Statistics │ Trivial majority predictor (Class N)   │
│ 2. Random Forest     │ 4 Timing RR Features   │ 150-tree ensemble on temporal rhythm   │
│ 3. Waveform 1D CNN   │ 252 ECG Signal Samples │ 3-block 1D CNN extracting morphology   │
│ 4. Hybrid Multimodal │ Waveform (252) + RR (4)│ 1D CNN + Dense projection fusion net   │
└──────────────────────┴────────────────────────┴────────────────────────────────────────┘
```

### Hybrid CNN Architecture Specification
1. **Morphological Branch**:
   - Conv1D Block 1: 32 filters, kernel size 7, stride 1, padding 3, BatchNorm, ReLU, MaxPool1d(2).
   - Conv1D Block 2: 64 filters, kernel size 5, stride 1, padding 2, BatchNorm, ReLU, MaxPool1d(2).
   - Conv1D Block 3: 128 filters, kernel size 3, stride 1, padding 1, BatchNorm, ReLU, AdaptiveAvgPool1d(1).
   - Dense Morphology Projection: Linear(128 $\to$ 64), ReLU.
2. **Rhythm Branch**:
   - Dense Block: Linear(4 $\to$ 32), ReLU, Linear(32 $\to$ 32), ReLU.
3. **Multimodal Fusion Classifier**:
   - Concatenation: $\mathbf{h} = [\mathbf{e}_{\text{morph}}; \mathbf{e}_{\text{rr}}] \in \mathbb{R}^{96}$.
   - Classification Head: Linear(96 $\to$ 64), ReLU, Dropout(0.3), Linear(64 $\to$ 4).

---

## 3. Training & Optimization Protocol

### Pre-Registered Hyperparameters
- **Random Seeds**: Multi-seed protocol across `[42, 1337, 2024]` with independent data loaders and weight initializations.
- **Batch Size**: 128 beats per batch.
- **Optimizer**: Adam ($\beta_1 = 0.9, \beta_2 = 0.999$, weight decay $= 10^{-4}$).
- **Learning Rate Schedule**: Initial LR $= 10^{-3}$, modulated via Cosine Annealing (`CosineAnnealingLR`) over 15 epochs.
- **Stopping Criterion**: Model checkpoint selected strictly by **maximum Macro F1 on held-out validation patients** (never accuracy).

### Imbalance Mitigation Strategy
- **Weighted Sampling**: `WeightedRandomSampler` with class weights $w_c = (1 / N_c)^{0.65}$, guaranteeing non-zero minority gradient representation in every mini-batch.
- **Loss Function**: Multi-Class Focal Loss with $\gamma = 1.8$ and alpha weighting $\alpha_c = (1 / N_c)^{0.35}$ (normalized to $\sum \alpha_c = 4.0$).

---

## 4. Evaluation Benchmarks

### 1. Headline Benchmark: Strict Patient-Disjoint
- **Dataset**: MIT-BIH DS2 Strict (`test_strict.npz`).
- **Records**: 21 patients (`100, 103, 105, 111, 113, 117, 121, 123, 200, 210, 212, 213, 214, 219, 221, 222, 228, 231, 232, 233, 234`).
- **Total Support**: 47,550 beats (42,180 N, 1,782 S, 3,201 V, 387 F).
- **Subject Leakage Guarantee**: 100% disjoint; Record 202 is excluded.

### 2. Historical Benchmark: Classical de Chazal DS2
- **Dataset**: MIT-BIH DS2 Classical (`test_classical.npz`).
- **Records**: 22 patients (includes Record 202).
- **Total Support**: 49,685 beats.
- **Purpose**: Direct comparison against de Chazal et al. (IEEE TBME 2004) Table 4.

### 3. Noise Stress Benchmark: TrustLab
- **Source**: PhysioNet Noise Stress Test Database (NSTDB).
- **Noise Types**: Baseline wander (`bw`), muscle artifact (`ma`), electrode motion (`em`).
- **SNR Grid**: Clean, 24 dB, 18 dB, 12 dB, 6 dB, 0 dB.
- **Metrics**: Macro F1 degradation slope, prediction flip rate, abstention rate at $\tau = 0.9073$.

### 4. External Out-of-Distribution Transfer: PhysioNet INCART
- **Source**: St Petersburg INCART 12-lead Arrhythmia Database.
- **Conversion**: Polyphase resampling ($257\text{ Hz} \to 360\text{ Hz}$), Lead II extraction.
- **Evaluation**: Zero-shot transfer of frozen model; audit domain shift and abstention rates.
