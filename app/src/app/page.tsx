"use client";

import React, { useState } from "react";
import { Navigation, TabKey } from "../components/Navigation";
import { HomeOverviewView } from "../components/views/HomeOverviewView";
import { TrustLabView } from "../components/views/TrustLabView";
import { FailureAtlasView } from "../components/views/FailureAtlasView";
import { ECGExplorerView } from "../components/views/ECGExplorerView";
import { ModelArenaView } from "../components/views/ModelArenaView";
import { ResearchReportView } from "../components/views/ResearchReportView";
import { ExperimentReceiptModal } from "../components/ExperimentReceiptModal";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [explorerTarget, setExplorerTarget] = useState<{ record: string; sample?: number }>({
    record: "200",
  });

  // Client-safe URL tab deep-linking
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as TabKey;
      if (
        tabParam &&
        [
          "overview",
          "ecg_explorer",
          "trustlab",
          "model_arena",
          "failure_atlas",
          "research_report",
        ].includes(tabParam)
      ) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const handleSelectTab = (tab: TabKey) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState(null, "", url.toString());
    }
  };

  const handleNavigateToExplorer = (recordId: string, sampleIndex: number) => {
    setExplorerTarget({ record: recordId, sample: sampleIndex });
    setActiveTab("ecg_explorer");
  };

  const handleNavigateToTrustLab = () => {
    setActiveTab("trustlab");
  };

  return (
    <div className="min-h-screen bg-canvas p-3 sm:p-5 lg:p-7 flex items-center justify-center font-sans select-text">
      {/* Enormous Rounded Floating Application Frame (Preserved Container) */}
      <div className="max-w-[1540px] w-full bg-surface rounded-[36px] sm:rounded-[44px] border border-white/70 app-frame-shadow p-5 sm:p-8 flex flex-col justify-between min-h-[900px] relative">
        {/* Navigation Bar */}
        <Navigation
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onOpenReceipt={() => setIsReceiptOpen(true)}
        />

        {/* Dynamic Main Stage */}
        <main className="w-full flex-1 mt-2">
          {/* Screen 1: Overview Landing Page (PRESERVED 100% UNCHANGED) */}
          {activeTab === "overview" && (
            <HomeOverviewView
              onNavigateToExplorer={handleNavigateToExplorer}
              onNavigateToTrustLab={handleNavigateToTrustLab}
              onOpenReceipt={() => setIsReceiptOpen(true)}
            />
          )}

          {/* Screen 2: ECG Explorer (Top-Right Design) */}
          {activeTab === "ecg_explorer" && (
            <ECGExplorerView
              initialRecord={explorerTarget.record}
              initialSample={explorerTarget.sample}
            />
          )}

          {/* Screen 3: TrustLab (Middle-Left Design + 3D Companion Sculpture) */}
          {activeTab === "trustlab" && (
            <TrustLabView
              onNavigateToExplorer={handleNavigateToExplorer}
              onOpenReceipt={() => setIsReceiptOpen(true)}
            />
          )}

          {/* Screen 4: Model Arena (Middle-Right Design) */}
          {activeTab === "model_arena" && <ModelArenaView />}

          {/* Screen 5: Failure Atlas (Bottom-Left Design) */}
          {activeTab === "failure_atlas" && (
            <FailureAtlasView onNavigateToExplorer={handleNavigateToExplorer} />
          )}

          {/* Screen 6: Research Report (Bottom-Right Design) */}
          {activeTab === "research_report" && (
            <ResearchReportView onOpenReceipt={() => setIsReceiptOpen(true)} />
          )}
        </main>

        {/* Delicate Modern App Footer */}
        <footer className="mt-8 pt-5 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between text-xs text-secondary gap-3 select-none">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-teal" />
            <span className="font-semibold text-primary">RhythmScope Research Studio</span>
            <span>·</span>
            <span>PhysioNet MIT-BIH & NSTDB Databases</span>
            <span>·</span>
            <span className="font-numeric">Checkpoint: f2cd8cbf</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <button
              onClick={() => setIsReceiptOpen(true)}
              className="text-primary hover:text-teal font-medium underline underline-offset-2"
            >
              Auditable Receipt
            </button>
            <span>·</span>
            <span className="text-secondary">MIT License · Non-Clinical Educational ML</span>
          </div>
        </footer>
      </div>

      {/* Auditable Experiment Receipt Modal */}
      <ExperimentReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />
    </div>
  );
}
