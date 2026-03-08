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

/** Tiny SVG distribution preview */
function DistributionPreview({ type }: { type: 'uniform' | 'normal' | 'triangular' }) {
  return (
    <svg viewBox="0 0 40 20" className="w-8 h-4 text-primary opacity-60" fill="none" stroke="currentColor" strokeWidth="1.5">
      {type === 'normal' && (
        <path d="M2 18 Q10 18 15 8 Q20 0 25 8 Q30 18 38 18" />
      )}
      {type === 'triangular' && (
        <path d="M2 18 L20 2 L38 18" />
      )}
      {type === 'uniform' && (
        <path d="M2 18 L2 6 L38 6 L38 18" />
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
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Range</span>
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
          "p-3 rounded-lg border border-primary/20",
          "bg-gradient-to-r from-primary/5 via-primary/3 to-primary/5",
          "space-y-2.5 transition-all duration-200"
        )}>
          {/* Min / Base / Max inputs */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-medium">Min</span>
              <div className="relative">
                {prefix && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
                <Input
                  type="number"
                  value={currentParam.minValue}
                  onChange={(e) => handleFieldChange('minValue', e.target.value)}
                  className={cn("h-8 text-xs", prefix && "pl-5")}
                  disabled={disabled}
                />
                {suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-primary font-semibold">Base</span>
              <div className="relative">
                {prefix && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
                <Input
                  type="number"
                  value={currentParam.baseValue}
                  onChange={(e) => handleFieldChange('baseValue', e.target.value)}
                  className={cn("h-8 text-xs border-primary/30", prefix && "pl-5")}
                  disabled={disabled}
                />
                {suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-medium">Max</span>
              <div className="relative">
                {prefix && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
                <Input
                  type="number"
                  value={currentParam.maxValue}
                  onChange={(e) => handleFieldChange('maxValue', e.target.value)}
                  className={cn("h-8 text-xs", prefix && "pl-5")}
                  disabled={disabled}
                />
                {suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
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
                <SelectTrigger className="h-7 text-[10px] w-[100px] border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="triangular" className="text-xs">Triangular</SelectItem>
                  <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                  <SelectItem value="uniform" className="text-xs">Uniform</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Range: {prefix}{currentParam.minValue.toLocaleString()}{suffix} – {prefix}{currentParam.maxValue.toLocaleString()}{suffix}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
