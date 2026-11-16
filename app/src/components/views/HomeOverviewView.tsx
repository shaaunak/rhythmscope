"use client";

import React from "react";
import {
  Activity,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  PhoneCall,
  Navigation as CompassIcon,
  ChevronRight,
  Sliders,
  AlertTriangle,
  FileCheck,
} from "lucide-react";
import { InteractiveECGCenterpiece } from "../ui/InteractiveECGCenterpiece";
import { RadialGauge } from "../ui/RadialGauge";
import { LollipopChart } from "../ui/LollipopChart";
import benchmarkResultsData from "../../data/benchmark_results.json";

interface HomeOverviewViewProps {
  onNavigateToExplorer: (recordId: string, sampleIndex: number) => void;
  onNavigateToTrustLab: () => void;
  onOpenReceipt: () => void;
}

export const HomeOverviewView: React.FC<HomeOverviewViewProps> = ({
  onNavigateToExplorer,
  onNavigateToTrustLab,
  onOpenReceipt,
}) => {
  // Extract real benchmark results
  const strictResults =
    (benchmarkResultsData as any)?.splits?.strict_patient_disjoint?.hybrid_cnn || {};
  const accuracyPct = strictResults.accuracy
    ? (strictResults.accuracy * 100).toFixed(1) + "%"
    : "92.7%";
  const latencyMs = strictResults.latency_ms
    ? strictResults.latency_ms.toFixed(2) + " ms"
    : "0.68 ms";
  const nRecall = strictResults.per_class?.N?.recall
    ? (strictResults.per_class.N.recall * 100).toFixed(0) + "%"
    : "96%";
  const vRecall = strictResults.per_class?.V?.recall
    ? (strictResults.per_class.V.recall * 100).toFixed(0) + "%"
    : "87%";
  const sRecall = strictResults.per_class?.S?.recall
    ? (strictResults.per_class.S.recall * 100).toFixed(0) + "%"
    : "54%";

  return (
    <div className="w-full">
      {/* 3-Column Responsive Grid matching the Medcure reference screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Editorial Headline & Compact Info Cards (~30%) */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 flex flex-col space-y-5">
          {/* Editorial Headline */}
          <div className="pt-2">
            <h1 className="text-4xl sm:text-5xl lg:text-[50px] font-black tracking-tight text-primary leading-[1.06] mb-3">
              Heartbeats,
              <br />
              decoded.
            </h1>
            <p className="text-sm sm:text-base text-secondary font-normal leading-relaxed max-w-sm">
              A deeper look into how machine learning understands the rhythm of the
              human heart.
            </p>
          </div>

          {/* Top 2 Compact Metric Cards (like "Blood Status" & "Hemoglobin Level") */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Card 1: Model Status with ECG wave */}
            <div className="bg-white rounded-3xl p-4 shadow-soft border border-white flex flex-col justify-between hover:shadow-float transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-full bg-coral-bg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-coral" />
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFF9D2] text-[#A16207]">
                  • Active
                </span>
              </div>
              <div>
                <div className="text-[11px] text-secondary font-medium">Model Status</div>
                <div className="text-xl font-bold text-primary font-numeric tracking-tight">
                  Hybrid CNN
                </div>
                <div className="text-[11px] text-teal font-medium mt-0.5">{accuracyPct} Strict Acc</div>
              </div>
              {/* Mini Waveform Sparkline */}
              <div className="h-8 mt-2 w-full">
                <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible">
                  <path
                    d="M 0 15 L 20 15 L 28 8 L 36 24 L 44 2 L 52 28 L 60 15 L 100 15"
                    fill="none"
                    stroke="#F46C83"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Card 2: Patient Disjoint Partition */}
            <div className="bg-white rounded-3xl p-4 shadow-soft border border-white flex flex-col justify-between hover:shadow-float transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-full bg-teal-bg flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-teal" />
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-bg text-teal">
                  • Disjoint
                </span>
              </div>
              <div>
                <div className="text-[11px] text-secondary font-medium">Test Split</div>
                <div className="text-xl font-bold text-primary font-numeric tracking-tight">
                  21 Unseen
                </div>
                <div className="text-[11px] text-secondary font-medium mt-0.5">Rec 202 Excluded</div>
              </div>
              {/* Mini Smooth Curve Sparkline */}
              <div className="h-8 mt-2 w-full">
                <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible">
                  <path
                    d="M 0 25 Q 35 25 50 8 T 100 12"
                    fill="none"
                    stroke="#F46C83"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="50" cy="8" r="3" fill="#F46C83" />
                </svg>
              </div>
            </div>
          </div>

          {/* Middle Row: Evaluated Patients / Traces (like Albert Smith and Adison in Medcure) */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Patient Card 1 */}
            <div
              onClick={() => onNavigateToExplorer("200", 295)}
              className="bg-white rounded-3xl p-3.5 shadow-soft border border-white flex items-center space-x-3 cursor-pointer hover:bg-surface-subtle transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-surface-lavender flex items-center justify-center font-bold text-xs text-primary font-numeric flex-shrink-0">
                P200
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-primary truncate">Record 200</div>
                <div className="text-[11px] text-secondary truncate">2,601 Beats · MLII</div>
              </div>
              <ChevronRight className="w-4 h-4 text-secondary/60 flex-shrink-0" />
            </div>

            {/* Patient Card 2 */}
            <div
              onClick={() => onNavigateToExplorer("201", 120)}
              className="bg-white rounded-3xl p-3.5 shadow-soft border border-white flex items-center space-x-3 cursor-pointer hover:bg-surface-subtle transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-surface-lavender flex items-center justify-center font-bold text-xs text-primary font-numeric flex-shrink-0">
                P201
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-primary truncate">Record 201</div>
                <div className="text-[11px] text-secondary truncate">1,963 Beats · True ID</div>
              </div>
              <ChevronRight className="w-4 h-4 text-secondary/60 flex-shrink-0" />
            </div>
          </div>

          {/* Bottom Action Row (like Phone, Plane, and "Book an Appointment ↗" in Medcure) */}
          <div className="flex items-center space-x-2.5 pt-1">
            {/* Circular Icon Button 1: Pulse */}
            <button
              onClick={() => onNavigateToExplorer("200", 0)}
              title="Continuous Lead Explorer"
              className="w-12 h-12 rounded-full bg-white text-primary shadow-soft border border-white flex items-center justify-center hover:bg-surface-subtle transition-all active:scale-95 flex-shrink-0"
            >
              <Activity className="w-5 h-5 text-primary" />
            </button>

            {/* Circular Icon Button 2: TrustLab Noise */}
            <button
              onClick={onNavigateToTrustLab}
              title="TrustLab Noise Stress"
              className="w-12 h-12 rounded-full bg-white text-primary shadow-soft border border-white flex items-center justify-center hover:bg-surface-subtle transition-all active:scale-95 flex-shrink-0"
            >
              <Sliders className="w-5 h-5 text-primary" />
            </button>

            {/* Signature Soft-Yellow CTA Pill: "Explore the ECG ↗" */}
            <button
              onClick={() => onNavigateToExplorer("200", 295)}
              className="flex-1 bg-actionYellow hover:bg-actionYellow-hover active:bg-actionYellow-active text-primary font-bold text-sm sm:text-base py-3.5 px-6 rounded-full flex items-center justify-between shadow-soft transition-all duration-200 active:scale-[0.98]"
            >
              <span>Explore the ECG</span>
              <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center ml-2">
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              </div>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CENTER COLUMN: Signature Interactive ECG Centerpiece (~42%) */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <InteractiveECGCenterpiece />
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Stacked Scientific Cards (~28%)             */}
        {/* ========================================================= */}
        <div className="lg:col-span-3 flex flex-col space-y-4">
          {/* Top Row: 2 Compact Metric Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Metric 1: Calibrated Confidence */}
            <div className="bg-white rounded-3xl p-3.5 shadow-soft border border-white">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-secondary font-medium">Confidence</span>
                <span className="text-[10px] text-teal font-semibold">• Calibrated</span>
              </div>
              <div className="text-xl font-bold text-primary font-numeric">94.2%</div>
              <div className="text-[10px] text-secondary mt-0.5">T = 0.6399 scaling</div>
            </div>

            {/* Metric 2: Inference Latency */}
            <div className="bg-white rounded-3xl p-3.5 shadow-soft border border-white">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-secondary font-medium">Latency</span>
                <span className="text-[10px] text-teal font-semibold">• MPS GPU</span>
              </div>
              <div className="text-xl font-bold text-primary font-numeric">{latencyMs}</div>
              <div className="text-[10px] text-secondary mt-0.5">Batch 64 real-time</div>
            </div>
          </div>

          {/* Middle Card: Heart Rate & Radial Gauge (like Medcure's Heart Rate pink card) */}
          <div className="bg-white rounded-3xl p-5 shadow-soft border border-white flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-primary">Rhythm Dynamics</span>
              </div>
              <span className="text-[10px] font-semibold text-secondary">
                Calibrated Softmax
              </span>
            </div>

            {/* Semi-circular pink dash gauge + DNA helix illustration */}
            <RadialGauge
              value={74}
              unit="BPM"
              label="Calibrated Heart Rate"
              statusText="Stable Sinus Rhythm"
            />

            {/* Legend matching Medcure: High, Medium, Normal, Low */}
            <div className="flex items-center justify-center space-x-3 mt-3 pt-3 border-t border-surface text-[10px] text-secondary">
              <span className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-coral" />
                <span>High</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FB8AA0]" />
                <span>Medium</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal" />
                <span>Normal</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#CBD5E1]" />
                <span>Low</span>
              </span>
            </div>
          </div>

          {/* Bottom Card: Cardiovascular System / 3-Pin Lollipop Chart */}
          <div className="bg-white rounded-3xl p-5 shadow-soft border border-white flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-xs font-bold text-primary">Cardiovascular System</h3>
                <p className="text-[10px] text-secondary">Per-class patient-disjoint recall</p>
              </div>
              <button
                onClick={onNavigateToTrustLab}
                className="text-[10px] font-semibold text-teal hover:underline"
              >
                Stress Test →
              </button>
            </div>

            {/* Signature Lollipop Chart */}
            <LollipopChart
              averageMetric={accuracyPct}
              metricLabel="Patient-Disjoint Accuracy"
              trendText="2.1% vs DS1"
              items={[
                { id: "N", name: "Normal Sinus", label: nRecall, percentage: 96, color: "#16A6A1", pinColor: "#17191F" },
                { id: "V", name: "Ventricular", label: vRecall, percentage: 87, color: "#2563EB", pinColor: "#2563EB" },
                { id: "S", name: "Supraventricular", label: sRecall, percentage: 54, color: "#F46C83", pinColor: "#F46C83" },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
