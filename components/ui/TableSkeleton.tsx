"use client";

import React from "react";

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  cols?: number; // alias
  className?: string;
}

export function TableSkeleton({
  rows = 5,
  columns,
  cols = 6,
  className = "",
}: TableSkeletonProps) {
  const actualCols = columns || cols;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-apple-sm ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/80">
              {Array.from({ length: actualCols }).map((_, i) => (
                <th key={i} className="px-4 py-3.5">
                  <div className="h-3.5 w-20 rounded-md bg-slate-200/70 animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} className="hover:bg-slate-50/40">
                {Array.from({ length: actualCols }).map((_, c) => (
                  <td key={c} className="px-4 py-3.5">
                    <div
                      className="h-3 rounded-md bg-slate-200/60 animate-pulse"
                      style={{
                        width: `${Math.max(40, Math.min(90, (r * 13 + c * 17) % 70 + 35))}%`,
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
