"use client";

import React from "react";
import { ShieldCheck, Activity, AlertCircle, Cpu, FileText, Compass, BarChart2, Layers } from "lucide-react";

export type TabKey = "trustlab" | "failure_atlas" | "ecg_explorer" | "model_arena" | "explainability" | "passport";

interface NavigationProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  onOpenReceipt: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  onOpenReceipt,
}) => {
  const tabs = [
    { key: "trustlab", label: "TrustLab", icon: ShieldCheck, badge: "Differentiator" },
    { key: "failure_atlas", label: "Failure Atlas", icon: AlertCircle, badge: "Unseen Cases" },
    { key: "ecg_explorer", label: "ECG Explorer", icon: Activity, badge: "Continuous Lead" },
    { key: "model_arena", label: "Model Arena", icon: BarChart2, badge: "Strict vs Classical" },
    { key: "explainability", label: "Explainability", icon: Layers, badge: "Captum IG" },
    { key: "passport", label: "Reliability Passport", icon: FileText, badge: "Receipt" },
  ] as const;

  return (
    <header className="border-b border-border bg-white sticky top-0 z-30 shadow-sm">
      {/* Top Meta Strip */}
      <div className="bg-[#FAF9F5] border-b border-border/80 px-4 sm:px-8 py-1.5 flex flex-wrap items-center justify-between text-xs text-navy-700">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1 font-medium text-teal-dark">
            <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
            <span>Research Studio v1.0</span>
          </span>
          <span className="text-gray-300">|</span>
          <span className="font-numeric text-navy-800">
            Strict Partition: <strong className="font-semibold text-navy-950">21 Patients Disjoint</strong> (Record 202 Excluded)
          </span>
          <span className="text-gray-300 hidden md:inline">|</span>
          <span className="font-numeric text-gray-500 hidden md:inline">
            Checkpoint: <code className="text-navy-900 bg-surface-muted px-1.5 py-0.5 rounded text-[11px]">f2cd8cbf</code>
          </span>
        </div>

        <div className="flex items-center space-x-3 mt-1 sm:mt-0">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-bg text-amber border border-amber/30">
            Non-Clinical Study · Educational ML
          </span>
          <button
            onClick={onOpenReceipt}
            className="inline-flex items-center space-x-1 text-[11px] font-medium text-navy-900 hover:text-teal underline underline-offset-2 transition-colors"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Experiment Receipt</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand & Editorial Identity */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-navy-900 text-teal-light flex items-center justify-center font-bold text-lg shadow-sm border border-navy-800">
            R
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-navy-950 font-serif">
                RhythmScope
              </h1>
              <span className="text-xs px-1.5 py-0.5 rounded font-mono font-medium bg-teal-bg text-teal-dark border border-teal/20">
                Research Edition
              </span>
            </div>
            <p className="text-xs text-gray-500 tracking-wide font-sans">
              Beyond the Prediction: Patient Generalization & Noise Robustness
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <nav className="flex items-center overflow-x-auto pb-1 md:pb-0 space-x-1 sm:space-x-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => onSelectTab(tab.key as TabKey)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-navy-900 text-white shadow-sm"
                    : "text-navy-700 hover:text-navy-950 hover:bg-surface-subtle"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-teal-light" : "text-gray-400"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`hidden lg:inline text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isActive
                        ? "bg-navy-800 text-teal-light"
                        : "bg-surface-muted text-gray-600"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
