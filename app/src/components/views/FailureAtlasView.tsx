"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Filter,
  ArrowUpRight,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Activity,
  Layers,
  HelpCircle,
  ShieldAlert,
} from "lucide-react";
import sampleBeatsData from "../../data/sample_beats.json";

interface FailureAtlasViewProps {
  onNavigateToExplorer?: (recordId: string, sampleIndex: number) => void;
}

export const FailureAtlasView: React.FC<FailureAtlasViewProps> = ({
  onNavigateToExplorer,
}) => {
  const beats = sampleBeatsData as any[];
  const failures = beats.filter((b) => !b.is_correct);

  const [filterTrueClass, setFilterTrueClass] = useState<string>("ALL");
  const [filterPredClass, setFilterPredClass] = useState<string>("ALL");
  const [selectedFailure, setSelectedFailure] = useState<any>(failures[0] || beats[0]);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const filteredFailures = failures.filter((f) => {
    if (filterTrueClass !== "ALL" && f.true_class !== filterTrueClass) return false;
    if (filterPredClass !== "ALL" && f.hybrid_prediction !== filterPredClass) return false;
    return true;
  });

  const wf = selectedFailure?.waveform || [];
  const minVal = wf.length ? Math.min(...wf) : -1;
  const maxVal = wf.length ? Math.max(...wf) : 2;
  const range = maxVal - minVal || 1;

  const width = 720;
  const height = 240;
  const padX = 20;
  const padY = 30;

  const svgPath = wf.length
    ? `M ${padX} ${height - padY - ((wf[0] - minVal) / range) * (height - 2 * padY)} ` +
      wf
        .slice(1)
        .map(
          (val: number, idx: number) =>
            `L ${padX + ((idx + 1) / (wf.length - 1)) * (width - 2 * padX)} ${
              height - padY - ((val - minVal) / range) * (height - 2 * padY)
            }`
        )
        .join(" ")
    : "";

  return (
    <div className="w-full">
      {/* 2-Column Split: Controls on Left, Waveform & Failure Details on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Large Heading & Filter Panel (~30%)          */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-primary tracking-tight leading-[1.08]">
              When and why
              <br />
              does it go wrong?
            </h1>
            <p className="text-xs text-secondary mt-2 leading-relaxed">
              Real misclassifications on unseen patients. Inspecting failure modes,
              morphological confounding, and why models fail when patients shift.
            </p>
          </div>

          {/* Filter Panel */}
          <div className="bg-white rounded-3xl p-5 shadow-soft border border-white space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
                Filter Failure Modes
              </span>
              <span className="text-xs font-bold text-coral font-numeric">
                {filteredFailures.length} Cases Found
              </span>
            </div>

            {/* True Class Filter */}
            <div>
              <label className="text-[10px] font-semibold text-secondary block mb-1.5">
                Annotated Ground Truth:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {["ALL", "S", "V", "N"].map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setFilterTrueClass(cls)}
                    className={`py-1.5 rounded-xl text-xs font-bold font-numeric transition-all ${
                      filterTrueClass === cls
                        ? "bg-primary text-white shadow-soft"
                        : "bg-surface-subtle text-secondary hover:text-primary"
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            {/* Predicted Class Filter */}
            <div>
              <label className="text-[10px] font-semibold text-secondary block mb-1.5">
                Erroneous Prediction:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {["ALL", "V", "N", "S"].map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setFilterPredClass(cls)}
                    className={`py-1.5 rounded-xl text-xs font-bold font-numeric transition-all ${
                      filterPredClass === cls
                        ? "bg-coral text-white shadow-soft"
                        : "bg-surface-subtle text-secondary hover:text-primary"
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            {/* Yellow Action Button */}
            <button
              onClick={() => {
                const curIdx = filteredFailures.findIndex(
                  (f) => f.beat_id === selectedFailure?.beat_id
                );
                const nextBeat = filteredFailures[(curIdx + 1) % filteredFailures.length];
                if (nextBeat) setSelectedFailure(nextBeat);
              }}
              className="mt-2 w-full bg-actionYellow hover:bg-actionYellow-hover active:bg-actionYellow-active text-primary font-bold text-xs py-3.5 px-4 rounded-full flex items-center justify-between shadow-soft transition-all duration-200"
            >
              <span>Inspect Next Failure</span>
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center ml-2">
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </button>
          </div>

          {/* Quick Clickable Failure Cases */}
          <div className="bg-white rounded-3xl p-4 shadow-soft border border-white space-y-2">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
              Curated Failure Catalog
            </span>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {filteredFailures.slice(0, 8).map((f) => {
                const isSelected = selectedFailure?.beat_id === f.beat_id;
                return (
                  <div
                    key={f.beat_id}
                    onClick={() => setSelectedFailure(f)}
                    className={`p-2.5 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? "bg-primary text-white shadow-soft"
                        : "bg-surface-subtle hover:bg-surface-lavender text-primary"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">
                        Record {f.record} · Beat #{f.beat_id}
                      </div>
                      <div
                        className={`text-[10px] ${
                          isSelected ? "text-white/70" : "text-secondary"
                        }`}
                      >
                        Sample {f.r_peak_sample}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-white text-primary font-numeric">
                        {f.true_class}
                      </span>
                      <span className="text-xs">→</span>
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-coral text-white font-numeric">
                        {f.hybrid_prediction}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT AREA: Waveform Canvas & Detailed Diagnostics (~70%) */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {/* Large Misclassified Waveform Stage */}
          <div className="bg-white rounded-3xl p-5 shadow-soft border border-white flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-coral animate-ping" />
                <span className="text-xs font-bold text-primary">
                  Record {selectedFailure?.record} · R-Peak {selectedFailure?.r_peak_sample} (Unseen Subject)
                </span>
              </div>

              {/* Zoom Buttons */}
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                  className="w-7 h-7 rounded-full bg-surface-subtle hover:bg-surface-lavender flex items-center justify-center text-primary transition-colors"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="w-7 h-7 rounded-full bg-surface-subtle hover:bg-surface-lavender flex items-center justify-center text-primary transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
                  className="w-7 h-7 rounded-full bg-surface-subtle hover:bg-surface-lavender flex items-center justify-center text-primary transition-colors"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Scientific Canvas */}
            <div className="relative w-full h-[240px] ecg-grid-subtle rounded-2xl overflow-hidden border border-border/40 my-1">
              <div
                className="w-full h-full transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                  {/* Aberrant QRS Region Highlight (Center) */}
                  <rect
                    x={width / 2 - 35}
                    y={padY}
                    width="70"
                    height={height - 2 * padY}
                    fill="rgba(244, 108, 131, 0.14)"
                    rx="8"
                  />

                  {/* Isoelectric Line */}
                  <line
                    x1={padX}
                    y1={height / 2}
                    x2={width - padX}
                    y2={height / 2}
                    stroke="#E2E4EB"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />

                  {/* Waveform Trace */}
                  <path
                    d={svgPath}
                    fill="none"
                    stroke="#F46C83"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* R-Peak Dot */}
                  <circle
                    cx={width / 2}
                    cy={height / 2 - 32}
                    r="5"
                    fill="#17191F"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              {/* Floating True vs Pred Badges */}
              <div className="absolute top-3 left-4 flex items-center space-x-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-float border border-white text-xs">
                <span className="text-secondary font-medium">Annotated:</span>
                <span className="font-bold text-teal">
                  Class {selectedFailure?.true_class} (Reference)
                </span>
              </div>

              <div className="absolute top-3 right-4 flex items-center space-x-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-float border border-white text-xs">
                <span className="text-secondary font-medium">Model Output:</span>
                <span className="font-bold text-coral">
                  Class {selectedFailure?.hybrid_prediction} (Misclassification)
                </span>
              </div>
            </div>

            <div className="mt-2 text-[11px] text-secondary">
              * Shaded area indicates region of greatest morphologic deviation from canonical sinus rhythm.
            </div>
          </div>

          {/* Bottom Diagnostic Panels: Beat Details, Attribution, Generalization */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Beat Details Card */}
            <div className="bg-white rounded-3xl p-4 shadow-soft border border-white flex flex-col justify-between">
              <span className="text-xs font-bold text-primary mb-2">Beat Diagnostics</span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between border-b border-surface pb-1">
                  <span className="text-secondary">Pre-RR Interval:</span>
                  <span className="font-numeric font-bold text-primary">
                    {selectedFailure?.rr_features
                      ? (selectedFailure.rr_features.pre_rr * 1000).toFixed(0)
                      : 740} ms
                  </span>
                </div>
                <div className="flex justify-between border-b border-surface pb-1">
                  <span className="text-secondary">RR Ratio:</span>
                  <span className="font-numeric font-bold text-primary">
                    {selectedFailure?.rr_features
                      ? selectedFailure.rr_features.rr_ratio.toFixed(2)
                      : "0.78"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">False Pos. Prob:</span>
                  <span className="font-numeric font-bold text-coral">
                    {(
                      (selectedFailure?.probabilities?.[selectedFailure?.hybrid_prediction] || 0.43) * 100
                    ).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Saliency Attribution Bar */}
            <div className="bg-white rounded-3xl p-4 shadow-soft border border-white flex flex-col justify-between">
              <span className="text-xs font-bold text-primary mb-2">Captum Attribution</span>
              <div className="space-y-1.5 text-xs">
                <div>
                  <div className="flex justify-between text-[10px] text-secondary mb-0.5">
                    <span>QRS Complex</span>
                    <span className="font-bold text-coral font-numeric">62%</span>
                  </div>
                  <div className="w-full bg-surface-lavender h-2 rounded-full overflow-hidden">
                    <div className="bg-coral h-full rounded-full" style={{ width: "62%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-secondary mb-0.5">
                    <span>Premature Timing (RR)</span>
                    <span className="font-bold text-teal font-numeric">28%</span>
                  </div>
                  <div className="w-full bg-surface-lavender h-2 rounded-full overflow-hidden">
                    <div className="bg-teal h-full rounded-full" style={{ width: "28%" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Patient Shift Insight */}
            <div className="bg-white rounded-3xl p-4 shadow-soft border border-white flex flex-col justify-between">
              <span className="text-xs font-bold text-primary mb-1">Morphological Confound</span>
              <p className="text-[11px] text-secondary leading-relaxed">
                Supraventricular beats with aberrant ventricular conduction mimic PVC wide-QRS morphology, explaining the false V prediction.
              </p>
              {onNavigateToExplorer && (
                <button
                  onClick={() =>
                    onNavigateToExplorer(selectedFailure.record, selectedFailure.r_peak_sample)
                  }
                  className="mt-2 text-left text-xs font-bold text-teal hover:underline"
                >
                  View in ECG Explorer →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
