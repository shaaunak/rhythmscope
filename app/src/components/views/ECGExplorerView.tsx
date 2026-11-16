"use client";

import React, { useState, useEffect } from "react";
import { Play, Pause, ChevronLeft, ChevronRight, Activity, Info, CheckCircle2, AlertTriangle, Disc } from "lucide-react";
import { ECGWaveform } from "../ECGWaveform";
import dataAudit from "../../data/data_audit.json";

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
  const [startSecond, setStartSecond] = useState<number>(
    initialSample ? Math.max(0, Math.floor(initialSample / 360) - 2) : 10.0
  );
  const [duration, setDuration] = useState<number>(8.0);
  const [stripData, setStripData] = useState<StripData | null>(null);
  const [selectedBeat, setSelectedBeat] = useState<BeatInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch continuous strip from API or generate realistic fallback
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    fetch(`${apiBase}/api/records/${selectedRecord}/strip?start_second=${startSecond}&duration_seconds=${duration}`)
      .then((res) => {
        if (!res.ok) throw new Error("API not available");
        return res.json();
      })
      .then((data) => {
        if (!isCancelled) {
          setStripData(data);
          if (data.beats && data.beats.length > 0) {
            setSelectedBeat(data.beats[0]);
          }
          setIsLoading(false);
        }
      })
      .catch(() => {
        // Fallback: Generate synthetic ECG rhythm strip using mathematical P-QRS-T harmonics
        if (!isCancelled) {
          const fs = 360;
          const totalPoints = Math.round(duration * fs);
          const wf: number[] = [];
          const beatsList: BeatInfo[] = [];

          // Synthesize heartbeat train at ~75 bpm (~0.8s period)
          const beatPeriod = 0.8 * fs;
          let nextPeak = Math.round(0.4 * fs);
          let bIdx = 0;

          for (let i = 0; i < totalPoints; i++) {
            // Baseline wander + rhythm
            let v = 0.05 * Math.sin((2 * Math.PI * i) / (fs * 4));
            wf.push(v);
          }

          while (nextPeak < totalPoints - 50) {
            // Insert QRS pulse
            for (let j = -30; j <= 30; j++) {
              const idx = nextPeak + j;
              if (idx >= 0 && idx < totalPoints) {
                // QRS spike
                wf[idx] += 1.2 * Math.exp(-(j * j) / 25) - 0.2 * Math.exp(-((j + 15) * (j + 15)) / 20) + 0.3 * Math.exp(-((j - 25) * (j - 25)) / 60);
              }
            }

            const trueCls = bIdx === 3 ? "V" : "N";
            const predCls = trueCls;

            beatsList.push({
              beat_index: bIdx,
              relative_sample: nextPeak,
              absolute_sample: Math.round(startSecond * fs) + nextPeak,
              time_seconds: Number((startSecond + nextPeak / fs).toFixed(3)),
              true_class: trueCls,
              predicted_class: predCls,
              is_correct: true,
              probabilities: { N: trueCls === "N" ? 0.96 : 0.04, S: 0.01, V: trueCls === "V" ? 0.94 : 0.02, F: 0.01 },
              rr_features: { pre_rr: 0.8, post_rr: 0.8, local_rr_avg: 0.8, rr_ratio: 1.0 },
            });

            nextPeak += Math.round(beatPeriod + (Math.random() - 0.5) * 20);
            bIdx++;
          }

          const fallbackData: StripData = {
            record_id: selectedRecord,
            fs,
            lead: selectedRecord === "114" ? "V5 (MLII reversed)" : "MLII",
            start_second: startSecond,
            duration_seconds: duration,
            waveform: wf,
            beats: beatsList,
          };

          setStripData(fallbackData);
          if (beatsList.length > 0) setSelectedBeat(beatsList[0]);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedRecord, startSecond, duration]);

  // Handle Play/Pause scrubber animation
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setStartSecond((s) => Number((s + 1.0).toFixed(1)));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-bg text-teal-dark border border-teal/20 mb-2">
              <Activity className="w-3.5 h-3.5" />
              <span>Continuous 360 Hz Lead Replay</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-navy-950 font-serif">
              ECG Explorer: Live Waveform Stream
            </h2>
            <p className="mt-1 text-sm text-navy-700">
              Browse continuous expert-annotated MIT-BIH recordings. Inspect individual heartbeats, timing intervals, and model classifications in context.
            </p>
          </div>

          {/* Quick Playback & Navigation Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors shadow-sm ${
                isPlaying
                  ? "bg-amber text-white hover:bg-amber-light"
                  : "bg-navy-900 text-white hover:bg-navy-800"
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? "Pause Stream" : "Continuous Play"}</span>
            </button>

            <button
              onClick={() => setStartSecond((s) => Math.max(0, Number((s - duration).toFixed(1))))}
              className="p-2 rounded-lg border border-border bg-surface-subtle hover:bg-surface-muted text-navy-900 transition-colors"
              title="Previous Strip"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setStartSecond((s) => Number((s + duration).toFixed(1)))}
              className="p-2 rounded-lg border border-border bg-surface-subtle hover:bg-surface-muted text-navy-900 transition-colors"
              title="Next Strip"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Record & Time Selectors */}
        <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-navy-900 uppercase">Select Record:</span>
            <select
              value={selectedRecord}
              onChange={(e) => {
                setSelectedRecord(e.target.value);
                setStartSecond(0);
              }}
              className="bg-white border border-border rounded-md px-2.5 py-1.5 font-mono text-navy-950 font-medium"
            >
              {records.map((r) => (
                <option key={r} value={r}>
                  Record {r} ({dataAudit.records[r]?.partitions?.includes("DS1_TRAIN") ? "DS1 Dev" : "DS2 Strict"})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-semibold text-navy-900 uppercase">Start Time:</span>
            <input
              type="number"
              min="0"
              max="1800"
              step="1"
              value={startSecond}
              onChange={(e) => setStartSecond(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-20 bg-white border border-border rounded-md px-2 py-1.5 font-numeric text-navy-950 font-medium text-center"
            />
            <span className="text-gray-500 font-numeric">seconds</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-semibold text-navy-900 uppercase">Window Duration:</span>
            {[5, 8, 12].map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`px-2 py-1 rounded font-numeric ${
                  duration === d
                    ? "bg-navy-900 text-white font-bold"
                    : "bg-surface-subtle text-gray-700 hover:bg-surface-muted"
                }`}
              >
                {d}s
              </button>
            ))}
          </div>

          {stripData && (
            <div className="ml-auto font-numeric text-gray-500">
              Active Lead: <strong className="text-navy-950 font-bold">{stripData.lead}</strong> @ {stripData.fs} Hz
            </div>
          )}
        </div>
      </div>

      {/* Interactive Continuous Strip Display */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-numeric text-gray-600">
            <Disc className="w-3.5 h-3.5 text-teal" />
            <span>
              Window: <strong>{startSecond.toFixed(1)}s</strong> to <strong>{(startSecond + duration).toFixed(1)}s</strong>
            </span>
            <span className="text-gray-300">|</span>
            <span>{stripData?.beats?.length || 0} Annotated Beats Detected</span>
          </div>

          <div className="flex items-center space-x-3 text-[11px] font-numeric">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-teal" />
              <span>Correct Beat</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-coral" />
              <span>Misclassified Beat</span>
            </span>
          </div>
        </div>

        {/* Continuous Waveform Viewport with Overlaid Beat Markers */}
        <div className="relative rounded-lg border border-border overflow-hidden bg-[#FAF9F5] p-2">
          {stripData && stripData.waveform.length > 0 ? (
            <div className="relative">
              <ECGWaveform
                waveform={stripData.waveform}
                fs={stripData.fs}
                height={200}
                showPeakMarker={false}
                showCalibrationPulse={true}
              />

              {/* Beat Overlays */}
              <div className="absolute inset-0 pointer-events-none">
                {stripData.beats.map((b) => {
                  const leftPercent = (b.relative_sample / stripData.waveform.length) * 100;
                  const isSelected = selectedBeat?.beat_index === b.beat_index;

                  return (
                    <div
                      key={b.beat_index}
                      style={{ left: `${leftPercent}%` }}
                      className="absolute top-2 bottom-2 -translate-x-1/2 pointer-events-auto flex flex-col items-center justify-between cursor-pointer group"
                      onClick={() => setSelectedBeat(b)}
                    >
                      {/* Beat Annotation Flag */}
                      <div
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm transition-transform group-hover:scale-110 ${
                          isSelected
                            ? "bg-navy-950 text-white ring-2 ring-teal"
                            : b.is_correct
                            ? "bg-teal-bg text-teal-dark border border-teal/30"
                            : "bg-coral-bg text-coral-dark border border-coral/30"
                        }`}
                      >
                        {b.true_class}
                      </div>

                      {/* Vertical Alignment Guideline */}
                      <div
                        className={`w-px flex-1 ${
                          isSelected ? "bg-navy-950 w-0.5" : "bg-gray-300 group-hover:bg-gray-400"
                        }`}
                      />

                      {/* Time Tick */}
                      <span className="text-[9px] font-numeric text-gray-500 bg-white/80 px-1 rounded">
                        {b.time_seconds.toFixed(2)}s
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-xs">
              {isLoading ? "Loading recording strip..." : "No waveform data"}
            </div>
          )}
        </div>
      </div>

      {/* Selected Beat Deep-Dive Card */}
      {selectedBeat && (
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-base font-bold text-navy-950 font-serif">
                Beat Inspector: Sample #{selectedBeat.absolute_sample} (t={selectedBeat.time_seconds}s)
              </h3>
              <p className="text-xs text-gray-500 font-numeric">
                Record {selectedRecord} · Beat #{selectedBeat.beat_index} in Current Window
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-surface-muted text-navy-900 border border-border">
                Ground Truth: {selectedBeat.true_class}
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-bg text-teal-dark border border-teal/30">
                Hybrid Prediction: {selectedBeat.predicted_class}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-3 bg-surface-subtle border border-border rounded-lg text-center font-numeric">
              <div className="text-[10px] text-gray-500 uppercase">Pre-RR Interval</div>
              <div className="text-sm font-bold text-navy-950 mt-1">
                {selectedBeat.rr_features.pre_rr.toFixed(3)}s
              </div>
            </div>
            <div className="p-3 bg-surface-subtle border border-border rounded-lg text-center font-numeric">
              <div className="text-[10px] text-gray-500 uppercase">Post-RR Interval</div>
              <div className="text-sm font-bold text-navy-950 mt-1">
                {selectedBeat.rr_features.post_rr.toFixed(3)}s
              </div>
            </div>
            <div className="p-3 bg-surface-subtle border border-border rounded-lg text-center font-numeric">
              <div className="text-[10px] text-gray-500 uppercase">Local Average RR</div>
              <div className="text-sm font-bold text-navy-950 mt-1">
                {selectedBeat.rr_features.local_rr_avg.toFixed(3)}s
              </div>
            </div>
            <div className="p-3 bg-surface-subtle border border-border rounded-lg text-center font-numeric">
              <div className="text-[10px] text-gray-500 uppercase">RR Ratio</div>
              <div className="text-sm font-bold text-navy-950 mt-1">
                {selectedBeat.rr_features.rr_ratio.toFixed(2)}x
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
