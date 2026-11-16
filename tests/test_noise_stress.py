"""
Unit tests for TrustLab Real-Noise Stress Test Module.
Verifies:
1. Deterministic noise generation across seeds.
2. Measured SNR accuracy on synthetic signals.
3. Shape and alignment preservation.
4. Edge cases: flat signal or silent noise does not produce NaNs.
"""

import numpy as np
import pytest

from rhythmscope.evaluation.noise_stress import inject_measured_noise


def test_noise_determinism():
    sig = np.sin(np.linspace(0, 2 * np.pi, 252))
    noise = np.random.RandomState(123).randn(5000).astype(np.float32)
    
    noisy1, snr1 = inject_measured_noise(sig, noise, target_snr_db=18.0, deterministic_seed=42)
    noisy2, snr2 = inject_measured_noise(sig, noise, target_snr_db=18.0, deterministic_seed=42)
    
    assert np.allclose(noisy1, noisy2)
    assert snr1 == pytest.approx(snr2)


def test_measured_snr_accuracy():
    # Construct known clean AC signal and noise
    t = np.linspace(0, 10 * np.pi, 252)
    sig = np.sin(t).astype(np.float32)
    noise = np.random.RandomState(456).randn(10000).astype(np.float32)
    
    for target_snr in [24.0, 18.0, 12.0, 6.0, 0.0]:
        noisy, realized_snr = inject_measured_noise(sig, noise, target_snr_db=target_snr, deterministic_seed=7)
        assert realized_snr == pytest.approx(target_snr, abs=0.2)
        # Power of noisy signal should be greater than clean signal
        assert np.var(noisy) >= np.var(sig)


def test_edge_case_zero_signal():
    flat_sig = np.zeros(252, dtype=np.float32)
    noise = np.random.randn(2000).astype(np.float32)
    noisy, realized_snr = inject_measured_noise(flat_sig, noise, target_snr_db=12.0, deterministic_seed=1)
    assert not np.isnan(noisy).any()
    assert np.allclose(noisy, flat_sig)


def test_shape_preservation():
    sig = np.random.randn(252).astype(np.float32)
    noise = np.random.randn(5000).astype(np.float32)
    noisy, _ = inject_measured_noise(sig, noise, target_snr_db=6.0, deterministic_seed=99)
    assert noisy.shape == (252,)
    assert noisy.dtype == sig.dtype
