"use client";

import React, { useState } from "react";
import { AlertCircle, Filter, ArrowUpRight, CheckCircle2, Search, SlidersHorizontal, Activity } from "lucide-react";
import { ECGWaveform } from "../ECGWaveform";
import sampleBeatsData from "../../data/sample_beats.json";

interface FailureAtlasViewProps {
  onNavigateToExplorer?: (recordId: string, sampleIndex: number) => void;
}

export const FailureAtlasView: React.FC<FailureAtlasViewProps> = ({
  onNavigateToExplorer,
}) => {
  const beats = sampleBeatsData as any[];
  // Real misclassifications on strict test patients
  const failures = beats.filter((b) => !b.is_correct);

  const [filterTrueClass, setFilterTrueClass] = useState<string>("ALL");
  const [filterPredClass, setFilterPredClass] = useState<string>("ALL");
  const [filterRecord, setFilterRecord] = useState<string>("ALL");
  const [selectedFailure, setSelectedFailure] = useState<any>(failures[0] || null);

  // Unique records present in failures
  const records = Array.from(new Set(failures.map((f) => f.record))).sort();

  const filteredFailures = failures.filter((f) => {
    if (filterTrueClass !== "ALL" && f.true_class !== filterTrueClass) return false;
    if (filterPredClass !== "ALL" && f.hybrid_prediction !== filterPredClass) return false;
    if (filterRecord !== "ALL" && f.record !== filterRecord) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-coral-bg text-coral-dark border border-coral/20 mb-2">
              <AlertCircle className="w-3.5 h-3.5 text-coral" />
              <span>Genuine Out-of-Sample Misclassifications</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-navy-950 font-serif">
              Failure Atlas: Where Models Break
            </h2>
            <p className="mt-1 text-sm text-navy-700">
              Rigorous ML engineering requires inspecting where models fail rather than hiding errors behind aggregate accuracy.
              Explore genuine misclassifications from the 21 unseen strict patients.
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-numeric font-medium px-3 py-1.5 rounded-lg bg-surface-subtle border border-border text-navy-950 block">
              Showing <strong>{filteredFailures.length}</strong> of <strong>{failures.length}</strong> Curated Failures
            </span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-6 pt-4 border-t border-border flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-navy-800 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <span>Filters:</span>
          </div>

          {/* True Class Filter */}
          <div className="flex items-center space-x-1 text-xs">
            <span className="text-gray-500">True Class:</span>
            {["ALL", "N", "S", "V", "F"].map((cls) => (
              <button
                key={cls}
                onClick={() => setFilterTrueClass(cls)}
                className={`px-2 py-1 rounded border font-mono font-medium transition-colors ${
                  filterTrueClass === cls
                    ? "bg-navy-900 text-white border-navy-900"
                    : "bg-surface-subtle text-navy-800 border-border hover:bg-surface-muted"
                }`}
              >
                {cls}
              </button>
            ))}
          </div>

          {/* Predicted Class Filter */}
          <div className="flex items-center space-x-1 text-xs">
            <span className="text-gray-500">Predicted:</span>
            {["ALL", "N", "S", "V", "F"].map((cls) => (
              <button
                key={cls}
                onClick={() => setFilterPredClass(cls)}
                className={`px-2 py-1 rounded border font-mono font-medium transition-colors ${
                  filterPredClass === cls
                    ? "bg-navy-900 text-white border-navy-900"
                    : "bg-surface-subtle text-navy-800 border-border hover:bg-surface-muted"
                }`}
              >
                {cls}
              </button>
            ))}
          </div>

          {/* Record Selector */}
          <div className="flex items-center space-x-1 text-xs ml-auto">
            <span className="text-gray-500">Patient Record:</span>
            <select
              value={filterRecord}
              onChange={(e) => setFilterRecord(e.target.value)}
              className="bg-white border border-border rounded px-2 py-1 text-xs font-mono text-navy-900"
            >
              <option value="ALL">All Records</option>
              {records.map((r) => (
                <option key={r} value={r}>
                  Record {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Failure Inspector & Gallery Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Failure List (5 cols) */}
        <div className="lg:col-span-5 space-y-3 max-h-[700px] overflow-y-auto pr-1">
          {filteredFailures.map((f) => {
            const isSelected = selectedFailure && selectedFailure.beat_id === f.beat_id;
            return (
              <div
                key={f.beat_id}
                onClick={() => setSelectedFailure(f)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "border-navy-900 bg-white shadow-md ring-1 ring-navy-900"
                    : "border-border bg-white hover:bg-surface-subtle"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-surface-muted text-navy-950 border border-border">
                      True: {f.true_class}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-coral-bg text-coral-dark border border-coral/30">
                      Pred: {f.hybrid_prediction}
                    </span>
                  </div>
                  <span className="text-[11px] font-numeric text-gray-500">
                    Rec {f.record} · #{f.beat_id}
                  </span>
                </div>

                <div className="h-16 w-full">
                  <ECGWaveform
                    waveform={f.waveform}
                    height={64}
                    showGrid={false}
                    showCalibrationPulse={false}
                    showPeakMarker={false}
                    strokeColor="#F43F5E"
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] font-numeric text-gray-600">
                  <span>Sample: {f.r_peak_sample}</span>
                  <span>RR Ratio: {f.rr_features.rr_ratio.toFixed(2)}x</span>
                  <span>Conf: {(f.probabilities[f.hybrid_prediction] * 100).toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Detailed Diagnostic Inspector (7 cols) */}
        <div className="lg:col-span-7">
          {selectedFailure ? (
            <div className="bg-white border border-border rounded-xl p-6 shadow-sm space-y-5 sticky top-24">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-bold font-serif text-navy-950">
                      Beat Failure Case #{selectedFailure.beat_id}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-coral-bg text-coral-dark border border-coral/30 font-bold">
                      {selectedFailure.true_class} confused with {selectedFailure.hybrid_prediction}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-numeric mt-0.5">
                    Patient Record {selectedFailure.record} · Sample Position {selectedFailure.r_peak_sample} (Time ~{(selectedFailure.r_peak_sample / 360).toFixed(1)}s)
                  </p>
                </div>

                {onNavigateToExplorer && (
                  <button
                    onClick={() => onNavigateToExplorer(selectedFailure.record, selectedFailure.r_peak_sample)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-navy-900 hover:bg-navy-800 transition-colors shadow-sm"
                  >
                    <Activity className="w-3.5 h-3.5 text-teal-light" />
                    <span>View in Rhythm Strip</span>
                  </button>
                )}
              </div>

              {/* Exact Beat Waveform Visualization */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-navy-800 mb-1.5">
                  Extracted 252-Sample Segment (-90 to +162 samples)
                </div>
                <ECGWaveform
                  waveform={selectedFailure.waveform}
                  height={220}
                  strokeColor="#F43F5E"
                  highlightFlipped={true}
                />
              </div>

              {/* Probabilities across all 4 classes */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-navy-800 mb-2">
                  Model Output Probabilities (Softmax)
                </div>
                <div className="grid grid-cols-4 gap-2 text-center font-numeric">
                  {["N", "S", "V", "F"].map((cls) => {
                    const prob = selectedFailure.probabilities[cls] || 0.0;
                    const isTrue = cls === selectedFailure.true_class;
                    const isPred = cls === selectedFailure.hybrid_prediction;

                    return (
                      <div
                        key={cls}
                        className={`p-2.5 rounded-lg border text-xs ${
                          isTrue
                            ? "bg-teal-bg/60 border-teal/40 font-bold text-teal-dark"
                            : isPred
                            ? "bg-coral-bg/60 border-coral/40 font-bold text-coral-dark"
                            : "bg-surface-subtle border-border text-gray-600"
                        }`}
                      >
                        <div className="font-mono text-sm">{cls}</div>
                        <div className="text-sm font-bold mt-1">{(prob * 100).toFixed(1)}%</div>
                        <div className="text-[10px] mt-0.5">
                          {isTrue ? "(Ground Truth)" : isPred ? "(Model Pick)" : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comparative Model Decisions */}
              <div className="p-4 bg-[#FAF9F5] border border-border rounded-xl space-y-2">
                <div className="text-xs font-bold uppercase tracking-wide text-navy-900">
                  Model Multi-Perspective Breakdown
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs font-numeric">
                  <div className="p-2 bg-white rounded border border-border">
                    <div className="text-gray-500 text-[10px]">Hybrid CNN</div>
                    <div className="font-bold text-coral-dark font-mono mt-0.5">
                      {selectedFailure.hybrid_prediction}
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded border border-border">
                    <div className="text-gray-500 text-[10px]">Waveform 1D CNN</div>
                    <div className="font-bold font-mono text-navy-900 mt-0.5">
                      {selectedFailure.waveform_cnn_prediction}
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded border border-border">
                    <div className="text-gray-500 text-[10px]">Random Forest (RR)</div>
                    <div className="font-bold font-mono text-navy-900 mt-0.5">
                      {selectedFailure.rf_prediction}
                    </div>
                  </div>
                </div>
              </div>

              {/* Diagnostic Interpretation */}
              <div className="p-3 bg-surface-subtle border border-border rounded-lg text-xs text-navy-800 leading-relaxed">
                <strong className="text-navy-950 font-semibold">Clinical / Engineering Takeaway:</strong> Ectopic supraventricular (S) beats frequently present with narrow QRS complexes nearly identical to normal beats, relying heavily on subtle prematurity in RR intervals. When compensatory pauses are masked by patient heart rate variability, the classifier easily defaults to normal.
              </div>
            </div>
          ) : (
            <div className="bg-white border border-border rounded-xl p-12 text-center text-gray-500 text-sm">
              Select a failure case from the list to inspect its waveform and probabilities.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
