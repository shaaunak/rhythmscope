# RhythmScope — persistent engineering rules

## Mission
Build an original, reproducible research-grade ECG heartbeat classification platform using MIT-BIH with strict patient-independent evaluation and an interactive, design-led interface. Educational research only; never frame this as a diagnosis or clinical device.

## Non-negotiable integrity requirements
- Execute, verify and document work; never merely propose a plan when asked to implement.
- Never invent model metrics, sample counts, screenshots, repository links, endpoint behavior, checkpoint weights or executed tests.
- Preserve true subject identity: PhysioNet states that recordings 201 and 202 share a subject. Keep both in one partition or exclude 202 from strict DS2 testing.
- Separate canonical 22-record DS1/22-record DS2 paper-comparison results from the strict patient-disjoint headline results. The classical split is not literally disjoint because of 201/202.
- Use patient-level train/validation separation, train-only scalers/feature statistics, a frozen test set and versioned split manifests.
- Never classify unspecified symbols as normal, fabricate underrepresented Q-class observations or infer health outcomes from model output.
- Annotated R-peaks are provided by the dataset. Label this a beat classifier, not an autonomous R-peak detector; distinguish offline use of next-RR from causal/previous-only use.
- Select ECG leads from recording metadata; test the abnormal lead order in record 114.
- Record data license and citation, data/model versions, code revision, random seed, hardware, all preprocessing and exclusions.
- API predictions must come from a real loaded checkpoint. Recorded demo traces must say 'recorded', never 'live'.
- Do not commit raw dataset, large model weights, patient-submitted uploads, secrets or generated private logs.

## Working protocol
- Maintain docs/PROGRESS.md: phase, completed actions, commands and outputs, verification, remaining work, blockers.
- Implement smallest verifiable step, run tests, fix failures, write evidence, then proceed. Do not mark TODOs as DONE.
- CI must include lint, formatting, typecheck where relevant, unit/data tests, fixture integration and frontend build.
- Prefer Python 3.11/3.12 if compatible; pin actual dependencies. Verify hardware/OS before choosing accelerator and batch sizes.
- Keep data and training separate from API startup and web request processing.
- Use Python type hints, Pydantic schemas, clear exceptions and structured logs.
- Never show fabricated scores in UI. Render explicit empty, blocked or unavailable states.
- Design must be original: no stock ECG icons as content, clichéd admin card dashboard, generic gradient hero or unlicensed medical imagery.
- Document the limits of the MIT-BIH sample and do not use a medical-device efficacy claim.

## Default stack
PyTorch, SciPy, NumPy, WFDB, scikit-learn, MLflow or versioned artifacts, Captum, FastAPI, Pydantic, Next.js, TypeScript, Tailwind CSS, uPlot or D3.js, pytest, Playwright, GitHub Actions. Change components only for a documented technical reason.

## Done means verified
A phase is complete only after commands genuinely run, evidence artifacts exist, tests pass, outputs are inspected, docs updated and changes committed. If an external credential or deployment approval is needed, stop that specific step and provide an exact handoff; continue other independent work without pretending the blocked step succeeded.

## Signature differentiator: TrustLab (research, not decoration)
- RhythmScope must answer: **When does a heartbeat classifier fail on unseen patients and realistic signal noise, and when should it abstain?** Build a reproducible TrustLab, not just another ECG prediction dashboard.
- Use PhysioNet MIT-BIH Noise Stress Test Database `bw`, `ma`, `em` noise samples. Select noise levels/procedure on development data, pre-register test stress settings, make injection deterministic and record actual SNR, noise origin, random seed and signal-processing details. Never use benchmark records derived from training ECGs as held-out independent patients.
- Keep **clean test** and **noise-stress test** separated; stress testing cannot be used to retune the final reported checkpoint. Plot degradation in per-class recall, macro-F1 and flip rate with patient-clustered intervals; report low-support limitations.
- Calibrate temperature or a simple abstention threshold only on a patient-disjoint development/calibration set. Assess risk-vs-coverage, per-class/patient coverage and calibration, not merely a single confidence figure. Softmax confidence is not a reliability guarantee. Conformal guarantees require exchangeability and do not automatically hold under patient/site shift; report empirical coverage and failure.
- External dataset test (INCART) is OPTIONAL, separate, and exploratory. Validate lead compatibility, resample from 257 Hz with annotation alignment, map comparable labels, group records by INCART patient, report mismatched recording populations. Never mix it into MIT-BIH development or call it clinical validation.
- Every displayed result has a **reproducibility receipt** (run ID, code commit, data revision, split manifest, signal-processing revision, checkpoint SHA256, cohort/class support, metric definition and optional CI).
- Premium product signature: interactive Failure Atlas and model-comparison TrustLab, including a fixed real beat, clean/noise comparison, confidence/abstention, and links to the exact evaluation report. Mark illustrative UI fixtures as illustrative.
