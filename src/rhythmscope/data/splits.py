"""
Dataset partitioning protocols for RhythmScope:
1. Classical de Chazal DS1 / DS2 Benchmark
2. Strict Patient-Disjoint Benchmark (excluding Record 202 from test)
3. Leak-proof DS1 Validation split (complete patients held out)
"""

from dataclasses import dataclass
from typing import List, Dict, Set

# MIT-BIH Arrhythmia Database record lists

# Paced records excluded by AAMI standard recommendation:
PACED_RECORDS = ["102", "104", "107", "217"]

# Classical de Chazal partition (22 records in DS1, 22 records in DS2)
DS1_RECORDS = [
    "101", "106", "108", "109", "112", "114", "115", "116",
    "118", "119", "122", "124", "201", "203", "205", "207",
    "208", "209", "215", "220", "223", "230"
]

DS2_RECORDS = [
    "100", "103", "105", "111", "113", "117", "121", "123",
    "200", "202", "210", "212", "213", "214", "219", "221",
    "222", "228", "231", "232", "233", "234"
]

# Strict Patient-Disjoint partition:
# Record 202 is excluded from DS2 test set because it originates from the same subject as Record 201 (DS1)
DS2_STRICT_RECORDS = [
    "100", "103", "105", "111", "113", "117", "121", "123",
    "200", "210", "212", "213", "214", "219", "221",
    "222", "228", "231", "232", "233", "234"
]

# Patient-held-out validation set drawn strictly from DS1:
# Chosen to represent both normal rhythms and arrhythmia morphologies (S, V, F) without data leakage
# Records: 115 (normal baseline), 118 (S-arrhythmias), 205 (V/F arrhythmias), 223 (S/V/F arrhythmias)
DS1_VAL_RECORDS = ["115", "118", "205", "223"]
DS1_TRAIN_RECORDS = [r for r in DS1_RECORDS if r not in DS1_VAL_RECORDS]

# AAMI 1998 mapping from MIT-BIH annotation symbols to 5 superclasses:
AAMI_MAPPING: Dict[str, str] = {
    # Normal and bundle branch blocks (N)
    "N": "N", "L": "N", "R": "N", "e": "N", "j": "N",
    # Supraventricular ectopic beats (S)
    "A": "S", "a": "S", "J": "S", "S": "S",
    # Ventricular ectopic beats (V)
    "V": "V", "E": "V",
    # Fusion of ventricular and normal beat (F)
    "F": "F",
    # Paced, fusion of paced, unclassifiable (Q)
    "/": "Q", "f": "Q", "Q": "Q"
}

# Headline evaluation targets the 4 clinically standard non-paced classes
HEADLINE_CLASSES = ["N", "S", "V", "F"]

@dataclass
class DatasetSplits:
    train_records: List[str]
    val_records: List[str]
    test_classical_records: List[str]
    test_strict_records: List[str]
    paced_records: List[str]

def get_splits() -> DatasetSplits:
    """Returns the validated split configuration."""
    return DatasetSplits(
        train_records=DS1_TRAIN_RECORDS,
        val_records=DS1_VAL_RECORDS,
        test_classical_records=DS2_RECORDS,
        test_strict_records=DS2_STRICT_RECORDS,
        paced_records=PACED_RECORDS
    )

def verify_no_patient_leakage():
    """
    Asserts zero patient leakage between splits:
    1. Train and Val are disjoint.
    2. Train and DS2 Strict are disjoint.
    3. Confirms Record 201 is in DS1 and Record 202 is excluded in DS2 Strict.
    """
    train_set = set(DS1_TRAIN_RECORDS)
    val_set = set(DS1_VAL_RECORDS)
    ds2_set = set(DS2_RECORDS)
    ds2_strict_set = set(DS2_STRICT_RECORDS)
    
    assert len(train_set.intersection(val_set)) == 0, "Leakage: Train and Val share records!"
    assert len(train_set.union(val_set)) == len(DS1_RECORDS), "Train + Val does not cover DS1!"
    assert "201" in DS1_RECORDS, "Record 201 must be in DS1."
    assert "202" in ds2_set, "Record 202 must be in classical DS2."
    assert "202" not in ds2_strict_set, "Record 202 MUST be excluded from strict patient-disjoint test set!"
    assert len(train_set.intersection(ds2_strict_set)) == 0, "Leakage: Train and DS2 Strict share records!"
    assert len(val_set.intersection(ds2_strict_set)) == 0, "Leakage: Val and DS2 Strict share records!"
    return True

if __name__ == "__main__":
    verify_no_patient_leakage()
    print("Leakage verification passed!")
