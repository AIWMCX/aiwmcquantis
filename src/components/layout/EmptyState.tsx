import React from 'react';
import { PersonalizedEmptyState } from './PersonalizedEmptyState';

interface EmptyStateProps {
  analysisCount?: number;
  remainingAnalyses?: number;
  isRateLimited?: boolean;
  lastAnalysis?: {
    idea: string;
    timestamp: Date;
  };
  onStartAnalysis?: () => void;
  onTrySample?: () => void;
  onUpgrade?: () => void;
}

export function EmptyState({
  analysisCount = 0,
  remainingAnalyses,
  isRateLimited = false,
  lastAnalysis,
  onStartAnalysis = () => {},
  onTrySample,
  onUpgrade,
}: EmptyStateProps) {
  return (
    <PersonalizedEmptyState
      analysisCount={analysisCount}
      remainingAnalyses={remainingAnalyses}
      isRateLimited={isRateLimited}
      lastAnalysis={lastAnalysis}
      onStartAnalysis={onStartAnalysis}
      onTrySample={onTrySample}
      onUpgrade={onUpgrade}
    />
  );
}
