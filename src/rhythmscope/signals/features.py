"""
Heartbeat timing and RR interval feature extraction.

Clinical background:
Arrhythmias such as Premature Ventricular Contractions (PVC / V) and
Premature Atrial Contractions (PAC / S) characteristically disrupt cardiac rhythm:
- S and V beats typically feature a shortened Pre-RR interval (premature arrival).
- V beats are frequently followed by a full compensatory pause (prolonged Post-RR).
- Normal sinus beats exhibit steady RR intervals matching the local running average.

Feature distinction:
- Online-accessible features: Pre-RR, Local running average, Ratio (computable immediately at beat arrival).
- Retrospective features: Post-RR (requires waiting for subsequent beat detection).
"""

from typing import List, Tuple
import numpy as np

def compute_rr_features(
    r_peaks: np.ndarray,
    fs: float = 360.0,
    local_window_beats: int = 10
) -> np.ndarray:
    """
    Computes RR features for each beat index in r_peaks:
    Returns array of shape (N, 4):
    [:, 0] = pre_rr (seconds)
    [:, 1] = post_rr (seconds)
    [:, 2] = local_rr_avg (seconds, preceding window)
    [:, 3] = rr_ratio (pre_rr / local_rr_avg)
    """
    n_beats = len(r_peaks)
    features = np.zeros((n_beats, 4), dtype=np.float32)
    
    if n_beats < 2:
        return features

    # Raw sample differences in seconds
    rr_intervals = np.diff(r_peaks) / float(fs) # length n_beats - 1
    
    # Median RR interval of the entire recording as fallback for boundaries
    median_rr = np.median(rr_intervals) if len(rr_intervals) > 0 else 0.8
    
    for i in range(n_beats):
        # Pre-RR interval
        if i == 0:
            pre_rr = rr_intervals[0] if len(rr_intervals) > 0 else median_rr
        else:
            pre_rr = rr_intervals[i - 1]
            
        # Post-RR interval (retrospective)
        if i == n_beats - 1:
            post_rr = rr_intervals[-1] if len(rr_intervals) > 0 else median_rr
        else:
            post_rr = rr_intervals[i]
            
        # Local running average of preceding RR intervals (online-computable)
        start_idx = max(0, i - local_window_beats)
        if i > 0 and start_idx < i:
            local_rr_avg = np.mean(rr_intervals[start_idx:i])
        else:
            local_rr_avg = pre_rr
            
        # Avoid division by zero
        local_rr_avg = max(float(local_rr_avg), 0.1)
        rr_ratio = pre_rr / local_rr_avg
        
        features[i, 0] = pre_rr
        features[i, 1] = post_rr
        features[i, 2] = local_rr_avg
        features[i, 3] = rr_ratio
        
    return features
