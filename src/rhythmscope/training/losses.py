"""
Loss functions for handling severe class imbalance in ECG arrhythmia classification.

In typical ECG datasets:
- N (Normal) represents ~80-90% of all heartbeats
- V (Ventricular ectopic) represents ~7%
- S (Supraventricular ectopic) represents ~2-3%
- F (Fusion) represents <1%

Standard Cross-Entropy causes models to collapse toward predicting N.
We provide:
1. Class-Weighted Cross Entropy: Weights inversely proportional to class frequency.
2. Multi-Class Focal Loss: Down-weights well-classified examples with focusing parameter gamma.
"""

from typing import Optional
import torch
import torch.nn as nn
import torch.nn.functional as F

class FocalLoss(nn.Module):
    """
    Multi-class Focal Loss:
    FL(p_t) = - alpha_t * (1 - p_t)^gamma * log(p_t)
    """
    def __init__(
        self,
        gamma: float = 2.0,
        alpha: Optional[torch.Tensor] = None,
        reduction: str = "mean"
    ):
        super().__init__()
        self.gamma = gamma
        self.alpha = alpha
        self.reduction = reduction
        
    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        """
        logits: (B, C)
        targets: (B,)
        """
        # Compute log softmax probabilities
        log_p = F.log_softmax(logits, dim=1)
        # Probabilities
        p = torch.exp(log_p)
        
        # Gather target log-probs and probs
        log_pt = log_p.gather(1, targets.unsqueeze(1)).squeeze(1)
        pt = p.gather(1, targets.unsqueeze(1)).squeeze(1)
        
        # Focal modulating factor
        focal_term = (1.0 - pt) ** self.gamma
        loss = -focal_term * log_pt
        
        # Class weighting alpha if provided
        if self.alpha is not None:
            if self.alpha.device != logits.device:
                self.alpha = self.alpha.to(logits.device)
            alpha_t = self.alpha.gather(0, targets)
            loss = alpha_t * loss
            
        if self.reduction == "mean":
            return loss.mean()
        elif self.reduction == "sum":
            return loss.sum()
        return loss

def compute_effective_class_weights(
    class_counts: torch.Tensor,
    beta: float = 0.999
) -> torch.Tensor:
    """
    Computes class weights based on the 'Class-Balanced Loss Based on Effective Number of Samples'
    Cui et al., CVPR 2019.
    E_n = (1 - beta^n) / (1 - beta)
    weight = (1 - beta) / (1 - beta^n)
    """
    effective_num = 1.0 - torch.pow(beta, class_counts.float())
    weights = (1.0 - beta) / (effective_num + 1e-8)
    weights = weights / weights.sum() * len(class_counts)
    return weights
