"""
Waveform-only 1D Convolutional Neural Network for ECG heartbeat classification.
Extracts morphological QRS-T wave representations directly from raw 252-sample filtered windows.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F

class WaveformCNN(nn.Module):
    """
    1D CNN architecture:
    - 3 Conv1D blocks with BatchNorm and ReLU
    - Max pooling layers
    - Global Adaptive Average Pooling
    - Dense classification head
    """
    def __init__(
        self,
        in_channels: int = 1,
        num_classes: int = 4,
        dropout: float = 0.3
    ):
        super().__init__()
        
        # Block 1: Captures broad morphological slopes and baseline contours
        self.block1 = nn.Sequential(
            nn.Conv1d(in_channels, 32, kernel_size=7, stride=1, padding=3, bias=False),
            nn.BatchNorm1d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool1d(kernel_size=2, stride=2) # 252 -> 126
        )
        
        # Block 2: Captures intermediate QRS deflection width and notch patterns
        self.block2 = nn.Sequential(
            nn.Conv1d(32, 64, kernel_size=5, stride=1, padding=2, bias=False),
            nn.BatchNorm1d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool1d(kernel_size=2, stride=2) # 126 -> 63
        )
        
        # Block 3: Captures sharp high-frequency R-peak spikes and ST-T segment elevation/depression
        self.block3 = nn.Sequential(
            nn.Conv1d(64, 128, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm1d(128),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool1d(1) # -> 128
        )
        
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128, 64),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
            nn.Linear(64, num_classes)
        )
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Expected input shape: (B, 252) or (B, 1, 252)
        if x.dim() == 2:
            x = x.unsqueeze(1)
            
        x = self.block1(x)
        x = self.block2(x)
        x = self.block3(x)
        logits = self.classifier(x)
        return logits
        
    def extract_features(self, x: torch.Tensor) -> torch.Tensor:
        """Extracts learned 128-dimensional morphology embedding."""
        if x.dim() == 2:
            x = x.unsqueeze(1)
        x = self.block1(x)
        x = self.block2(x)
        x = self.block3(x)
        return torch.flatten(x, 1)

if __name__ == "__main__":
    net = WaveformCNN(num_classes=4)
    dummy = torch.randn(8, 252)
    out = net(dummy)
    print("WaveformCNN smoke test output shape:", out.shape)
