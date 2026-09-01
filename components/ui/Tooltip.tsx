"use client";

import React, { ReactNode } from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = "bottom",
  className = "",
}: TooltipProps) {
  if (!content) return <>{children}</>;

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-line-500 border-l-transparent border-r-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-line-500 border-l-transparent border-r-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-line-500 border-t-transparent border-b-transparent border-r-transparent",
    right: "right-full top-1/2 -translate-y-1/2 border-r-line-500 border-t-transparent border-b-transparent border-l-transparent",
  };

  return (
    <div className={`relative group inline-flex items-center justify-center ${className}`}>
      {children}
      <div
        role="tooltip"
        className={`absolute z-50 pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 scale-95 group-hover:scale-100 ${positionClasses[position]}`}
      >
        <div className="rounded-md border border-line-500 bg-asphalt-900 px-2.5 py-1.5 text-xs text-paper-50 shadow-2xl font-mono tracking-tight">
          {content}
        </div>
      </div>
    </div>
  );
}
