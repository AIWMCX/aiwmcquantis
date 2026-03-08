import React from 'react';

interface QIconProps {
  size?: number;
  className?: string;
}

export const QIconRevenue = ({ size = 24, className }: QIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M7 17l4-6 3 3 3-7" />
    <path d="M15 7h2v2" />
  </svg>
);

export const QIconProfit = ({ size = 24, className }: QIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 6v12" />
    <path d="M15 9.5c0-1.38-1.34-2.5-3-2.5s-3 1.12-3 2.5 1.34 2.5 3 2.5 3 1.12 3 2.5-1.34 2.5-3 2.5" />
    <path d="M18 4l1-1" />
    <path d="M19 3l-1 1" />
    <circle cx="19" cy="3" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

export const QIconCost = ({ size = 24, className }: QIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3v18" />
    <path d="M8 7l4 4 4-4" />
    <path d="M17 11h2M5 11h2" />
    <path d="M17 15h2M5 15h2" />
  </svg>
);

export const QIconMargin = ({ size = 24, className }: QIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 4h3" />
    <path d="M5 20h3" />
    <path d="M16 4h3" />
    <path d="M16 20h3" />
    <path d="M10 7l2 5 2-5" />
    <path d="M9 15h6" />
    <path d="M9 17h6" />
  </svg>
);

export const QIconCashflow = ({ size = 24, className }: QIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 12c2-3 4-4 6-1s4 2 6-1 4-2 6 1 2 2 2 2" />
    <path d="M2 17c2-3 4-4 6-1s4 2 6-1 4-2 6 1 2 2 2 2" />
    <path d="M2 7c2-3 4-4 6-1s4 2 6-1 4-2 6 1 2 2 2 2" />
  </svg>
);

export const QIconBreakeven = ({ size = 24, className }: QIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 20l9-16 9 16" />
    <path d="M3 14h18" />
    <circle cx="12" cy="11" r="1.5" />
  </svg>
);

export const QIconRunway = ({ size = 24, className }: QIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="10" width="18" height="4" rx="2" />
    <rect x="3" y="10" width="11" height="4" rx="2" />
    <path d="M7 10V8" />
    <path d="M11 10V8" />
    <path d="M15 10V8" />
    <path d="M19 10V8" />
  </svg>
);
