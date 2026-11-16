"""
Signal filtering module for ECG processing.
Uses Second-Order Sections (SOS) Butterworth bandpass filter for numerical stability.
Baseline wander (~0.05-0.5 Hz) and high-frequency noise (>40 Hz, including 50/60 Hz powerline hum)
are removed while preserving diagnostic QRS, P, and T wave morphology.
"""

import numpy as np
from scipy.signal import butter, sosfiltfilt

def create_bandpass_sos(
    lowcut: float = 0.5,
    highcut: float = 40.0,
    fs: float = 360.0,
    order: int = 3
) -> np.ndarray:
    """
    Constructs a second-order sections (SOS) bandpass filter.
    Using SOS prevents numerical instability encountered with transfer function (b, a) formats
    at high sampling rates or steep orders.
    """
    nyq = 0.5 * fs
    low = lowcut / nyq
    high = highcut / nyq
    sos = butter(order, [low, high], btype='bandpass', output='sos')
    return sos

def filter_ecg(
    signal: np.ndarray,
    lowcut: float = 0.5,
    highcut: float = 40.0,
    fs: float = 360.0,
    order: int = 3
) -> np.ndarray:
    """
    Zero-phase bandpass filtering of an ECG signal using forward-backward SOS filtering.
    Preserves exact R-peak alignment without phase delay.
    """
    # Ensure float64 or float32 1D array
    sig = np.asarray(signal, dtype=np.float64)
    sos = create_bandpass_sos(lowcut=lowcut, highcut=highcut, fs=fs, order=order)
    
    # Zero-phase bidirectional filter
    filtered = sosfiltfilt(sos, sig)
    return filtered.astype(np.float32)

if __name__ == "__main__":
    # Smoke test filter
    sample_sig = np.random.randn(3600) + np.sin(np.linspace(0, 10, 3600))
    filt = filter_ecg(sample_sig)
    print("Filter smoke test successful! Filtered shape:", filt.shape)
