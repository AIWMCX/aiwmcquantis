import React, { useState } from 'react';
import { fmtK } from './shared';

interface FinancialFieldProps {
  label: string;
  prefix?: string;
  suffix?: string;
  placeholder: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  benchmarkMin?: number;
  benchmarkMax?: number;
  hint?: string;
  advisorHint?: string;
}

export function FinancialField({ label, prefix, suffix, placeholder, value, onChange, benchmarkMin, benchmarkMax, hint, advisorHint }: FinancialFieldProps) {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== undefined && value > 0;

  let statusLabel = '';
  let statusColor = '';
  let dotPct = 50;
  if (hasValue && benchmarkMin !== undefined && benchmarkMax !== undefined) {
    const range = benchmarkMax - benchmarkMin;
    dotPct = range > 0 ? Math.max(0, Math.min(100, ((value - benchmarkMin) / range) * 100)) : 50;
    if (value >= benchmarkMin && value <= benchmarkMax) {
      statusLabel = 'In range ✓'; statusColor = 'var(--q-status-green)';
    } else if (value < benchmarkMin) {
      statusLabel = 'Below typical'; statusColor = 'var(--q-status-yellow)';
    } else {
      statusLabel = 'Above typical'; statusColor = 'var(--q-status-orange)';
    }
  }

  return (
    <div className="flex flex-col min-w-0">
      <label className="q-form-label mb-1.5">
        {label}
      </label>
      <div
        className="flex items-center h-12 rounded-[var(--q-radius-md)] transition-all duration-150"
        style={{
          background: 'var(--q-bg-input)',
          border: `1px solid ${focused ? 'var(--q-accent-primary)' : hasValue ? 'var(--q-border-default)' : 'var(--q-border-subtle)'}`,
          boxShadow: focused ? '0 0 0 3px var(--q-accent-glow)' : 'none',
        }}
      >
        {prefix && (
          <span className="pl-3 text-sm font-medium flex-shrink-0 select-none pointer-events-none transition-colors duration-150"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: focused ? 'var(--q-accent-primary)' : 'var(--q-text-tertiary)' }}>
            {prefix}
          </span>
        )}
        <input
          type="number"
          inputMode="numeric"
          placeholder={placeholder}
          value={value ?? ''}
          onChange={e => {
            const v = e.target.value;
            onChange(v === '' ? undefined : Number(v));
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 h-full bg-transparent border-none outline-none text-[18px] font-semibold"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: 'var(--q-text-primary)',
            padding: prefix ? '0 10px' : '0 12px',
            MozAppearance: 'textfield',
          }}
        />
        {suffix && (
          <span className="pr-3 text-sm font-medium flex-shrink-0 select-none pointer-events-none transition-colors duration-150"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: focused ? 'var(--q-accent-primary)' : 'var(--q-text-tertiary)' }}>
            {suffix}
          </span>
        )}
      </div>
      {/* Smart advisor hint on focus */}
      {focused && advisorHint && !hasValue && (
        <span className="text-[12px] mt-1 px-2 py-0.5 rounded-md inline-block w-fit" style={{ background: 'var(--q-status-ai-bg)', color: 'var(--q-status-ai)', border: '1px solid var(--q-status-ai-border)' }}>
          {advisorHint}
        </span>
      )}
      {!hasValue && !focused && hint && (
        <span className="q-form-hint mt-1">{hint}</span>
      )}
      {benchmarkMin !== undefined && benchmarkMax !== undefined && hasValue && (
        <div className="mt-1.5">
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-[11px]" style={{ color: 'var(--q-text-tertiary)' }}>{fmtK(benchmarkMin)}</span>
            <span className="text-[11px] font-semibold" style={{ color: statusColor }}>{statusLabel}</span>
            <span className="text-[11px]" style={{ color: 'var(--q-text-tertiary)' }}>{fmtK(benchmarkMax)}</span>
          </div>
          <div className="relative h-[5px] rounded-full" style={{ background: 'var(--q-border-subtle)' }}>
            <div className="absolute h-full rounded-full" style={{ left: '25%', right: '25%', background: 'var(--q-status-green-bg)' }} />
            <div
              className="absolute top-1/2 w-2.5 h-2.5 rounded-full transition-all duration-[400ms]"
              style={{
                left: `${dotPct}%`,
                transform: 'translate(-50%, -50%)',
                background: statusColor,
                border: '2px solid var(--q-bg-base)',
                boxShadow: `0 0 8px ${statusColor}60`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
