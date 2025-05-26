
import React from 'react';

const LoadingSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-3xl mt-0 animate-pulse-subtle">
      <div className="section-card space-y-6">
        <div className="h-8 bg-muted rounded w-2/3"></div>
        <div className="h-5 bg-muted rounded w-1/3"></div>
        <div className="h-5 bg-muted rounded w-1/2"></div>
        <div className="space-y-3">
          <div className="h-6 bg-muted rounded w-1/4 mb-2"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
        <div className="space-y-3">
          <div className="h-6 bg-muted rounded w-1/4 mb-2"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
        <div className="space-y-3">
          <div className="h-6 bg-muted rounded w-1/4 mb-2"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSkeleton;
