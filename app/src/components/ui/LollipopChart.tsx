"use client";

import React from "react";

interface LollipopItem {
  id: string;
  name: string;
  label: string;
  percentage: number;
  color: string;
  pinColor: string;
}

interface LollipopChartProps {
  items?: LollipopItem[];
  averageMetric?: string;
  metricLabel?: string;
  trendText?: string;
}

export const LollipopChart: React.FC<LollipopChartProps> = ({
  items = [
    { id: "N", name: "Normal Sinus", label: "96%", percentage: 96, color: "#16A6A1", pinColor: "#17191F" },
    { id: "V", name: "Ventricular (V)", label: "87%", percentage: 87, color: "#2563EB", pinColor: "#2563EB" },
    { id: "S", name: "Supraventricular (S)", label: "54%", percentage: 54, color: "#F46C83", pinColor: "#F46C83" },
  ],
  averageMetric = "92.7%",
  metricLabel = "Patient-Disjoint Accuracy",
  trendText = "2% vs base",
}) => {
  // Generate background vertical bars simulating patient distribution
  const bars = [
    35, 42, 50, 58, 64, 72, 80, 85, 96, 75, 68, 60, 52, 48, 62, 70, 78, 87, 82, 65, 54, 45, 50, 54, 48, 42
  ];

  return (
    <div className="w-full">
      {/* Top Value Display */}
      <div className="flex items-baseline space-x-2 mb-3">
        <span className="text-3xl font-extrabold text-primary tracking-tight font-numeric">
          {averageMetric}
        </span>
        <span className="inline-flex items-center text-xs font-semibold text-teal">
          <span className="mr-0.5">↑</span>
          <span>{trendText}</span>
        </span>
      </div>
      <div className="text-xs text-secondary font-medium mb-5">
        {metricLabel}
      </div>

      {/* Graphic Bars Area */}
      <div className="relative h-28 flex items-end justify-between px-1 pt-6 pb-2">
        {/* Subtle background bars */}
        {bars.map((h, i) => (
          <div
            key={i}
            className="w-1 bg-[#E8EBF2] rounded-full transition-all duration-300"
            style={{ height: `${h * 0.75}%` }}
          />
        ))}

        {/* 3 Prominent Pin Lollipops (matching screenshot styling) */}
        {/* Pin 1: N Class */}
        <div
          className="absolute bottom-2 flex flex-col items-center pointer-events-none"
          style={{ left: "28%" }}
        >
          {/* Pin Head */}
          <div className="w-3.5 h-3.5 rounded-full bg-primary border-2 border-white shadow-sm flex items-center justify-center -mb-1 z-10">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
          {/* Pin Stem */}
          <div className="w-0.5 bg-primary rounded-full" style={{ height: "68px" }} />
          {/* Label below */}
          <span className="mt-1.5 text-xs font-bold text-primary font-numeric">
            {items[0]?.label || "96%"}
          </span>
          <span className="text-[10px] text-secondary font-medium">N-Recall</span>
        </div>

        {/* Pin 2: V Class */}
        <div
          className="absolute bottom-2 flex flex-col items-center pointer-events-none"
          style={{ left: "62%" }}
        >
          {/* Pin Head */}
          <div className="w-3.5 h-3.5 rounded-full bg-[#2563EB] border-2 border-white shadow-sm flex items-center justify-center -mb-1 z-10">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
          {/* Pin Stem */}
          <div className="w-0.5 bg-[#2563EB] rounded-full" style={{ height: "60px" }} />
          {/* Label below */}
          <span className="mt-1.5 text-xs font-bold text-primary font-numeric">
            {items[1]?.label || "87%"}
          </span>
          <span className="text-[10px] text-secondary font-medium">V-Recall</span>
        </div>

        {/* Pin 3: S Class */}
        <div
          className="absolute bottom-2 flex flex-col items-center pointer-events-none"
          style={{ left: "86%" }}
        >
          {/* Pin Head */}
          <div className="w-3.5 h-3.5 rounded-full bg-coral border-2 border-white shadow-sm flex items-center justify-center -mb-1 z-10">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
          {/* Pin Stem */}
          <div className="w-0.5 bg-coral rounded-full" style={{ height: "42px" }} />
          {/* Label below */}
          <span className="mt-1.5 text-xs font-bold text-primary font-numeric">
            {items[2]?.label || "54%"}
          </span>
          <span className="text-[10px] text-secondary font-medium">S-Recall</span>
        </div>
      </div>
    </div>
  );
};
