import React from 'react';
import { ChevronDown, ChevronUp, HelpCircle, TrendingUp, DollarSign, Users, Percent, Sparkles, Zap } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { BenchmarkWarning } from './BenchmarkWarning';
import { OpExWarning } from './OpExWarning';
import { validateParamAgainstBenchmarks, autofillMissingParams, getBenchmark } from '@/lib/benchmark-calibrator';
import type { OptionalFinancialInputs } from '@/types/analysis';

interface AdvancedFinancialInputsProps {
  financialInputs: OptionalFinancialInputs;
  onChange: (inputs: OptionalFinancialInputs) => void;
  disabled?: boolean;
  industryType?: string;
  location?: string;
}

type NumericFinancialKeys = Exclude<keyof OptionalFinancialInputs, 'selected_industry'>;

interface FieldConfig {
  key: NumericFinancialKeys;
  label: string;
  placeholder: string;
  tooltip: string;
  subtext: string;
  icon: React.ReactNode;
  prefix?: string;
  suffix?: string;
  benchmarkParam?: string;
  groupEnd?: boolean; // show divider after this field
}

const FIELD_CONFIGS: FieldConfig[] = [
  {
    key: 'startup_investment',
    label: 'Initial Investment',
    placeholder: '50,000',
    tooltip: 'Total amount you plan to invest to start the business',
    subtext: 'Typical: $25,000–$100,000 for this industry',
    icon: <DollarSign className="w-4 h-4" />,
    prefix: '$',
  },
  {
    key: 'monthly_revenue',
    label: 'Expected Monthly Revenue',
    placeholder: '15,000',
    tooltip: 'How much revenue you expect per month once operational',
    subtext: 'Estimated target — we\'ll validate this',
    icon: <TrendingUp className="w-4 h-4" />,
    prefix: '$',
    groupEnd: true,
  },
  {
    key: 'average_price',
    label: 'Average Price per Sale',
    placeholder: '89',
    tooltip: 'Average price customers pay for your product or service',
    subtext: 'Per transaction / per month / per unit',
    icon: <DollarSign className="w-4 h-4" />,
    prefix: '$',
    benchmarkParam: 'avg_ticket_size',
  },
  {
    key: 'expected_customers',
    label: 'Monthly Customers',
    placeholder: '30',
    tooltip: 'Expected number of paying customers per month',
    subtext: 'Expected at launch',
    icon: <Users className="w-4 h-4" />,
    groupEnd: true,
  },
  {
    key: 'monthly_costs',
    label: 'Monthly Operating Costs',
    placeholder: '10,000',
    tooltip: 'Total monthly expenses including rent, salaries, utilities, etc.',
    subtext: 'Rent + staff + utilities + software',
    icon: <DollarSign className="w-4 h-4" />,
    prefix: '$',
  },
  {
    key: 'cac',
    label: 'Customer Acquisition Cost',
    placeholder: '150',
    tooltip: 'How much it costs to acquire one new customer',
    subtext: 'Cost to acquire one customer',
    icon: <DollarSign className="w-4 h-4" />,
    prefix: '$',
    benchmarkParam: 'cac',
  },
  {
    key: 'churn_rate',
    label: 'Monthly Churn Rate',
    placeholder: '5',
    tooltip: 'Percentage of customers who stop using your service each month',
    subtext: '% of customers lost per month',
    icon: <Percent className="w-4 h-4" />,
    suffix: '%',
    benchmarkParam: 'churn_rate',
  },
];

function countFilledFields(inputs: OptionalFinancialInputs): number {
  const numericKeys: NumericFinancialKeys[] = ['startup_investment', 'monthly_revenue', 'average_price', 'expected_customers', 'monthly_costs', 'cac', 'churn_rate'];
  return numericKeys.filter(key => {
    const v = inputs[key];
    return v !== undefined && v !== null && v > 0;
  }).length;
}

function formatNumber(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? '' : cleaned;
}

export function AdvancedFinancialInputs({ 
  financialInputs, 
  onChange,
  disabled = false,
  industryType,
}: AdvancedFinancialInputsProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const filledCount = countFilledFields(financialInputs);
  const totalFields = FIELD_CONFIGS.length;
  const confidenceBoost = Math.round((filledCount / totalFields) * 40);

  const handleChange = (key: NumericFinancialKeys, value: string) => {
    const formatted = formatNumber(value);
    const numValue = formatted ? parseFloat(formatted) : undefined;
    onChange({
      ...financialInputs,
      [key]: numValue,
    });
  };

  const handleAutofill = () => {
    if (!industryType) return;
    const partial: Record<string, number | undefined> = {};
    for (const field of FIELD_CONFIGS) {
      if (field.benchmarkParam) {
        partial[field.benchmarkParam] = financialInputs[field.key] as number | undefined;
      }
    }
    const result = autofillMissingParams(partial, industryType);
    const updated = { ...financialInputs };
    for (const field of FIELD_CONFIGS) {
      if (field.benchmarkParam && result.autofilledFields.includes(field.benchmarkParam)) {
        (updated as any)[field.key] = result.filledParams[field.benchmarkParam];
      }
    }
    onChange(updated);
  };

  return (
    <TooltipProvider>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
            "bg-[var(--q-bg-surface)] hover:bg-[var(--q-bg-elevated)] border-[var(--q-border-default)]",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--q-accent-primary)]/10">
              <TrendingUp className="w-4 h-4 text-[var(--q-accent-primary)]" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm text-[var(--q-text-primary)]">Advanced Financial Details</p>
              <p className="text-xs text-[var(--q-text-tertiary)]">
                {filledCount > 0 
                  ? `${filledCount}/${totalFields} fields filled · +${confidenceBoost}% confidence`
                  : 'Optional — boosts confidence up to 40%'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {filledCount > 0 && (
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[var(--q-accent-primary)]/15 text-[var(--q-accent-primary)]" style={{ fontFamily: 'var(--q-font-mono)' }}>
                +{confidenceBoost}%
              </span>
            )}
            {isOpen ? (
              <ChevronUp className="w-5 h-5 text-[var(--q-text-tertiary)]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[var(--q-text-tertiary)]" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4">
          <div className="p-5 rounded-xl border border-[var(--q-border-default)] bg-[var(--q-bg-surface)]">
            {/* Compact Confidence Boost Banner */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--q-accent-glow)] border border-[var(--q-accent-primary)]/15 mb-6">
              <TrendingUp className="w-4 h-4 text-[var(--q-accent-primary)] flex-shrink-0" />
              <p className="text-xs text-[var(--q-text-secondary)] leading-snug flex-1">
                Real financial data increases accuracy by ~40%. All fields optional.
              </p>
              {industryType && (
                <button
                  type="button"
                  onClick={handleAutofill}
                  disabled={disabled}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex-shrink-0",
                    "bg-[var(--q-accent-primary)]/15 text-[var(--q-accent-primary)] hover:bg-[var(--q-accent-primary)]/25",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Sparkles className="w-3 h-3" />
                  Auto-fill
                </button>
              )}
            </div>

            {/* Single-column full-width fields */}
            <div className="space-y-0">
              {FIELD_CONFIGS.map((field, i) => (
                <React.Fragment key={field.key}>
                  <FinancialField
                    config={field}
                    value={financialInputs[field.key]}
                    onChange={(value) => handleChange(field.key, value)}
                    disabled={disabled}
                    industryType={industryType}
                    onUseMedian={(median) => handleChange(field.key, median.toString())}
                  />
                  {field.groupEnd && i < FIELD_CONFIGS.length - 1 && (
                    <div className="h-px bg-[var(--q-border-subtle)] my-5" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Confidence Boost Pill */}
            {filledCount > 0 && (
              <div className="flex items-center gap-2 mt-6 px-4 py-2.5 rounded-full w-fit"
                style={{ background: 'hsla(160, 84%, 39%, 0.08)', border: '1px solid hsla(160, 84%, 39%, 0.2)' }}>
                <Zap className="w-3.5 h-3.5 text-[var(--q-status-green)]" />
                <span className="text-[13px] font-medium text-[var(--q-status-green)]" style={{ fontFamily: 'var(--q-font-mono)' }}>
                  +{confidenceBoost}% confidence boost · {filledCount}/{totalFields} fields filled
                </span>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </TooltipProvider>
  );
}

function FinancialField({ 
  config, 
  value, 
  onChange,
  disabled,
  industryType,
  onUseMedian,
}: { 
  config: FieldConfig; 
  value?: number;
  onChange: (value: string) => void;
  disabled?: boolean;
  industryType?: string;
  onUseMedian?: (median: number) => void;
}) {
  const validation = React.useMemo(() => {
    if (!industryType || !config.benchmarkParam || !value || value <= 0) return null;
    return validateParamAgainstBenchmarks(config.benchmarkParam, value, industryType);
  }, [industryType, config.benchmarkParam, value]);

  const handleUseMedian = React.useCallback(() => {
    if (!industryType || !config.benchmarkParam || !onUseMedian) return;
    const benchmark = getBenchmark(industryType, config.benchmarkParam);
    if (benchmark) onUseMedian(benchmark.p50);
  }, [industryType, config.benchmarkParam, onUseMedian]);

  return (
    <div className="mb-5 last:mb-0">
      {/* Label row */}
      <label className="flex items-center gap-1.5 mb-2">
        <span className="text-[13px] font-medium tracking-wide uppercase text-[var(--q-text-tertiary)]" style={{ letterSpacing: '0.04em' }}>
          {config.label}
        </span>
        <span className="text-[10px] text-[var(--q-text-tertiary)]/60 font-normal normal-case tracking-normal ml-1">
          optional
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="w-3.5 h-3.5 text-[var(--q-text-tertiary)]/50 cursor-help ml-auto" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px]">
            <p className="text-sm">{config.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </label>

      {/* Input wrapper — 56px height */}
      <div
        className={cn(
          "flex items-center h-14 rounded-[10px] border transition-all duration-150",
          "bg-[var(--q-bg-input)] border-[var(--q-border-default)]",
          "focus-within:border-[var(--q-accent-primary)] focus-within:shadow-[0_0_0_3px_var(--q-accent-glow)]",
          "hover:border-[var(--q-border-hover)]",
          validation?.warningLevel === 'critical' && "border-[var(--q-status-red)]/50",
          validation?.warningLevel === 'strong' && "border-[var(--q-status-yellow)]/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {config.prefix && (
          <span
            className="pl-4 text-[15px] font-medium text-[var(--q-text-tertiary)] select-none pointer-events-none flex-shrink-0"
            style={{ fontFamily: 'var(--q-font-mono)' }}
          >
            {config.prefix}
          </span>
        )}
        <input
          type="text"
          inputMode="numeric"
          value={value !== undefined ? value.toString() : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config.placeholder}
          disabled={disabled}
          className={cn(
            "flex-1 h-full bg-transparent border-none outline-none text-[var(--q-text-primary)]",
            "text-lg font-semibold placeholder:text-[var(--q-text-tertiary)]/40",
            config.prefix ? "pl-2 pr-4" : "pl-4 pr-4",
            config.suffix && "pr-2",
          )}
          style={{
            fontFamily: 'var(--q-font-mono)',
            WebkitAppearance: 'none',
            MozAppearance: 'textfield',
          }}
        />
        {config.suffix && (
          <span
            className="pr-4 text-[15px] font-medium text-[var(--q-text-tertiary)] select-none pointer-events-none flex-shrink-0"
            style={{ fontFamily: 'var(--q-font-mono)' }}
          >
            {config.suffix}
          </span>
        )}
      </div>

      {/* Subtext */}
      <p className="text-[11px] text-[var(--q-text-tertiary)]/70 mt-1.5 pl-0.5">
        {config.subtext}
      </p>

      {/* Benchmark warning */}
      {validation && validation.warningLevel !== 'none' && (
        <div className="mt-2">
          <BenchmarkWarning
            warningLevel={validation.warningLevel}
            message={validation.message}
            benchmarkRange={validation.benchmarkRange}
            percentile={validation.percentile}
            onUseMedian={handleUseMedian}
          />
        </div>
      )}
    </div>
  );
}