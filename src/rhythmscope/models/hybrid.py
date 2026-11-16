"""
Primary Hybrid 1D CNN + RR Interval Feature Network for ECG Heartbeat Classification.

Integrates:
1. 1D Convolutional branch: Learns morphological wave shape, QRS duration, ST elevation/depression, T wave inversion.
2. RR Interval branch: Embeds pre-RR, post-RR, local RR average, and RR ratio timing dynamics.
3. Multimodal fusion: Merges morphology embedding with timing representations for final classification.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F

class HybridECGNet(nn.Module):
    """
    Hybrid 1D CNN + RR Interval Feature Architecture.
    """
    def __init__(
        self,
        in_channels: int = 1,
        rr_features_dim: int = 4,
        morphology_embed_dim: int = 64,
        rr_embed_dim: int = 32,
        num_classes: int = 4,
        dropout: float = 0.3
    ):
        super().__init__()
        
        # Waveform feature extractor
        self.conv_branch = nn.Sequential(
            # Block 1
            nn.Conv1d(in_channels, 32, kernel_size=7, stride=1, padding=3, bias=False),
            nn.BatchNorm1d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool1d(kernel_size=2, stride=2), # 252 -> 126
            
            # Block 2
            nn.Conv1d(32, 64, kernel_size=5, stride=1, padding=2, bias=False),
            nn.BatchNorm1d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool1d(kernel_size=2, stride=2), # 126 -> 63
            
            # Block 3
            nn.Conv1d(64, 128, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm1d(128),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool1d(1) # -> 128
        )
        
        # Projection of morphology features
        self.morphology_proj = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128, morphology_embed_dim),
            nn.ReLU(inplace=True)
        )
        
        # RR timing features branch
        self.rr_branch = nn.Sequential(
            nn.Linear(rr_features_dim, rr_embed_dim),
            nn.ReLU(inplace=True),
            nn.Linear(rr_embed_dim, rr_embed_dim),
            nn.ReLU(inplace=True)
        )
        
        # Multimodal fusion classifier
        fusion_dim = morphology_embed_dim + rr_embed_dim
        self.classifier = nn.Sequential(
            nn.Linear(fusion_dim, 64),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
            nn.Linear(64, num_classes)
        )
        
    def forward(self, waveform: torch.Tensor, rr_features: torch.Tensor) -> torch.Tensor:
        """
        waveform: (B, 252) or (B, 1, 252)
        rr_features: (B, 4)
        """
        if waveform.dim() == 2:
            waveform = waveform.unsqueeze(1)
            
        # Waveform branch
        conv_out = self.conv_branch(waveform)
        morphology_emb = self.morphology_proj(conv_out)
        
        # RR branch
        rr_emb = self.rr_branch(rr_features)
        
        # Multimodal concatenation
        fused = torch.cat([morphology_emb, rr_emb], dim=1)
        logits = self.classifier(fused)
        return logits
        
    def extract_embeddings(self, waveform: torch.Tensor, rr_features: torch.Tensor) -> torch.Tensor:
        """Extracts fused multimodal representations."""
        if waveform.dim() == 2:
            waveform = waveform.unsqueeze(1)
        conv_out = self.conv_branch(waveform)
        morphology_emb = self.morphology_proj(conv_out)
        rr_emb = self.rr_branch(rr_features)
        return torch.cat([morphology_emb, rr_emb], dim=1)

if __name__ == "__main__":
    net = HybridECGNet()
    wf = torch.randn(8, 252)
    rr = torch.randn(8, 4)
    out = net(wf, rr)
    print("HybridECGNet smoke test output shape:", out.shape)
