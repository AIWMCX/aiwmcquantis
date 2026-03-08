import React from 'react';

interface QIconProps {
  size?: number;
  className?: string;
}

export const QIconRiskLow = ({ size = 24, className }: QIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3l8 4.5v5c0 4.5-3.4 8.7-8 9.5-4.6-.8-8-5-8-9.5v-5L12 3Z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const QIconRiskMed = ({ size = 24, className }: QIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3l8 4.5v5c0 4.5-3.4 8.7-8 9.5-4.6-.8-8-5-8-9.5v-5L12 3Z" />
    <path d="M12 8v5" />
    <circle cx="12" cy="16" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

export const QIconRiskHigh = ({ size = 24, className }: QIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3l8 4.5v5c0 4.5-3.4 8.7-8 9.5-4.6-.8-8-5-8-9.5v-5L12 3Z" />
    <path d="M15 9l-6 6" />
    <path d="M9 9l6 6" />
  </svg>
);

export const QIconVerified = ({ size = 24, className }: QIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 12l5 5L20 7" />
    <path d="M7 12l5 5L22 7" />
  </svg>
);

export const QIconWarning = ({ size = 24, className }: QIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2L2 20h20L12 2Z" />
    <path d="M12 9v5" />
    <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

export const QIconBlocked = ({ size = 24, className }: QIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M5.7 5.7l12.6 12.6" />
  </svg>
);
