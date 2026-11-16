"use client";

import React, { useState } from "react";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Database,
  Cpu,
  Layers,
  Activity,
  Download,
  Info,
} from "lucide-react";
import benchmarkResults from "../../data/benchmark_results.json";
import incartReport from "../../data/incart_transfer_report.json";

interface ResearchReportViewProps {
  onOpenReceipt: () => void;
}

export const ResearchReportView: React.FC<ResearchReportViewProps> = ({
  onOpenReceipt,
}) => {
  const strictMetrics = (benchmarkResults as any).splits.strict_patient_disjoint.hybrid_cnn;
  const transfer = (incartReport as any).transfer_metrics;
  const [activeSection, setActiveSection] = useState<number>(0);

  const sections = [
    {
      title: "1. Patient Independence Audit",
      status: "VERIFIED & AUDITED",
      summary:
        "Evaluated on 21 strictly independent test patients (47,550 beats). PhysioNet Records 201 and 202 subject overlap explicitly resolved by excluding 202 from headline test.",
      metrics: [
        { label: "Headline Macro F1", value: strictMetrics.macro_f1.toFixed(4) },
        {
          label: "95% Bootstrap CI",
          value: `[${strictMetrics.bootstrap_ci.macro_f1.ci_lower.toFixed(4)}, ${strictMetrics.bootstrap_ci.macro_f1.ci_upper.toFixed(4)}]`,
        },
        { label: "Strict Accuracy", value: `${(strictMetrics.accuracy * 100).toFixed(2)}%` },
        { label: "V-Sensitivity (Recall)", value: `${(strictMetrics.v_sensitivity * 100).toFixed(1)}%` },
      ],
    },
    {
      title: "2. Real NSTDB Noise Robustness",
      status: "EVALUATED & VERIFIED",
      summary:
        "Stress benchmark using recorded PhysioNet NSTDB noise streams (bw, ma, em) across 24 down to 0 dB SNR on 5,000 test beats.",
      metrics: [
        { label: "Baseline Wander (0 dB)", value: "F1 = 0.4286 (Flip: 35.8%)" },
        { label: "Muscle Artifact (0 dB)", value: "F1 = 0.3172 (V-Rec: 7.2%)" },
        { label: "Electrode Motion (0 dB)", value: "F1 = 0.4467 (Abstain: 60.8%)" },
        { label: "Primary Sensitivity", value: "High-frequency tremor collapses morphology" },
      ],
    },
    {
      title: "3. Calibrated Abstention & Selective Risk",
      status: "DEVELOPMENT CALIBRATED",
      summary:
        "Temperature scaling (T = 0.6399) fitted strictly on held-out development patients reduces ECE from 11.76% to 2.11%. Threshold tau = 0.9073 guarantees selective risk <= 5%.",
      metrics: [
        { label: "Optimal Temperature T", value: "0.6399 (L-BFGS)" },
        { label: "Uncalibrated ECE", value: "11.76%" },
        { label: "Calibrated ECE", value: "2.11%" },
        { label: "Selective Risk (Tau=0.9073)", value: "4.82% (Coverage: 88.4%)" },
      ],
    },
    {
      title: "4. Cross-Dataset Transfer (INCART 12-Lead)",
      status: "EXPLORATORY TRANSFER",
      summary:
        "Lead II transfer audit on St Petersburg INCART Database (resampled 257 to 360 Hz). Mismatched population triggers 86.2% abstention, demonstrating why clinical claims are unwarranted.",
      metrics: [
        { label: "Transfer Macro F1", value: `${transfer.macro_f1.toFixed(4)}` },
        { label: "Zero-Shot Abstention Rate", value: `${(transfer.abstention_rate * 100).toFixed(1)}%` },
        { label: "N Recall on Transfer", value: `${(transfer.n_recall * 100).toFixed(1)}%` },
        { label: "Safety Status", value: "Abstains rather than emitting false predictions" },
      ],
    },
  ];

  return (
    <div className="w-full">
      {/* Top Metadata Bar (5 compact cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {[
          { label: "Dataset Origin", val: "MIT-BIH & NSTDB" },
          { label: "Split Protocol", val: "21 Disjoint Patients" },
          { label: "AAMI Task", val: "4-Class Arrhythmia" },
          { label: "Checkpoint SHA", val: "f2cd8cbf" },
          { label: "Audit Status", val: "Audited & Verified" },
        ].map((item, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-3 shadow-soft border border-white text-center"
          >
            <div className="text-[10px] text-secondary font-medium">{item.label}</div>
            <div className="text-xs font-bold text-primary font-numeric mt-0.5 truncate">
              {item.val}
            </div>
          </div>
        ))}
      </div>

      {/* 2-Column Split: Editorial Left & Findings on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Heading & Vertical Section Selector (~30%)   */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-primary tracking-tight leading-[1.08]">
              Evaluation &<br />
              Findings
            </h1>
            <p className="text-xs text-secondary mt-2 leading-relaxed">
              Rigorous evaluation methodology, leakage audits, PhysioNet dataset
              provenance, and non-clinical research boundaries.
            </p>
          </div>

          {/* Vertical Research Section Nav */}
          <div className="bg-white rounded-3xl p-4 shadow-soft border border-white space-y-2">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
              Research Pillars
            </span>
            <div className="flex flex-col space-y-1.5">
              {sections.map((sec, idx) => {
                const isSelected = activeSection === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveSection(idx)}
                    className={`p-3 rounded-2xl text-left transition-all ${
                      isSelected
                        ? "bg-primary text-white shadow-soft"
                        : "bg-surface-subtle text-primary hover:bg-surface-lavender"
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{sec.title}</div>
                    <div
                      className={`text-[10px] mt-0.5 truncate ${
                        isSelected ? "text-white/70" : "text-secondary"
                      }`}
                    >
                      {sec.status}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Yellow Action Button */}
            <button
              onClick={onOpenReceipt}
              className="mt-3 w-full bg-actionYellow hover:bg-actionYellow-hover active:bg-actionYellow-active text-primary font-bold text-xs py-3.5 px-4 rounded-full flex items-center justify-between shadow-soft transition-all duration-200"
            >
              <span>Download Provenance Receipt</span>
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center ml-2">
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT AREA: Detailed Findings & Auditable Receipt (~70%)   */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {/* Active Pillar Card */}
          <div className="bg-white rounded-3xl p-6 shadow-soft border border-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface">
              <div>
                <h3 className="text-lg font-bold text-primary">
                  {sections[activeSection].title}
                </h3>
                <span className="text-xs font-semibold text-teal">
                  • {sections[activeSection].status}
                </span>
              </div>
              <button
                onClick={onOpenReceipt}
                className="text-xs font-bold text-secondary hover:text-primary underline"
              >
                Inspect Hashes
              </button>
            </div>

            <p className="text-xs sm:text-sm text-secondary leading-relaxed">
              {sections[activeSection].summary}
            </p>

            {/* 4 Quantitative Metrics in Pillar */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {sections[activeSection].metrics.map((m, i) => (
                <div key={i} className="p-3.5 rounded-2xl bg-surface-subtle">
                  <div className="text-[11px] text-secondary font-medium">{m.label}</div>
                  <div className="text-base font-bold text-primary font-numeric mt-0.5">
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Core Scientific Insights Banner */}
          <div className="bg-white rounded-3xl p-5 shadow-soft border border-white space-y-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-teal" />
              <span className="text-xs font-bold text-primary">
                Key Methodological Findings
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-secondary leading-relaxed">
              <div className="p-3 rounded-2xl bg-surface-subtle">
                <strong className="text-primary block mb-0.5">
                  1. Subject Overlap In Canonical Splits:
                </strong>
                PhysioNet confirms Records 201 (DS1) and 202 (DS2) share a patient identity. By excluding 202 from headline evaluation, RhythmScope provides true generalization estimates.
              </div>
              <div className="p-3 rounded-2xl bg-surface-subtle">
                <strong className="text-primary block mb-0.5">
                  2. Noise Vulnerability Thresholds:
                </strong>
                Models tolerate low-frequency respiratory drift (bw) down to 6 dB SNR, but electrode motion (em) breaks QRS morphology, triggering selective abstention.
              </div>
            </div>
          </div>

          {/* Educational Research Disclaimer */}
          <div className="bg-[#FFFBEB] rounded-3xl p-4 border border-[#FDE68A] text-xs text-[#92400E] flex items-start space-x-3">
            <AlertTriangle className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Non-Clinical Educational Research Notice:</strong> RhythmScope is an academic ML engineering study. It is not an FDA-cleared diagnostic medical device and must never be used to direct patient care or clinical triage.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
