"use client";

import React from "react";

export interface CardSkeletonProps {
  count?: number;
  className?: string;
}

export function CardSkeleton({ count = 4, className = "" }: CardSkeletonProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-line-600 bg-asphalt-900 p-4 space-y-3 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 bg-asphalt-800 rounded" />
            <div className="w-8 h-8 rounded-lg bg-asphalt-800" />
          </div>
          <div className="h-7 w-16 bg-asphalt-800 rounded" />
          <div className="h-2.5 w-32 bg-asphalt-800/60 rounded" />
        </div>
      ))}
    </div>
  );
}
