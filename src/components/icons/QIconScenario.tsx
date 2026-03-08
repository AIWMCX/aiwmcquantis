import React from 'react';

interface QIconProps {
  size?: number;
  className?: string;
}

export const QIconStressMap = ({ size = 24, className }: QIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="8" height="8" rx="2" />
    <rect x="13" y="3" width="8" height="8" rx="2" />
    <rect x="3" y="13" width="8" height="8" rx="2" />
    <rect x="13" y="13" width="8" height="8" rx="2" />
  </svg>
);

export const QIconScenario = ({ size = 24, className }: QIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="5" cy="12" r="2" />
    <circle cx="19" cy="5" r="2" />
    <circle cx="19" cy="12" r="2" />
    <circle cx="19" cy="19" r="2" />
    <path d="M7 12h4l4-7" />
    <path d="M11 12h6" />
    <path d="M11 12l4 7" />
  </svg>
);

export const QIconRecession = ({ size = 24, className }: QIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 7h4v-0H7L7 10h4v0h0v3h4v0h0v3h4v0h0v4h2" />
    <path d="M3 7h4v3h4v3h4v3h4v4" />
    <path d="M21 21H3V3" />
  </svg>
);

export const QIconTornado = ({ size = 24, className }: QIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 4v16" />
    <path d="M5 6h14" />
    <path d="M3 10h18" />
    <path d="M6 14h12" />
    <path d="M8 18h8" />
  </svg>
);
