"use client";

import React from "react";
import {
  LayoutDashboard,
  Activity,
  ShieldCheck,
  BarChart2,
  AlertCircle,
  FileText,
  Search,
  Cpu,
} from "lucide-react";

export type TabKey =
  | "overview"
  | "ecg_explorer"
  | "trustlab"
  | "model_arena"
  | "failure_atlas"
  | "research_report";

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
  const navItems = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "ecg_explorer", label: "ECG Explorer", icon: Activity },
    { key: "trustlab", label: "TrustLab", icon: ShieldCheck },
    { key: "model_arena", label: "Model Arena", icon: BarChart2 },
    { key: "failure_atlas", label: "Failure Atlas", icon: AlertCircle },
    { key: "research_report", label: "Research Report", icon: FileText },
  ] as const;

  return (
    <header className="w-full flex items-center justify-between pb-6 pt-1 select-none">
      {/* ========================================================= */}
      {/* LEFT: Custom Brand Logo & Wordmark (Preserved)           */}
      {/* ========================================================= */}
      <div
        onClick={() => onSelectTab("overview")}
        className="flex items-center space-x-2.5 cursor-pointer group"
      >
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white shadow-soft group-hover:scale-105 transition-transform">
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12h4l3 8 4-16 3 8h4" />
          </svg>
        </div>
        <div className="flex items-baseline space-x-1.5">
          <span className="text-xl font-extrabold tracking-tight text-primary font-sans">
            RhythmScope
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-teal" />
        </div>
      </div>

      {/* ========================================================= */}
      {/* CENTER: Floating Pill Navigation                         */}
      {/* ========================================================= */}
      <nav className="hidden lg:flex items-center space-x-1.5 bg-transparent">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelectTab(item.key as TabKey)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-semibold tracking-tight transition-all duration-200 ${
                isActive
                  ? "bg-primary text-white shadow-float scale-[1.02]"
                  : "bg-white text-secondary hover:text-primary shadow-soft hover:shadow-float border border-white"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-actionYellow" : "text-secondary"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ========================================================= */}
      {/* RIGHT: Search, Receipt, Model Status, Profile Avatar     */}
      {/* ========================================================= */}
      <div className="flex items-center space-x-2.5">
        {/* Search Icon Button */}
        <button
          onClick={() => onSelectTab("ecg_explorer")}
          title="Search ECG Records"
          className="w-10 h-10 rounded-full bg-white text-secondary hover:text-primary shadow-soft border border-white flex items-center justify-center transition-all hover:shadow-float"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Audit Receipt / Bell Icon Button */}
        <button
          onClick={onOpenReceipt}
          title="Audit Receipt & Provenance"
          className="relative w-10 h-10 rounded-full bg-white text-secondary hover:text-primary shadow-soft border border-white flex items-center justify-center transition-all hover:shadow-float"
        >
          <Cpu className="w-4 h-4" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-teal" />
        </button>

        {/* Profile / Research Badge */}
        <div
          onClick={onOpenReceipt}
          className="flex items-center space-x-2.5 pl-1.5 pr-3 py-1 bg-white rounded-full shadow-soft border border-white cursor-pointer hover:shadow-float transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-surface-lavender border border-white flex items-center justify-center text-primary font-bold text-xs">
            RS
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold text-primary leading-tight">
              Research Unit
            </span>
            <span className="text-[10px] text-secondary leading-tight">
              MIT-BIH · Strict
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
