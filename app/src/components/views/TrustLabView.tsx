"use client";

import React, { useState } from "react";
import { ShieldAlert, ShieldCheck, AlertTriangle, ArrowRight, Zap, RefreshCw, BarChart3, HelpCircle, Activity } from "lucide-react";
import { ECGWaveform } from "../ECGWaveform";
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
  // 20 real paired beats from strict test set
  const examples = pairedExamplesData as any[];
  const [selectedBeatIndex, setSelectedBeatIndex] = useState(0);
  const [noiseType, setNoiseType] = useState<"clean" | "bw" | "ma" | "em">("em");
  const [targetSnr, setTargetSnr] = useState<number>(12);
  const [selectedModel, setSelectedModel] = useState<"hybrid" | "waveform_cnn" | "rf">("hybrid");

  const currentBeat = examples[selectedBeatIndex] || examples[0];
  const scenarioKey = `${noiseType}_${targetSnr}db`;
  const isClean = noiseType === "clean";

  // Waveform selection
  const cleanWf: number[] = currentBeat.clean_waveform;
  let activeWf: number[] = cleanWf;
  let realizedSnr = "Clean";
  let predictionOutcome: any = currentBeat.clean_prediction;
  let isFlipped = false;

  if (!isClean && currentBeat.noise_scenarios && currentBeat.noise_scenarios[scenarioKey]) {
    const sc = currentBeat.noise_scenarios[scenarioKey];
    activeWf = sc.noisy_waveform;
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

  // Model class and confidence mapping
  const currentPredClass =
    selectedModel === "hybrid"
      ? predictionOutcome.hybrid
      : selectedModel === "waveform_cnn"
      ? predictionOutcome.waveform_cnn
      : predictionOutcome.random_forest;

  const confidence = predictionOutcome.hybrid_confidence || 0.85;
  const isCorrect = currentPredClass === currentBeat.true_class;
  const abstentionThreshold = calibrationData.abstention_thresholds.balanced.threshold;
  const isAbstained = predictionOutcome.abstained || confidence < abstentionThreshold;

  const noiseDescriptions: Record<string, string> = {
    clean: "Clean baseline recording from held-out patient",
    bw: "PhysioNet NSTDB Baseline Wander (respiratory drift & sensor displacement)",
    ma: "PhysioNet NSTDB Muscle Artifact (high-frequency myoelectric tremor)",
    em: "PhysioNet NSTDB Electrode Motion (transient skin contact loss & heavy shift)",
  };

  return (
    <div className="space-y-6">
      {/* Signature Header Banner */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center space-x-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-bg text-teal-dark border border-teal/20 mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Defining Product Experience · Research Milestone</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-navy-950 font-serif">
              TrustLab: Beyond the Prediction
            </h2>
            <p className="mt-1 text-sm text-navy-700 leading-relaxed">
              Standard ECG classifiers report static accuracy on pre-cut beats. TrustLab explores the critical research questions: 
              <strong className="text-navy-950"> When does a classifier fail on unseen patients? How does real signal corruption break morphology? And when does development-calibrated abstention protect reliability?</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenReceipt}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-navy-900 bg-surface-subtle border border-border hover:bg-surface-muted transition-colors flex items-center space-x-1.5"
            >
              <span>Audit Run Receipt</span>
            </button>
            {onNavigateToExplorer && (
              <button
                onClick={() => onNavigateToExplorer(currentBeat.record, currentBeat.sample_index)}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-navy-900 hover:bg-navy-800 transition-colors flex items-center space-x-1.5 shadow-sm"
              >
                <Activity className="w-3.5 h-3.5 text-teal-light" />
                <span>Open in ECG Explorer</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Interactive Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Controls & Signal Perturbator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Beat Selector from Strict Test Set */}
          <div className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-navy-800">
                1. Select Unseen Patient Beat
              </label>
              <span className="text-[11px] font-numeric text-gray-500">
                {examples.length} Verified Held-Out Beats
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {examples.slice(0, 12).map((b, idx) => {
                const isSelected = idx === selectedBeatIndex;
                const clsColor =
                  b.true_class === "N"
                    ? "border-teal/50 text-teal-dark bg-teal-bg/50"
                    : b.true_class === "V"
                    ? "border-coral/50 text-coral-dark bg-coral-bg/50"
                    : b.true_class === "S"
                    ? "border-amber/50 text-amber bg-amber-bg/50"
                    : "border-purple-300 text-purple-700 bg-purple-50";

                return (
                  <button
                    key={b.beat_id}
                    onClick={() => setSelectedBeatIndex(idx)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "border-navy-900 bg-navy-900 text-white shadow-sm ring-1 ring-navy-900"
                        : "hover:bg-surface-subtle bg-white border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold">
                        {b.true_class}-Beat
                      </span>
                      <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${isSelected ? "bg-navy-800 text-teal-light" : clsColor}`}>
                        Rec {b.record}
                      </span>
                    </div>
                    <div className={`text-[10px] mt-1 font-numeric truncate ${isSelected ? "text-gray-300" : "text-gray-500"}`}>
                      Idx #{b.beat_id}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-2.5 bg-surface-subtle border border-border rounded-lg text-xs font-numeric text-gray-700 flex justify-between items-center">
              <span>Patient Record: <strong className="text-navy-950 font-bold">{currentBeat.record}</strong></span>
              <span>Sample: <strong className="text-navy-950">{currentBeat.sample_index}</strong></span>
              <span>Ground Truth: <span className="font-bold text-teal-dark px-1.5 py-0.5 bg-white rounded border border-border">{currentBeat.true_class}</span></span>
            </div>
          </div>

          {/* Real-Noise Injection Controls */}
          <div className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-navy-800">
                2. Real PhysioNet NSTDB Noise Stream
              </label>
              <span className="text-[10px] text-gray-400 font-mono">Real Recordings</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "clean", label: "Clean Signal", sub: "Reference ECG" },
                { id: "bw", label: "Baseline Wander", sub: "NSTDB / bw (Respiration)" },
                { id: "ma", label: "Muscle Artifact", sub: "NSTDB / ma (Tremor)" },
                { id: "em", label: "Electrode Motion", sub: "NSTDB / em (Movement)" },
              ].map((n) => (
                <button
                  key={n.id}
                  onClick={() => setNoiseType(n.id as any)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    noiseType === n.id
                      ? "border-navy-900 bg-navy-900 text-white shadow-sm"
                      : "border-border bg-white hover:bg-surface-subtle text-navy-900"
                  }`}
                >
                  <div className="text-xs font-bold">{n.label}</div>
                  <div className={`text-[10px] mt-0.5 truncate ${noiseType === n.id ? "text-teal-light" : "text-gray-500"}`}>
                    {n.sub}
                  </div>
                </button>
              ))}
            </div>

            <div className="text-xs text-gray-600 bg-surface-subtle p-2.5 rounded-lg border border-border/70">
              <span className="font-medium text-navy-900">Disturbance:</span> {noiseDescriptions[noiseType]}
            </div>

            {/* SNR Slider (Only precomputed, scientifically calibrated steps) */}
            {!isClean && (
              <div className="space-y-2 pt-2 border-t border-border/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-navy-900">Signal-to-Noise Ratio (SNR):</span>
                  <span className="font-numeric font-bold text-teal-dark bg-teal-bg px-2 py-0.5 rounded border border-teal/20">
                    {targetSnr} dB ({targetSnr === 0 ? "Extreme (P_sig = P_noise)" : targetSnr <= 6 ? "Heavy Noise" : targetSnr <= 12 ? "Moderate" : "Mild"})
                  </span>
                </div>

                <div className="flex items-center space-x-1.5">
                  {[24, 18, 12, 6, 0].map((level) => (
                    <button
                      key={level}
                      onClick={() => setTargetSnr(level)}
                      className={`flex-1 py-1.5 text-xs font-numeric font-semibold rounded border transition-colors ${
                        targetSnr === level
                          ? "bg-navy-900 text-white border-navy-900"
                          : "bg-surface-subtle text-gray-700 border-border hover:bg-surface-muted"
                      }`}
                    >
                      {level} dB
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Model Architecture Switcher */}
          <div className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-navy-800 block">
              3. Compare Model Architecture
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "hybrid", label: "Hybrid CNN + RR", sub: "Morphology + Timing" },
                { id: "waveform_cnn", label: "Waveform 1D CNN", sub: "Morphology Only" },
                { id: "rf", label: "Random Forest", sub: "RR Intervals Only" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id as any)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    selectedModel === m.id
                      ? "border-teal-dark bg-teal-bg text-teal-dark font-bold shadow-sm"
                      : "border-border bg-white text-navy-800 hover:bg-surface-subtle"
                  }`}
                >
                  <div className="text-xs leading-tight">{m.label}</div>
                  <div className="text-[10px] text-gray-500 font-normal mt-0.5">{m.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Waveform Centerpiece & Diagnostic Readout (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Real ECG Waveform Visual Centerpiece */}
          <div className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-navy-950 font-serif">
                  Waveform Morphology Centerpiece
                </h3>
                <p className="text-xs text-gray-500 font-numeric">
                  Unseen Patient {currentBeat.record} · Reference R-peak Alignment (Sample 90 = 0 ms)
                </p>
              </div>

              {isFlipped && (
                <span className="inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-md bg-coral-bg text-coral-dark border border-coral/30 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5 text-coral" />
                  <span>PREDICTION FLIPPED UNDER NOISE</span>
                </span>
              )}
            </div>

            {/* High-Precision SVG Waveform */}
            <ECGWaveform
              waveform={activeWf}
              cleanWaveform={isClean ? undefined : cleanWf}
              height={260}
              highlightFlipped={isFlipped}
            />

            {/* RR Interval Timing Features Card */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border text-center">
              <div className="bg-surface-subtle p-2 rounded border border-border/60">
                <div className="text-[10px] text-gray-500 uppercase">Pre-RR</div>
                <div className="font-numeric text-xs font-bold text-navy-950">
                  {currentBeat.rr_features.pre_rr.toFixed(3)}s
                </div>
              </div>
              <div className="bg-surface-subtle p-2 rounded border border-border/60">
                <div className="text-[10px] text-gray-500 uppercase">Post-RR</div>
                <div className="font-numeric text-xs font-bold text-navy-950">
                  {currentBeat.rr_features.post_rr.toFixed(3)}s
                </div>
              </div>
              <div className="bg-surface-subtle p-2 rounded border border-border/60">
                <div className="text-[10px] text-gray-500 uppercase">Local Avg RR</div>
                <div className="font-numeric text-xs font-bold text-navy-950">
                  {currentBeat.rr_features.local_rr_avg.toFixed(3)}s
                </div>
              </div>
              <div className="bg-surface-subtle p-2 rounded border border-border/60">
                <div className="text-[10px] text-gray-500 uppercase">RR Ratio</div>
                <div className="font-numeric text-xs font-bold text-navy-950">
                  {currentBeat.rr_features.rr_ratio.toFixed(2)}x
                </div>
              </div>
            </div>
          </div>

          {/* Model Prediction & Development-Calibrated Abstention Diagnostics */}
          <div className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-navy-950 uppercase tracking-wide">
                Classification & Uncertainty Decision
              </h3>
              <span className="text-xs font-numeric text-gray-500">
                Fitted Temp: <strong className="text-navy-900">T = {calibrationData.temperature}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Predicted Class Output */}
              <div className={`p-4 rounded-xl border ${isCorrect ? "bg-teal-bg/30 border-teal/30" : "bg-coral-bg/30 border-coral/30"}`}>
                <div className="text-xs text-gray-600 font-medium">Model Output vs Ground Truth</div>
                <div className="mt-2 flex items-baseline space-x-3">
                  <span className="text-3xl font-extrabold font-mono text-navy-950">
                    {currentPredClass}
                  </span>
                  <span className="text-xs text-gray-500">
                    (Truth: <strong className="text-navy-900">{currentBeat.true_class}</strong>)
                  </span>
                </div>
                <div className="mt-2 text-xs font-numeric font-medium">
                  {isCorrect ? (
                    <span className="text-teal-dark flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Correct Classification</span>
                    </span>
                  ) : (
                    <span className="text-coral-dark flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Misclassified on Unseen Patient</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Development-Calibrated Abstention Pill */}
              <div className="p-4 rounded-xl border border-border bg-[#FAF9F5] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-navy-900">Confidence & Abstention:</span>
                  <span className="font-numeric font-bold text-navy-950">
                    {(confidence * 100).toFixed(1)}%
                  </span>
                </div>

                {/* Meter Bar with Threshold Marker */}
                <div className="relative w-full h-3 bg-surface-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      confidence >= 0.95
                        ? "bg-teal"
                        : confidence >= abstentionThreshold
                        ? "bg-amber"
                        : "bg-coral"
                    }`}
                    style={{ width: `${Math.min(100, confidence * 100)}%` }}
                  />
                  {/* Threshold Line at 90.73% */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-navy-950 z-10"
                    style={{ left: `${abstentionThreshold * 100}%` }}
                    title={`Abstention Threshold tau = ${abstentionThreshold}`}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  {isAbstained ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-coral-bg text-coral-dark border border-coral/30">
                      ABSTAINED (High Uncertainty)
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-teal-bg text-teal-dark border border-teal/30">
                      ACCEPTED (Confident)
                    </span>
                  )}
                  <span className="text-[10px] font-numeric text-gray-500">
                    Target Selective Risk ≤ 5%
                  </span>
                </div>
              </div>
            </div>

            {/* Scientific Caveat Banner */}
            <div className="p-3 bg-surface-subtle border border-border/80 rounded-lg text-xs text-navy-800 leading-normal flex items-start space-x-2">
              <HelpCircle className="w-4 h-4 text-navy-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-navy-950">Key Scientific Takeaway:</strong> Under pure waveform noise, Random Forest predictions stay constant because annotator-provided R-peaks do not shift. The Hybrid CNN combines both signals, offering morphological sensitivity while retaining timing robustness.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Degradation Matrix across all 15 NSTDB Scenarios */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-navy-950 font-serif">
              Measured Degradation Matrix (All 15 NSTDB Scenarios)
            </h3>
            <p className="text-xs text-gray-500">
              Evaluated on 5,000 strict held-out beats across 21 patients. Real PhysioNet NSTDB recordings.
            </p>
          </div>
          <span className="text-xs font-numeric font-medium text-teal-dark bg-teal-bg px-2.5 py-1 rounded border border-teal/20">
            Clean Baseline Macro F1: {trustlabMetricsData.clean_baseline.hybrid_cnn.macro_f1}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-numeric">
            <thead>
              <tr className="border-b border-border bg-[#FAF9F5] text-navy-800 font-bold">
                <th className="py-2.5 px-3">Noise Stream</th>
                <th className="py-2.5 px-3">SNR (dB)</th>
                <th className="py-2.5 px-3">Hybrid Macro F1</th>
                <th className="py-2.5 px-3">V-Recall</th>
                <th className="py-2.5 px-3">Flip Rate</th>
                <th className="py-2.5 px-3">Abstention Rate</th>
                <th className="py-2.5 px-3">Selective Risk</th>
                <th className="py-2.5 px-3">Waveform CNN F1</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {trustlabMetricsData.scenarios.map((sc, idx) => {
                const isCurrent = sc.noise_type === noiseType && sc.target_snr_db === targetSnr;
                return (
                  <tr
                    key={idx}
                    onClick={() => {
                      setNoiseType(sc.noise_type as any);
                      setTargetSnr(sc.target_snr_db);
                    }}
                    className={`cursor-pointer transition-colors ${
                      isCurrent
                        ? "bg-teal-bg/60 font-semibold text-navy-950"
                        : "hover:bg-surface-subtle text-navy-900"
                    }`}
                  >
                    <td className="py-2 px-3 font-sans font-medium uppercase text-navy-950">
                      {sc.noise_type} ({sc.noise_type === "bw" ? "Baseline Wander" : sc.noise_type === "ma" ? "Muscle Artifact" : "Electrode Motion"})
                    </td>
                    <td className="py-2 px-3">{sc.target_snr_db} dB</td>
                    <td className="py-2 px-3 text-teal-dark font-bold">
                      {sc.models.hybrid_cnn.macro_f1.toFixed(4)}
                    </td>
                    <td className="py-2 px-3">
                      {(sc.models.hybrid_cnn.v_recall * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 px-3">
                      <span className={sc.models.hybrid_cnn.flip_rate > 0.2 ? "text-coral font-bold" : ""}>
                        {(sc.models.hybrid_cnn.flip_rate * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {(sc.models.hybrid_cnn.abstention_rate * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 px-3">
                      {(sc.models.hybrid_cnn.selective_risk * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-gray-500">
                      {sc.models.waveform_cnn.macro_f1.toFixed(4)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
