"use client";

import React from "react";

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 5,
  showHeader = true,
  className = "",
}: TableSkeletonProps) {
  return (
    <div className={`overflow-hidden rounded-xl border border-line-600 bg-asphalt-900 ${className}`}>
      {showHeader && (
        <div className="border-b border-line-600 bg-asphalt-950/80 p-3.5 flex items-center justify-between gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <div
              key={i}
              className="h-3.5 bg-asphalt-800 rounded animate-pulse"
              style={{
                width: i === 0 ? "18%" : i === columns - 1 ? "12%" : "20%",
              }}
            />
          ))}
        </div>
      )}

      <div className="divide-y divide-line-600/60">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div
            key={rIdx}
            className="p-3.5 flex items-center justify-between gap-4 bg-asphalt-900/60"
          >
            {Array.from({ length: columns }).map((_, cIdx) => (
              <div
                key={cIdx}
                className="h-4 bg-asphalt-800/80 rounded animate-pulse"
                style={{
                  width:
                    cIdx === 0
                      ? `${20 + (rIdx % 3) * 5}%`
                      : cIdx === columns - 1
                      ? "10%"
                      : `${15 + ((rIdx + cIdx) % 4) * 5}%`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
