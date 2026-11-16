"use client";

import React from "react";

interface RadialGaugeProps {
  value?: number;
  unit?: string;
  label?: string;
  statusText?: string;
}

export const RadialGauge: React.FC<RadialGaugeProps> = ({
  value = 74,
  unit = "BPM",
  label = "Calibrated Sinus Rate",
  statusText = "Stable Rhythm",
}) => {
  // Generate 24 tick dashes in a semicircle (180 degrees)
  const totalTicks = 24;
  const activeTicks = Math.round((value / 120) * totalTicks);

  const ticks = Array.from({ length: totalTicks }).map((_, index) => {
    // Angle from -180 to 0 degrees (top semicircle)
    const angle = -180 + (index / (totalTicks - 1)) * 180;
    const rad = (angle * Math.PI) / 180;
    const radius = 68;
    const cx = 90;
    const cy = 95;

    const x1 = cx + (radius - 12) * Math.cos(rad);
    const y1 = cy + (radius - 12) * Math.sin(rad);
    const x2 = cx + radius * Math.cos(rad);
    const y2 = cy + radius * Math.sin(rad);

    // Color gradient from coral pink to active coral
    const isActive = index <= activeTicks;
    const stroke = isActive
      ? index < totalTicks * 0.6
        ? "#F46C83"
        : "#FB8AA0"
      : "#F0E4E7";

    return { index, x1, y1, x2, y2, stroke };
  });

  return (
    <div className="flex items-center justify-between w-full">
      {/* Semicircle Gauge */}
      <div className="relative w-44 h-28 flex flex-col items-center justify-end">
        <svg
          viewBox="0 0 180 110"
          className="w-full h-full overflow-visible"
        >
          {ticks.map((t) => (
            <line
              key={t.index}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={t.stroke}
              strokeWidth="4"
              strokeLinecap="round"
            />
          ))}
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1 pointer-events-none">
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-coral animate-ping" />
            <span className="text-2xl font-black text-primary font-numeric tracking-tight">
              {value}
            </span>
            <span className="text-xs font-bold text-secondary">{unit}</span>
          </div>
          <span className="text-[10px] font-semibold text-secondary mt-0.5">
            {statusText}
          </span>
        </div>
      </div>

      {/* DNA / Wavelet Helix Graphic on Right */}
      <div className="w-20 h-24 relative flex items-center justify-center pr-2">
        <svg
          viewBox="0 0 80 100"
          className="w-full h-full drop-shadow-sm"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Base rungs */}
          {[15, 27, 39, 51, 63, 75, 87].map((y, i) => {
            const spread = Math.sin((i / 7) * Math.PI * 2) * 22;
            const x1 = 40 - spread;
            const x2 = 40 + spread;
            return (
              <line
                key={i}
                x1={x1}
                y1={y}
                x2={x2}
                y2={y}
                stroke="#D1D5DB"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            );
          })}
          {/* Helix Strand A */}
          <path
            d="M 18 10 Q 62 30 18 50 Q 62 70 18 90"
            stroke="#17191F"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Helix Strand B */}
          <path
            d="M 62 10 Q 18 30 62 50 Q 18 70 62 90"
            stroke="#9CA3AF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="1 1"
          />
        </svg>
      </div>
    </div>
  );
};
