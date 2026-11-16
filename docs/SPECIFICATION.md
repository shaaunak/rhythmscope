# RhythmScope — Scientific and Product Specification

## Research question
Can a compact 1D CNN with retrospective heartbeat intervals improve class-balanced heartbeat classification over interpretable classical baselines when evaluated on patients excluded from model development?

## Scope
This is **offline classification of expert-annotated individual beats**. It is neither an autonomous R-peak detector nor a clinical diagnostic system. The dataset comprises 48 recordings from 47 subjects and approximately 110,000 annotated beats at 360 Hz.

## Recommended dataset policy
- Source: MIT-BIH Arrhythmia Database v1.0.0, official PhysioNet; ODC Attribution 1.0. Record license and citation.
- Exclude paced records 102,104,107,217 for the paper-style evaluation; document implications. Ensure each symbol is an actual beat annotation and use an explicit AAMI mapping.
- Paper-comparison DS1 (train/development): 101,106,108,109,112,114,115,116,118,119,122,124,201,203,205,207,208,209,215,220,223,230.
- Paper-comparison DS2 (test): 100,103,105,111,113,117,121,123,200,202,210,212,213,214,219,221,222,228,231,232,233,234.
- Strict headline evaluation: same DS1, DS2 excluding 202; train/validation must be disjoint at subject level. Explicitly report 21 test records in the strict version.
- All records must be audited before training. Verify record 114's lead selection by header metadata.
- AAMI grouping candidate: N,L,R,e,j -> N; A,a,J,S -> S; V,E -> V; F -> F; /,f,Q -> Q. Validate mapping against annotation reference and report actual class counts. If Q is absent after exclusions, treat primary task as 4-class N/S/V/F and clearly label it; do not silently claim 5-class evaluation.
- Do not mix held-out test labels into model selection, normalization, negative sampling, charts which act as tuning guidance or class balancing.

## Signal processing
- 360 Hz, 3rd-order Butterworth bandpass 0.5–40 Hz, SOS numerical implementation and zero-phase retrospective filtering. Compare with no filtering or other plausible frequencies only on validation.
- Use 90 samples before and 162 samples after expert R-peak: 252 samples. Fix boundary off-by-one and discard out-of-bounds beats.
- Choose MLII from header signal names when present; if absent choose and document an alternative channel policy. Never assume first lead.
- Apply train-only global scaling (plus optional tested local per-beat normalization). Do not normalize using all patients.
- Compute RR intervals from the complete annotation sequence before discarding non-target symbols; avoid incorrectly treating gaps created by filtering as RR changes. Include previous and next RR only in retrospective/oracle mode; evaluate previous-only separately for a deployment-like scenario.
- Save record_id, subject_id, source sample, channel, split, annotation, mapped class and signal-processing revision for each beat.

## Models
1. Majority-class predictor.
2. RR-based Random Forest (fixed train-only fitting).
3. Waveform-only 1D CNN: Conv1D + normalization + ReLU + pooling blocks, global pooling, MLP; regularization and weighted loss tuned on validation.
4. Hybrid CNN+RR model: same waveform trunk concatenated with standardized RR features; fair matching of training/evaluation conditions.
Optional ablations: focal vs weighted cross-entropy, morphology-only vs intervals, 252 vs 360 sample windows, filtering, augmentation, dropout and number of channels.

## Evaluation
- Primary: patient-disjoint macro F1, with absent-class handling and class counts explicit.
- Secondary: per-class precision, recall, F1, N/S/V/F confusion matrix, weighted F1, balanced accuracy, per-patient distributions, 95% confidence intervals from patient-cluster bootstrap, p50/p95 latency and model bytes.
- Both patient-level and pooled-beat results can be reported, clearly labeled. Do not present overall accuracy alone.
- Compare multiple seeds where feasible. Keep strict test data untouched until frozen model choice.
- Report failed runs and weak generalization honestly; don't claim 98–99% as a target. No clinical-performance claims.

## Frontend
Six screens: ECG Explorer, Model Arena, Explainability Studio, Failure Investigator, Research Report, Model Registry.
Must feature real waveforms, annotation overlays and predictions, accessible zoom/pan, responsive states, true record/model version labeling, failure cases, measured metrics and prominent educational-use disclaimer.
Theme: warm ivory #F6F5F0, navy #16273D, deep teal #087C83, coral #E16B5C; editorial typography and careful chart axes. Use distinct research-laboratory aesthetic, not generic SaaS cards.

## Service and hosting
FastAPI routes: /health/live, /health/ready, /v1/records, /v1/records/{id}/strip, /v1/models, /v1/predict-beats, /v1/metrics, /v1/errors, /v1/attributions. Strict schemas, bounded inputs, timeouts, rate limits and CORS allowlist. Prefer precomputed embeddings/attributions or sampled waveform strips where cost matters; always label offline displays honestly.
Next.js frontend on Vercel; a separate always-on compatible CPU container host for inference; host model artifacts in an explicit registry or object store. No unverified free-tier promises.

## Release conditions
Pinned setup; runnable download/train/evaluate/infer commands; passing data leakage tests; measured immutable metrics and valid checkpoint; working API; zero fatal browser console errors; tested mobile/desktop; accessibility review; license/citation; model card and known failure cases; real README screenshots/video; reproducible GitHub actions; verified live links only.


## Signature research extension — TrustLab

### Differentiation thesis
Other projects classify a single pre-cut heartbeat and show accuracy. RhythmScope asks what breaks *under patient shift and measured ECG corruption*, whether the model can abstain, and exactly how an auditor can reproduce the failures. The scientific findings are the hero—not an animated dashboard.

### Frozen study hypotheses (decide direction on dev, don't promise positive result)
H1. The hybrid waveform+RR model has better patient-disjoint macro-F1 than the RR-only baseline.
H2. Realistic electrode-motion noise degrades S/V recall more than baseline wander under the specified SNR schedule.
H3. Development-calibrated abstention reduces error among accepted examples, at a quantifiable coverage cost.
H4. Performance on external INCART records differs measurably from MIT-BIH results when an appropriate comparable task can be defined.
All hypotheses are exploratory until the dataset, protocol, classes, and hardware are checked. Negative results are publishable.

### Noise testing
- Reference: https://physionet.org/content/nstdb/1.0.0/ (three recorded noise streams `bw`, `ma`, `em`).
- Pre-register the noise schedule (recommended clean, 24, 18, 12, 6, 0 dB measured SNR) and injection/calibration method, subject to data audit. A beat window is not necessarily adequate to define a stable baseline SNR: compute robust reference signal power over a fixed reproducible region and document signal gain.
- Noise streams cannot accidentally include or encode held-out ECG labels. Do not treat NSTDB's derived noisy records 118/119 as independent external patients: MIT-BIH records 118/119 are training-set records in the classical partition. Instead use noise-only recordings as perturbations applied to held-out subjects.
- Preserve the original R-peak centers and ground-truth labels. Repeat multiple deterministic noise excerpts/seeds on the **same** held-out beats; keep sample IDs paired across noise levels.
- Separate the strict clean headline metric from the secondary robustness audit; don't train or tune on strict test corruption cases.
- Metrics by corruption/noise/SNR: class support, macro F1, per-class S/V sensitivity, per-beat prediction flip rate, abstention rate, p95 latency; patient-cluster uncertainty and paired deltas wherever feasible.
- For unknown/rare class support, mark metric not estimable rather than replacing it with a misleading zero.

### Reliability / abstention
- Split DS1 development patients into training, model-selection validation, and a distinct patient-disjoint calibration group when feasible; if small patient counts make a three-way split unstable, document and justify cross-validation/cross-fitting on **development only**.
- Pre-register a max-probability baseline abstention threshold with calibration on dev. For any optional split-conformal prediction, clearly distinguish marginal/conditional coverage, report prediction-set sizes, patient- and class-stratified empirical coverage, and test coverage under noise. Do NOT promise formal coverage under non-exchangeable patient or distribution shift.
- Plot risk–coverage with denominators and confidence intervals; never market abstention as a medical 'safe to discharge' signal.

### Optional external transfer test
- INCART https://physionet.org/content/incartdb/1.0.0/ has 75 thirty-minute 12-lead recordings from 32 Holter records at 257 Hz. Group by patient number, not individual files; the demographic/cardiac population and channels differ from MIT-BIH.
- Freeze MIT-BIH model first. Specify comparable input lead, resample waveform and annotation indices correctly, verify amplitude and gain, label map and target support. No fine-tuning, calibration, or threshold selection on external test labels.
- If equivalence cannot be established, document incompatibility; optional exploratory comparisons must not be presented as a single directly comparable benchmark or a clinical diagnostic score.

### Signature product views
- **TrustLab**: choose an actual held-out beat and model; change *precomputed/real* noise type and SNR settings; show waveform, prediction, reference label, class score caveat, whether model abstains, and the linked evaluation run. Genuine interactive inference may be offered if available; never interpolate invented predicted labels.
- **Failure Atlas**: sample-aligned before/after comparisons, patient-level distributions, searchable failure cards with waveform/record offsets, no personal identifying data.
- **Reliability Passport**: visual research summary for each model: supported classes, cohort, tested noise conditions, patient-level spread, uncertainty calibration status, external test status, exclusions, model hash. Not a certification or safety endorsement.
- **Experiment Receipt**: downloadable manifest for every displayed plot, including dataset/split hashes, commit, model SHA, software versions, seed, test population, metric definition, timestamp, limitations.

### TrustLab completion conditions
- Checkpoint selected before strict test and stress suite, audited patient-disjoint calibration.
- Fixed clean-vs-noise paired dataset and verified signal/symbol alignment; tests reproduce injected waveforms at each seed.
- Calibration/risk coverage plots with denominators, confidence intervals, class/patient breakdown, visible uncertainty failures.
- Genuine generated reports consumed by FastAPI and frontend. User can click a failure to its underlying sample and experiment receipt.
- Robustness and external test explicitly labeled **secondary / exploratory**, separate from the frozen strict clean headline.
