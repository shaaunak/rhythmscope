# RhythmScope — Scientific & Clinical Limitations

> [!WARNING]
> **RESEARCH AND EDUCATIONAL USE ONLY**  
> RhythmScope is an open research platform designed to investigate machine learning reliability, patient generalization, and uncertainty calibration in cardiovascular time-series analysis. It is **not a certified medical device**, has not been evaluated by the FDA or notified bodies under EU MDR, and must never be used for clinical diagnosis, patient monitoring, treatment guidance, or autonomous triage.

---

## 1. Single-Lead Modified Bipolar Lead Limitations

- **Lead Montage**: RhythmScope operates on single-channel Modified Limb Lead II (`MLII`), derived from chest electrodes positioned along the anatomical cardiac axis.
- **Electrophysiologic Constraint**: A single lead provides only a 1D scalar projection of the 3D cardiac electrical vector $\mathbf{v}(t) \in \mathbb{R}^3$. Complex arrhythmias involving axis deviation, localized anterior/posterior ischemia, or bundle branch blocks with lead-specific morphology cannot be fully resolved without multi-lead recordings (such as standard 12-lead or 3-lead vectorcardiography).
- **Inverted Leads**: Variations in electrode placement (such as the reversed lead configuration in Record 114) alter polarity and wave heights, necessitating strict lead metadata auditing.

---

## 2. Demographic & Historical Cohort Constraints of MIT-BIH

The MIT-BIH Arrhythmia Database was collected between 1975 and 1979 by Beth Israel Hospital and MIT:
- **Sample Size**: 47 unique patients across 48 recordings.
- **Demographics**: Predominantly elderly inpatients (median age 65 years, 57% male) with significant cardiovascular comorbidity, often taking antiarrhythmic medications (Digoxin, Quinidine, Pronestyl).
- **Generalizability**: The sample does not represent pediatric populations, healthy young athletes, or modern patient demographics receiving contemporary beta-blockers or catheter ablation therapy.

---

## 3. The Physiological Ambiguity of Fusion (F) Beats

- **Electrophysiological Mechanism**: A Fusion beat occurs when a supraventricular impulse conducts across the atrioventricular (AV) node to depolarize a portion of the ventricles at the exact same instant an ectopic ventricular focus depolarizes the remaining myocardium.
- **Morphological Spectrum**: By definition, the resulting QRS complex is an anatomical blend between the patient's normal sinus beat and ventricular ectopic beat. In single-lead MLII, a fusion beat often has high correlation ($r > 0.85$) with either pure normal or pure PVC waveforms.
- **Severe Patient Concentration**:
  - In DS1: Record 208 contains **89.8%** of all Fusion beats.
  - In DS2: Record 213 contains **93.5%** of all Fusion beats.
  Because only one or two patients in the entire dataset exhibit sustained fusion rhythms, true out-of-patient generalization for class F is constrained by dataset support. As noted by de Chazal et al. (2004), class F consistently achieves the lowest sensitivity among all arrhythmia classes in single-lead benchmarks.

---

## 4. Retrospective Timing (Post-RR) Latency

- **Feature Requirement**: RhythmScope's hybrid network utilizes `post_rr` (the time interval between the current beat and the subsequent beat) to distinguish ventricular ectopic beats with compensatory pauses.
- **Latency Trade-Off**: Computing `post_rr` requires waiting for the subsequent R-peak to occur, introducing a causal latency equal to one cardiac cycle ($\approx 600 - 1000\text{ ms}$). In real-time continuous defibrillator monitoring, purely causal/preceding features must be used instead.

---

## 5. Violation of Conformal Exchangeability Under Patient & Site Shift

- **Mathematical Requirement**: Conformal prediction and risk-coverage guarantees mathematically require that data points are independently and identically distributed (exchangeable).
- **Clinical Reality**: Different hospitals, Holter hardware vendors, patient skin impedances, and patient-specific anatomies create systematic covariate shift.
- **Explicit Warning**: Calibrated confidence thresholds ($\tau = 0.9073$) and selective risk estimates are empirical benchmarks on the development partition; they do not guarantee bounded error on external hospital cohorts without local re-calibration.
