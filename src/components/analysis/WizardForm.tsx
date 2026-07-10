import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, MapPin, Loader2, FileText, Zap, DollarSign, Users, Lightbulb, Navigation, Lock } from 'lucide-react';
import { useFeature } from '@/hooks/useTier';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { MONTE_CARLO_ITERATIONS_DISPLAY } from '@/config/canonical-facts';
import { AdvancedFinancialInputs } from './AdvancedFinancialInputs';
import { IndustrySelector } from './IndustrySelector';
import { FileUploader } from './FileUploader';
import { AnalysisProgress } from './AnalysisProgress';
import { AnonymousUsageNotice } from './AnonymousUsageNotice';
import { DraftRecoveryBanner } from './DraftRecoveryBanner';
import { QuickIndustryPicks } from './QuickIndustryPicks';
import { FieldCompletionDot } from './FieldCompletionDot';
import { FormProgressBar } from './FormProgressBar';
import { BenchmarkWarning } from './BenchmarkWarning';
import { getBenchmark, validateParamAgainstBenchmarks } from '@/lib/benchmark-calibrator';
import type { OptionalFinancialInputs } from '@/types/analysis';
import type { UploadedFile } from '@/hooks/useFileUpload';
import { secureSetItem, secureGetItem, secureRemoveItem } from '@/lib/secureStorage';

import { logger } from '@/lib/logger';
const DRAFT_KEY = 'quantis_wizard_draft';
const SAVE_DELAY_MS = 2000;

interface WizardDraft {
  idea: string;
  location: string;
  industry: string;
  financialInputs: OptionalFinancialInputs;
  savedAt: number;
}

interface WizardFormProps {
  idea: string;
  location: string;
  financialInputs: OptionalFinancialInputs;
  errors: { idea?: string; location?: string };
  isLoading: boolean;
  isFormValid: boolean;
  onIdeaChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onFinancialInputsChange: (inputs: OptionalFinancialInputs) => void;
  onClearError: (field: 'idea' | 'location') => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  files?: UploadedFile[];
  isUploading?: boolean;
  maxFiles?: number;
  allowedExtensions?: string[];
  onUploadFiles?: (files: FileList | File[]) => void;
  onRemoveFile?: (fileId: string) => void;
  isAuthenticated?: boolean;
}

function countCompletedFields(
  idea: string,
  location: string,
  financialInputs: OptionalFinancialInputs,
): number {
  let count = 0;
  if (financialInputs.selected_industry && financialInputs.selected_industry !== 'auto') count++;
  if (location.trim().length >= 2) count++;
  if (idea.trim().length >= 10) count++;
  if (financialInputs.startup_investment && financialInputs.startup_investment > 0) count++;
  if (financialInputs.average_price && financialInputs.average_price > 0) count++;
  if (financialInputs.expected_customers && financialInputs.expected_customers > 0) count++;
  // depth always has a default so count it
  count++;
  return count;
}

/** Returns "Typical: $X–$Y" hint from benchmark DB */
function getBenchmarkHint(industryType: string | undefined, parameter: string): string | null {
  if (!industryType || industryType === 'auto') return null;
  const b = getBenchmark(industryType, parameter);
  if (!b) return null;
  const fmt = (v: number) => b.unit === '$' ? `$${v.toLocaleString()}` : `${v}${b.unit}`;
  return `Typical: ${fmt(b.p25)}–${fmt(b.p75)}`;
}

export function WizardForm({
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
  onCancel,
  files = [],
  isUploading = false,
  maxFiles = 5,
  allowedExtensions = ['.pdf', '.docx', '.xlsx', '.xls', '.csv', '.txt'],
  onUploadFiles,
  onRemoveFile,
  isAuthenticated = false,
}: WizardFormProps) {
  const [analysisDepth, setAnalysisDepth] = useState<'quick' | 'full' | 'deep'>('full');
  const navigate = useNavigate();
  // Monte Carlo / Deep Audit is a PLUS feature — gate it for FREE users.
  const { allowed: canRunDeep } = useFeature('monte_carlo');
  // If the user downgrades while 'deep' is selected, snap back to 'full'.
  useEffect(() => {
    if (!canRunDeep && analysisDepth === 'deep') setAnalysisDepth('full');
  }, [canRunDeep, analysisDepth]);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftAge, setDraftAge] = useState<string | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  const [geoState, setGeoState] = useState<'idle' | 'loading' | 'detected'>('idle');
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [industryAnimKey, setIndustryAnimKey] = useState(0);
  const prevIndustryRef = useRef(financialInputs.selected_industry);
  const analysisStartTime = useRef<number | null>(null);

  const filledCount = countCompletedFields(idea, location, financialInputs);
  const TOTAL_FIELDS = 7;

  const industryType = financialInputs.selected_industry;

  // Stagger animation when industry changes from empty to a value
  useEffect(() => {
    const prev = prevIndustryRef.current;
    const curr = financialInputs.selected_industry;
    if ((!prev || prev === 'auto') && curr && curr !== 'auto') {
      setIndustryAnimKey(k => k + 1);
    }
    prevIndustryRef.current = curr;
  }, [financialInputs.selected_industry]);

  // Benchmark validations for financial fields
  const investmentValidation = useMemo(() => {
    if (!industryType || industryType === 'auto' || !financialInputs.startup_investment) return null;
    // No direct "startup_investment" benchmark param; skip validation for this field
    return null;
  }, [industryType, financialInputs.startup_investment]);

  const priceValidation = useMemo(() => {
    if (!industryType || industryType === 'auto' || !financialInputs.average_price) return null;
    return validateParamAgainstBenchmarks('avg_ticket_size', financialInputs.average_price, industryType);
  }, [industryType, financialInputs.average_price]);

  // Track when analysis starts
  useEffect(() => {
    if (isLoading && !analysisStartTime.current) {
      analysisStartTime.current = Date.now();
    } else if (!isLoading) {
      analysisStartTime.current = null;
    }
  }, [isLoading]);

  // Check for prefill from mini-demo OR hero form
  useEffect(() => {
    const prefill = localStorage.getItem('quantis_prefill') || sessionStorage.getItem('hero_prefill');
    if (prefill) {
      try {
        const { idea: prefillIdea, location: prefillLocation } = JSON.parse(prefill);
        if (prefillIdea) onIdeaChange(prefillIdea);
        if (prefillLocation) onLocationChange(prefillLocation);
        localStorage.removeItem('quantis_prefill');
        sessionStorage.removeItem('hero_prefill');
      } catch (e) {
        logger.error('Failed to parse prefill:', e);
      }
    }
  }, []);

  // Check for existing draft on mount
  useEffect(() => {
    const checkDraft = async () => {
      try {
        const draft = await secureGetItem<WizardDraft>(DRAFT_KEY);
        if (draft && typeof draft === 'object' && 'savedAt' in draft) {
          if (draft.idea?.trim().length > 5 || draft.location?.trim().length > 2) {
            setHasDraft(true);
            const ageMs = Date.now() - draft.savedAt;
            const ageMinutes = Math.floor(ageMs / 60000);
            const ageHours = Math.floor(ageMinutes / 60);
            const ageDays = Math.floor(ageHours / 24);
            if (ageDays > 0) setDraftAge(`${ageDays} day${ageDays > 1 ? 's' : ''} ago`);
            else if (ageHours > 0) setDraftAge(`${ageHours} hour${ageHours > 1 ? 's' : ''} ago`);
            else if (ageMinutes > 0) setDraftAge(`${ageMinutes} minute${ageMinutes > 1 ? 's' : ''} ago`);
            else setDraftAge('just now');
          }
        }
      } catch (e) {
        logger.error('Failed to check draft:', e);
      }
    };
    checkDraft();
  }, []);

  useEffect(() => {
    if (hasDraft && !isRestored) return;
    if (!idea.trim() && !location.trim()) return;
    const timeout = setTimeout(async () => {
      try {
        const draft: WizardDraft = {
          idea, location,
          industry: financialInputs.selected_industry || 'auto',
          financialInputs, savedAt: Date.now(),
        };
        await secureSetItem(DRAFT_KEY, draft);
      } catch (e) { logger.error('Failed to save draft:', e); }
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [idea, location, financialInputs, hasDraft, isRestored]);

  const restoreDraft = useCallback(async () => {
    try {
      const draft = await secureGetItem<WizardDraft>(DRAFT_KEY);
      if (draft && typeof draft === 'object') {
        onIdeaChange(draft.idea || '');
        onLocationChange(draft.location || '');
        onFinancialInputsChange(draft.financialInputs || {});
        setIsRestored(true);
        setHasDraft(false);
      }
    } catch (e) { logger.error('Failed to restore draft:', e); }
  }, [onIdeaChange, onLocationChange, onFinancialInputsChange]);

  const dismissDraft = useCallback(() => { setHasDraft(false); setIsRestored(true); }, []);
  const clearDraft = useCallback(() => {
    try { secureRemoveItem(DRAFT_KEY); setHasDraft(false); } catch (e) { logger.error('Failed to clear draft:', e); }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearDraft();
    onSubmit(e);
  };

  const handleIdeaChange = (value: string) => {
    onIdeaChange(value);
    if (errors.idea) onClearError('idea');
  };

  const handleLocationChange = (value: string) => {
    onLocationChange(value);
    if (errors.location) onClearError('location');
  };

  const handleQuickIndustryPick = (industryId: string) => {
    onFinancialInputsChange({
      ...financialInputs,
      selected_industry: industryId,
    });
  };

  const handleUseMyLocation = useCallback(async () => {
    if (!navigator.geolocation) return;
    setGeoState('loading');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || '';
          const state = data.address?.state || '';
          const label = [city, state].filter(Boolean).join(', ');
          if (label) {
            setDetectedCity(label);
            setGeoState('detected');
          } else {
            setGeoState('idle');
          }
        } catch {
          setGeoState('idle');
        }
      },
      () => setGeoState('idle'),
      { timeout: 8000 }
    );
  }, []);

  const acceptDetectedLocation = useCallback(() => {
    if (detectedCity) {
      onLocationChange(detectedCity);
      setGeoState('idle');
      setDetectedCity(null);
    }
  }, [detectedCity, onLocationChange]);

  const dismissDetectedLocation = useCallback(() => {
    setGeoState('idle');
    setDetectedCity(null);
  }, []);

  // Benchmark hints
  const investmentHint = getBenchmarkHint(industryType, 'break_even_months'); // No direct startup_investment benchmark; use generic
  const priceHint = getBenchmarkHint(industryType, 'avg_ticket_size');

  return (
    <form onSubmit={handleSubmit} className="max-w-[900px] mx-auto space-y-0">
      {/* Dark Hero Header */}
      <div className="relative overflow-hidden rounded-t-[var(--q-radius-lg)] bg-[var(--q-bg-base)] dark:bg-[#0B1120] px-6 py-10 md:py-12 q-grid-pattern">
        <div className="relative z-10 max-w-2xl">
          <h1
            className="text-3xl md:text-[40px] font-bold leading-tight text-[var(--q-text-primary)]"
            style={{ fontFamily: 'var(--q-font-display)' }}
          >
            Stress-test your business idea
          </h1>
          <p
            className="mt-2 text-base text-[var(--q-text-secondary)]"
            style={{ fontFamily: 'var(--q-font-body)' }}
          >
            Two AI engines. 97,500 benchmarks. Your numbers in 90 seconds.
          </p>
        </div>
      </div>

      {/* Draft Recovery + Anonymous Notice */}
      <div className="px-6 pt-4 space-y-3">
        {hasDraft && !isRestored && (
          <DraftRecoveryBanner draftAge={draftAge || 'recently'} onRestore={restoreDraft} onDismiss={dismissDraft} />
        )}
        {!isAuthenticated && <AnonymousUsageNotice />}
      </div>

      {/* Progress Bar */}
      <div className="px-6 pt-4">
        <FormProgressBar filledCount={filledCount} totalCount={TOTAL_FIELDS} />
      </div>

      {/* Two-Column Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-6 pt-6">
        {/* LEFT: Business Details */}
        <div className="space-y-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--q-text-tertiary)]" style={{ fontFamily: 'var(--q-font-body)' }}>
            Business Details
          </h2>

          {/* 1. Industry */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium text-[var(--q-text-secondary)]">
              <FieldCompletionDot isComplete={!!financialInputs.selected_industry && financialInputs.selected_industry !== 'auto'} />
              1. What's your business?
            </Label>
            <IndustrySelector
              value={financialInputs.selected_industry || 'auto'}
              onChange={(value) => onFinancialInputsChange({
                ...financialInputs,
                selected_industry: value === 'auto' ? undefined : value
              })}
              disabled={isLoading}
            />
            <QuickIndustryPicks
              selected={financialInputs.selected_industry}
              onSelect={handleQuickIndustryPick}
              disabled={isLoading}
            />
          </div>

          {/* 2. Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2 text-sm font-medium text-[var(--q-text-secondary)]">
              <FieldCompletionDot isComplete={location.trim().length >= 2} />
              <MapPin className="w-4 h-4 text-[var(--q-text-tertiary)]" />
              2. Where are you launching?
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => handleLocationChange(e.target.value)}
              placeholder="City, State — e.g. Denver, Colorado"
              disabled={isLoading}
              aria-invalid={!!errors.location}
              className={cn(
                "transition-all text-[15px]",
                errors.location && "border-[var(--q-status-red)] focus-visible:shadow-[0_0_0_3px_rgba(239,68,68,0.12)] border-l-[3px] border-l-[var(--q-status-red)]"
              )}
            />
            {errors.location && <p className="text-xs text-[var(--q-status-red)]">{errors.location}</p>}

            {/* Geolocation */}
            {geoState === 'idle' && !location.trim() && (
              <button
                type="button"
                onClick={handleUseMyLocation}
                className="flex items-center gap-1.5 text-xs text-[var(--q-accent-primary)] hover:text-[var(--q-accent-hover)] transition-colors duration-[var(--q-duration-fast)]"
              >
                <Navigation className="w-3.5 h-3.5" />
                📍 Use my location
              </button>
            )}
            {geoState === 'loading' && (
              <span className="flex items-center gap-1.5 text-xs text-[var(--q-text-tertiary)]">
                <Loader2 className="w-3 h-3 animate-spin" /> Detecting location…
              </span>
            )}
            {geoState === 'detected' && detectedCity && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[var(--q-text-secondary)]">📍 {detectedCity} detected · Use this?</span>
                <button type="button" onClick={acceptDetectedLocation} className="font-semibold text-[var(--q-accent-primary)] hover:text-[var(--q-accent-hover)] transition-colors">Yes</button>
                <button type="button" onClick={dismissDetectedLocation} className="text-[var(--q-text-tertiary)] hover:text-[var(--q-text-secondary)] transition-colors">Change</button>
              </div>
            )}
          </div>

          {/* 3. Description */}
          <div className="space-y-2">
            <Label htmlFor="idea" className="flex items-center gap-2 text-sm font-medium text-[var(--q-text-secondary)]">
              <FieldCompletionDot isComplete={idea.trim().length >= 10} />
              <Brain className="w-4 h-4 text-[var(--q-text-tertiary)]" />
              3. Describe it in one line
            </Label>
            <Textarea
              id="idea"
              value={idea}
              onChange={(e) => handleIdeaChange(e.target.value)}
              placeholder="e.g. Boutique fitness studio near LoDo with cycling and strength classes"
              rows={3}
              disabled={isLoading}
              aria-invalid={!!errors.idea}
              className={cn(
                "resize-none transition-all text-[15px]",
                errors.idea && "border-[var(--q-status-red)] focus-visible:shadow-[0_0_0_3px_rgba(239,68,68,0.12)] border-l-[3px] border-l-[var(--q-status-red)]"
              )}
            />
            <div className="flex justify-between items-center">
              {errors.idea ? (
                <p className="text-xs text-[var(--q-status-red)]">{errors.idea}</p>
              ) : (
                <span className="text-xs text-[var(--q-text-tertiary)]">Min 10 chars — more detail = better analysis</span>
              )}
              <span className={cn("text-xs tabular-nums", idea.length > 5000 ? "text-[var(--q-status-red)]" : "text-[var(--q-text-tertiary)]")}>
                {idea.length.toLocaleString()}/5,000
              </span>
            </div>
          </div>

          {/* Document upload (desktop: below left column) */}
          {isAuthenticated && onUploadFiles && onRemoveFile && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[var(--q-text-tertiary)]" />
                <Label className="text-xs font-medium text-[var(--q-text-secondary)]">
                  Upload Documents (optional)
                </Label>
              </div>
              <FileUploader
                files={files}
                isUploading={isUploading}
                disabled={isLoading}
                maxFiles={maxFiles}
                allowedExtensions={allowedExtensions}
                onUpload={onUploadFiles}
                onRemove={onRemoveFile}
              />
            </div>
          )}
        </div>

        {/* RIGHT: Financial Parameters */}
        <div className="space-y-6" key={industryAnimKey}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--q-text-tertiary)]" style={{ fontFamily: 'var(--q-font-body)' }}>
            Financial Parameters
          </h2>

          {/* 4. Starting capital */}
          <div className="space-y-2 q-metric-reveal" style={{ '--index': 0 } as React.CSSProperties}>
            <label className="flex items-center gap-1.5">
              <FieldCompletionDot isComplete={!!financialInputs.startup_investment && financialInputs.startup_investment > 0} />
              <span className="text-[13px] font-medium tracking-wide uppercase text-[var(--q-text-tertiary)]" style={{ letterSpacing: '0.04em' }}>
                4. Starting capital
              </span>
              <span className="text-[10px] text-[var(--q-text-tertiary)]/60 font-normal normal-case tracking-normal ml-1">optional</span>
            </label>
            <div
              className={cn(
                "flex items-center h-14 rounded-[10px] border transition-all duration-150",
                "bg-[var(--q-bg-input)] border-[var(--q-border-default)]",
                "focus-within:border-[var(--q-accent-primary)] focus-within:shadow-[0_0_0_3px_var(--q-accent-glow)]",
                "hover:border-[var(--q-border-hover)]",
              )}
            >
              <span className="pl-4 text-[15px] font-medium text-[var(--q-text-tertiary)] select-none pointer-events-none flex-shrink-0" style={{ fontFamily: 'var(--q-font-mono)' }}>$</span>
              <input
                type="text"
                inputMode="numeric"
                value={financialInputs.startup_investment || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d]/g, '');
                  onFinancialInputsChange({ ...financialInputs, startup_investment: val ? Number(val) : undefined });
                }}
                placeholder="50,000"
                disabled={isLoading}
                className="flex-1 h-full bg-transparent border-none outline-none text-[var(--q-text-primary)] text-lg font-semibold pl-2 pr-4 placeholder:text-[var(--q-text-tertiary)]/40"
                style={{ fontFamily: 'var(--q-font-mono)', WebkitAppearance: 'none', MozAppearance: 'textfield' } as React.CSSProperties}
              />
            </div>
            <p className="text-[11px] text-[var(--q-text-tertiary)]/70 pl-0.5">
              {investmentHint || 'Industry typical range shown after industry selection'}
            </p>
          </div>

          {/* 5. Target price per customer */}
          <div className="space-y-2 q-metric-reveal" style={{ '--index': 1 } as React.CSSProperties}>
            <label className="flex items-center gap-1.5">
              <FieldCompletionDot isComplete={!!financialInputs.average_price && financialInputs.average_price > 0} />
              <span className="text-[13px] font-medium tracking-wide uppercase text-[var(--q-text-tertiary)]" style={{ letterSpacing: '0.04em' }}>
                5. Target price per customer
              </span>
              <span className="text-[10px] text-[var(--q-text-tertiary)]/60 font-normal normal-case tracking-normal ml-1">optional</span>
            </label>
            <div
              className={cn(
                "flex items-center h-14 rounded-[10px] border transition-all duration-150",
                "bg-[var(--q-bg-input)] border-[var(--q-border-default)]",
                "focus-within:border-[var(--q-accent-primary)] focus-within:shadow-[0_0_0_3px_var(--q-accent-glow)]",
                "hover:border-[var(--q-border-hover)]",
              )}
            >
              <span className="pl-4 text-[15px] font-medium text-[var(--q-text-tertiary)] select-none pointer-events-none flex-shrink-0" style={{ fontFamily: 'var(--q-font-mono)' }}>$</span>
              <input
                type="text"
                inputMode="numeric"
                value={financialInputs.average_price || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d.]/g, '');
                  onFinancialInputsChange({ ...financialInputs, average_price: val ? Number(val) : undefined });
                }}
                placeholder="89"
                disabled={isLoading}
                className="flex-1 h-full bg-transparent border-none outline-none text-[var(--q-text-primary)] text-lg font-semibold pl-2 pr-4 placeholder:text-[var(--q-text-tertiary)]/40"
                style={{ fontFamily: 'var(--q-font-mono)', WebkitAppearance: 'none', MozAppearance: 'textfield' } as React.CSSProperties}
              />
            </div>
            <p className="text-[11px] text-[var(--q-text-tertiary)]/70 pl-0.5">
              {priceHint || 'Per transaction / per month / per unit'}
            </p>
            {priceValidation && priceValidation.warningLevel !== 'none' && (
              <BenchmarkWarning
                warningLevel={priceValidation.warningLevel}
                message={priceValidation.message}
                benchmarkRange={priceValidation.benchmarkRange}
                percentile={priceValidation.percentile}
                unit="$"
                onUseMedian={() => {
                  const b = getBenchmark(industryType!, 'avg_ticket_size');
                  if (b) onFinancialInputsChange({ ...financialInputs, average_price: b.p50 });
                }}
              />
            )}
          </div>

          {/* 6. Expected customers */}
          <div className="space-y-2 q-metric-reveal" style={{ '--index': 2 } as React.CSSProperties}>
            <label className="flex items-center gap-1.5">
              <FieldCompletionDot isComplete={!!financialInputs.expected_customers && financialInputs.expected_customers > 0} />
              <span className="text-[13px] font-medium tracking-wide uppercase text-[var(--q-text-tertiary)]" style={{ letterSpacing: '0.04em' }}>
                6. Expected customers at launch
              </span>
            </label>
            <div
              className={cn(
                "flex items-center h-14 rounded-[10px] border transition-all duration-150",
                "bg-[var(--q-bg-input)] border-[var(--q-border-default)]",
                "focus-within:border-[var(--q-accent-primary)] focus-within:shadow-[0_0_0_3px_var(--q-accent-glow)]",
                "hover:border-[var(--q-border-hover)]",
              )}
            >
              <input
                type="text"
                inputMode="numeric"
                value={financialInputs.expected_customers || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d]/g, '');
                  onFinancialInputsChange({ ...financialInputs, expected_customers: val ? Number(val) : undefined });
                }}
                placeholder="30"
                disabled={isLoading}
                className="flex-1 h-full bg-transparent border-none outline-none text-[var(--q-text-primary)] text-lg font-semibold pl-4 pr-4 placeholder:text-[var(--q-text-tertiary)]/40"
                style={{ fontFamily: 'var(--q-font-mono)', WebkitAppearance: 'none', MozAppearance: 'textfield' } as React.CSSProperties}
              />
            </div>
            <p className="text-[11px] text-[var(--q-text-tertiary)]/70 pl-0.5">Expected at launch</p>
          </div>

          {/* 7. Analysis depth */}
          <div className="space-y-3 q-metric-reveal" style={{ '--index': 3 } as React.CSSProperties}>
            <Label className="flex items-center gap-2 text-[13px] font-medium tracking-wide uppercase text-[var(--q-text-tertiary)]" style={{ letterSpacing: '0.04em' }}>
              <FieldCompletionDot isComplete={true} />
              7. Analysis depth
            </Label>
            <RadioGroup
              value={analysisDepth}
              onValueChange={(v) => {
                if (v === 'deep' && !canRunDeep) {
                  navigate('/pricing?reason=monte_carlo');
                  return;
                }
                setAnalysisDepth(v as 'quick' | 'full' | 'deep');
              }}
              className="flex gap-2.5"
            >
              {([
                { value: 'quick' as const, label: 'Quick Check', time: '30s', desc: '3 vital signs — instant go/no-go', badge: 'Gut check', color: 'var(--q-chart-1)', bg: 'rgba(79,142,247,0.08)', borderColor: 'rgba(79,142,247,0.3)', tags: ['Break-even', 'Revenue M12', 'Risk score'], requiresPlus: false },
                { value: 'full' as const, label: 'Full Analysis', time: '90s', desc: '12-variable investor-grade model', badge: 'Recommended', color: 'var(--q-accent-primary)', bg: 'var(--q-accent-glow)', borderColor: 'var(--q-accent-primary)', tags: ['All metrics', 'Revenue chart', 'Risk breakdown', 'Insights'], requiresPlus: false },
                { value: 'deep' as const, label: 'Deep Audit', time: '3 min', desc: `${MONTE_CARLO_ITERATIONS_DISPLAY} Monte Carlo scenarios`, badge: 'CFO-grade', color: 'var(--q-status-ai)', bg: 'rgba(129,140,248,0.08)', borderColor: 'rgba(129,140,248,0.35)', tags: ['Monte Carlo', '5-yr projection', 'PDF export'], requiresPlus: true },
              ])
                // FREE tier: hide Deep Audit entirely (no Monte Carlo). Plus/Pro see all three.
                .filter(opt => !opt.requiresPlus || canRunDeep)
                .map((opt) => {
                const isLocked = opt.requiresPlus && !canRunDeep;
                return (
                <label
                  key={opt.value}
                  onClick={(e) => {
                    if (isLocked) {
                      e.preventDefault();
                      navigate('/pricing?reason=monte_carlo');
                    }
                  }}
                  className={cn(
                    'flex-1 flex flex-col gap-2 px-3 py-3 rounded-[var(--q-radius-md)] border transition-all duration-200 relative overflow-hidden',
                    isLocked ? 'cursor-pointer opacity-70 hover:opacity-100' : 'cursor-pointer',
                    !isLocked && analysisDepth === opt.value
                      ? 'shadow-md'
                      : 'bg-[var(--q-bg-surface)] border-[var(--q-border-default)] text-[var(--q-text-secondary)] hover:bg-[var(--q-bg-elevated)] hover:border-[var(--q-border-hover)]'
                  )}
                  style={!isLocked && analysisDepth === opt.value ? { background: opt.bg, borderColor: opt.borderColor } : undefined}
                  title={isLocked ? 'Monte Carlo Deep Audit is included with Plus. Click to upgrade.' : undefined}
                >
                  <RadioGroupItem value={opt.value} className="sr-only" disabled={isLocked} />
                  {/* Top accent bar */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] transition-opacity" style={{ background: opt.color, opacity: !isLocked && analysisDepth === opt.value ? 1 : 0.15 }} />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold flex items-center gap-1.5" style={{ fontFamily: 'var(--q-font-body)', color: !isLocked && analysisDepth === opt.value ? opt.color : 'var(--q-text-secondary)' }}>
                      {isLocked && <Lock className="w-3 h-3" aria-hidden />}
                      {opt.label}
                    </span>
                    <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded" style={{ background: opt.bg, color: opt.color, border: `1px solid ${opt.borderColor}` }}>
                      {isLocked ? 'PLUS' : opt.badge}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--q-text-secondary)] leading-snug">⏱ {opt.time} · {opt.desc}</span>
                  <div className="flex flex-wrap gap-1">
                    {opt.tags.map(t => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: opt.color, background: opt.bg }}>{t}</span>
                    ))}
                  </div>
                </label>
                );
              })}
            </RadioGroup>
          </div>

          {/* Advanced Collapsible */}
          <AdvancedFinancialInputs
            financialInputs={financialInputs}
            onChange={onFinancialInputsChange}
            disabled={isLoading}
            industryType={financialInputs.selected_industry}
          />
        </div>
      </div>

      {/* Submit Section */}
      <div className="px-6 pt-6 pb-6 space-y-4">
        <Button
          type="submit"
          disabled={!isFormValid || isLoading}
          className={cn(
            "w-full h-14 text-base font-semibold rounded-[var(--q-radius-md)] gap-2 transition-all duration-200",
            "q-btn-ai text-[var(--q-text-inverse)]",
            "hover:-translate-y-px hover:shadow-[0_0_20px_var(--q-accent-glow)]",
            (!isFormValid || isLoading) && "opacity-50 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing your business...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              ⚡ Run Stress-Test →
            </>
          )}
        </Button>

        {/* Loading Progress */}
        {isLoading && (
          <AnalysisProgress
            isLoading={isLoading}
            startTime={analysisStartTime.current || undefined}
            businessType={financialInputs.selected_industry || undefined}
            location={location || undefined}
            onRetry={() => {
              analysisStartTime.current = Date.now();
              const form = document.querySelector('form');
              if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }}
            onCancel={onCancel}
          />
        )}
      </div>
    </form>
  );
}
