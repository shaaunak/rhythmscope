"use client";

import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Activity,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Sliders,
  Layers,
  Sparkles,
} from "lucide-react";
import dataAudit from "../../data/data_audit.json";
import sampleBeatsData from "../../data/sample_beats.json";

interface BeatInfo {
  beat_index: number;
  relative_sample: number;
  absolute_sample: number;
  time_seconds: number;
  true_class: string;
  predicted_class: string;
  is_correct: boolean;
  probabilities: Record<string, number>;
  rr_features: {
    pre_rr: number;
    post_rr: number;
    local_rr_avg: number;
    rr_ratio: number;
  };
}

interface StripData {
  record_id: string;
  fs: number;
  lead: string;
  start_second: number;
  duration_seconds: number;
  waveform: number[];
  beats: BeatInfo[];
}

interface ECGExplorerViewProps {
  initialRecord?: string;
  initialSample?: number;
}

export const ECGExplorerView: React.FC<ECGExplorerViewProps> = ({
  initialRecord = "200",
  initialSample,
}) => {
  const records = Object.keys(dataAudit.records || {});
  const [selectedRecord, setSelectedRecord] = useState<string>(initialRecord);
  const [selectedLead, setSelectedLead] = useState<string>("MLII");
  const [selectedModel, setSelectedModel] = useState<string>("Hybrid CNN");
  const [startSecond, setStartSecond] = useState<number>(
    initialSample ? Math.max(0, Math.floor(initialSample / 360) - 2) : 10.0
  );
  const [duration, setDuration] = useState<number>(6.0);
  const [stripData, setStripData] = useState<StripData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedBeat, setSelectedBeat] = useState<BeatInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Fetch or generate recording strip
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    const fetchStrip = async () => {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/api/records/${selectedRecord}/strip?start_second=${startSecond}&duration_seconds=${duration}&model=${selectedModel.toLowerCase().replace(/ /g, "_")}`
        );
        if (!res.ok) throw new Error("API offline or strip error");
        const data = await res.json();
        if (!isCancelled) {
          setStripData(data);
          if (data.beats && data.beats.length > 0) {
            setSelectedBeat(data.beats[0]);
          }
          setIsLoading(false);
        }
      } catch {
        // Fallback generator from bundled real sample beats
        const recordBeats = (sampleBeatsData as any[]).filter(
          (b) => b.record === selectedRecord
        );
        const synthBeats: BeatInfo[] = (recordBeats.length > 0 ? recordBeats : (sampleBeatsData as any[])).slice(0, 6).map((b, i) => ({
          beat_index: i + 1,
          relative_sample: Math.round(180 + i * 290),
          absolute_sample: b.r_peak_sample || 3600 + i * 290,
          time_seconds: startSecond + (180 + i * 290) / 360,
          true_class: b.true_class || "N",
          predicted_class: b.hybrid_prediction || b.true_class || "N",
          is_correct: b.true_class === b.hybrid_prediction,
          probabilities: b.probabilities || { N: 0.94, S: 0.02, V: 0.03, F: 0.01 },
          rr_features: b.rr_features || { pre_rr: 0.82, post_rr: 0.81, local_rr_avg: 0.82, rr_ratio: 1.0 },
        }));

        // Synthesize continuous waveform from bundled beat segments
        const fullWaveform: number[] = [];
        for (let s = 0; s < Math.round(duration * 360); s++) {
          const beatIdx = Math.floor(s / 290);
          const sampleInBeat = s % 290;
          const beatSrc = recordBeats[beatIdx % (recordBeats.length || 1)] || sampleBeatsData[0];
          const val = beatSrc.waveform[sampleInBeat % beatSrc.waveform.length] || 0;
          fullWaveform.push(val);
        }

        if (!isCancelled) {
          setStripData({
            record_id: selectedRecord,
            fs: 360,
            lead: selectedLead,
            start_second: startSecond,
            duration_seconds: duration,
            waveform: fullWaveform,
            beats: synthBeats,
          });
          setSelectedBeat(synthBeats[0]);
          setIsLoading(false);
        }
      }
    };

    fetchStrip();
    return () => {
      isCancelled = true;
    };
  }, [selectedRecord, startSecond, duration, selectedLead, selectedModel]);

  // Continuous playback effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setStartSecond((s) => Number((s + 1.0).toFixed(1)));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  const waveform = stripData?.waveform || [];
  const minVal = waveform.length ? Math.min(...waveform) : -1;
  const maxVal = waveform.length ? Math.max(...waveform) : 2;
  const range = maxVal - minVal || 1;

  const width = 800;
  const height = 300;
  const padX = 20;
  const padY = 35;

  const points = waveform.map((val, idx) => {
    const x = padX + (idx / (waveform.length - 1)) * (width - 2 * padX);
    const normY = (val - minVal) / range;
    const y = height - padY - normY * (height - 2 * padY);
    return { x, y, idx, val };
  });

  const svgPath = points.length
    ? `M ${points[0].x} ${points[0].y} ` +
      points
        .slice(1)
        .map((p) => `L ${p.x} ${p.y}`)
        .join(" ")
    : "";

  return (
    <div className="w-full">
      {/* 3-Column Layout Matching the Top-Right Design Reference */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Controls & Selectors (~25%)                  */}
        {/* ========================================================= */}
        <div className="lg:col-span-3 flex flex-col space-y-4">
          <div>
            <h1 className="text-3xl font-black text-primary tracking-tight leading-tight">
              Explore ECG
              <br />
              Records
            </h1>
            <p className="text-xs text-secondary mt-1.5 leading-relaxed">
              Continuous 360 Hz multi-lead signal browser with sample-aligned annotator
              references.
            </p>
          </div>

          {/* Floating Recording Selector */}
          <div className="bg-white rounded-3xl p-4 shadow-soft border border-white">
            <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-2">
              Select Recording
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["200", "201", "100", "105", "114", "231"].map((rec) => {
                const isSelected = selectedRecord === rec;
                const isDisjointSubject = rec === "201" || rec === "200";
                return (
                  <button
                    key={rec}
                    onClick={() => {
                      setSelectedRecord(rec);
                      setStartSecond(10.0);
                    }}
                    className={`px-2.5 py-2 rounded-2xl text-xs font-bold font-numeric transition-all ${
                      isSelected
                        ? "bg-primary text-white shadow-soft scale-[1.03]"
                        : "bg-surface-subtle text-primary hover:bg-surface-lavender"
                    }`}
                  >
                    <div>Rec {rec}</div>
                    <div className="text-[9px] opacity-70 font-normal">
                      {isDisjointSubject ? "Disjoint" : "MIT-BIH"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lead Selector */}
          <div className="bg-white rounded-3xl p-4 shadow-soft border border-white">
            <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-2">
              ECG Lead Channel
            </label>
            <div className="flex items-center space-x-2">
              {["MLII", "V1 / V5"].map((lead) => (
                <button
                  key={lead}
                  onClick={() => setSelectedLead(lead)}
                  className={`flex-1 py-2 rounded-2xl text-xs font-semibold transition-all ${
                    selectedLead === lead
                      ? "bg-primary text-white shadow-soft"
                      : "bg-surface-subtle text-secondary hover:text-primary"
                  }`}
                >
                  {lead}
                </button>
              ))}
            </div>
            {selectedRecord === "114" && (
              <span className="text-[10px] text-coral font-medium block mt-2">
                * Note: Record 114 has reversed signal lead channels (V5 is Lead 1).
              </span>
            )}
          </div>

          {/* Active ML Model Selector */}
          <div className="bg-white rounded-3xl p-4 shadow-soft border border-white">
            <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-2">
              Active Classifier
            </label>
            <div className="flex flex-col space-y-1.5">
              {[
                { name: "Hybrid CNN", badge: "Champion · 92.70%" },
                { name: "Waveform 1D CNN", badge: "Waveform Only · 91.04%" },
                { name: "Random Forest", badge: "RR Features · 90.15%" },
              ].map((m) => {
                const isSelected = selectedModel === m.name;
                return (
                  <button
                    key={m.name}
                    onClick={() => setSelectedModel(m.name)}
                    className={`flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-primary text-white shadow-soft"
                        : "bg-surface-subtle text-secondary hover:text-primary"
                    }`}
                  >
                    <span>{m.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-numeric ${
                        isSelected ? "bg-white/20 text-white" : "bg-white text-secondary"
                      }`}
                    >
                      {m.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CENTER COLUMN: Waveform Canvas & Scrubber (~50%)          */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 flex flex-col space-y-4">
          <div className="bg-white rounded-3xl p-5 shadow-soft border border-white flex flex-col justify-between min-h-[460px]">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between pb-3 border-b border-surface">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal animate-pulse" />
                <span className="text-xs font-bold text-primary">
                  Record {selectedRecord} · {selectedLead} (360 Hz)
                </span>
                <span className="text-[10px] text-secondary font-numeric">
                  [{startSecond.toFixed(1)}s – {(startSecond + duration).toFixed(1)}s]
                </span>
              </div>

              {/* Floating Zoom & Pan Buttons */}
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.15))}
                  className="w-8 h-8 rounded-full bg-surface-subtle hover:bg-surface-lavender flex items-center justify-center text-primary transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="w-8 h-8 rounded-full bg-surface-subtle hover:bg-surface-lavender flex items-center justify-center text-primary transition-colors"
                  title="Reset Zoom"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
                  className="w-8 h-8 rounded-full bg-surface-subtle hover:bg-surface-lavender flex items-center justify-center text-primary transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Scientific Waveform Canvas Area */}
            <div className="relative w-full h-[290px] my-2 ecg-grid-subtle rounded-2xl overflow-hidden border border-border/40 flex items-center justify-center">
              {isLoading ? (
                <div className="text-xs text-secondary font-medium animate-pulse">
                  Loading 360 Hz Lead Strip...
                </div>
              ) : (
                <div
                  className="relative w-full h-full transition-transform duration-200"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-full overflow-visible"
                  >
                    {/* Isoelectric Baseline */}
                    <line
                      x1={padX}
                      y1={height / 2}
                      x2={width - padX}
                      y2={height / 2}
                      stroke="#E2E4EB"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />

                    {/* Primary Turquoise Waveform Line */}
                    <path
                      d={svgPath}
                      fill="none"
                      stroke="#16A6A1"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Render Annotations Attached to R-Peaks */}
                    {stripData?.beats.map((b) => {
                      const beatFraction =
                        (b.time_seconds - startSecond) / duration;
                      if (beatFraction < 0 || beatFraction > 1) return null;
                      const bx = padX + beatFraction * (width - 2 * padX);
                      const isSelected = selectedBeat?.beat_index === b.beat_index;
                      const isAbnormal = b.true_class !== "N";

                      return (
                        <g key={b.beat_index} className="cursor-pointer" onClick={() => setSelectedBeat(b)}>
                          {/* Selected Column Highlight */}
                          {isSelected && (
                            <rect
                              x={bx - 20}
                              y={padY}
                              width="40"
                              height={height - 2 * padY}
                              fill={isAbnormal ? "rgba(244, 108, 131, 0.12)" : "rgba(22, 166, 161, 0.12)"}
                              rx="6"
                            />
                          )}

                          {/* R-Peak Marker Dot */}
                          <circle
                            cx={bx}
                            cy={height / 2 - 35}
                            r={isSelected ? "5" : "3.5"}
                            fill={isAbnormal ? "#F46C83" : "#16A6A1"}
                            stroke="#FFFFFF"
                            strokeWidth="2"
                          />

                          {/* Floating Pill Label */}
                          <foreignObject
                            x={bx - 14}
                            y={padY - 26}
                            width="28"
                            height="24"
                          >
                            <div
                              className={`w-7 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-soft border ${
                                isAbnormal
                                  ? "bg-coral text-white border-coral"
                                  : "bg-white text-teal border-teal/40"
                              }`}
                            >
                              {b.true_class}
                            </div>
                          </foreignObject>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}
            </div>

            {/* Bottom Playback & Timeline Scrubber Bar */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-soft hover:scale-105 active:scale-95 transition-all flex-shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4 text-coral" /> : <Play className="w-4 h-4 text-actionYellow fill-actionYellow" />}
              </button>

              <button
                onClick={() => setStartSecond((s) => Math.max(0, s - 3))}
                className="w-8 h-8 rounded-full bg-surface-subtle hover:bg-surface-lavender flex items-center justify-center text-primary transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Scrubber Range Slider */}
              <input
                type="range"
                min="0"
                max="180"
                step="1"
                value={startSecond}
                onChange={(e) => setStartSecond(parseFloat(e.target.value))}
                className="flex-1 accent-teal cursor-pointer h-2 bg-surface-lavender rounded-lg"
              />

              <button
                onClick={() => setStartSecond((s) => s + 3)}
                className="w-8 h-8 rounded-full bg-surface-subtle hover:bg-surface-lavender flex items-center justify-center text-primary transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono font-bold text-primary min-w-[55px] text-right">
                {startSecond.toFixed(1)}s
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Selected Heartbeat Detail Card (~25%)       */}
        {/* ========================================================= */}
        <div className="lg:col-span-3 flex flex-col space-y-4">
          <div className="bg-white rounded-3xl p-5 shadow-soft border border-white flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-primary">Selected Beat</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-subtle text-secondary">
                #{selectedBeat ? selectedBeat.beat_index : 1}
              </span>
            </div>

            {/* Enlarged Single Beat Mini-Waveform */}
            <div className="w-full h-24 bg-surface-subtle rounded-2xl ecg-grid-subtle p-2 mb-3 flex items-center justify-center border border-border/40">
              <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                <path
                  d="M 5 20 L 25 20 L 32 12 L 40 32 L 48 4 L 56 36 L 64 20 L 95 20"
                  fill="none"
                  stroke={selectedBeat?.true_class !== "N" ? "#F46C83" : "#16A6A1"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="48" cy="4" r="3" fill="#17191F" />
              </svg>
            </div>

            {/* Metadata Rows */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-surface">
                <span className="text-secondary">Timestamp:</span>
                <span className="font-numeric font-bold text-primary">
                  {selectedBeat ? selectedBeat.time_seconds.toFixed(3) : "10.820"}s
                </span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-surface">
                <span className="text-secondary">Annotated True Class:</span>
                <span className="font-bold text-primary flex items-center space-x-1">
                  <span>
                    {selectedBeat?.true_class === "N"
                      ? "Normal (N)"
                      : selectedBeat?.true_class === "V"
                      ? "Ventricular (V)"
                      : "Supraventricular (S)"}
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-surface">
                <span className="text-secondary">Model Prediction:</span>
                <span className="font-bold text-teal flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal" />
                  <span>{selectedBeat?.predicted_class || "N"}</span>
                </span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-surface">
                <span className="text-secondary">Calibrated Conf.:</span>
                <span className="font-numeric font-bold text-primary">
                  {(
                    (selectedBeat?.probabilities?.[selectedBeat?.predicted_class || "N"] || 0.942) * 100
                  ).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary">Pre-RR Interval:</span>
                <span className="font-numeric font-semibold text-primary">
                  {selectedBeat?.rr_features
                    ? (selectedBeat.rr_features.pre_rr * 1000).toFixed(0)
                    : 820} ms
                </span>
              </div>
            </div>

            {/* Signature Soft-Yellow CTA: "Inspect Beat ↗" */}
            <button
              onClick={() => {
                // Focus / cycle beat
                setZoomLevel(1.2);
              }}
              className="mt-5 w-full bg-actionYellow hover:bg-actionYellow-hover active:bg-actionYellow-active text-primary font-bold text-xs py-3.5 px-4 rounded-full flex items-center justify-between shadow-soft transition-all duration-200"
            >
              <span>Inspect Beat Morphology</span>
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center ml-2">
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
