import React from 'react';
import { ChevronDown, ChevronUp, HelpCircle, TrendingUp, DollarSign, Users, Percent, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { BenchmarkWarning } from './BenchmarkWarning';
import { validateParamAgainstBenchmarks, autofillMissingParams, getBenchmark } from '@/lib/benchmark-calibrator';
import type { OptionalFinancialInputs } from '@/types/analysis';

interface AdvancedFinancialInputsProps {
  financialInputs: OptionalFinancialInputs;
  onChange: (inputs: OptionalFinancialInputs) => void;
  disabled?: boolean;
  industryType?: string;
}

// Numeric-only keys from OptionalFinancialInputs (excluding selected_industry)
type NumericFinancialKeys = Exclude<keyof OptionalFinancialInputs, 'selected_industry'>;

interface FieldConfig {
  key: NumericFinancialKeys;
  label: string;
  placeholder: string;
  tooltip: string;
  icon: React.ReactNode;
  prefix?: string;
  suffix?: string;
  benchmarkParam?: string; // maps to benchmark-calibrator parameter name
}

const FIELD_CONFIGS: FieldConfig[] = [
  {
    key: 'startup_investment',
    label: 'Initial Investment',
    placeholder: '50000',
    tooltip: 'Total amount you plan to invest to start the business (equipment, inventory, setup costs)',
    icon: <DollarSign className="w-4 h-4" />,
    prefix: '$',
  },
  {
    key: 'monthly_revenue',
    label: 'Expected Monthly Revenue',
    placeholder: '15000',
    tooltip: 'How much revenue you expect to generate per month once operational',
    icon: <TrendingUp className="w-4 h-4" />,
    prefix: '$',
  },
  {
    key: 'average_price',
    label: 'Average Price per Sale',
    placeholder: '100',
    tooltip: 'Average price customers pay for your product or service',
    icon: <DollarSign className="w-4 h-4" />,
    prefix: '$',
    benchmarkParam: 'avg_ticket_size',
  },
  {
    key: 'expected_customers',
    label: 'Monthly Customers',
    placeholder: '150',
    tooltip: 'Expected number of paying customers per month',
    icon: <Users className="w-4 h-4" />,
  },
  {
    key: 'monthly_costs',
    label: 'Monthly Operating Costs',
    placeholder: '8000',
    tooltip: 'Total monthly expenses including rent, salaries, utilities, etc.',
    icon: <DollarSign className="w-4 h-4" />,
    prefix: '$',
  },
  {
    key: 'cac',
    label: 'Customer Acquisition Cost',
    placeholder: '50',
    tooltip: 'How much it costs to acquire one new customer (marketing spend / new customers)',
    icon: <DollarSign className="w-4 h-4" />,
    prefix: '$',
    benchmarkParam: 'cac',
  },
  {
    key: 'churn_rate',
    label: 'Monthly Churn Rate',
    placeholder: '5',
    tooltip: 'Percentage of customers who stop using your service each month',
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
            "w-full flex items-center justify-between p-4 rounded-lg border transition-all",
            "bg-muted/30 hover:bg-muted/50 border-border/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">Advanced Financial Details</p>
              <p className="text-xs text-muted-foreground">
                {filledCount > 0 
                  ? `${filledCount}/${totalFields} fields filled • +${confidenceBoost}% confidence`
                  : 'Optional — boosts confidence up to 40%'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {filledCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/20 text-primary">
                +{confidenceBoost}%
              </span>
            )}
            {isOpen ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4">
          <div className="p-5 rounded-xl border border-[var(--q-border-default)] bg-[var(--q-bg-surface)] space-y-6">
            {/* Confidence Boost Banner */}
            <div className="flex items-start gap-4 p-4 rounded-lg bg-[var(--q-accent-glow)] border border-[var(--q-accent-primary)]/15">
              <TrendingUp className="w-5 h-5 text-[var(--q-accent-primary)] mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--q-text-primary)]">
                  Boost your analysis confidence
                </p>
                <p className="text-xs text-[var(--q-text-secondary)] mt-1 leading-relaxed">
                  Providing real financial data instead of estimates increases accuracy by ~40%. 
                  All fields are optional.
                </p>
              </div>
              {industryType && (
                <button
                  type="button"
                  onClick={handleAutofill}
                  disabled={disabled}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all flex-shrink-0",
                    "bg-[var(--q-accent-primary)]/15 text-[var(--q-accent-primary)] hover:bg-[var(--q-accent-primary)]/25",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-fill
                </button>
              )}
            </div>

            {/* Investment & Revenue Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {FIELD_CONFIGS.slice(0, 2).map((field) => (
                <FinancialField
                  key={field.key}
                  config={field}
                  value={financialInputs[field.key]}
                  onChange={(value) => handleChange(field.key, value)}
                  disabled={disabled}
                  industryType={industryType}
                  onUseMedian={(median) => handleChange(field.key, median.toString())}
                />
              ))}
            </div>

            {/* Pricing & Customers Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {FIELD_CONFIGS.slice(2, 4).map((field) => (
                <FinancialField
                  key={field.key}
                  config={field}
                  value={financialInputs[field.key]}
                  onChange={(value) => handleChange(field.key, value)}
                  disabled={disabled}
                  industryType={industryType}
                  onUseMedian={(median) => handleChange(field.key, median.toString())}
                />
              ))}
            </div>

            {/* Costs & CAC Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {FIELD_CONFIGS.slice(4, 6).map((field) => (
                <FinancialField
                  key={field.key}
                  config={field}
                  value={financialInputs[field.key]}
                  onChange={(value) => handleChange(field.key, value)}
                  disabled={disabled}
                  industryType={industryType}
                  onUseMedian={(median) => handleChange(field.key, median.toString())}
                />
              ))}
            </div>

            {/* Churn Rate + Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FinancialField
                config={FIELD_CONFIGS[6]}
                value={financialInputs.churn_rate}
                onChange={(value) => handleChange('churn_rate', value)}
                disabled={disabled}
                industryType={industryType}
                onUseMedian={(median) => handleChange('churn_rate', median.toString())}
              />
              
              {/* Summary */}
              <div className="flex items-center justify-center p-4 rounded-xl bg-[var(--q-bg-elevated)] border border-[var(--q-border-default)]">
                <div className="text-center space-y-1">
                  <p className="text-2xl font-bold text-[var(--q-accent-primary)]" style={{ fontFamily: 'var(--q-font-mono)' }}>+{confidenceBoost}%</p>
                  <p className="text-xs text-[var(--q-text-tertiary)]">Confidence boost</p>
                </div>
              </div>
            </div>
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
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <span className="text-muted-foreground">{config.icon}</span>
        {config.label}
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px]">
            <p className="text-sm">{config.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </Label>
      <div className="relative">
        {config.prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {config.prefix}
          </span>
        )}
        <Input
          type="text"
          inputMode="numeric"
          value={value !== undefined ? value.toString() : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config.placeholder}
          disabled={disabled}
          className={cn(
            "transition-colors",
            config.prefix && "pl-7",
            config.suffix && "pr-8",
            validation?.warningLevel === 'critical' && "border-destructive/50",
            validation?.warningLevel === 'strong' && "border-amber-500/50",
          )}
        />
        {config.suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {config.suffix}
          </span>
        )}
      </div>
      {validation && validation.warningLevel !== 'none' && (
        <BenchmarkWarning
          warningLevel={validation.warningLevel}
          message={validation.message}
          benchmarkRange={validation.benchmarkRange}
          percentile={validation.percentile}
          onUseMedian={handleUseMedian}
        />
      )}
    </div>
  );
}
