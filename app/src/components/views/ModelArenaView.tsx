"use client";

import React, { useState } from "react";
import { BarChart3, ShieldCheck, Scale, Zap, Database, ArrowUpDown, Info } from "lucide-react";
import benchmarkResultsData from "../../data/benchmark_results.json";

export const ModelArenaView: React.FC = () => {
  const [activeSplit, setActiveSplit] = useState<"strict_patient_disjoint" | "classical_ds2">("strict_patient_disjoint");
  const [selectedModel, setSelectedModel] = useState<string>("hybrid_cnn");

  const splitData = benchmarkResultsData.splits[activeSplit];
  const deChazal = benchmarkResultsData.de_chazal_reference;

  const models = [
    { id: "hybrid_cnn", name: "Hybrid 1D CNN + RR", type: "Multimodal (Ours)", color: "text-teal-dark bg-teal-bg border-teal" },
    { id: "waveform_cnn", name: "Waveform 1D CNN", type: "Morphology Only", color: "text-navy-900 bg-surface-subtle border-border" },
    { id: "random_forest", name: "Random Forest", type: "RR Intervals Only", color: "text-navy-900 bg-surface-subtle border-border" },
    { id: "majority", name: "Majority Baseline", type: "Sanity Baseline", color: "text-gray-600 bg-surface-muted border-border" },
  ];

  const currentMetrics = splitData[selectedModel];
  const isStrict = activeSplit === "strict_patient_disjoint";

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-bg text-teal-dark border border-teal/20 mb-2">
              <Scale className="w-3.5 h-3.5" />
              <span>Multi-Model Benchmark & Historical Comparison</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-navy-950 font-serif">
              Model Arena: Strict vs Classical Generalization
            </h2>
            <p className="mt-1 text-sm text-navy-700">
              Evaluating four architectural philosophies under identical test cohorts. 
              Toggle between the <strong>Strict Patient-Disjoint Benchmark</strong> (DS2 excluding 202) and the historical <strong>Classical DS1/DS2 Benchmark</strong>.
            </p>
          </div>

          {/* Benchmark Partition Switcher */}
          <div className="flex items-center space-x-1 bg-surface-subtle p-1.5 rounded-xl border border-border">
            <button
              onClick={() => setActiveSplit("strict_patient_disjoint")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isStrict
                  ? "bg-navy-900 text-white shadow-sm"
                  : "text-navy-700 hover:text-navy-950"
              }`}
            >
              Strict Disjoint (21 Patients)
            </button>
            <button
              onClick={() => setActiveSplit("classical_ds2")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !isStrict
                  ? "bg-navy-900 text-white shadow-sm"
                  : "text-navy-700 hover:text-navy-950"
              }`}
            >
              Classical DS2 (Includes 202)
            </button>
          </div>
        </div>

        {/* Partition Overlap Note */}
        <div className="mt-4 p-3 bg-amber-bg/60 border border-amber/30 rounded-lg text-xs text-amber-900 flex items-start space-x-2">
          <Info className="w-4 h-4 text-amber shrink-0 mt-0.5" />
          <div>
            <strong>Subject Overlap Disclosure:</strong> MIT-BIH Records 201 (DS1) and 202 (DS2) come from the same individual. The classical benchmark is therefore not strictly patient-independent. RhythmScope highlights the <strong>Strict Disjoint</strong> partition as the true test of unseen patient generalization.
          </div>
        </div>
      </div>

      {/* Comparative Leaderboard Table */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-navy-950 uppercase tracking-wide">
          Evaluated Benchmark Leaderboard ({isStrict ? "Strict 21 Patients" : "Classical 22 Records"})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-numeric">
            <thead>
              <tr className="border-b border-border bg-[#FAF9F5] text-navy-800 font-bold">
                <th className="py-3 px-3">Architecture</th>
                <th className="py-3 px-3">Accuracy</th>
                <th className="py-3 px-3">Macro F1 (95% CI)</th>
                <th className="py-3 px-3">S-Sensitivity (Recall)</th>
                <th className="py-3 px-3">V-Sensitivity (Recall)</th>
                <th className="py-3 px-3">Inference Latency</th>
                <th className="py-3 px-3">Checkpoint Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {models.map((m) => {
                const res = splitData[m.id];
                const isSelected = selectedModel === m.id;
                const ci = res.bootstrap_ci?.macro_f1;

                return (
                  <tr
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-teal-bg/40 font-semibold" : "hover:bg-surface-subtle"
                    }`}
                  >
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-navy-950">{m.name}</div>
                      <div className="text-[10px] text-gray-500">{m.type}</div>
                    </td>
                    <td className="py-3 px-3 text-navy-950 font-bold">
                      {(res.accuracy * 100).toFixed(2)}%
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-teal-dark font-extrabold text-sm">
                        {res.macro_f1.toFixed(4)}
                      </span>
                      {ci && (
                        <span className="text-[10px] text-gray-500 block">
                          [{ci.ci_lower.toFixed(4)}, {ci.ci_upper.toFixed(4)}]
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={res.s_sensitivity > 0.4 ? "text-teal-dark font-bold" : "text-gray-500"}>
                        {(res.s_sensitivity * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={res.v_sensitivity > 0.8 ? "text-teal-dark font-bold" : "text-gray-500"}>
                        {(res.v_sensitivity * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-700">{res.latency_ms} ms</td>
                    <td className="py-3 px-3 text-gray-700">{res.checkpoint_size_kb} KB</td>
                  </tr>
                );
              })}

              {/* Historical de Chazal Comparison Row */}
              <tr className="bg-surface-subtle/80 text-navy-800 font-sans italic border-t-2 border-border">
                <td className="py-3 px-3">
                  <div className="font-bold text-navy-900">de Chazal et al. (2004)</div>
                  <div className="text-[10px] text-gray-500">Historical IEEE TBME Reference</div>
                </td>
                <td className="py-3 px-3 text-gray-400">—</td>
                <td className="py-3 px-3 text-gray-400">—</td>
                <td className="py-3 px-3 font-bold text-navy-900 font-numeric">
                  {(deChazal.metrics.s_sensitivity * 100).toFixed(1)}%
                </td>
                <td className="py-3 px-3 font-bold text-navy-900 font-numeric">
                  {(deChazal.metrics.v_sensitivity * 100).toFixed(1)}%
                </td>
                <td className="py-3 px-3 text-gray-400">—</td>
                <td className="py-3 px-3 text-gray-400">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Model Deep Dive: Per-Class Precision / Recall & Confusion Matrix */}
      {currentMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Per-Class Metrics Table (6 cols) */}
          <div className="lg:col-span-6 bg-white border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wide">
              Per-Class Performance breakdown: {models.find((m) => m.id === selectedModel)?.name}
            </h3>

            <table className="w-full text-xs text-left border-collapse font-numeric">
              <thead>
                <tr className="border-b border-border bg-[#FAF9F5] text-navy-800 font-bold">
                  <th className="py-2 px-3">Class</th>
                  <th className="py-2 px-3">Precision</th>
                  <th className="py-2 px-3">Recall (Sens)</th>
                  <th className="py-2 px-3">F1-Score</th>
                  <th className="py-2 px-3">Test Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {Object.entries(currentMetrics.per_class).map(([cls, m]: any) => (
                  <tr key={cls} className="hover:bg-surface-subtle">
                    <td className="py-2.5 px-3 font-mono font-bold text-navy-950">
                      {cls} ({cls === "N" ? "Normal" : cls === "S" ? "Supraventricular" : cls === "V" ? "Ventricular" : "Fusion"})
                    </td>
                    <td className="py-2.5 px-3">{(m.precision * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 font-bold text-teal-dark">{(m.recall * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 font-semibold text-navy-900">{m.f1_score.toFixed(4)}</td>
                    <td className="py-2.5 px-3 text-gray-600">{m.support} beats</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Normalized Confusion Matrix (6 cols) */}
          <div className="lg:col-span-6 bg-white border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wide">
              Normalized Confusion Matrix (Row: True Class, Col: Predicted)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse font-numeric">
                <thead>
                  <tr className="border-b border-border bg-[#FAF9F5] text-navy-800 font-bold">
                    <th className="py-2 px-3 text-left">True \ Pred</th>
                    {["N", "S", "V", "F"].map((c) => (
                      <th key={c} className="py-2 px-3 font-mono">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {currentMetrics.normalized_confusion_matrix?.map((row: number[], rIdx: number) => {
                    const rowLabel = ["N", "S", "V", "F"][rIdx];
                    return (
                      <tr key={rIdx}>
                        <td className="py-2 px-3 text-left font-mono font-bold text-navy-950 bg-surface-subtle">
                          {rowLabel}
                        </td>
                        {row.map((val: number, cIdx: number) => {
                          const isDiag = rIdx === cIdx;
                          const intensity = Math.min(1, Math.max(0, val));
                          const bgColor = isDiag
                            ? `rgba(13, 148, 136, ${0.15 + intensity * 0.75})`
                            : val > 0.05
                            ? `rgba(244, 63, 94, ${0.1 + intensity * 0.6})`
                            : "transparent";

                          return (
                            <td
                              key={cIdx}
                              style={{ backgroundColor: bgColor }}
                              className="py-2.5 px-3 font-mono font-medium text-navy-950"
                            >
                              {(val * 100).toFixed(1)}%
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
