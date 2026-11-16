"use client";

import React from "react";
import { ShieldCheck, AlertTriangle, FileText, CheckCircle2, XCircle, HelpCircle, Download, ExternalLink, Cpu } from "lucide-react";
import benchmarkResults from "../../data/benchmark_results.json";
import trustlabReceipt from "../../data/trustlab_receipt.json";
import incartReport from "../../data/incart_transfer_report.json";

interface ReliabilityPassportViewProps {
  onOpenReceipt: () => void;
}

export const ReliabilityPassportView: React.FC<ReliabilityPassportViewProps> = ({
  onOpenReceipt,
}) => {
  const strictMetrics = benchmarkResults.splits.strict_patient_disjoint.hybrid_cnn;
  const transfer = incartReport.transfer_metrics;

  const pillars = [
    {
      title: "1. Patient-Disjoint Generalization",
      status: "EVALUATED & VERIFIED",
      statusColor: "text-teal-dark bg-teal-bg border-teal/30",
      icon: CheckCircle2,
      summary: "Evaluated on 21 strictly independent test patients (47,550 beats). PhysioNet Records 201 and 202 subject overlap explicitly resolved by excluding 202 from headline test.",
      metrics: [
        { label: "Headline Macro F1", value: `${strictMetrics.macro_f1.toFixed(4)}` },
        { label: "95% Bootstrap CI", value: `[${strictMetrics.bootstrap_ci.macro_f1.ci_lower.toFixed(4)}, ${strictMetrics.bootstrap_ci.macro_f1.ci_upper.toFixed(4)}]` },
        { label: "Strict Test Accuracy", value: `${(strictMetrics.accuracy * 100).toFixed(2)}%` },
        { label: "V-Sensitivity (Recall)", value: `${(strictMetrics.v_sensitivity * 100).toFixed(1)}%` },
      ],
    },
    {
      title: "2. PhysioNet NSTDB Noise Stress Test",
      status: "EVALUATED & VERIFIED",
      statusColor: "text-teal-dark bg-teal-bg border-teal/30",
      icon: CheckCircle2,
      summary: "Reproducible stress benchmark using recorded PhysioNet NSTDB noise streams (bw, ma, em) across 24, 18, 12, 6, and 0 dB SNR on 5,000 strict test beats.",
      metrics: [
        { label: "Baseline Wander (0 dB)", value: "F1 = 0.4286 (Flip: 35.8%)" },
        { label: "Muscle Artifact (0 dB)", value: "F1 = 0.3172 (V-Rec: 7.2%)" },
        { label: "Electrode Motion (0 dB)", value: "F1 = 0.4467 (Abstain: 60.8%)" },
        { label: "Primary Sensitivity", value: "High-frequency tremor (ma) crashes morphology" },
      ],
    },
    {
      title: "3. Uncertainty Calibration & Abstention",
      status: "DEVELOPMENT CALIBRATED",
      statusColor: "text-teal-dark bg-teal-bg border-teal/30",
      icon: CheckCircle2,
      summary: "Temperature scaling (T = 0.6399) and selective classification threshold (tau = 0.9073) calibrated strictly on DS1 development patients with zero test leakage.",
      metrics: [
        { label: "Uncalibrated ECE", value: "11.76%" },
        { label: "Calibrated ECE", value: "2.11% (Guo et al. 2017)" },
        { label: "Operating Threshold", value: "tau = 0.9073 (Target selective error <= 5%)" },
        { label: "Coverage Tradeoff", value: "N: 86.7% coverage | S: 12.0% | V: 44.5%" },
      ],
    },
    {
      title: "4. Out-of-Distribution Transfer (INCART)",
      status: "DOMAIN SHIFT AUDITED",
      statusColor: "text-amber-800 bg-amber-bg border-amber/30",
      icon: AlertTriangle,
      summary: "Zero-shot transfer audit on St Petersburg INCART 12-lead database (Lead II, resampled 257 Hz -> 360 Hz). Models abstain on 86.2% of beats due to electrode montage mismatch.",
      metrics: [
        { label: "External Beat Support", value: "3,215 beats (4 patients)" },
        { label: "Transfer Abstention Rate", value: "86.2% (Appropriate Uncertainty)" },
        { label: "Transfer Macro F1", value: "0.0500 (Morphological Mismatch)" },
        { label: "Scientific Verdict", value: "Demonstrates clinical domain shift failure" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-navy-900 text-white mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-light" />
              <span>Scientific Reliability Audit</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-navy-950 font-serif">
              RhythmScope Reliability Passport
            </h2>
            <p className="mt-1 text-sm text-navy-700 max-w-3xl">
              A comprehensive research scorecard documenting model provenance, tested stress envelopes, uncertainty policies, and audited failure boundaries.
              Not a medical device certification.
            </p>
          </div>

          <button
            onClick={onOpenReceipt}
            className="px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-navy-900 hover:bg-navy-800 transition-colors flex items-center space-x-2 shadow-sm shrink-0"
          >
            <Cpu className="w-4 h-4 text-teal-light" />
            <span>View Full Experiment Receipt</span>
          </button>
        </div>
      </div>

      {/* 4 Evaluated Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pillars.map((p, idx) => {
          const Icon = p.icon;
          return (
            <div key={idx} className="bg-white border border-border rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-md bg-surface-subtle border border-border flex items-center justify-center">
                    <Icon className="w-4 h-4 text-navy-950" />
                  </div>
                  <h3 className="text-base font-bold text-navy-950 font-serif">{p.title}</h3>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${p.statusColor}`}>
                  {p.status}
                </span>
              </div>

              <p className="text-xs text-navy-700 leading-relaxed">{p.summary}</p>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/80">
                {p.metrics.map((m, mIdx) => (
                  <div key={mIdx} className="p-2.5 bg-[#FAF9F5] border border-border/60 rounded-lg">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide">{m.label}</div>
                    <div className="text-xs font-bold font-numeric text-navy-950 mt-0.5">{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Technical Constraints & Disclaimers */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm space-y-5">
        <h3 className="text-base font-bold text-navy-950 font-serif border-b border-border pb-3">
          Scientific Limitations & Clinical Non-Deployment Statement
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-surface-subtle border border-border rounded-xl space-y-2">
            <div className="font-bold text-navy-950 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber" />
              <span>Reference R-Peak Dependence</span>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Heartbeats are extracted centered around expert annotator R-peaks (-90/+162 samples). The model does not perform autonomous QRS detection. Upstream peak detection jitter will alter morphology.
            </p>
          </div>

          <div className="p-4 bg-surface-subtle border border-border rounded-xl space-y-2">
            <div className="font-bold text-navy-950 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber" />
              <span>Retrospective Feature Latency</span>
            </div>
            <p className="text-gray-600 leading-relaxed">
              The `post_rr` and `rr_ratio` features require observing the subsequent heartbeat (~0.8s future window). The primary hybrid model is therefore retrospective rather than strictly real-time causal.
            </p>
          </div>

          <div className="p-4 bg-surface-subtle border border-border rounded-xl space-y-2">
            <div className="font-bold text-navy-950 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber" />
              <span>Electrode Geometry Sensitivity</span>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Trained predominantly on Modified Limb Lead II (MLII) from ambulatory Holter patches. Cross-validation on standard 12-lead Lead II (INCART) produced 86.2% abstention, demonstrating montage mismatch.
            </p>
          </div>
        </div>

        {/* Prominent Legal / Medical Alert */}
        <div className="p-4 bg-amber-bg/60 border border-amber/40 rounded-xl text-xs text-amber-950 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-semibold text-amber-950">Non-Clinical Educational Research Notice:</strong>
            <p className="text-amber-900 leading-relaxed">
              RhythmScope is an academic research portfolio project designed to demonstrate rigorous ML engineering, out-of-distribution evaluation, real-noise perturbation, and uncertainty calibration. It has not undergone FDA 510(k), CE mark, or IRB clinical validation. Do not use for patient diagnosis or medical decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
