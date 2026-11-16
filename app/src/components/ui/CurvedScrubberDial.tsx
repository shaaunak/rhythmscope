"use client";

import React, { useState } from "react";

interface CurvedScrubberDialProps {
  currentSample?: number;
  totalSamples?: number;
  onSampleChange?: (sample: number) => void;
  label?: string;
}

export const CurvedScrubberDial: React.FC<CurvedScrubberDialProps> = ({
  currentSample = 90,
  totalSamples = 180,
  onSampleChange,
  label = "3.8 nm",
}) => {
  const [val, setVal] = useState<number>(currentSample);

  // 41 ticks along an upward convex curve
  const tickCount = 41;
  const cx = 150;
  const cy = 200;
  const r = 160;

  // Arc from -140 deg to -40 deg
  const startAngle = -140;
  const endAngle = -40;

  const ticks = Array.from({ length: tickCount }).map((_, i) => {
    const fraction = i / (tickCount - 1);
    const angle = startAngle + fraction * (endAngle - startAngle);
    const rad = (angle * Math.PI) / 180;
    const isMajor = i % 5 === 0;
    const len = isMajor ? 14 : 8;

    const x1 = cx + (r - len) * Math.cos(rad);
    const y1 = cy + (r - len) * Math.sin(rad);
    const x2 = cx + r * Math.cos(rad);
    const y2 = cy + r * Math.sin(rad);

    return { i, x1, y1, x2, y2, isMajor };
  });

  // Calculate knob position based on val
  const currentFraction = val / totalSamples;
  const knobAngle = startAngle + currentFraction * (endAngle - startAngle);
  const knobRad = (knobAngle * Math.PI) / 180;
  const knobX = cx + (r - 7) * Math.cos(knobRad);
  const knobY = cy + (r - 7) * Math.sin(knobRad);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const newSample = Math.round(fraction * totalSamples);
    setVal(newSample);
    onSampleChange?.(newSample);
  };

  const timeSec = (val / 360).toFixed(2);

  return (
    <div className="flex flex-col items-center justify-center w-full select-none">
      {/* Semicircular Tick Arc */}
      <div className="relative w-72 h-16 overflow-hidden flex items-end justify-center">
        <svg
          viewBox="0 0 300 80"
          className="w-full h-full cursor-pointer"
          onClick={handleClick}
        >
          {ticks.map((t) => (
            <line
              key={t.i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={t.isMajor ? "#94A3B8" : "#CBD5E1"}
              strokeWidth={t.isMajor ? "1.75" : "1"}
              strokeLinecap="round"
            />
          ))}

          {/* Central Knob (styled exactly like the black circle with white dot in Medcure) */}
          <circle
            cx={knobX}
            cy={knobY}
            r="8"
            fill="#17191F"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            className="filter drop-shadow-md transition-all duration-75"
          />
          <circle cx={knobX} cy={knobY} r="2.5" fill="#FFFFFF" />
        </svg>
      </div>

      {/* Label under dial */}
      <div className="flex items-center space-x-2 mt-1">
        <span className="text-xs font-bold text-primary font-numeric tracking-tight">
          {label || `${timeSec}s`}
        </span>
        <span className="text-[10px] text-secondary font-medium">
          (Sample {val}/{totalSamples})
        </span>
      </div>
    </div>
  );
};
