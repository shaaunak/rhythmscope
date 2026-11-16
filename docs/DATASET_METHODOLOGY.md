# RhythmScope — ECG Dataset & Partitioning Methodology

**Specification Standard**: PhysioNet MIT-BIH Arrhythmia Database & AAMI EC57:1998  
**Document Revision**: 2.0.0  
**Status**: Verified & Implemented

---

## 1. Database Overview & Source Attribution

RhythmScope evaluates heartbeat classification using the **MIT-BIH Arrhythmia Database** (Moody & Mark, 1992; Goldberger et al., 2000), hosted on PhysioNet under the Open Data Commons Attribution License (ODC-By v1.0).

### Key Dataset Characteristics
- **Total Records**: 48 half-hour two-channel ambulatory ECG recordings.
- **Sampling Frequency**: $f_s = 360\text{ Hz}$ per channel with 11-bit resolution over a $\pm 10\text{ mV}$ range.
- **Subjects**: 47 unique patients studied by the BIH Arrhythmia Laboratory between 1975 and 1979 (Records 201 and 202 share the same patient).
- **Leads**: In 45 records, channel 1 is a Modified Limb Lead II (MLII) and channel 2 is typically modified lead V1 (occasionally V2, V4, or V5). In Record 114, lead order is reversed (Lead 0 is V5; Lead 1 is MLII).

---

## 2. AAMI EC57 Class Mapping

The Association for the Advancement of Medical Instrumentation (AAMI EC57:1998) standard groups MIT-BIH heartbeat annotations into five superclasses:

| AAMI Superclass | PhysioNet Symbols Included | Clinical Meaning |
|---|---|---|
| **N** (Normal / Bundle Branch Block) | `N` (Normal beat), `L` (Left bundle branch block), `R` (Right bundle branch block), `e` (Atrial escape), `j` (Nodal escape) | Sinus rhythm, conduction blocks, and physiologic escape beats |
| **S** (Supraventricular Ectopic) | `A` (Atrial premature), `a` (Aberrated atrial premature), `J` (Nodal premature), `S` (Supraventricular premature) | Premature atrial and junctional arrhythmias |
| **V** (Ventricular Ectopic) | `V` (Premature ventricular contraction), `E` (Ventricular escape) | Ectopic beats originating in ventricular myocardium |
| **F** (Fusion) | `F` (Fusion of ventricular and normal beat) | Concurrent activation from sinus and ventricular foci |
| **Q** (Unknown / Paced) | `/` (Paced beat), `f` (Fusion of paced and normal), `Q` (Unclassifiable) | Artificial pacing spikes and uninterpretable morphology |

### Paced Record Exclusion
Per AAMI guidelines, 4 recordings containing predominantly paced ventricular rhythms are excluded from arrhythmia classification benchmarks:
- **Excluded Records**: `102`, `104`, `107`, `217` (Total: 4 records).

### Headline 4-Class Scheme
Following standard research protocol, RhythmScope's headline evaluation targets the 4 clinically meaningful non-paced classes: **`N`, `S`, `V`, `F`**. The unclassifiable class **`Q`** represents less than 0.02% of non-paced DS1 beats and is audited separately in `reports/data_audit.json`.

---

## 3. Partitioning Protocol: Classical DS2 vs Strict Patient-Disjoint

### The Hidden Patient Overlap in the Classical de Chazal Split
In the seminal paper by de Chazal et al. (IEEE Trans. Biomed. Eng., 2004), the remaining 44 non-paced records are divided into two 22-record sets:
- **DS1 (Training / Development)**: `101, 106, 108, 109, 112, 114, 115, 116, 118, 119, 122, 124, 201, 203, 205, 207, 208, 209, 215, 220, 223, 230`
- **DS2 (Testing)**: `100, 103, 105, 111, 113, 117, 121, 123, 200, 202, 210, 212, 213, 214, 219, 221, 222, 228, 231, 232, 233, 234`

**Critical Finding**: Official PhysioNet metadata reveals that **Record 201 (assigned to DS1) and Record 202 (assigned to DS2) were recorded from the exact same human subject** (male, age 68, treated with Digoxin and Quinidine). Consequently, evaluating on classical DS2 without modification violates strict patient-independent isolation.

### RhythmScope Dual Partition Architecture
To maintain both scientific rigor and exact reproducibility against prior literature, RhythmScope evaluates on two separate test partitions:

```
                               ┌──────────────────────────────────────────────────────────┐
                               │       MIT-BIH Arrhythmia Database (48 Records)           │
                               └────────────────────────────┬─────────────────────────────┘
                                                            │
                       ┌────────────────────────────────────┴───────────────────────────────────┐
                       │ Exclude 4 Paced Records: 102, 104, 107, 217                             │
                       └────────────────────────────────────┬───────────────────────────────────┘
                                                            │ 44 Non-Paced Records
                                ┌───────────────────────────┴───────────────────────────┐
                                │                                                       │
                 ┌──────────────┴───────────────┐                       ┌───────────────┴───────────────┐
                 │       DS1 (22 Records)       │                       │       DS2 (22 Records)        │
                 └──────────────┬───────────────┘                       └───────────────┬───────────────┘
                                │                                                       │
                ┌───────────────┴───────────────┐                       ┌───────────────┴───────────────┐
                │                               │                       │                               │
    ┌───────────┴──────────┐        ┌───────────┴──────────┐┌───────────┴──────────┐        ┌───────────┴──────────┐
    │  DS1 Train (18 Recs) │        │  DS1 Val (4 Recs)    ││ Classical DS2 (22)   │        │ Strict DS2 (21 Recs) │
    │  Weight Optimization │        │  Tuning & Calib      ││ Includes Rec 202     │        │ Excludes Rec 202     │
    │  41,506 beats        │        │  9,488 beats         ││ (de Chazal benchmark)│        │ (Headline Benchmark) │
    │  389 F beats         │        │  25 F beats          ││ 49,685 beats         │        │ 47,550 beats         │
    └──────────────────────┘        └──────────────────────┘└──────────────────────┘        └──────────────────────┘
```

1. **Classical Benchmark (`test_classical.npz`)**:
   - 22 records, 49,685 beats.
   - Retains Record 202 strictly for comparison against published benchmarks (de Chazal et al., 2004).
2. **Strict Patient-Disjoint Benchmark (`test_strict.npz`)**:
   - 21 records, 47,550 beats.
   - **Excludes Record 202 entirely**.
   - Primary headline benchmark ensuring zero patient leakage across all partitions.

---

## 4. Development Partitioning & Preserving the Minority Fusion Class

### Root Cause of Previous Fusion (F) Collapse
In prior iterations of the pipeline, `DS1_VAL_RECORDS` was defined as `["115", "119", "208", "223"]`. An empirical audit of beat annotations revealed:
- Record 208 contains **372 of the 414** Fusion beats in the entire DS1 partition (89.8%).
- With 208 in validation, `train.npz` contained only **28 F beats** out of 41,500 total beats (0.067%).
- In mini-batches of size 128, almost every gradient step contained zero F examples, causing complete collapse of the Fusion decision boundary.

### Leak-Proof DS1 Re-allocation
RhythmScope re-allocates validation records to preserve adequate minority training signal while maintaining complete patient isolation and morphological diversity in validation:
- **`DS1_VAL_RECORDS = ["115", "118", "205", "223"]`** (4 patients):
  - Record 115: Pure sinus rhythm (1,952 N beats) for false-positive validation.
  - Record 118: Supraventricular ectopic bursts (96 S, 16 V beats).
  - Record 205: Ventricular ectopic and fusion events (11 F, 71 V, 3 S beats).
  - Record 223: Multi-focal arrhythmias (14 F, 473 V, 73 S beats).
- **`DS1_TRAIN_RECORDS`** (18 patients):
  - Retains Record 208 (372 F beats) alongside records 101, 106, 108, 109, 112, 114, 116, 119, 122, 124, 201, 203, 207, 209, 215, 220, 230.
  - Training set contains **389 F beats**, providing sufficient signal for balanced sampling.

### Mathematical Proof of Zero Patient Leakage
Let $\mathcal{P}(R)$ denote the patient ID corresponding to recording $R$:
$$\mathcal{P}_{\text{Train}} = \{\text{P101}, \text{P106}, \dots, \text{P201\_202}, \dots, \text{P230}\} \quad (|\mathcal{P}_{\text{Train}}| = 18)$$
$$\mathcal{P}_{\text{Val}} = \{\text{P115}, \text{P118}, \text{P205}, \text{P223}\} \quad (|\mathcal{P}_{\text{Val}}| = 4)$$
$$\mathcal{P}_{\text{StrictTest}} = \{\text{P100}, \text{P103}, \dots, \text{P234}\} \setminus \{\text{P201\_202}\} \quad (|\mathcal{P}_{\text{StrictTest}}| = 21)$$

Then:
$$\mathcal{P}_{\text{Train}} \cap \mathcal{P}_{\text{Val}} = \emptyset, \quad \mathcal{P}_{\text{Train}} \cap \mathcal{P}_{\text{StrictTest}} = \emptyset, \quad \mathcal{P}_{\text{Val}} \cap \mathcal{P}_{\text{StrictTest}} = \emptyset$$

Zero patient identity leakage is programmatically verified in `reports/patient_overlap_audit.json`.

---

## 5. Signal Preprocessing & Feature Extraction

### Lead Selection & Record 114 Anomaly
- **Primary Lead**: Modified Limb Lead II (`MLII`).
- **Lead Order Check**: In Record 114, `sig_names = ['V5', 'MLII']`. The beat extractor programmatically searches for `"MLII"` in `sig_names` rather than indexing channel 0, guaranteeing identical lead geometry across all records.

### Bandpass Filtering
Raw signals are filtered using a zero-phase 3rd-order Butterworth bandpass filter via Second-Order Sections (`scipy.signal.sosfiltfilt`):
- Low cutoff: $0.5\text{ Hz}$ (eliminates baseline wander, respiration drift).
- High cutoff: $40.0\text{ Hz}$ (attenuates powerline $60\text{ Hz}$ interference and high-frequency EMG tremor).

### Beat Window Segmentation
Centered on the dataset-annotated R-peak:
- Pre-R samples: $90$ samples ($\approx 250\text{ ms}$).
- Post-R samples: $162$ samples ($\approx 450\text{ ms}$).
- Total beat window length: $252$ samples ($\approx 700\text{ ms}$).

### Timing (RR Interval) Features
Extracted dynamically from annotated beat positions:
1. `pre_rr`: Interval from previous R-peak to current R-peak (seconds).
2. `post_rr`: Interval from current R-peak to subsequent R-peak (seconds, retrospective).
3. `local_rr_avg`: Running average of preceding 10 RR intervals (online computable).
4. `rr_ratio`: Ratio of `pre_rr / local_rr_avg` (quantifies prematurity relative to local heart rate).

### Train-Fitted Normalization
To prevent statistical leakage:
- Global waveform mean and standard deviation are computed **strictly on training beats** ($\mu_{\text{wf}} = 0.0084, \sigma_{\text{wf}} = 0.3769$).
- Feature means and standard deviations are computed strictly on training beats.
- Scaler parameters are saved to `data/processed/scaler_params.json` and applied immutably to validation and test partitions.
