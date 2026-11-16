"use client";

import React, { useState } from "react";

interface ECGWaveformProps {
  waveform: number[];
  cleanWaveform?: number[];
  fs?: number;
  height?: number;
  strokeColor?: string;
  cleanStrokeColor?: string;
  showGrid?: boolean;
  showCalibrationPulse?: boolean;
  showPeakMarker?: boolean;
  peakIndex?: number;
  highlightFlipped?: boolean;
  className?: string;
}

export const ECGWaveform: React.FC<ECGWaveformProps> = ({
  waveform,
  cleanWaveform,
  fs = 360,
  height = 200,
  strokeColor = "#0D9488", // Teal
  cleanStrokeColor = "rgba(100, 116, 139, 0.4)", // Slate muted
  showGrid = true,
  showCalibrationPulse = true,
  showPeakMarker = true,
  peakIndex = 90,
  highlightFlipped = false,
  className = ""
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; sample: number; mv: number; timeMs: number } | null>(null);

  if (!waveform || waveform.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-surface-subtle border border-border rounded text-sm text-gray-500 h-[${height}px]`}>
        No waveform data available
      </div>
    );
  }

  const n = waveform.length;
  // Compute auto-scaling based on amplitude range
  const allValues = cleanWaveform ? [...waveform, ...cleanWaveform] : waveform;
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  
  // Pad bounds slightly to avoid clipping peaks
  const yPadding = Math.max(0.2, (rawMax - rawMin) * 0.15);
  const yMin = rawMin - yPadding;
  const yMax = rawMax + yPadding;
  const yRange = (yMax - yMin) || 1.0;

  const width = 600; // SVG viewBox coordinate width
  const svgHeight = height;

  const mapX = (index: number) => (index / (n - 1)) * width;
  const mapY = (val: number) => svgHeight - ((val - yMin) / yRange) * svgHeight;

  // Build SVG path strings
  const buildPath = (data: number[]) => {
    return data.reduce((path, val, idx) => {
      const x = mapX(idx);
      const y = mapY(val);
      return idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${path} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, "");
  };

  const activePath = buildPath(waveform);
  const cleanPath = cleanWaveform ? buildPath(cleanWaveform) : null;
  const peakX = mapX(peakIndex);
  const baselineY = mapY(0.0);

  // Calibration pulse coordinates (1 mV height representation at left edge)
  const pulseX = 14;
  const pulseWidth = 14;
  const pulseY0 = Math.min(svgHeight - 20, Math.max(30, baselineY));
  const oneMvHeight = (1.0 / yRange) * svgHeight;
  const pulseY1 = pulseY0 - Math.min(60, Math.max(20, oneMvHeight));

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clientX / rect.width));
    const sampleIdx = Math.round(ratio * (n - 1));
    const val = waveform[sampleIdx];
    const timeMs = Math.round(((sampleIdx - peakIndex) / fs) * 1000);

    setHoveredPoint({
      x: mapX(sampleIdx),
      y: mapY(val),
      sample: sampleIdx,
      mv: val,
      timeMs
    });
  };

  return (
    <div className={`relative select-none overflow-hidden rounded border border-border bg-[#FAF9F5] ${className}`}>
      {/* Visual Header Annotation */}
      <div className="absolute top-2 left-3 z-10 flex items-center space-x-3 text-[11px] font-numeric text-navy-700 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded border border-border/60">
        <span className="flex items-center space-x-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: highlightFlipped ? "#F43F5E" : strokeColor }} />
          <span className="font-medium text-navy-900">{highlightFlipped ? "Perturbed (Flip Detected)" : "Active Morphology"}</span>
        </span>
        {cleanWaveform && (
          <span className="flex items-center space-x-1 text-gray-500">
            <span className="w-2 h-0.5 bg-gray-400" />
            <span>Clean Baseline</span>
          </span>
        )}
        <span className="text-gray-400">|</span>
        <span className="text-gray-600">252 samples @ {fs} Hz (~0.7s)</span>
      </div>

      {hoveredPoint && (
        <div className="absolute top-2 right-3 z-10 text-[11px] font-numeric text-navy-900 bg-white/90 backdrop-blur-sm px-2.5 py-0.5 rounded border border-border/80 shadow-sm">
          <span>t: {hoveredPoint.timeMs >= 0 ? `+${hoveredPoint.timeMs}` : hoveredPoint.timeMs} ms</span>
          <span className="text-gray-300 mx-1.5">|</span>
          <span>amp: {hoveredPoint.mv.toFixed(3)} mV</span>
          <span className="text-gray-300 mx-1.5">|</span>
          <span className="text-gray-500">idx: {hoveredPoint.sample}</span>
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${svgHeight}`}
        className="w-full h-full cursor-crosshair block"
        style={{ height: `${svgHeight}px` }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        <defs>
          {/* Scientific ECG millivolt grid (1mm & 5mm equivalent) */}
          <pattern id="ecg-fine-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(226, 223, 210, 0.45)" strokeWidth="0.5" />
          </pattern>
          <pattern id="ecg-major-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <rect width="50" height="50" fill="url(#ecg-fine-grid)" />
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(203, 198, 180, 0.75)" strokeWidth="0.8" />
          </pattern>
        </defs>

        {/* Grid Background */}
        {showGrid && <rect width={width} height={svgHeight} fill="url(#ecg-major-grid)" />}

        {/* Isoelectric Baseline (0 mV) */}
        {baselineY >= 0 && baselineY <= svgHeight && (
          <line
            x1="0"
            y1={baselineY}
            x2={width}
            y2={baselineY}
            stroke="rgba(148, 163, 184, 0.35)"
            strokeDasharray="3 3"
            strokeWidth="0.8"
          />
        )}

        {/* 1 mV Calibration Pulse (Medical Instrumentation Standard) */}
        {showCalibrationPulse && (
          <g opacity="0.6">
            <path
              d={`M ${pulseX} ${pulseY0} L ${pulseX + 2} ${pulseY0} L ${pulseX + 2} ${pulseY1} L ${pulseX + pulseWidth - 2} ${pulseY1} L ${pulseX + pulseWidth - 2} ${pulseY0} L ${pulseX + pulseWidth} ${pulseY0}`}
              fill="none"
              stroke="#64748B"
              strokeWidth="1.2"
            />
            <text
              x={pulseX + pulseWidth / 2}
              y={pulseY1 - 4}
              fontSize="8"
              fontFamily="monospace"
              fill="#64748B"
              textAnchor="middle"
            >
              1mV
            </text>
          </g>
        )}

        {/* Reference R-peak Alignment Line */}
        {showPeakMarker && (
          <g>
            <line
              x1={peakX}
              y1="0"
              x2={peakX}
              y2={svgHeight}
              stroke="#D97706"
              strokeDasharray="2 3"
              strokeWidth="1.0"
              opacity="0.6"
            />
            <text
              x={peakX}
              y={svgHeight - 6}
              fontSize="9"
              fontFamily="monospace"
              fill="#D97706"
              textAnchor="middle"
              fontWeight="600"
            >
              R-peak (t=0)
            </text>
          </g>
        )}

        {/* Clean Baseline Waveform (Faint Gray Overlay) */}
        {cleanPath && (
          <path
            d={cleanPath}
            fill="none"
            stroke={cleanStrokeColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Active Waveform (Teal or Coral if Flipped) */}
        <path
          d={activePath}
          fill="none"
          stroke={highlightFlipped ? "#F43F5E" : strokeColor}
          strokeWidth="2.0"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover Crosshair */}
        {hoveredPoint && (
          <g>
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="4"
              fill={highlightFlipped ? "#F43F5E" : strokeColor}
              stroke="#FFFFFF"
              strokeWidth="2"
            />
            <line
              x1={hoveredPoint.x}
              y1="0"
              x2={hoveredPoint.x}
              y2={svgHeight}
              stroke="rgba(15, 23, 42, 0.2)"
              strokeWidth="0.8"
            />
          </g>
        )}
      </svg>
    </div>
  );
};
