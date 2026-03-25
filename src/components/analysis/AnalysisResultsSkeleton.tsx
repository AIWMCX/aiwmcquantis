import React from 'react';

function SkeletonBox({ className = '' }: { className?: string }) {
  return <div className={`q-skeleton ${className}`} />;
}

export function AnalysisResultsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero verdict strip skeleton */}
      <div className="q-card p-6">
        <div className="flex items-center gap-4 mb-4">
          <SkeletonBox className="w-32 h-8 rounded-full" />
          <SkeletonBox className="w-20 h-6 rounded-md" />
        </div>
        <SkeletonBox className="w-3/4 h-5 rounded-md mb-2" />
        <SkeletonBox className="w-1/2 h-4 rounded-md" />
      </div>

      {/* KPI grid skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="q-card p-5 space-y-3" style={{ animationDelay: `${i * 80}ms` }}>
            <SkeletonBox className="w-20 h-3 rounded-sm" />
            <SkeletonBox className="w-24 h-8 rounded-md" />
            <SkeletonBox className="w-16 h-4 rounded-full" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="q-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <SkeletonBox className="w-48 h-5 rounded-md" />
          <SkeletonBox className="w-24 h-8 rounded-md" />
        </div>
        <SkeletonBox className="w-full h-[240px] rounded-lg" />
      </div>

      {/* Risk cards skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="q-card p-4 space-y-2" style={{ animationDelay: `${(i + 6) * 80}ms` }}>
            <div className="flex items-center justify-between">
              <SkeletonBox className="w-16 h-3 rounded-sm" />
              <SkeletonBox className="w-8 h-5 rounded-md" />
            </div>
            <SkeletonBox className="w-full h-2 rounded-full" />
            <SkeletonBox className="w-3/4 h-3 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
