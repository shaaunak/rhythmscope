"use client";

import React, { useState } from "react";
import { FileText, AlertCircle, Layers, ShieldCheck } from "lucide-react";
import { ReliabilityPassportView } from "./ReliabilityPassportView";
import { FailureAtlasView } from "./FailureAtlasView";
import { ExplainabilityView } from "./ExplainabilityView";

interface ResearchHubViewProps {
  onNavigateToExplorer: (recordId: string, sampleIndex: number) => void;
  onOpenReceipt: () => void;
}

export const ResearchHubView: React.FC<ResearchHubViewProps> = ({
  onNavigateToExplorer,
  onOpenReceipt,
}) => {
  const [subTab, setSubTab] = useState<"passport" | "failure_atlas" | "explainability">("passport");

  const subTabs = [
    { key: "passport", label: "Reliability Passport", icon: FileText, badge: "Provenance & Audits" },
    { key: "failure_atlas", label: "Failure Atlas", icon: AlertCircle, badge: "Unseen Misclassifications" },
    { key: "explainability", label: "Feature Attribution", icon: Layers, badge: "Captum Saliency" },
  ] as const;

  return (
    <div className="w-full flex flex-col space-y-6">
      {/* Subtab Floating Pill Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-2.5 rounded-full shadow-soft border border-white">
        <div className="flex items-center space-x-2">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = subTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setSubTab(tab.key)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-semibold tracking-tight transition-all ${
                  isActive
                    ? "bg-primary text-white shadow-soft"
                    : "bg-transparent text-secondary hover:text-primary hover:bg-surface-subtle"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-actionYellow" : "text-secondary"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden lg:flex items-center space-x-2 pr-3 text-xs text-secondary font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-teal" />
          <span>Strict Patient Disjoint · Checkpoint f2cd8cbf</span>
        </div>
      </div>

      {/* View Content */}
      <div className="w-full">
        {subTab === "passport" && (
          <ReliabilityPassportView onOpenReceipt={onOpenReceipt} />
        )}
        {subTab === "failure_atlas" && (
          <FailureAtlasView onNavigateToExplorer={onNavigateToExplorer} />
        )}
        {subTab === "explainability" && <ExplainabilityView />}
      </div>
    </div>
  );
};
