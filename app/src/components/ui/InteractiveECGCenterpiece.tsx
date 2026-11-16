"use client";

import React, { useState, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize2, Play, Pause, RefreshCw } from "lucide-react";
import { CurvedScrubberDial } from "./CurvedScrubberDial";
import sampleBeatsData from "../../data/sample_beats.json";

interface BeatItem {
  beat_id: number;
  record: string;
  r_peak_sample: number;
  true_class: string;
  hybrid_prediction: string;
  probabilities: { [key: string]: number };
  waveform: number[];
  rr_features?: {
    pre_rr: number;
    post_rr: number;
    local_rr_avg?: number;
    rr_ratio?: number;
  };
}

export const InteractiveECGCenterpiece: React.FC = () => {
  const beats = (sampleBeatsData as BeatItem[]) || [];

  // Default to first beat or find an interesting beat
  const [selectedBeatIndex, setSelectedBeatIndex] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [scrubberSample, setScrubberSample] = useState<number>(90);

  const currentBeat = beats[selectedBeatIndex] || beats[0];
  const waveform = currentBeat?.waveform || [];

  // Playback animation effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setScrubberSample((prev) => {
          if (prev >= 170) return 10;
          return prev + 2;
        });
      }, 50);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  // Generate SVG path from 180 samples
  const width = 580;
  const height = 380;
  const paddingX = 40;
  const paddingY = 50;

  // Find min/max for normalization
  const minVal = waveform.length ? Math.min(...waveform) : -1;
  const maxVal = waveform.length ? Math.max(...waveform) : 2;
  const range = maxVal - minVal || 1;

  const points = waveform.map((val, idx) => {
    const x = paddingX + (idx / (waveform.length - 1)) * (width - 2 * paddingX);
    // Invert y because SVG y goes down
    const normalizedY = (val - minVal) / range;
    const y = height - paddingY - normalizedY * (height - 2 * paddingY);
    return { x, y, val };
  });

  const svgPath = points.length
    ? `M ${points[0].x} ${points[0].y} ` +
      points
        .slice(1)
        .map((p) => `L ${p.x} ${p.y}`)
        .join(" ")
    : "";

  // Depth / Echo layer (offset slightly for spatial dimension)
  const echoPath = points.length
    ? `M ${points[0].x + 4} ${points[0].y + 6} ` +
      points
        .slice(1)
        .map((p) => `L ${p.x + 4} ${p.y + 6}`)
        .join(" ")
    : "";

  // Key feature points
  const rPeakPoint = points[90] || points[Math.floor(points.length / 2)] || { x: width / 2, y: height / 2 };
  const pWavePoint = points[45] || { x: width * 0.3, y: height * 0.6 };
  const tWavePoint = points[135] || { x: width * 0.75, y: height * 0.55 };

  // Current scrubbed point
  const currentScrubbedPoint = points[scrubberSample] || points[90];

  return (
    <div className="relative w-full flex flex-col items-center justify-between min-h-[580px] select-none py-2">
      {/* Floating Left Circular Controls (exactly like the 3 circular icons in Medcure) */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex flex-col space-y-2.5">
        <button
          onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
          title="Zoom In"
          className="w-10 h-10 rounded-full bg-white text-primary shadow-float border border-white flex items-center justify-center hover:bg-surface-subtle transition-transform active:scale-95"
        >
          <ZoomIn className="w-4 h-4 text-primary" />
        </button>
        <button
          onClick={() => {
            setZoomLevel(1);
            setScrubberSample(90);
          }}
          title="Reset View"
          className="w-10 h-10 rounded-full bg-white text-primary shadow-float border border-white flex items-center justify-center hover:bg-surface-subtle transition-transform active:scale-95"
        >
          <Maximize2 className="w-4 h-4 text-primary" />
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
          title="Zoom Out"
          className="w-10 h-10 rounded-full bg-white text-primary shadow-float border border-white flex items-center justify-center hover:bg-surface-subtle transition-transform active:scale-95"
        >
          <ZoomOut className="w-4 h-4 text-primary" />
        </button>
      </div>

      {/* Main Floating Waveform Stage */}
      <div
        className="relative w-full max-w-[620px] h-[400px] flex items-center justify-center transition-transform duration-300"
        style={{ transform: `scale(${zoomLevel})` }}
      >
        {/* Subtle grid texture background */}
        <div className="absolute inset-4 rounded-3xl opacity-40 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible z-10"
        >
          {/* Defs for gradients and glow */}
          <defs>
            <linearGradient id="ecgGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#16A6A1" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#22C5BE" stopOpacity="1" />
              <stop offset="100%" stopColor="#16A6A1" stopOpacity="0.4" />
            </linearGradient>
            <filter id="waveShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#16A6A1" floodOpacity="0.18" />
            </filter>
          </defs>

          {/* Isoelectric Baseline */}
          <line
            x1={paddingX}
            y1={height - paddingY - (-minVal / range) * (height - 2 * paddingY)}
            x2={width - paddingX}
            y2={height - paddingY - (-minVal / range) * (height - 2 * paddingY)}
            stroke="#E2E4EB"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />

          {/* Spatial Depth Echo Trace (translucent secondary shadow layer) */}
          <path
            d={echoPath}
            fill="none"
            stroke="#94D2BD"
            strokeWidth="2.5"
            strokeOpacity="0.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Primary High-Precision Turquoise ECG Waveform */}
          <path
            d={svgPath}
            fill="none"
            stroke="url(#ecgGlow)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#waveShadow)"
          />

          {/* Active Scrubber Head & Line */}
          {currentScrubbedPoint && (
            <g>
              <line
                x1={currentScrubbedPoint.x}
                y1={paddingY}
                x2={currentScrubbedPoint.x}
                y2={height - paddingY}
                stroke="#F46C83"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                opacity="0.8"
              />
              <circle
                cx={currentScrubbedPoint.x}
                cy={currentScrubbedPoint.y}
                r="6"
                fill="#F46C83"
                stroke="#FFFFFF"
                strokeWidth="2"
                className="animate-pulse"
              />
            </g>
          )}

          {/* R-Peak Feature Marker (Apex) */}
          <circle
            cx={rPeakPoint.x}
            cy={rPeakPoint.y}
            r="5"
            fill="#17191F"
            stroke="#FFFFFF"
            strokeWidth="2"
          />

          {/* Connector Line 1 to Callout Badge (Top Right) */}
          <path
            d={`M ${rPeakPoint.x} ${rPeakPoint.y} L ${rPeakPoint.x + 35} ${rPeakPoint.y - 35} L ${width - 130} ${rPeakPoint.y - 35}`}
            fill="none"
            stroke="#A0A5B5"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />
          <circle cx={width - 130} cy={rPeakPoint.y - 35} r="3" fill="#16A6A1" />

          {/* Connector Line 2 to Ventricular Callout (Bottom Left) */}
          <path
            d={`M ${pWavePoint.x} ${pWavePoint.y} L ${pWavePoint.x - 30} ${pWavePoint.y + 40} L ${60} ${pWavePoint.y + 40}`}
            fill="none"
            stroke="#A0A5B5"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />
          <circle cx={60} cy={pWavePoint.y + 40} r="3" fill="#F46C83" />
        </svg>

        {/* Floating Contextual Callout 1 (Top Right: R-Peak & Class) */}
        <div
          className="absolute z-20"
          style={{ top: "14%", right: "8%" }}
        >
          <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-float border border-white/80 flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal animate-pulse" />
            <span className="text-xs font-bold text-primary tracking-tight">
              {currentBeat.true_class === "N"
                ? "Normal Sinus (N)"
                : currentBeat.true_class === "V"
                ? "Ventricular Ectopic (V)"
                : "Supraventricular (S)"}
            </span>
            <span className="text-[11px] text-secondary font-numeric">
              {(
                ((currentBeat.probabilities?.[currentBeat.hybrid_prediction] || 0.94) * 100).toFixed(1)
              )}%
            </span>
          </div>
        </div>

        {/* Floating Contextual Callout 2 (Bottom Left: Morphology Feature) */}
        <div
          className="absolute z-20"
          style={{ bottom: "22%", left: "8%" }}
        >
          <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-float border border-white/80 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-coral" />
            <span className="text-xs font-semibold text-primary">
              Pre-RR: {currentBeat.rr_features ? (currentBeat.rr_features.pre_rr * 1000).toFixed(0) : "780"} ms
            </span>
          </div>
        </div>

        {/* Floating Contextual Callout 3 (Center Top: R-Peak Label) */}
        <div
          className="absolute z-20"
          style={{ top: "32%", left: "42%" }}
        >
          <div className="bg-white/95 backdrop-blur-md px-3 py-1 rounded-full shadow-float border border-white/80 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-[11px] font-semibold text-primary font-numeric">
              R-Peak · 0.250s
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Centerpiece Controls: Beat Switcher & Curved Scrubber Dial */}
      <div className="w-full flex flex-col items-center mt-2 z-20">
        {/* Play / Next Beat Pill Controls */}
        <div className="flex items-center space-x-3 mb-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-white text-primary text-xs font-semibold shadow-pill border border-border hover:bg-surface-subtle transition-colors"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 text-coral" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-teal fill-teal" />
                <span>Animate</span>
              </>
            )}
          </button>

          {/* Quick Beat Cycle Selector */}
          <button
            onClick={() =>
              setSelectedBeatIndex((prev) => (prev + 1) % Math.min(10, beats.length))
            }
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-white text-secondary text-xs font-medium shadow-pill border border-border hover:text-primary transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Cycle Beat ({selectedBeatIndex + 1}/{Math.min(10, beats.length)})</span>
          </button>
        </div>

        {/* The Signature Curved Scrubber Dial (replica of "3.8 nm" dial in Medcure) */}
        <CurvedScrubberDial
          currentSample={scrubberSample}
          totalSamples={180}
          onSampleChange={setScrubberSample}
          label={`${(scrubberSample / 360).toFixed(2)}s · Lead MLII`}
        />
      </div>
    </div>
  );
};
