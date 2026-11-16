# RhythmScope Differentiation Blueprint — Research Edition

## Positioning
**RhythmScope — Beyond the prediction.**
A study of how patient-independent ECG heartbeat classifiers fail under real recorded noise, distribution shift, and uncertainty. Original value is the independently inspectable reliability benchmark—not a claim that the underlying CNN or noise method is new. Educational research only.

## One-minute differentiating demonstration
1. Open a genuine unseen-patient record and select a correctly classified ventricular (V) beat from the strict held-out data. Show real record/sample coordinates.
2. Lock record/beat/model/checkpoint. Change only noise: clean -> baseline wander -> electrode motion at precomputed, properly calibrated SNR levels. Show real waveform, predicted label, score, and error/flip outcome for the *same beat*.
3. Toggle pre-calibrated abstention. Show when prediction becomes indeterminate and what fraction of dataset is still covered. Do not invent results if no model/checkpoint.
4. Switch to Patient Generalization Atlas: distribution by individual unseen patient; show one genuine failure case, class support, and link.
5. Open the Experiment Receipt: exact split, dataset, model SHA, commit, protocol, metric definitions and reproducible commands.

## Publication narrative
**Study title:** "Beyond Accuracy: Patient-Level Generalization, Noise Robustness, and Abstention in a 1D-CNN ECG Beat Classifier"
**Question:** A model performs well on clean, beat-segmented recordings; what happens when the patient is new, noise is realistic, and the classifier can say 'uncertain'?

### Figures to generate from real measured results
- Figure 1: Dataset and subject partitions (explicit 201/202 collision).
- Figure 2: Per-class confusion matrices, primary patient-disjoint test.
- Figure 3: Paired degradation plots across noise type and SNR, with patient intervals.
- Figure 4: Risk/coverage curve for dev-calibrated abstention; show patient/class differences.
- Figure 5: Failure atlas — real waveform before and after noise for selected cases.
- Figure 6 (optional): External INCART comparison with incompatibility caveats.

### Metrics and immutable files
`reports/runs/<run_id>/{config.yaml,metadata.json,metrics.json,per_beat_predictions.parquet,bootstrap_intervals.json,plots/,model_manifest.json,experiment_receipt.json}`. Do not distribute raw identifying data or copyrighted dataset files unnecessarily.

## Hard lines against superficial projects
- Don't claim novelty of 1D CNN; claim a carefully engineered, reproducible evaluation experience.
- Don't simulate medical alerts, patients, or performance. No input field for real patient uploads in the first release.
- Don't promise 90% conformal coverage on new patients; calculate realized coverage and report when it breaks.
- Don't generate metrics from the UI slider. Slider may select only actual precomputed scenarios or invoke genuine model inference.
- Don't conflate offline beat classification with live arrhythmia detection.
- Don't hide a weak S/V recall behind strong overall accuracy.
- Don't call external transfer scores directly comparable until lead, annotation and class semantics have been audited.

## What an interviewer should learn
You designed honest experimental controls; detected a patient overlap in a common benchmark; trained real baselines; quantified failure under real disturbances; selected uncertainty policies without test leakage; built an auditable full-stack research application.

## Source reading
- MIT-BIH: https://physionet.org/content/mitdb/1.0.0/
- NSTDB: https://physionet.org/content/nstdb/1.0.0/
- INCART: https://physionet.org/content/incartdb/1.0.0/
