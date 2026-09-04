"use client";

import React from "react";

export interface CardSkeletonProps {
  count?: number;
  className?: string;
}

export function CardSkeleton({ count = 4, className = "" }: CardSkeletonProps) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-apple-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 rounded-md bg-slate-200/70 animate-pulse" />
            <div className="h-8 w-8 rounded-xl bg-slate-200/60 animate-pulse" />
          </div>
          <div className="h-7 w-16 rounded-lg bg-slate-200/80 animate-pulse mt-2" />
          <div className="h-2.5 w-32 rounded-md bg-slate-200/50 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
