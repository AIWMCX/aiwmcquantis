import React, { useState, useCallback, useMemo } from 'react';
import { BarChart3, FileText, AlertTriangle, Shield, TrendingUp, Target, Globe, FileCheck } from 'lucide-react';
import { AnalysisProgress } from './AnalysisProgress';
import { IndustryStep } from './steps/IndustryStep';
import { FinancialsStep } from './steps/FinancialsStep';
import { ConfidenceSidebar } from './steps/ConfidenceSidebar';
import type { OptionalFinancialInputs } from '@/types/analysis';
import type { UploadedFile } from '@/hooks/useFileUpload';

/* ─── OUTPUT TYPES ─── */
const OUTPUT_TYPES = [
  { id: 'bi', label: 'BI Report', defaultOn: true },
  { id: 'premortem', label: 'Pre-Mortem Analysis', defaultOn: false },
  { id: 'invoice', label: 'Invoice Capacity Check', defaultOn: false },
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
}

export function CompactAnalysisForm({
  idea, location, financialInputs, errors, isLoading, isFormValid,
  onIdeaChange, onLocationChange, onFinancialInputsChange, onClearError, onSubmit,
  isAuthenticated,
}: CompactAnalysisFormProps) {
  const [selectedIndustry, setSelectedIndustry] = useState<string | undefined>(financialInputs.selected_industry);
  const [depth, setDepth] = useState('full');
  const [selectedOutputs, setSelectedOutputs] = useState<Set<string>>(new Set(['bi']));

  const toggleOutput = useCallback((id: string) => {
    setSelectedOutputs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (id === 'bi') return next; // can't deselect BI
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleIndustrySelect = useCallback((id: string) => {
    setSelectedIndustry(id);
    onFinancialInputsChange({ ...financialInputs, selected_industry: id });
  }, [financialInputs, onFinancialInputsChange]);

  const updateField = useCallback((field: keyof OptionalFinancialInputs, value: number | undefined) => {
    onFinancialInputsChange({ ...financialInputs, [field]: value });
  }, [financialInputs, onFinancialInputsChange]);

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
    if (idea.trim().length >= 10) s += (55 / 6);
    if (location.trim().length >= 2) s += (55 / 6) - 10;
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
    selectedOutputs.forEach(id => {
      if (DELIVERABLES[id]) items.push(...DELIVERABLES[id]);
    });
    return items;
  }, [selectedOutputs]);

  return (
    <form onSubmit={(e) => onSubmit(e, depth)} className="space-y-4">
      {isLoading && <AnalysisProgress isLoading={isLoading} businessType={selectedIndustry} location={location} />}

      {/* Breadcrumb bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-5 rounded-full" style={{ background: 'var(--q-accent-primary)' }} />
          <span className="text-[12px] font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--q-text-tertiary)' }}>AIWMC Quantis</span>
          <span className="text-[12px]" style={{ color: 'var(--q-text-disabled)' }}>▸</span>
          <span className="text-[12px] font-medium" style={{ color: 'var(--q-text-secondary)' }}>New Analysis</span>
        </div>
        <span className="text-[10px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--q-text-disabled)' }}>
          Model v2.0 · Mar 2026
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-block text-[11px] font-bold tracking-[0.06em] px-2.5 py-[3px] rounded-full mb-2"
            style={{ background: 'var(--q-status-ai-bg)', border: '1px solid var(--q-status-ai-border)', color: 'var(--q-status-ai)' }}>
            ⚡ DUAL-AI · GPT-4o mini + GEMINI
          </span>
          <h1 className="text-[28px] sm:text-[34px] font-bold leading-tight" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--q-text-primary)' }}>
            Stress-test your business idea
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--q-text-secondary)' }}>
            Fill in what you know. We validate with 1,000+ benchmarks.
          </p>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1.6fr_260px] gap-4">
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

        <FinancialsStep
          financialInputs={financialInputs}
          updateField={updateField}
          selectedIndustry={selectedIndustry}
          depth={depth}
          onDepthChange={setDepth}
        />

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

      {/* Multi-Output Selector */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="text-[12px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--q-text-disabled)' }}>What do you want?</span>
        {OUTPUT_TYPES.map(opt => {
          const active = selectedOutputs.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggleOutput(opt.id)}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-full transition-all duration-150 cursor-pointer"
              style={{
                background: active ? 'var(--q-accent-glow)' : 'var(--q-bg-input)',
                border: `1.5px solid ${active ? 'var(--q-accent-primary)' : 'var(--q-border-subtle)'}`,
                color: active ? 'var(--q-accent-primary)' : 'var(--q-text-tertiary)',
              }}
            >
              {active ? '✓ ' : ''}{opt.label}
            </button>
          );
        })}
      </div>
      {selectedOutputs.has('invoice') && (
        <p className="text-[11px] px-1" style={{ color: 'var(--q-status-ai)' }}>
          We'll assess if this business model supports your invoice volume and margins
        </p>
      )}

      {/* "What you'll get" strip */}
      <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-2 rounded-xl px-4 sm:px-5 py-3" style={{ background: 'var(--q-bg-surface)', border: '1px solid var(--q-border-subtle)' }}>
        <span className="text-[12px] font-semibold uppercase tracking-[0.06em] w-full sm:w-auto" style={{ color: 'var(--q-text-disabled)' }}>You'll receive:</span>
        {activeDeliverables.map(({ icon: Icon, text }) => (
          <span key={text} className="flex items-center gap-1.5 group relative">
            <Icon className="w-3.5 h-3.5" style={{ color: 'var(--q-accent-primary)' }} />
            <span className="text-[13px] font-medium" style={{ color: 'var(--q-text-secondary)' }}>{text}</span>
          </span>
        ))}
      </div>
    </form>
  );
}
