import React from 'react';

interface QIconProps {
  size?: number;
  className?: string;
}

export const QIconAI = ({ size = 24, className }: QIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2l5.2 3v6L12 14 6.8 11V5L12 2Z" />
    <path d="M12 10l5.2 3v6L12 22 6.8 19v-6L12 10Z" />
  </svg>
);

export const QIconConsensus = ({ size = 24, className }: QIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="7" cy="7" r="3" />
    <circle cx="17" cy="7" r="3" />
    <circle cx="12" cy="17" r="3" />
    <path d="M9.5 8.5L11 15" />
    <path d="M14.5 8.5L13 15" />
    <path d="M10 7h4" />
  </svg>
);

export const QIconBenchmark = ({ size = 24, className }: QIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 6h12" />
    <path d="M4 10h16" />
    <path d="M4 14h8" />
    <path d="M4 18h14" />
    <path d="M18 4v18" strokeDasharray="3 2" />
  </svg>
);

export const QIconConfidence = ({ size = 24, className }: QIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 18a8 8 0 0 1 16 0" />
    <path d="M12 18V10" />
    <circle cx="12" cy="18" r="1.5" />
    <path d="M8 6l4-3 4 3" />
  </svg>
);
