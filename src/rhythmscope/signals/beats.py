"""
Heartbeat segmentation, lead selection, and leakage-proof dataset creation.

Key engineering requirements:
1. Lead Selection: Identifies and extracts the 'MLII' lead by name. (Record 114 has leads reversed!).
2. Filtering: Applies 3rd order Butterworth SOS bandpass filter (0.5 - 40 Hz).
3. Windowing: 252 samples centered around R-peak (90 before, 162 after).
4. Leakage-Proof Scaling: Mean and std are computed EXCLUSIVELY on DS1_TRAIN beats and applied downstream.
5. Patient-Disjoint Partitions: DS1 Train, DS1 Val, DS2 Classical, and DS2 Strict.
"""

import json
from pathlib import Path
import logging
from typing import Dict, List, Tuple
import numpy as np
import wfdb

from rhythmscope.signals.filters import filter_ecg
from rhythmscope.signals.features import compute_rr_features
from rhythmscope.data.splits import (
    AAMI_MAPPING,
    HEADLINE_CLASSES,
    DS1_TRAIN_RECORDS,
    DS1_VAL_RECORDS,
    DS2_RECORDS,
    DS2_STRICT_RECORDS,
    PACED_RECORDS
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

CLASS_TO_IDX = {cls_name: idx for idx, cls_name in enumerate(HEADLINE_CLASSES)}
IDX_TO_CLASS = {idx: cls_name for cls_name, idx in CLASS_TO_IDX.items()}

def extract_record_beats(
    record_path: str,
    target_classes: List[str] = HEADLINE_CLASSES,
    pre_samples: int = 90,
    post_samples: int = 162
) -> dict:
    """
    Extracts filtered 252-sample beats and RR interval features for a single MIT-BIH record.
    """
    rec_str = str(record_path)
    header = wfdb.rdheader(rec_str)
    record = wfdb.rdrecord(rec_str)
    ann = wfdb.rdann(rec_str, 'atr')
    
    fs = header.fs
    sig_names = header.sig_name
    
    # Lead selection: priority to MLII, then II, then first lead
    if "MLII" in sig_names:
        lead_idx = sig_names.index("MLII")
        lead_used = "MLII"
    elif "II" in sig_names:
        lead_idx = sig_names.index("II")
        lead_used = "II"
    else:
        lead_idx = 0
        lead_used = sig_names[0]
        
    raw_signal = record.p_signal[:, lead_idx]
    
    # 2nd-order-sections Butterworth zero-phase filter
    filtered_signal = filter_ecg(raw_signal, lowcut=0.5, highcut=40.0, fs=fs, order=3)
    
    # Filter valid beat annotations and compute RR features
    beat_sample_indices = []
    beat_symbols = []
    
    for sample, symbol in zip(ann.sample, ann.symbol):
        if symbol in AAMI_MAPPING:
            aami_cls = AAMI_MAPPING[symbol]
            if aami_cls in target_classes:
                beat_sample_indices.append(sample)
                beat_symbols.append(aami_cls)
                
    beat_sample_indices = np.array(beat_sample_indices, dtype=np.int64)
    if len(beat_sample_indices) == 0:
        return {"waveforms": np.empty((0, pre_samples + post_samples)), "features": np.empty((0, 4)), "labels": np.empty(0), "samples": np.empty(0)}
        
    # Compute RR timing features
    rr_features = compute_rr_features(beat_sample_indices, fs=fs, local_window_beats=10)
    
    window_len = pre_samples + post_samples
    total_samples = len(filtered_signal)
    
    valid_waveforms = []
    valid_features = []
    valid_labels = []
    valid_samples = []
    
    for i, r_peak in enumerate(beat_sample_indices):
        start = r_peak - pre_samples
        end = r_peak + post_samples
        
        # Guard against boundary cuts
        if start < 0 or end > total_samples:
            continue
            
        segment = filtered_signal[start:end]
        valid_waveforms.append(segment)
        valid_features.append(rr_features[i])
        valid_labels.append(CLASS_TO_IDX[beat_symbols[i]])
        valid_samples.append(r_peak)
        
    return {
        "waveforms": np.array(valid_waveforms, dtype=np.float32),
        "features": np.array(valid_features, dtype=np.float32),
        "labels": np.array(valid_labels, dtype=np.int64),
        "samples": np.array(valid_samples, dtype=np.int64),
        "lead_used": lead_used,
        "raw_signal": raw_signal.astype(np.float32),
        "filtered_signal": filtered_signal.astype(np.float32),
        "fs": fs
    }

def process_and_save_datasets(
    raw_dir: str = "data/raw",
    out_dir: str = "data/processed",
    pre_samples: int = 90,
    post_samples: int = 162
):
    """
    Processes all records, computes train-only normalization, and saves final partitions.
    """
    raw_path = Path(raw_dir)
    out_path = Path(out_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    
    logger.info("Extracting beats from DS1_TRAIN records to compute leak-proof scaling parameters...")
    
    train_waveforms_list, train_features_list, train_labels_list, train_records_list, train_samples_list = [], [], [], [], []
    
    for rec in DS1_TRAIN_RECORDS:
        rec_data = extract_record_beats(str(raw_path / rec), pre_samples=pre_samples, post_samples=post_samples)
        n = len(rec_data["labels"])
        if n > 0:
            train_waveforms_list.append(rec_data["waveforms"])
            train_features_list.append(rec_data["features"])
            train_labels_list.append(rec_data["labels"])
            train_records_list.extend([rec] * n)
            train_samples_list.append(rec_data["samples"])
            
    train_waveforms = np.concatenate(train_waveforms_list, axis=0)
    train_features = np.concatenate(train_features_list, axis=0)
    train_labels = np.concatenate(train_labels_list, axis=0)
    train_samples = np.concatenate(train_samples_list, axis=0)
    
    # TRAIN-ONLY NORMALIZATION:
    # 1. Waveform normalization: global mean and std across training beats
    wf_mean = float(np.mean(train_waveforms))
    wf_std = float(np.std(train_waveforms))
    if wf_std < 1e-6:
        wf_std = 1.0
        
    # 2. RR feature normalization: mean and std per feature dimension across training beats
    rr_mean = np.mean(train_features, axis=0).tolist()
    rr_std = np.std(train_features, axis=0).tolist()
    rr_std_arr = np.array([s if s > 1e-6 else 1.0 for s in rr_std], dtype=np.float32)
    rr_mean_arr = np.array(rr_mean, dtype=np.float32)
    
    scaler_params = {
        "waveform_mean": wf_mean,
        "waveform_std": wf_std,
        "rr_feature_names": ["pre_rr", "post_rr", "local_rr_avg", "rr_ratio"],
        "rr_mean": rr_mean,
        "rr_std": rr_std
    }
    
    with open(out_path / "scaler_params.json", "w") as f:
        json.dump(scaler_params, f, indent=2)
    logger.info(f"Fitted train-only scaler: Waveform mean={wf_mean:.4f}, std={wf_std:.4f}")
    
    def normalize_data(wf: np.ndarray, feat: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        norm_wf = (wf - wf_mean) / wf_std
        norm_feat = (feat - rr_mean_arr) / rr_std_arr
        return norm_wf.astype(np.float32), norm_feat.astype(np.float32)
        
    # Save Train partition
    norm_train_wf, norm_train_feat = normalize_data(train_waveforms, train_features)
    np.savez_compressed(
        out_path / "train.npz",
        waveforms=norm_train_wf,
        features=norm_train_feat,
        labels=train_labels,
        records=np.array(train_records_list),
        samples=train_samples,
        raw_waveforms=train_waveforms,
        raw_features=train_features
    )
    logger.info(f"Saved train.npz: {len(train_labels)} beats")
    
    def process_split_records(record_list: List[str], split_name: str):
        wf_list, feat_list, lbl_list, rec_list, smp_list = [], [], [], [], []
        for r in record_list:
            rec_data = extract_record_beats(str(raw_path / r), pre_samples=pre_samples, post_samples=post_samples)
            n = len(rec_data["labels"])
            if n > 0:
                wf_list.append(rec_data["waveforms"])
                feat_list.append(rec_data["features"])
                lbl_list.append(rec_data["labels"])
                rec_list.extend([r] * n)
                smp_list.append(rec_data["samples"])
                
        if len(lbl_list) == 0:
            return
            
        all_wf = np.concatenate(wf_list, axis=0)
        all_feat = np.concatenate(feat_list, axis=0)
        all_lbl = np.concatenate(lbl_list, axis=0)
        all_smp = np.concatenate(smp_list, axis=0)
        
        norm_wf, norm_feat = normalize_data(all_wf, all_feat)
        np.savez_compressed(
            out_path / f"{split_name}.npz",
            waveforms=norm_wf,
            features=norm_feat,
            labels=all_lbl,
            records=np.array(rec_list),
            samples=all_smp,
            raw_waveforms=all_wf,
            raw_features=all_feat
        )
        logger.info(f"Saved {split_name}.npz: {len(all_lbl)} beats from {len(record_list)} records")
        
    # Process and save remaining splits using strictly train-fitted scaler
    process_split_records(DS1_VAL_RECORDS, "val")
    process_split_records(DS2_RECORDS, "test_classical")
    process_split_records(DS2_STRICT_RECORDS, "test_strict")
    
    logger.info("Dataset preprocessing and partition packaging complete!")

if __name__ == "__main__":
    process_and_save_datasets()
