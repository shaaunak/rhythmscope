"""
Tests for signal filtering and RR feature extraction.
"""

import numpy as np
import pytest

from rhythmscope.signals.filters import filter_ecg, create_bandpass_sos
from rhythmscope.signals.features import compute_rr_features

def test_butterworth_sos_filter_stability():
    """Verify that SOS filter produces finite, stable outputs without NaN or explosive values."""
    fs = 360.0
    t = np.linspace(0, 10, int(10 * fs))
    # 0.1 Hz baseline wander + 1.2 Hz heartbeat pulse + 60 Hz mains noise
    sig = 2.0 * np.sin(2 * np.pi * 0.1 * t) + np.sin(2 * np.pi * 1.2 * t) + 0.5 * np.sin(2 * np.pi * 60.0 * t)
    
    filtered = filter_ecg(sig, lowcut=0.5, highcut=40.0, fs=fs, order=3)
    
    assert len(filtered) == len(sig)
    assert not np.isnan(filtered).any()
    assert not np.isinf(filtered).any()
    # High-frequency 60Hz and 0.1Hz baseline should be substantially attenuated
    assert np.var(filtered) < np.var(sig)

def test_rr_features_calculation():
    """Verify computation of pre-RR, post-RR, local average, and ratio."""
    fs = 360.0
    # Simulate R-peaks spaced by 1 second (360 samples) with one premature beat at index 2
    # Normal: 0s, 1s, 2s, premature: 2.6s, normal: 3.8s, 4.8s
    r_peaks = np.array([0, 360, 720, 936, 1368, 1728])
    features = compute_rr_features(r_peaks, fs=fs, local_window_beats=5)
    
    assert features.shape == (len(r_peaks), 4)
    # The premature beat at index 3 (936 - 720 = 216 samples = 0.6s)
    pre_rr_premature = features[3, 0]
    assert np.isclose(pre_rr_premature, 0.6, atol=1e-3)
    
    # Its post-RR interval is 1368 - 936 = 432 samples = 1.2s (compensatory pause)
    post_rr_premature = features[3, 1]
    assert np.isclose(post_rr_premature, 1.2, atol=1e-3)
    
    # RR ratio should be significantly below 1.0 for premature beat
    rr_ratio = features[3, 3]
    assert rr_ratio < 0.8
