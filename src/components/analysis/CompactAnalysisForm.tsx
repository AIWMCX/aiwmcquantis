import React, { useState, useCallback, useMemo } from 'react';
import { AnalysisProgress } from './AnalysisProgress';
import { IndustryStep } from './steps/IndustryStep';
import { FinancialsStep } from './steps/FinancialsStep';
import { ConfidenceSidebar } from './steps/ConfidenceSidebar';
import type { OptionalFinancialInputs } from '@/types/analysis';
import type { UploadedFile } from '@/hooks/useFileUpload';

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

  return (
    <form onSubmit={(e) => onSubmit(e, depth)} className="space-y-4">
      {isLoading && <AnalysisProgress isLoading={isLoading} businessType={selectedIndustry} location={location} />}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-block text-[11px] font-bold tracking-[0.06em] px-2.5 py-[3px] rounded-full mb-2"
            style={{ background: 'var(--q-status-ai-bg)', border: '1px solid var(--q-status-ai-border)', color: 'var(--q-status-ai)' }}>
            ⚡ DUAL-AI · GPT-4o mini + GEMINI
          </span>
          <h1 className="text-[22px] sm:text-[26px] font-bold leading-tight" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--q-text-primary)' }}>
            Stress-test your business idea
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--q-text-tertiary)' }}>
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

      {/* "What you'll get" strip */}
      <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2 rounded-xl px-4 sm:px-5 py-3" style={{ background: 'var(--q-bg-surface)', border: '1px solid var(--q-border-subtle)' }}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] w-full sm:w-auto" style={{ color: 'var(--q-text-disabled)' }}>You'll receive:</span>
        {[
          ['📊', '36-month P&L'],
          ['🗺', 'Stress Map'],
          ['🎯', 'Break-even'],
          ['⚡', 'Dual-AI'],
          ['🌍', 'Geo-calibrated', true],
          ['📄', 'Investor docs', true],
        ].map(([icon, text, hideMobile]) => (
          <span key={text as string} className={`flex items-center gap-1.5 ${hideMobile ? 'hidden sm:flex' : ''}`}>
            <span className="text-sm">{icon}</span>
            <span className="text-[11px] sm:text-[12px]" style={{ color: 'var(--q-text-tertiary)' }}>{text}</span>
          </span>
        ))}
      </div>
    </form>
  );
}
