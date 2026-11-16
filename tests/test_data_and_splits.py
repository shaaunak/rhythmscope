"""
Tests for data auditing, split guarantees, and leakage prevention.
"""

import pytest
import numpy as np
from pathlib import Path

from rhythmscope.data.splits import (
    DS1_RECORDS,
    DS2_RECORDS,
    DS2_STRICT_RECORDS,
    DS1_TRAIN_RECORDS,
    DS1_VAL_RECORDS,
    PACED_RECORDS,
    verify_no_patient_leakage
)

def test_patient_leakage_guarantee():
    """Verify train, val, and test partitions are completely patient-disjoint."""
    assert verify_no_patient_leakage() is True

def test_record_201_and_202_handling():
    """Verify Record 201 is in training and Record 202 is excluded in strict test."""
    assert "201" in DS1_TRAIN_RECORDS
    assert "202" in DS2_RECORDS # present in classical
    assert "202" not in DS2_STRICT_RECORDS # excluded in strict

def test_paced_records_excluded():
    """Verify paced records are not part of evaluation partitions."""
    for p in PACED_RECORDS:
        assert p not in DS1_RECORDS
        assert p not in DS2_RECORDS
        assert p not in DS2_STRICT_RECORDS

def test_split_sizes():
    """Check split counts match standard de Chazal definition."""
    assert len(DS1_RECORDS) == 22
    assert len(DS2_RECORDS) == 22
    assert len(DS2_STRICT_RECORDS) == 21
    assert len(DS1_TRAIN_RECORDS) + len(DS1_VAL_RECORDS) == 22


def test_patient_overlap_audit_json():
    """Verify that reports/patient_overlap_audit.json reports zero leakage."""
    import json
    audit_file = Path("reports/patient_overlap_audit.json")
    assert audit_file.exists(), "patient_overlap_audit.json must exist"
    with open(audit_file) as f:
        data = json.load(f)
    assert data["zero_patient_leakage"] is True
    assert data["status"] == "PASSED_ZERO_LEAKAGE"
    assert len(data["pairwise_overlap"]["train_val_overlap"]) == 0
    assert len(data["pairwise_overlap"]["train_test_strict_overlap"]) == 0
    assert len(data["pairwise_overlap"]["val_test_strict_overlap"]) == 0


def test_record_114_lead_configuration():
    """Verify that Record 114 selects MLII even though lead 0 is V5."""
    from rhythmscope.signals.beats import extract_record_beats
    b = extract_record_beats("data/raw/114")
    assert b["lead_used"] == "MLII", f"Expected MLII but got {b['lead_used']}"


def test_split_manifest_json():
    """Verify that reports/split_manifest.json contains all 48 records."""
    import json
    manifest_file = Path("reports/split_manifest.json")
    assert manifest_file.exists(), "split_manifest.json must exist"
    with open(manifest_file) as f:
        data = json.load(f)
    assert data["total_records"] == 48
    records = {r["record"]: r for r in data["records"]}
    assert "201" in records
    assert "202" in records
    assert records["201"]["assigned_split"] == "train"
    assert records["202"]["assigned_split"] == "test_classical_only"
    assert "102" in records
    assert records["102"]["assigned_split"] == "excluded_paced"
