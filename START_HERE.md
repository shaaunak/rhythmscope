# RhythmScope — Antigravity Build Kit

**Mission:** Build a rigorous, reproducible ECG heartbeat classification research product with a premium interactive interface. **Educational research only; not a diagnostic device.**

## How to use

1. Create `~/Projects/rhythmscope` on your Mac and open it in Google Antigravity.
2. Copy the included `AGENTS.md` into the repository root. Antigravity will use it as persistent project guidance.
3. Paste `prompts/00_MASTER.md` once in the agent chat. It establishes the overall mission and initiates Phase 1.
4. Paste each numbered phase prompt only after its acceptance criteria are met. Each prompt requires executable evidence and updates `docs/PROGRESS.md`.
5. Run `prompts/07_RELEASE_AUDIT.md` before publishing, and `prompts/08_GITHUB_PUBLISH.md` only when the repository and deployment are verified.
6. Use `docs/SPECIFICATION.md` as the technical source of truth. Update it when the dataset audit forces a scientifically justified change.

## Reference links

- PhysioNet MIT-BIH: https://physionet.org/content/mitdb/1.0.0/
- WFDB Python: https://wfdb.readthedocs.io/
- Antigravity rules: https://antigravity.google/docs/rules/
- Antigravity skills: https://antigravity.google/docs/skills
- Antigravity browser: https://antigravity.google/docs/browser/

## Guardrails

- No fabricated evaluation metrics, data counts, model predictions, training logs, live links or screenshots.
- No random beat-level train/test split. The dataset documents records 201 and 202 as one subject.
- No test-set selection of hyperparameters; no fitted preprocessing from validation/test patients.
- No assumption that every dataset record's first lead is MLII.
- No clinical diagnosis, health advice, or falsely calibrated confidence.
- No production deployment until tests, real inference, licenses and privacy conditions are verified.

## Evidence gate

For each completed phase, record commands run and their outputs in `docs/PROGRESS.md`; save structured evidence under `reports/runs/<run-id>/`, and commit the completed milestone. A blocked step is marked BLOCKED with the reason, rather than reported as successful.

## Research Edition — How to stand out

The defining feature is **TrustLab**, a patient-generalization and real-noise reliability suite with development-calibrated abstention, a Failure Atlas and independently auditable experiment receipts. Read `docs/DIFFERENTIATION_BLUEPRINT.md` and the new section in `docs/SPECIFICATION.md` before starting.

**Revised prompt order** (all still gated by real evidence):

`00_MASTER` → `01_DATA_PIPELINE` → `02_BASELINES` → `03_DEEP_LEARNING` → **`03A_CALIBRATION_PLAN`** → `04_FINAL_EVALUATION` → **`04A_TRUSTLAB_NOISE_STRESS`** → optional **`04B_EXTERNAL_TRANSFER`** → `05_API` → `06_PREMIUM_FRONTEND` → **`06A_SIGNATURE_EXPERIENCE`** → `07_RELEASE_AUDIT` → `08_GITHUB_PUBLISH`.

There is no shortcut to true numbers: execute the models before creating public benchmark charts. Antigravity may not be able to finish all phases in one run; pass each prompt one at a time and verify evidence.
