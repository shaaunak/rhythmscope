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
