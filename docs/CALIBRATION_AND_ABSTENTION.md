# RhythmScope — Uncertainty Calibration & Selective Abstention Protocol

**Specification**: Temperature Scaling (Guo et al., 2017) & Selective Classification (Geifman & El-Yaniv, 2017)  
**Document Revision**: 2.0.0  
**Status**: Verified & Implemented

---

## 1. Why Softmax Confidence Is Not a Reliability Guarantee

In safety-critical biomedical applications such as ambulatory ECG analysis, raw neural network outputs should never be treated as true posterior probabilities. Deep neural networks optimized via gradient descent frequently exhibit miscalibration:
1. **Under Standard Cross-Entropy**: Networks become over-confident because cross-entropy pushes pre-activation logits toward infinity to minimize loss on training samples.
2. **Under Multi-Class Focal Loss**: Because the modulating factor $(1 - p_t)^\gamma$ aggressively down-weights well-classified examples ($\gamma = 1.8$), logit magnitudes remain bounded. When evaluated on unseen patient validation data, raw softmax predictions may exhibit higher entropy (apparent under-confidence).

RhythmScope implements a two-stage post-processing pipeline:
- **Stage 1**: Probability calibration via post-hoc Temperature Scaling on held-out development patients.
- **Stage 2**: Selective classification with development-calibrated confidence thresholds that abstain on ambiguous waveforms.

---

## 2. Temperature Scaling Calibration

### Mathematical Formulation
Given pre-activation logit vector $\mathbf{z} \in \mathbb{R}^K$ for $K = 4$ classes, temperature scaling applies a single scalar parameter $T > 0$:

$$\hat{p}_i = \frac{\exp(z_i / T)}{\sum_{j=1}^K \exp(z_j / T)}$$

Because $T$ is scalar and shared across all classes:
- The argmax prediction is invariant: $\arg\max_i \hat{p}_i = \arg\max_i z_i$.
- Accuracy on unrejected samples is unaffected.
- The probability distribution is softened if $T > 1.0$ (reducing over-confidence) or sharpened if $T < 1.0$ (reducing under-confidence).

### Development-Only Calibration Split
To eliminate test-set contamination, temperature $T$ is optimized strictly on held-out **DS1 validation records** (`val.npz`, 9,488 beats from patients 115, 118, 205, 223):

$$\min_{T > 0} \; -\frac{1}{N_{\text{val}}} \sum_{n=1}^{N_{\text{val}}} \log \left( \frac{\exp(z_{n, y_n} / T)}{\sum_{j=1}^K \exp(z_{n, j} / T)} \right)$$

### Audit of Temperature Value ($T < 1.0$)
In the baseline report, the optimized temperature was $T = 0.6399$. Forensic auditing confirmed:
- Training with Focal Loss ($\gamma = 1.8 - 2.0$) and $L_2$ weight decay ($10^{-4}$) restrains the magnitude of the final classification layer weights.
- On unseen validation patients, unscaled model probabilities had a mean maximum confidence of $\approx 78\%$, while the empirical accuracy of those predictions was $\approx 88\%$.
- Consequently, NLL minimization correctly lowered $T$ below $1.0$ to calibrate predicted confidence to match empirical accuracy.

### Calibration Error Metrics
RhythmScope computes two formulations of Expected Calibration Error (ECE):

1. **Equal-Width ECE ($M = 10$ bins)**:
   Divides the probability interval $[0, 1]$ into $M$ equal-width bins $B_1, \dots, B_M$:
   $$\text{ECE}_{\text{width}} = \sum_{m=1}^M \frac{|B_m|}{N} \left| \text{acc}(B_m) - \text{conf}(B_m) \right|$$

2. **Equal-Mass (Adaptive Quantile) ECE ($M = 10$ bins)**:
   Divides predictions into $M$ bins each containing exactly $N / M$ samples, preventing empty bins or skewed weighting in high-confidence regions.

3. **Multi-Class Brier Score**:
   $$\text{Brier} = \frac{1}{N} \sum_{n=1}^N \sum_{k=1}^K \left( \hat{p}_{n, k} - \mathbf{1}[y_n = k] \right)^2$$

---

## 3. Selective Classification & Abstention Policy

### Framework Definition
Following Geifman & El-Yaniv (NeurIPS 2017), a selective classifier $(f, g)$ consists of:
- A prediction function $f(\mathbf{x}) = \arg\max_k \hat{p}_k(\mathbf{x})$.
- A binary selection function $g(\mathbf{x}) = \mathbf{1}\left[\max_k \hat{p}_k(\mathbf{x}) \ge \tau\right]$.

The classifier accepts the prediction when $g(\mathbf{x}) = 1$ and **abstains** (flags for clinician review) when $g(\mathbf{x}) = 0$.

### Core Metrics
- **Empirical Coverage**:
  $$\Phi(\tau) = \frac{1}{N} \sum_{n=1}^N g(\mathbf{x}_n) = \frac{1}{N} \sum_{n=1}^N \mathbf{1}\left[\max_k \hat{p}_{n, k} \ge \tau\right]$$
- **Selective Risk (Error rate among accepted heartbeats)**:
  $$\mathcal{R}(\tau) = \frac{\sum_{n=1}^N \mathbf{1}\left[f(\mathbf{x}_n) \ne y_n\right] \cdot g(\mathbf{x}_n)}{\sum_{n=1}^N g(\mathbf{x}_n)}$$

### Calibrated Operating Points
Pre-registered on development validation data and saved in `reports/calibration_protocol.json`:

| Operating Mode | Confidence Threshold $\tau$ | Expected Development Coverage $\Phi$ | Expected Development Risk $\mathcal{R}$ | Clinical Intent |
|---|---|---|---|---|
| **High Reliability** | $\tau = 0.9500$ | $\approx 78.5\%$ | $\le 1.8\%$ | Zero-tolerance telemetry alerting |
| **Balanced (Default)** | $\tau = 0.9073$ | $\approx 86.8\%$ | $\approx 3.2\%$ | Standard automated Holter triage |
| **High Coverage** | $\tau = 0.7000$ | $\approx 96.2\%$ | $\approx 6.5\%$ | High-throughput preliminary screening |

### Class-Wise Abstention Behavior
Ambulatory ECG signals exhibit non-uniform uncertainty across arrhythmia morphologies:
- **Normal (N) Beats**: Exhibit the highest average confidence; abstention rate at $\tau = 0.9073$ is typically $\le 8\%$.
- **Ventricular (V) Beats**: Classic PVCs with wide, slurred QRS complexes achieve high confidence ($\ge 92\%$), but borderline fusion beats trigger elevated abstention rates ($\approx 25-35\%$).
- **Fusion (F) Beats**: Due to morphological superposition of normal sinus and ventricular ectopic conduction, Fusion beats have the highest abstention rate ($> 50\%$), correctly routing ambiguous waveforms to clinical over-read.

---

## 4. Scientific Limitations & Conformal Coverage Caveat

> [!CAUTION]
> **Exchangeability Assumption**: Formal Conformal Prediction guarantees (e.g. Vovk et al., 2005; Angelopoulos & Bates, 2021) mathematically require that calibration and test samples be **exchangeable** (independent and identically distributed).
>
> In real-world cardiology and patient-independent cross-validation:
> 1. Beats from an unseen patient share anatomical axis orientation, thoracic impedance, and medication profiles not present in the calibration cohort.
> 2. Noise stress (electrode motion, muscle tremor) dynamically shifts the signal-to-noise ratio.
>
> Consequently, RhythmScope explicitly documents that development-calibrated coverage **is an empirical safety mechanism, not an unconditional statistical guarantee of error bounds on future clinical patients**.
