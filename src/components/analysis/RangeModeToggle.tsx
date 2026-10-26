import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { MonteCarloParam } from '@/lib/monte-carlo';

interface RangeModeToggleProps {
  fieldName: string;
  label: string;
  baseValue: number;
  rangeMode: boolean;
  onToggle: (enabled: boolean) => void;
  param?: MonteCarloParam;
  onParamChange?: (param: MonteCarloParam) => void;
  prefix?: string;
  suffix?: string;
  disabled?: boolean;
}

/** Distribution shape SVG between min/base/max fields */
function DistributionPreview({ type }: { type: 'uniform' | 'normal' | 'triangular' }) {
  return (
    <svg viewBox="0 0 48 24" className="w-10 h-5 text-[var(--q-accent-primary)] opacity-70" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {type === 'normal' && (
        <path d="M4 22 Q12 22 18 10 Q24 0 30 10 Q36 22 44 22" />
      )}
      {type === 'triangular' && (
        <path d="M4 22 L24 3 L44 22" />
      )}
      {type === 'uniform' && (
        <path d="M4 22 L4 6 L44 6 L44 22" />
      )}
    </svg>
  );
}

export default function RangeModeToggle({
  fieldName,
  label,
  baseValue,
  rangeMode,
  onToggle,
  param,
  onParamChange,
  prefix = '',
  suffix = '',
  disabled = false,
}: RangeModeToggleProps) {
  const currentParam: MonteCarloParam = param ?? {
    name: fieldName,
    baseValue,
    minValue: Math.round(baseValue * 0.7),
    maxValue: Math.round(baseValue * 1.3),
    distribution: 'triangular',
  };

  const handleFieldChange = (field: keyof MonteCarloParam, value: string | number) => {
    if (!onParamChange) return;
    onParamChange({
      ...currentParam,
      [field]: typeof value === 'string' && field !== 'distribution' && field !== 'name'
        ? parseFloat(value) || 0
        : value,
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-[var(--q-text-secondary)]">{label}</Label>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--q-text-tertiary)] uppercase tracking-wider font-semibold">Range</span>
          <Switch
            checked={rangeMode}
            onCheckedChange={onToggle}
            disabled={disabled}
            className="scale-75"
          />
        </div>
      </div>

      {rangeMode ? (
        <div className={cn(
          "p-3 rounded-[var(--q-radius-md)] border border-[var(--q-accent-primary)]/20",
          "bg-[var(--q-accent-glow)]",
          "space-y-3 transition-all duration-[var(--q-duration-normal)]",
          "animate-in slide-in-from-top-1 fade-in duration-200"
        )}>
          {/* Min / Distribution Shape / Base / Distribution Shape / Max */}
          <div className="flex items-end gap-1">
            {/* Min */}
            <div className="flex-1 space-y-1">
              <span className="text-[10px] text-[var(--q-text-tertiary)] font-medium uppercase tracking-wide">Min</span>
              <div className="relative">
                {prefix && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--q-text-tertiary)]">{prefix}</span>}
                <Input
                  type="number"
                  value={currentParam.minValue}
                  onChange={(e) => handleFieldChange('minValue', e.target.value)}
                  className={cn("h-10 text-xs", prefix && "pl-5")}
                  disabled={disabled}
                />
                {suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--q-text-tertiary)]">{suffix}</span>}
              </div>
            </div>

            {/* Distribution shape between min and base */}
            <div className="flex items-center justify-center pb-1">
              <div className="w-6 h-px bg-[var(--q-border-default)]" />
            </div>

            {/* Base */}
            <div className="flex-1 space-y-1">
              <span className="text-[10px] text-[var(--q-accent-primary)] font-semibold uppercase tracking-wide">Base</span>
              <div className="relative">
                {prefix && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--q-text-tertiary)]">{prefix}</span>}
                <Input
                  type="number"
                  value={currentParam.baseValue}
                  onChange={(e) => handleFieldChange('baseValue', e.target.value)}
                  className={cn("h-10 text-xs border-[var(--q-accent-primary)]/30", prefix && "pl-5")}
                  disabled={disabled}
                />
                {suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--q-text-tertiary)]">{suffix}</span>}
              </div>
            </div>

            {/* Connector */}
            <div className="flex items-center justify-center pb-1">
              <div className="w-6 h-px bg-[var(--q-border-default)]" />
            </div>

            {/* Max */}
            <div className="flex-1 space-y-1">
              <span className="text-[10px] text-[var(--q-text-tertiary)] font-medium uppercase tracking-wide">Max</span>
              <div className="relative">
                {prefix && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--q-text-tertiary)]">{prefix}</span>}
                <Input
                  type="number"
                  value={currentParam.maxValue}
                  onChange={(e) => handleFieldChange('maxValue', e.target.value)}
                  className={cn("h-10 text-xs", prefix && "pl-5")}
                  disabled={disabled}
                />
                {suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--q-text-tertiary)]">{suffix}</span>}
              </div>
            </div>
          </div>

          {/* Distribution selector + preview */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DistributionPreview type={currentParam.distribution} />
              <Select
                value={currentParam.distribution}
                onValueChange={(v) => handleFieldChange('distribution', v)}
                disabled={disabled}
              >
                <SelectTrigger className="h-7 text-[10px] w-[100px] border-[var(--q-border-default)]/50 bg-[var(--q-bg-input)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="triangular" className="text-xs">Triangular</SelectItem>
                  <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                  <SelectItem value="uniform" className="text-xs">Uniform</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="text-[10px] text-[var(--q-text-tertiary)] font-mono tabular-nums">
              {prefix}{currentParam.minValue.toLocaleString('en-US')}{suffix} – {prefix}{currentParam.maxValue.toLocaleString('en-US')}{suffix}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
