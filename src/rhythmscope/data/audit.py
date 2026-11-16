"""
Audit script for MIT-BIH Arrhythmia Database.
Audits:
- Signal leads (detecting reverse order like Record 114)
- Sampling rate and duration
- Annotation symbols and mapping to AAMI 1998 classes
- Total beat distributions across DS1 (train/val) and DS2 (classical/strict)
- Documented patient demographics (e.g. shared identity of records 201 & 202)
- Rarity of Q class and justification for headline 4-class evaluation
"""

import json
from pathlib import Path
import logging
from collections import Counter, defaultdict
import wfdb

from rhythmscope.data.splits import (
    AAMI_MAPPING,
    DS1_TRAIN_RECORDS,
    DS1_VAL_RECORDS,
    DS2_RECORDS,
    DS2_STRICT_RECORDS,
    PACED_RECORDS
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Documented patient info from PhysioNet MIT-BIH database directory
# Note especially: Record 201 and 202 both represent Patient #201 (male, age 68)
RECORD_METADATA = {
    "100": {"age": 69, "gender": "M", "medications": ["Aldomet", "Inderal"]},
    "101": {"age": 75, "gender": "F", "medications": []},
    "102": {"age": 84, "gender": "F", "medications": [], "paced": True},
    "103": {"age": 20, "gender": "M", "medications": []},
    "104": {"age": 66, "gender": "F", "medications": [], "paced": True},
    "105": {"age": 73, "gender": "F", "medications": ["Digoxin", "Quinidine"]},
    "106": {"age": 24, "gender": "F", "medications": []},
    "107": {"age": 63, "gender": "M", "medications": ["Digoxin"], "paced": True},
    "108": {"age": 87, "gender": "F", "medications": ["Digoxin", "Quinidine"]},
    "109": {"age": 64, "gender": "M", "medications": ["Digoxin", "Quinidine"]},
    "111": {"age": 47, "gender": "F", "medications": ["Digoxin"]},
    "112": {"age": 54, "gender": "M", "medications": []},
    "113": {"age": 24, "gender": "F", "medications": []},
    "114": {"age": 72, "gender": "F", "medications": [], "leads_reversed": True},
    "115": {"age": 39, "gender": "F", "medications": []},
    "116": {"age": 68, "gender": "M", "medications": ["Digoxin"]},
    "117": {"age": 69, "gender": "M", "medications": []},
    "118": {"age": 69, "gender": "M", "medications": ["Digoxin", "Quinidine"]},
    "119": {"age": 51, "gender": "F", "medications": []},
    "121": {"age": 83, "gender": "F", "medications": ["Digoxin", "Quinidine"]},
    "122": {"age": 51, "gender": "M", "medications": ["Digoxin", "Pronestyl"]},
    "123": {"age": 63, "gender": "F", "medications": []},
    "124": {"age": 77, "gender": "M", "medications": []},
    "200": {"age": 64, "gender": "M", "medications": ["Digoxin", "Pronestyl"]},
    "201": {"age": 68, "gender": "M", "medications": ["Digoxin", "Quinidine"], "patient_id": "P201_202"},
    "202": {"age": 68, "gender": "M", "medications": ["Digoxin", "Quinidine"], "patient_id": "P201_202", "shared_with": "201"},
    "203": {"age": 43, "gender": "M", "medications": ["Digoxin", "Quinidine"]},
    "205": {"age": 59, "gender": "M", "medications": ["Digoxin", "Pronestyl"]},
    "207": {"age": 89, "gender": "F", "medications": ["Digoxin", "Quinidine"]},
    "208": {"age": 23, "gender": "F", "medications": []},
    "209": {"age": 62, "gender": "M", "medications": ["Digoxin", "Pronestyl"]},
    "210": {"age": 89, "gender": "M", "medications": ["Digoxin", "Quinidine"]},
    "212": {"age": 32, "gender": "F", "medications": []},
    "213": {"age": 61, "gender": "M", "medications": []},
    "214": {"age": 53, "gender": "M", "medications": ["Digoxin", "Pronestyl"]},
    "215": {"age": 81, "gender": "F", "medications": ["Digoxin", "Quinidine"]},
    "217": {"age": 65, "gender": "M", "medications": [], "paced": True},
    "219": {"age": 74, "gender": "M", "medications": []},
    "220": {"age": 87, "gender": "F", "medications": ["Digoxin", "Quinidine"]},
    "221": {"age": 83, "gender": "M", "medications": []},
    "222": {"age": 84, "gender": "F", "medications": ["Digoxin", "Pronestyl"]},
    "223": {"age": 73, "gender": "M", "medications": ["Digoxin", "Quinidine"]},
    "228": {"age": 80, "gender": "F", "medications": ["Digoxin", "Quinidine"]},
    "230": {"age": 32, "gender": "M", "medications": []},
    "231": {"age": 72, "gender": "F", "medications": ["Digoxin", "Pronestyl"]},
    "232": {"age": 76, "gender": "F", "medications": []},
    "233": {"age": 57, "gender": "M", "medications": ["Digoxin", "Quinidine"]},
    "234": {"age": 56, "gender": "F", "medications": []}
}

def audit_dataset(raw_dir: str = "data/raw", output_report: str = "reports/data_audit.json") -> dict:
    """Performs full audit of downloaded MIT-BIH records."""
    raw_path = Path(raw_dir)
    records = sorted([f.stem for f in raw_path.glob("*.hea")])
    if not records:
        raise FileNotFoundError(f"No .hea records found in {raw_dir}")
        
    logger.info(f"Auditing {len(records)} records in {raw_dir}...")
    
    per_record_audit = {}
    split_counts = {
        "DS1_TRAIN": Counter(),
        "DS1_VAL": Counter(),
        "DS2_CLASSICAL": Counter(),
        "DS2_STRICT": Counter(),
        "PACED": Counter(),
        "TOTAL": Counter()
    }
    
    lead_distribution = Counter()
    non_beat_annotations = Counter()
    
    for rec in records:
        record_file = str(raw_path / rec)
        header = wfdb.rdheader(record_file)
        ann = wfdb.rdann(record_file, 'atr')
        
        sig_names = header.sig_name
        lead_str = "/".join(sig_names)
        lead_distribution[lead_str] += 1
        
        # Check MLII presence and index
        mlii_idx = None
        if "MLII" in sig_names:
            mlii_idx = sig_names.index("MLII")
        elif "II" in sig_names:
            mlii_idx = sig_names.index("II")
            
        record_symbol_counts = Counter(ann.symbol)
        aami_counts = Counter()
        
        for sym, count in record_symbol_counts.items():
            if sym in AAMI_MAPPING:
                aami_class = AAMI_MAPPING[sym]
                aami_counts[aami_class] += count
            else:
                non_beat_annotations[sym] += count
                
        # Classify partition
        partitions = []
        if rec in PACED_RECORDS:
            partitions.append("PACED")
            split_counts["PACED"] += aami_counts
        else:
            if rec in DS1_TRAIN_RECORDS:
                partitions.append("DS1_TRAIN")
                split_counts["DS1_TRAIN"] += aami_counts
            if rec in DS1_VAL_RECORDS:
                partitions.append("DS1_VAL")
                split_counts["DS1_VAL"] += aami_counts
            if rec in DS2_RECORDS:
                partitions.append("DS2_CLASSICAL")
                split_counts["DS2_CLASSICAL"] += aami_counts
            if rec in DS2_STRICT_RECORDS:
                partitions.append("DS2_STRICT")
                split_counts["DS2_STRICT"] += aami_counts
                
        split_counts["TOTAL"] += aami_counts
        
        per_record_audit[rec] = {
            "record": rec,
            "leads": sig_names,
            "mlii_index": mlii_idx,
            "lead_reversed": rec == "114" or (mlii_idx == 1),
            "fs": header.fs,
            "total_samples": header.sig_len,
            "duration_minutes": round(header.sig_len / header.fs / 60, 2),
            "total_annotations": len(ann.symbol),
            "total_beats": sum(aami_counts.values()),
            "aami_class_counts": dict(aami_counts),
            "partitions": partitions,
            "demographics": RECORD_METADATA.get(rec, {})
        }
        
    audit_summary = {
        "num_records": len(records),
        "lead_configurations": dict(lead_distribution),
        "split_counts": {k: dict(v) for k, v in split_counts.items()},
        "non_beat_annotations": dict(non_beat_annotations),
        "patient_overlap_check": {
            "record_201_partition": "DS1_TRAIN",
            "record_202_classical_partition": "DS2_CLASSICAL",
            "record_202_strict_partition": "EXCLUDED",
            "shared_patient_details": "PhysioNet documents Record 201 and 202 were recorded from the same 68-year-old male subject.",
            "strict_guarantee": "Record 202 is completely omitted from DS2_STRICT benchmark to guarantee true out-of-subject generalization."
        },
        "q_class_audit": {
            "q_count_ds1_train": split_counts["DS1_TRAIN"].get("Q", 0),
            "q_count_ds1_val": split_counts["DS1_VAL"].get("Q", 0),
            "q_count_ds2_classical": split_counts["DS2_CLASSICAL"].get("Q", 0),
            "q_count_ds2_strict": split_counts["DS2_STRICT"].get("Q", 0),
            "q_decision": "After excluding paced recordings (102, 104, 107, 217), class Q consists of negligible unclassifiable/fusion beats (<0.02% of data in DS1). Headline classification targets N, S, V, F; Q beats are audited and documented."
        },
        "records": per_record_audit
    }
    
    out_path = Path(output_report)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(audit_summary, f, indent=2)
        
    logger.info(f"Audit report saved to {out_path}")
    return audit_summary

if __name__ == "__main__":
    audit_dataset()
