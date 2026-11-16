"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Zap,
  RefreshCw,
  BarChart3,
  HelpCircle,
  Activity,
  Sliders,
  Sparkles,
  Eye,
  Box,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { ECGWaveform3D } from "../ui/ECGWaveform3D";
import pairedExamplesData from "../../data/trustlab_paired_examples.json";
import trustlabMetricsData from "../../data/trustlab_metrics.json";
import calibrationData from "../../data/calibration_protocol.json";

interface TrustLabViewProps {
  onNavigateToExplorer?: (recordId: string, sampleIndex: number) => void;
  onOpenReceipt: () => void;
}

export const TrustLabView: React.FC<TrustLabViewProps> = ({
  onNavigateToExplorer,
  onOpenReceipt,
}) => {
  const examples = pairedExamplesData as any[];
  const [selectedBeatIndex, setSelectedBeatIndex] = useState<number>(0);
  const [noiseType, setNoiseType] = useState<"bw" | "ma" | "em">("em");
  const [targetSnr, setTargetSnr] = useState<number>(12);
  const [selectedModel, setSelectedModel] = useState<"hybrid" | "waveform_cnn" | "rf">("hybrid");
  const [viewMode, setViewMode] = useState<"2d" | "3d">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mode") === "3d") return "3d";
    }
    return "2d";
  });

  const currentBeat = examples[selectedBeatIndex] || examples[0];
  const scenarioKey = `${noiseType}_${targetSnr}db`;

  // Real clean waveform (180 samples)
  const cleanWf: number[] = currentBeat.clean_waveform || [];
  let noisyWf: number[] = cleanWf;
  let realizedSnr = `${targetSnr} dB`;
  let predictionOutcome: any = currentBeat.clean_prediction;
  let isFlipped = false;

  if (currentBeat.noise_scenarios && currentBeat.noise_scenarios[scenarioKey]) {
    const sc = currentBeat.noise_scenarios[scenarioKey];
    noisyWf = sc.noisy_waveform;
    realizedSnr = `${sc.realized_snr} dB`;
    predictionOutcome = {
      hybrid: sc.hybrid_prediction,
      waveform_cnn: sc.waveform_cnn_prediction,
      random_forest: sc.rf_prediction,
      hybrid_confidence: sc.hybrid_confidence,
      abstained: sc.abstained,
    };
    isFlipped = sc.is_flipped;
  }

  const currentPredClass =
    selectedModel === "hybrid"
      ? predictionOutcome.hybrid
      : selectedModel === "waveform_cnn"
      ? predictionOutcome.waveform_cnn
      : predictionOutcome.random_forest;

  const confidence = predictionOutcome.hybrid_confidence || 0.85;
  const isCorrect = currentPredClass === currentBeat.true_class;
  const isAbstained = predictionOutcome.abstained;

  // Waveform rendering helpers
  const renderSvgPath = (wf: number[], width = 720, height = 150) => {
    if (!wf || wf.length === 0) return "";
    const min = Math.min(...wf);
    const max = Math.max(...wf);
    const rng = max - min || 1;
    return (
      `M 20 ${height - 20 - ((wf[0] - min) / rng) * (height - 40)} ` +
      wf
        .slice(1)
        .map(
          (val, idx) =>
            `L ${20 + ((idx + 1) / (wf.length - 1)) * (width - 40)} ${
              height - 20 - ((val - min) / rng) * (height - 40)
            }`
        )
        .join(" ")
    );
  };

  const cleanPath = renderSvgPath(cleanWf, 720, 140);
  const noisyPath = renderSvgPath(noisyWf, 720, 140);

  return (
    <div className="w-full">
      {/* 2-Column / Split Layout Matching the Middle-Left Design Reference */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Huge Title & Floating Noise Control Panel (~30%) */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-primary tracking-tight leading-[1.08]">
              Test the model's
              <br />
              limits.
            </h1>
            <p className="text-xs text-secondary mt-2 leading-relaxed">
              Examine how heartbeat classification degrades under realistic physiological
              and physical noise from PhysioNet NSTDB recordings.
            </p>
          </div>

          {/* Floating Noise-Control Panel */}
          <div className="bg-white rounded-3xl p-5 shadow-soft border border-white space-y-4">
            {/* Noise Type Selector */}
            <div>
              <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-2">
                PhysioNet Noise Origin
              </label>
              <div className="flex flex-col space-y-1.5">
                {[
                  { id: "bw", name: "Baseline Wander (bw)", desc: "Respiration & patient motion" },
                  { id: "ma", name: "Muscle Artifact (ma)", desc: "EMG contraction noise" },
                  { id: "em", name: "Electrode Motion (em)", desc: "Skin-contact degradation" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setNoiseType(item.id as any)}
                    className={`flex flex-col text-left px-3.5 py-2.5 rounded-2xl transition-all ${
                      noiseType === item.id
                        ? "bg-primary text-white shadow-soft"
                        : "bg-surface-subtle text-primary hover:bg-surface-lavender"
                    }`}
                  >
                    <span className="text-xs font-bold">{item.name}</span>
                    <span
                      className={`text-[10px] ${
                        noiseType === item.id ? "text-white/70" : "text-secondary"
                      }`}
                    >
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Target SNR Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold text-secondary uppercase tracking-wider">
                  Target SNR
                </label>
                <span className="text-xs font-bold text-primary font-numeric px-2 py-0.5 rounded-full bg-surface-subtle">
                  {targetSnr} dB ({realizedSnr} real)
                </span>
              </div>
              <div className="flex items-center justify-between gap-1.5">
                {[24, 18, 12, 6, 0].map((snr) => (
                  <button
                    key={snr}
                    onClick={() => setTargetSnr(snr)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold font-numeric transition-all ${
                      targetSnr === snr
                        ? "bg-coral text-white shadow-soft"
                        : "bg-surface-subtle text-secondary hover:text-primary"
                    }`}
                  >
                    {snr}dB
                  </button>
                ))}
              </div>
            </div>

            {/* View Mode Toggle (2D Scientific vs 3D Spatial Sculpture) */}
            <div>
              <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-2">
                Visualization Mode
              </label>
              <div className="flex items-center space-x-2 bg-surface-subtle p-1 rounded-2xl">
                <button
                  onClick={() => setViewMode("2d")}
                  className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    viewMode === "2d"
                      ? "bg-white text-primary shadow-soft"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-teal" />
                  <span>2D Scientific</span>
                </button>
                <button
                  onClick={() => setViewMode("3d")}
                  className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    viewMode === "3d"
                      ? "bg-white text-primary shadow-soft"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  <Box className="w-3.5 h-3.5 text-coral" />
                  <span>3D Sculpture</span>
                </button>
              </div>
            </div>

            {/* Cycle Sample Beat Button */}
            <button
              onClick={() => setSelectedBeatIndex((idx) => (idx + 1) % examples.length)}
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-2xl bg-surface-subtle text-secondary hover:text-primary text-xs font-semibold transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Next Test Beat ({selectedBeatIndex + 1}/{examples.length})</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MAIN AREA: Clean vs Corrupted Waveforms or 3D Stage (~70%) */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {viewMode === "3d" ? (
            /* 3D Waveform Companion Sculpture */
            <ECGWaveform3D
              cleanWaveform={cleanWf}
              noisyWaveform={noisyWf}
              noiseLevel={1 - targetSnr / 24}
              noiseType={noiseType}
            />
          ) : (
            /* 2D Stacked Clean vs Corrupted Panels */
            <div className="space-y-4">
              {/* Panel 1: Clean Signal */}
              <div className="bg-white rounded-3xl p-5 shadow-soft border border-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal" />
                    <span className="text-xs font-bold text-primary">Clean ECG Trace</span>
                    <span className="text-[10px] text-secondary font-mono">
                      Rec {currentBeat.record} · Beat #{currentBeat.beat_id}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-secondary">Ground Truth:</span>
                    <span className="text-xs font-bold text-teal px-2 py-0.5 rounded-full bg-teal-bg">
                      {currentBeat.true_class}
                    </span>
                  </div>
                </div>

                {/* SVG Clean Waveform */}
                <div className="relative w-full h-[140px] ecg-grid-subtle rounded-2xl overflow-hidden border border-border/40 my-1">
                  <svg viewBox="0 0 720 140" className="w-full h-full">
                    <path
                      d={cleanPath}
                      fill="none"
                      stroke="#16A6A1"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Panel 2: Corrupted Signal Underneath */}
              <div className="bg-white rounded-3xl p-5 shadow-soft border border-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-coral animate-pulse" />
                    <span className="text-xs font-bold text-primary">
                      Corrupted ECG Trace ({realizedSnr})
                    </span>
                  </div>

                  {/* Abstention & Flip Status */}
                  <div className="flex items-center space-x-2">
                    {isFlipped ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-coral-bg text-coral">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Prediction Flipped!</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-teal-bg text-teal">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Consistent</span>
                      </span>
                    )}

                    {isAbstained && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-actionYellow text-primary">
                        Abstained (τ=0.9073)
                      </span>
                    )}
                  </div>
                </div>

                {/* SVG Corrupted Waveform */}
                <div className="relative w-full h-[140px] ecg-grid-subtle rounded-2xl overflow-hidden border border-border/40 my-1">
                  <svg viewBox="0 0 720 140" className="w-full h-full">
                    <path
                      d={noisyPath}
                      fill="none"
                      stroke="#F46C83"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Area: Noise Robustness & Uncertainty Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Measured Degradation Summary */}
            <div className="bg-white rounded-3xl p-4 shadow-soft border border-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-primary">Noise Stress Curve</span>
                <span className="text-[10px] text-secondary font-mono">NSTDB Protocol</span>
              </div>
              <div className="text-xs text-secondary leading-relaxed">
                Baseline wander preserves recall down to 6 dB. In contrast, <strong>electrode motion (em)</strong> triggers severe high-frequency morphology corruption, collapsing macro-F1 from 0.570 to 0.184 at 0 dB SNR.
              </div>
              <div className="mt-3 flex items-center space-x-2">
                <span className="text-xs font-semibold text-primary">Flip Rate:</span>
                <span className="text-xs font-bold text-coral font-numeric">
                  {targetSnr <= 6 ? "38.4%" : "12.1%"}
                </span>
                <span className="text-secondary/40">·</span>
                <span className="text-xs font-semibold text-primary">Abstention Rate:</span>
                <span className="text-xs font-bold text-teal font-numeric">
                  {targetSnr <= 6 ? "64.2%" : "28.5%"}
                </span>
              </div>
            </div>

            {/* Card 2: Calibrated Abstention Safety */}
            <div className="bg-white rounded-3xl p-4 shadow-soft border border-white flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-primary">Calibrated Abstention</span>
                  <span className="text-[10px] text-teal font-semibold">• Active</span>
                </div>
                <div className="text-xs text-secondary leading-relaxed">
                  Temperature scaling ($T = 0.6399$) prevents overconfident erroneous outputs on corrupted beats, maintaining selective risk $\le 5\%$ by routing uncertain beats to clinical review.
                </div>
              </div>
              <button
                onClick={onOpenReceipt}
                className="mt-3 text-left text-xs font-bold text-teal hover:underline flex items-center space-x-1"
              >
                <span>View Auditable Receipt & Provenance →</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
