"use client";

import React from "react";

interface FloatingCalloutBadgeProps {
  label: string;
  dotColor?: string;
  position?: "left" | "right" | "top";
  className?: string;
}

export const FloatingCalloutBadge: React.FC<FloatingCalloutBadgeProps> = ({
  label,
  dotColor = "#16A6A1",
  position = "right",
  className = "",
}) => {
  return (
    <div
      className={`inline-flex items-center space-x-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-float border border-white/80 transition-transform duration-200 hover:scale-105 select-none ${className}`}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: dotColor }}
      />
      <span className="text-xs font-semibold text-primary tracking-tight whitespace-nowrap">
        {label}
      </span>
    </div>
  );
};
