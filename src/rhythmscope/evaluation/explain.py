"""
Model explainability and feature attribution using Captum Integrated Gradients
and waveform perturbation analysis.
"""

from typing import Dict, List, Any, Tuple
import numpy as np
import torch
import torch.nn.functional as F
from captum.attr import IntegratedGradients

from rhythmscope.models.cnn import WaveformCNN
from rhythmscope.models.hybrid import HybridECGNet
from rhythmscope.data.splits import HEADLINE_CLASSES

# Anatomical segment regions in a 252-sample beat centered around R-peak (sample 90)
# (assuming 360 Hz sampling rate, 250ms pre-R, 450ms post-R)
SEGMENTS = {
    "P_wave": (0, 70),       # ~200ms to 55ms before R
    "PR_segment": (70, 85),  # ~55ms to 15ms before R
    "QRS_complex": (80, 115),# ~30ms before R to 70ms after R
    "ST_segment": (115, 170),# ~70ms to 220ms after R
    "T_wave": (170, 245)     # ~220ms to 430ms after R
}

def explain_waveform_beat(
    model: torch.nn.Module,
    waveform: np.ndarray,
    rr_features: np.ndarray = None,
    target_class: int = None,
    device: str = "cpu"
) -> Dict[str, Any]:
    """
    Computes Integrated Gradients attribution along the 252-sample waveform.
    Returns:
    - attribution scores along the 252 samples
    - predicted class and probability distribution
    - regional importance scores (P-wave, QRS, ST, T-wave)
    """
    model.eval()
    dev = torch.device(device)
    model.to(dev)
    
    # Waveform tensor (1, 1, 252)
    wf_tensor = torch.from_numpy(waveform).float().unsqueeze(0)
    if wf_tensor.dim() == 2:
        wf_tensor = wf_tensor.unsqueeze(1)
    wf_tensor = wf_tensor.to(dev)
    
    is_hybrid = isinstance(model, HybridECGNet)
    
    if is_hybrid:
        if rr_features is None:
            rr_features = np.zeros(4, dtype=np.float32)
        rr_tensor = torch.from_numpy(rr_features).float().unsqueeze(0).to(dev)
        
        # Wrapper so attribution targets the waveform input specifically
        class ModelWaveformWrapper(torch.nn.Module):
            def __init__(self, hybrid_m, rr_t):
                super().__init__()
                self.m = hybrid_m
                self.rr = rr_t
            def forward(self, x):
                return self.m(x, self.rr)
                
        wrapper = ModelWaveformWrapper(model, rr_tensor)
        with torch.no_grad():
            logits = model(wf_tensor, rr_tensor)
        ig = IntegratedGradients(wrapper)
    else:
        with torch.no_grad():
            logits = model(wf_tensor)
        ig = IntegratedGradients(model)
        
    probs = F.softmax(logits, dim=1).squeeze(0).cpu().numpy()
    pred_class = int(np.argmax(probs))
    
    if target_class is None:
        target_class = pred_class
        
    # Baseline is zero amplitude normalized signal
    baseline = torch.zeros_like(wf_tensor)
    attributions = ig.attribute(wf_tensor, baselines=baseline, target=target_class, n_steps=30)
    attr_scores = attributions.squeeze().detach().cpu().numpy()
    
    # Regional importance aggregation
    region_importance = {}
    abs_attr = np.abs(attr_scores)
    total_attr = np.sum(abs_attr) + 1e-8
    
    for seg_name, (start, end) in SEGMENTS.items():
        sub = abs_attr[start:end]
        region_importance[seg_name] = float(np.sum(sub) / total_attr)
        
    return {
        "predicted_class": HEADLINE_CLASSES[pred_class],
        "predicted_idx": pred_class,
        "probabilities": {cls_name: float(probs[i]) for i, cls_name in enumerate(HEADLINE_CLASSES)},
        "attributions": attr_scores.tolist(),
        "normalized_attributions": (attr_scores / (np.max(np.abs(attr_scores)) + 1e-8)).tolist(),
        "regional_importance": region_importance
    }

def perturbation_impact(
    model: torch.nn.Module,
    waveform: np.ndarray,
    rr_features: np.ndarray = None,
    device: str = "cpu"
) -> Dict[str, float]:
    """
    Measures drop in predicted class probability when masking out specific anatomical segments.
    """
    model.eval()
    dev = torch.device(device)
    model.to(dev)
    
    wf_tensor = torch.from_numpy(waveform).float().unsqueeze(0).to(dev)
    is_hybrid = isinstance(model, HybridECGNet)
    if is_hybrid:
        rr_tensor = torch.from_numpy(rr_features).float().unsqueeze(0).to(dev)
        with torch.no_grad():
            base_logits = model(wf_tensor, rr_tensor)
    else:
        with torch.no_grad():
            base_logits = model(wf_tensor)
            
    base_probs = F.softmax(base_logits, dim=1).squeeze(0).cpu().numpy()
    pred_idx = int(np.argmax(base_probs))
    base_p = float(base_probs[pred_idx])
    
    drop_results = {}
    for seg_name, (start, end) in SEGMENTS.items():
        masked_wf = waveform.copy()
        masked_wf[start:end] = 0.0 # zero baseline
        m_tensor = torch.from_numpy(masked_wf).float().unsqueeze(0).to(dev)
        
        with torch.no_grad():
            if is_hybrid:
                m_logits = model(m_tensor, rr_tensor)
            else:
                m_logits = model(m_tensor)
        m_prob = float(F.softmax(m_logits, dim=1).squeeze(0)[pred_idx].item())
        drop_results[seg_name] = round(max(0.0, base_p - m_prob), 4)
        
    return drop_results
