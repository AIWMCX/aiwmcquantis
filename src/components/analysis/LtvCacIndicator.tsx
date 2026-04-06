import React, { useMemo } from 'react';

interface LtvCacIndicatorProps {
  ratio: number;
  ltv?: number;
  cac?: number;
}

const ZONES = [
  { max: 1, label: 'Losing money on every customer', color: 'var(--q-status-red)', bg: 'var(--q-status-red)', zone: 'DANGER' },
  { max: 3, label: 'Below viability threshold', color: 'var(--q-status-red)', bg: 'var(--q-status-red)', zone: 'WEAK' },
  { max: 5, label: 'Viable but fragile', color: 'var(--q-status-yellow)', bg: 'var(--q-status-yellow)', zone: 'VIABLE' },
  { max: Infinity, label: 'Scale-ready unit economics', color: 'var(--q-status-green)', bg: 'var(--q-status-green)', zone: 'STRONG' },
] as const;

export function LtvCacIndicator({ ratio, ltv, cac }: LtvCacIndicatorProps) {
  const zone = useMemo(() => ZONES.find((z) => ratio < z.max) || ZONES[3], [ratio]);

  // Angle for gauge: 0 = -135°, 10 = +135° (270° arc)
  const clampedRatio = Math.min(ratio, 10);
  const angle = -135 + (clampedRatio / 10) * 270;

  return (
    <div className="q-card p-5 space-y-4">
      <h3
        className="text-sm font-semibold text-[var(--q-text-primary)]"
        style={{ fontFamily: 'var(--q-font-heading)' }}
      >
        Unit Economics Health
      </h3>

      <div className="flex items-center gap-6">
        {/* Gauge */}
        <div className="relative w-[120px] h-[120px] shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full">
            {/* Background arc */}
            <path
              d="M 15 85 A 50 50 0 1 1 105 85"
              fill="none"
              stroke="var(--q-border-default)"
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.3"
            />
            {/* Red zone (0-3) */}
            <path
              d="M 15 85 A 50 50 0 0 1 27 35"
              fill="none"
              stroke="var(--q-status-red)"
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.5"
            />
            {/* Yellow zone (3-5) */}
            <path
              d="M 27 35 A 50 50 0 0 1 60 10"
              fill="none"
              stroke="var(--q-status-yellow)"
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.5"
            />
            {/* Green zone (5+) */}
            <path
              d="M 60 10 A 50 50 0 0 1 105 85"
              fill="none"
              stroke="var(--q-status-green)"
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.5"
            />
            {/* Needle */}
            <line
              x1="60"
              y1="60"
              x2="60"
              y2="20"
              stroke={zone.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              transform={`rotate(${angle} 60 60)`}
            />
            <circle cx="60" cy="60" r="4" fill={zone.color} />
          </svg>
          {/* Central number */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
            <span
              className="text-xl font-bold"
              style={{ fontFamily: 'var(--q-font-mono)', color: zone.color }}
            >
              {ratio.toFixed(1)}×
            </span>
          </div>
        </div>

        {/* Right side info */}
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: zone.color }}
            />
            <span className="text-sm font-semibold text-[var(--q-text-primary)]">{zone.zone}</span>
          </div>
          <p className="text-xs text-[var(--q-text-secondary)] leading-relaxed">{zone.label}</p>
          {ltv !== undefined && cac !== undefined && (
            <div className="flex gap-3 text-xs text-[var(--q-text-tertiary)]" style={{ fontFamily: 'var(--q-font-mono)' }}>
              <span>LTV ${ltv.toLocaleString()}</span>
              <span>CAC ${cac.toLocaleString()}</span>
            </div>
          )}
          {ratio < 3 && (
            <p className="text-[11px] font-medium text-[var(--q-status-red)]">
              ⚠ Below the 3:1 minimum for sustainable growth
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
