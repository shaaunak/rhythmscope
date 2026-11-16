.PHONY: install download audit preprocess train evaluate test api app help

PYTHON = .venv/bin/python
PIP = .venv/bin/pip
PYTEST = .venv/bin/pytest

help:
	@echo "RhythmScope Pipeline Commands:"
	@echo "  make install     - Install python package and dependencies"
	@echo "  make download    - Download PhysioNet MIT-BIH dataset"
	@echo "  make audit       - Audit dataset records, patient IDs, leads, and beat distribution"
	@echo "  make preprocess  - Filter signals, segment 252-sample beats, extract RR intervals"
	@echo "  make train       - Train baselines, Waveform CNN, and Hybrid CNN"
	@echo "  make evaluate    - Run classical DS1/DS2 and strict patient-disjoint benchmarks"
	@echo "  make test        - Run test suite"
	@echo "  make api         - Start FastAPI backend server"
	@echo "  make app         - Start Next.js frontend application"

install:
	$(PIP) install -e .

download:
	$(PYTHON) -m rhythmscope.data.download

audit:
	$(PYTHON) -m rhythmscope.data.audit

preprocess:
	$(PYTHON) -m rhythmscope.signals.beats

train:
	$(PYTHON) -m rhythmscope.training.train

evaluate:
	$(PYTHON) -m rhythmscope.evaluation.metrics

test:
	$(PYTEST) tests/ -v

api:
	$(PYTHON) -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

app:
	cd app && npm run dev
