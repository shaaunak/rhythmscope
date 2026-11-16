"use client";

import React, { useState } from "react";
import { Navigation, TabKey } from "../components/Navigation";
import { TrustLabView } from "../components/views/TrustLabView";
import { FailureAtlasView } from "../components/views/FailureAtlasView";
import { ECGExplorerView } from "../components/views/ECGExplorerView";
import { ModelArenaView } from "../components/views/ModelArenaView";
import { ExplainabilityView } from "../components/views/ExplainabilityView";
import { ReliabilityPassportView } from "../components/views/ReliabilityPassportView";
import { ExperimentReceiptModal } from "../components/ExperimentReceiptModal";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("trustlab");
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [explorerTarget, setExplorerTarget] = useState<{ record: string; sample?: number }>({
    record: "200",
  });

  const handleNavigateToExplorer = (recordId: string, sampleIndex: number) => {
    setExplorerTarget({ record: recordId, sample: sampleIndex });
    setActiveTab("ecg_explorer");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Persistent Header */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenReceipt={() => setIsReceiptOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6">
        {activeTab === "trustlab" && (
          <TrustLabView
            onNavigateToExplorer={handleNavigateToExplorer}
            onOpenReceipt={() => setIsReceiptOpen(true)}
          />
        )}
        {activeTab === "failure_atlas" && (
          <FailureAtlasView onNavigateToExplorer={handleNavigateToExplorer} />
        )}
        {activeTab === "ecg_explorer" && (
          <ECGExplorerView
            initialRecord={explorerTarget.record}
            initialSample={explorerTarget.sample}
          />
        )}
        {activeTab === "model_arena" && <ModelArenaView />}
        {activeTab === "explainability" && <ExplainabilityView />}
        {activeTab === "passport" && (
          <ReliabilityPassportView onOpenReceipt={() => setIsReceiptOpen(true)} />
        )}
      </main>

      {/* Auditable Experiment Receipt Modal */}
      <ExperimentReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />

      {/* Editorial Footer */}
      <footer className="border-t border-border bg-white mt-12 py-8 px-4 sm:px-8 text-xs text-navy-700">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="font-bold text-navy-950 font-serif">
              RhythmScope — Research-Grade ECG Reliability Studio
            </div>
            <div className="text-gray-500 font-numeric">
              Evaluated on PhysioNet MIT-BIH & NSTDB Databases · Checkpoint SHA: f2cd8cbf · Git Commit: 3291fc2
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <button
              onClick={() => setIsReceiptOpen(true)}
              className="text-navy-900 hover:text-teal font-medium underline underline-offset-2"
            >
              Auditable Receipt
            </button>
            <span className="text-gray-300">·</span>
            <a
              href="https://physionet.org/content/mitdb/1.0.0/"
              target="_blank"
              rel="noreferrer"
              className="text-navy-900 hover:text-teal font-medium underline underline-offset-2"
            >
              MIT-BIH Database
            </a>
            <span className="text-gray-300">·</span>
            <a
              href="https://physionet.org/content/nstdb/1.0.0/"
              target="_blank"
              rel="noreferrer"
              className="text-navy-900 hover:text-teal font-medium underline underline-offset-2"
            >
              NSTDB Noise
            </a>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">
              MIT License · Educational Research Only
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
