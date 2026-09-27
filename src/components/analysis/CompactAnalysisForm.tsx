import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { TIERS } from '@/config/tiers';
import {
  BarChart3,
  FileText,
  AlertTriangle,
  Shield,
  TrendingUp,
  Target,
  Globe,
  FileCheck,
  Lock,
} from 'lucide-react';
import { AnalysisProgress } from './AnalysisProgress';
import { IndustryStep } from './steps/IndustryStep';
import { FinancialsStep } from './steps/FinancialsStep';
import { ConfidenceSidebar } from './steps/ConfidenceSidebar';
import type { OptionalFinancialInputs } from '@/types/analysis';
import type { UploadedFile } from '@/hooks/useFileUpload';
import { BENCHMARK_COUNT_DISPLAY } from '@/config/canonical-facts';

/* ─── OUTPUT TYPES ─── */
const OUTPUT_TYPES = [
  { id: 'bi', label: 'Financial Decision Analysis', plusOnly: false },
  { id: 'premortem', label: 'Failure Pre-Mortem', plusOnly: false },
  { id: 'invoice', label: 'Invoice Capacity Check', plusOnly: true },
] as const;

const DELIVERABLES: Record<string, { icon: React.ElementType; text: string }[]> = {
  bi: [
    { icon: BarChart3, text: '36-month P&L' },
    { icon: Shield, text: 'Stress Map' },
    { icon: Target, text: 'Break-even' },
    { icon: Globe, text: 'Geo-calibrated' },
  ],
  premortem: [
    { icon: AlertTriangle, text: 'Failure scenarios' },
    { icon: Shield, text: 'Risk flags' },
    { icon: FileCheck, text: 'Mitigation plan' },
  ],
  invoice: [
    { icon: TrendingUp, text: 'Credit capacity' },
    { icon: BarChart3, text: 'Margin health' },
    { icon: AlertTriangle, text: 'Payment risk' },
  ],
};

/* ─── MAIN ORCHESTRATOR ─── */
interface CompactAnalysisFormProps {
  idea: string;
  location: string;
  financialInputs: OptionalFinancialInputs;
  errors: { idea?: string; location?: string };
  isLoading: boolean;
  isFormValid: boolean;
  onIdeaChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onFinancialInputsChange: (inputs: OptionalFinancialInputs) => void;
  onClearError: (field: 'idea' | 'location') => void;
  onSubmit: (e: React.FormEvent, depth?: string) => void;
  files?: UploadedFile[];
  isUploading?: boolean;
  maxFiles?: number;
  allowedExtensions?: string[];
  onUploadFiles?: (files: FileList | File[]) => void;
  onRemoveFile?: (fileId: string) => void;
  isAuthenticated?: boolean;
  /** When true, paid workflow add-ons are available. Core analysis + pre-mortem are always included. */
  isPlus?: boolean;
}

export function CompactAnalysisForm({
  idea,
  location,
  financialInputs,
  errors,
  isLoading,
  isFormValid,
  onIdeaChange,
  onLocationChange,
  onFinancialInputsChange,
  onClearError,
  onSubmit,
  isAuthenticated,
  isPlus = false,
}: CompactAnalysisFormProps) {
  const [selectedIndustry, setSelectedIndustry] = useState<string | undefined>(
    financialInputs.selected_industry
  );
  // useState's initializer only runs on mount -- it does not re-read
  // financialInputs.selected_industry on later prop updates. Found
  // 2026-09-20: a caller that sets financialInputs.selected_industry
  // externally after mount (e.g. AppDashboard.tsx's "Try Coffee Shop
  // Sample" quick-fill) had no effect on this local state, so the industry
  // chip never showed as selected and requiredReady (which reads this
  // local state, not the prop) stayed false -- the button silently did
  // nothing. Re-sync whenever the prop changes to a value this state
  // doesn't already reflect.
  useEffect(() => {
    if (financialInputs.selected_industry && financialInputs.selected_industry !== selectedIndustry) {
      setSelectedIndustry(financialInputs.selected_industry);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financialInputs.selected_industry]);
  const [depth, setDepth] = useState('full');
  const [selectedOutputs, setSelectedOutputs] = useState<Set<string>>(
    new Set(['bi', 'premortem'])
  );
  const isFirstTimeAnon = !isAuthenticated && !localStorage.getItem('has_run_analysis');
  const [showAdvanced, setShowAdvanced] = useState(!isFirstTimeAnon);

  const toggleOutput = useCallback(
    (id: string) => {
      const opt = OUTPUT_TYPES.find((o) => o.id === id);
      // Gate paid workflow add-ons only after the user asks for one. The core
      // Decision Run and Pre-Mortem are available without an upgrade prompt.
      if (opt?.plusOnly && !isPlus) {
        toast.error(`${opt.label} is a Plus feature`, {
          description:
            `Upgrade to Plus ($${TIERS.plus.priceMonthly}/mo) for Invoice & Capacity workflows and unlimited Decision Runs.`,
          duration: 8000,
          action: {
            label: 'Upgrade to Plus →',
            onClick: () => {
              window.location.href = '/pricing';
            },
          },
        });
        return;
      }
      setSelectedOutputs((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          if (id === 'bi') return next; // BI Report can't be deselected — it's the base
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [isPlus]
  );

  const handleIndustrySelect = useCallback(
    (id: string) => {
      setSelectedIndustry(id);
      onFinancialInputsChange({ ...financialInputs, selected_industry: id });
    },
    [financialInputs, onFinancialInputsChange]
  );

  const updateField = useCallback(
    (field: keyof OptionalFinancialInputs, value: number | undefined) => {
      onFinancialInputsChange({ ...financialInputs, [field]: value });
    },
    [financialInputs, onFinancialInputsChange]
  );

  /* ─── Derived state ─── */
  const confidence = useMemo(() => {
    let s = 0;
    if (selectedIndustry) s += 15;
    if (location.trim().length >= 2) s += 10;
    const reqFields = [
      financialInputs.startup_investment,
      financialInputs.average_price,
      financialInputs.expected_customers,
      financialInputs.monthly_costs,
    ];
    s += reqFields.filter(Boolean).length * (55 / 6);
    if (idea.trim().length >= 10) s += 55 / 6;
    if (location.trim().length >= 2) s += 55 / 6 - 10;
    if (financialInputs.cac) s += 10;
    if (financialInputs.churn_rate) s += 7;
    return Math.min(97, Math.round(Math.max(0, s)));
  }, [selectedIndustry, location, idea, financialInputs]);

  const missingHint = useMemo(() => {
    if (!selectedIndustry) return 'Select an industry to begin';
    const missing: string[] = [];
    if (!financialInputs.startup_investment) missing.push('capital');
    if (!financialInputs.average_price) missing.push('price');
    if (!financialInputs.expected_customers) missing.push('customers');
    if (!idea.trim() || idea.trim().length < 10) missing.push('business idea');
    if (missing.length) return `Fill ${missing.join(', ')}`;
    return '';
  }, [selectedIndustry, financialInputs, idea]);

  /* ─── Active deliverables ─── */
  const activeDeliverables = useMemo(() => {
    const items: { icon: React.ElementType; text: string }[] = [];
    selectedOutputs.forEach((id) => {
      if (DELIVERABLES[id]) items.push(...DELIVERABLES[id]);
    });
    return items;
  }, [selectedOutputs]);

  return (
    <form onSubmit={(e) => onSubmit(e, depth)} className="space-y-4">
      {isLoading && (
        <AnalysisProgress
          isLoading={isLoading}
          businessType={selectedIndustry}
          location={location}
        />
      )}

      {/* Breadcrumb bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <div
            className="w-[3px] h-5 rounded-full"
            style={{ background: 'var(--q-accent-primary)' }}
          />
          <span
            className="text-[12px] font-bold"
            style={{ fontFamily: 'Sora, sans-serif', color: 'var(--q-text-tertiary)' }}
          >
            AIWMC Quantis
          </span>
          <span className="text-[12px]" style={{ color: 'var(--q-text-disabled)' }}>
            ▸
          </span>
          <span className="text-[12px] font-medium" style={{ color: 'var(--q-text-secondary)' }}>
            New Analysis
          </span>
        </div>
        <span
          className="text-[10px] font-medium"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--q-text-disabled)' }}
        >
          Model v2.0 · Mar 2026
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span
            className="inline-block text-[11px] font-bold tracking-[0.06em] px-2.5 py-[3px] rounded-full mb-2"
            style={{
              background: 'var(--q-status-ai-bg)',
              border: '1px solid var(--q-status-ai-border)',
              color: 'var(--q-status-ai)',
            }}
          >
            ⚡ QUANTIS AI · DeepSeek Powered
          </span>
          <h1
            className="text-[28px] sm:text-[34px] font-bold leading-tight"
            style={{ fontFamily: 'Sora, sans-serif', color: 'var(--q-text-primary)' }}
          >
            Stress-test your business idea
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--q-text-secondary)' }}>
            Fill in what you know. We validate with a {BENCHMARK_COUNT_DISPLAY}-cell modeled benchmark grid.
          </p>
          {/* Domain 4 audit (Q40): nothing in this form previously named the
              decision or the capital behind it — every field below fed
              straight into the payback/verdict math with no framing that
              this represents a real decision. Kept to a fact we can stand
              behind (the numbers are load-bearing for the verdict) rather
              than inventing positioning copy that isn't ours to decide. */}
          <p className="text-[12px] mt-1" style={{ color: 'var(--q-text-tertiary)' }}>
            Every number below feeds directly into your payback period and verdict — this is the real math behind the decision, not a preview.
          </p>
        </div>
      </div>

      {/* 3-column grid */}
      <div
        className={`grid grid-cols-1 ${showAdvanced ? 'md:grid-cols-2 lg:grid-cols-[1fr_1.6fr_260px]' : 'md:grid-cols-[1fr_260px]'} gap-4`}
      >
        <IndustryStep
          selectedIndustry={selectedIndustry}
          onIndustrySelect={handleIndustrySelect}
          location={location}
          onLocationChange={onLocationChange}
          idea={idea}
          onIdeaChange={onIdeaChange}
          errors={errors}
          onClearError={onClearError}
          isAuthenticated={isAuthenticated}
        />

        {showAdvanced && (
          <FinancialsStep
            financialInputs={financialInputs}
            updateField={updateField}
            selectedIndustry={selectedIndustry}
            depth={depth}
            onDepthChange={setDepth}
          />
        )}

        <ConfidenceSidebar
          confidence={confidence}
          selectedIndustry={selectedIndustry}
          location={location}
          idea={idea}
          financialInputs={financialInputs}
          depth={depth}
          isFormValid={isFormValid}
          isLoading={isLoading}
          missingHint={missingHint}
        />
      </div>

      {/* Expand financials for first-time users */}
      {!showAdvanced && (
        <button
          type="button"
          onClick={() => setShowAdvanced(true)}
          className="flex items-center gap-2 mx-auto text-[13px] font-medium px-4 py-2 rounded-lg transition-all hover:opacity-80"
          style={{
            color: 'var(--q-accent-primary)',
            background: 'var(--q-accent-glow)',
            border: '1px solid var(--q-border-subtle)',
          }}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Want more precision? Add your financial numbers ↓
        </button>
      )}

      {/* Multi-Output Selector */}
      {showAdvanced && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span
            className="text-[12px] font-semibold uppercase tracking-[0.06em]"
            style={{ color: 'var(--q-text-disabled)' }}
          >
            What do you want?
          </span>
          {OUTPUT_TYPES.map((opt) => {
            const active = selectedOutputs.has(opt.id);
            const locked = opt.plusOnly && !isPlus;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleOutput(opt.id)}
                title={locked ? `${opt.label} — Plus only` : undefined}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full transition-all duration-150"
                style={{
                  cursor: locked ? 'pointer' : 'pointer',
                  background: locked
                    ? 'var(--q-bg-input)'
                    : active
                      ? 'var(--q-accent-glow)'
                      : 'var(--q-bg-input)',
                  border: `1.5px solid ${locked ? 'var(--q-border-subtle)' : active ? 'var(--q-accent-primary)' : 'var(--q-border-subtle)'}`,
                  color: locked
                    ? 'var(--q-text-disabled)'
                    : active
                      ? 'var(--q-accent-primary)'
                      : 'var(--q-text-tertiary)',
                  opacity: locked ? 0.7 : 1,
                }}
              >
                {locked ? (
                  <Lock
                    className="w-3 h-3 flex-shrink-0"
                    style={{ color: 'var(--q-text-disabled)' }}
                  />
                ) : active ? (
                  <span>✓</span>
                ) : null}
                {opt.label}
                {locked && (
                  <span
                    className="text-[10px] font-bold px-1 py-0.5 rounded-full ml-0.5"
                    style={{
                      background: 'var(--q-status-ai-bg)',
                      color: 'var(--q-status-ai)',
                      border: '1px solid var(--q-status-ai-border)',
                    }}
                  >
                    Plus
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {showAdvanced && selectedOutputs.has('invoice') && (
        <p className="text-[11px] px-1" style={{ color: 'var(--q-status-ai)' }}>
          We'll assess if this business model supports your invoice volume and margins
        </p>
      )}

      {/* "What you'll get" strip */}
      <div
        className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-2 rounded-xl px-4 sm:px-5 py-3"
        style={{ background: 'var(--q-bg-surface)', border: '1px solid var(--q-border-subtle)' }}
      >
        <span
          className="text-[12px] font-semibold uppercase tracking-[0.06em] w-full sm:w-auto"
          style={{ color: 'var(--q-text-disabled)' }}
        >
          You'll receive:
        </span>
        {activeDeliverables.map(({ icon: Icon, text }) => (
          <span key={text} className="flex items-center gap-1.5 group relative">
            <Icon className="w-3.5 h-3.5" style={{ color: 'var(--q-accent-primary)' }} />
            <span className="text-[13px] font-medium" style={{ color: 'var(--q-text-secondary)' }}>
              {text}
            </span>
          </span>
        ))}
      </div>
    </form>
  );
}
