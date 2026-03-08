import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Brain, MapPin, Send, Loader2, ChevronDown, FileText, Zap, CheckCircle2, ChevronRight, DollarSign, BarChart3, Lightbulb } from 'lucide-react';
import { QuickStartTemplates } from './QuickStartTemplates';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AdvancedFinancialInputs } from './AdvancedFinancialInputs';
import { IndustrySelector } from './IndustrySelector';
import { FileUploader } from './FileUploader';
import { AnalysisProgress } from './AnalysisProgress';
import { AnonymousUsageNotice } from './AnonymousUsageNotice';
import { DraftRecoveryBanner } from './DraftRecoveryBanner';
import type { OptionalFinancialInputs } from '@/types/analysis';
import type { UploadedFile } from '@/hooks/useFileUpload';
import { secureSetItem, secureGetItem, secureRemoveItem } from '@/lib/secureStorage';

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

// Compute step completeness
function getStepStatus(step: number, idea: string, location: string, financialInputs: OptionalFinancialInputs, isAuthenticated: boolean, files: UploadedFile[]) {
  if (step === 1) {
    return idea.trim().length >= 10 && location.trim().length >= 2;
  }
  if (step === 2) {
    const f = financialInputs;
    const hasAny = !!(f.startup_investment || f.monthly_revenue || f.average_price || f.expected_customers || f.monthly_costs || f.cac);
    return hasAny;
  }
  if (step === 3) {
    const hasChurn = !!financialInputs.churn_rate;
    const hasDocs = files.length > 0;
    return hasChurn || hasDocs;
  }
  return false;
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
  const [activeStep, setActiveStep] = useState(1);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftAge, setDraftAge] = useState<string | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  const analysisStartTime = useRef<number | null>(null);

  const step1Complete = getStepStatus(1, idea, location, financialInputs, isAuthenticated, files);
  const step2Complete = getStepStatus(2, idea, location, financialInputs, isAuthenticated, files);
  const step3Complete = getStepStatus(3, idea, location, financialInputs, isAuthenticated, files);

  // Auto-advance to step 2 when step 1 is complete
  useEffect(() => {
    if (step1Complete && activeStep === 1 && !isLoading) {
      // Don't auto-advance if user just loaded the page with prefill
      const timer = setTimeout(() => setActiveStep(2), 400);
      return () => clearTimeout(timer);
    }
  }, [step1Complete]);

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
        console.error('Failed to parse prefill:', e);
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
        console.error('Failed to check draft:', e);
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
      } catch (e) { console.error('Failed to save draft:', e); }
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
    } catch (e) { console.error('Failed to restore draft:', e); }
  }, [onIdeaChange, onLocationChange, onFinancialInputsChange]);

  const dismissDraft = useCallback(() => { setHasDraft(false); setIsRestored(true); }, []);
  const clearDraft = useCallback(() => {
    try { secureRemoveItem(DRAFT_KEY); setHasDraft(false); } catch (e) { console.error('Failed to clear draft:', e); }
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

  const steps = [
    { num: 1, label: 'Idea & Market', icon: Brain, complete: step1Complete },
    { num: 2, label: 'Core Numbers', icon: DollarSign, complete: step2Complete },
    { num: 3, label: 'Advanced', icon: BarChart3, complete: step3Complete },
  ];

  const reliabilityGain = step2Complete ? (step3Complete ? 0 : 15) : 25;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Draft Recovery */}
      {hasDraft && !isRestored && (
        <DraftRecoveryBanner draftAge={draftAge || 'recently'} onRestore={restoreDraft} onDismiss={dismissDraft} />
      )}
      {!isAuthenticated && <AnonymousUsageNotice />}

      {/* Vertical Stepper */}
      <div className="space-y-2">
        {steps.map((step) => {
          const isActive = activeStep === step.num;
          const StepIcon = step.icon;

          return (
            <div key={step.num} className="relative">
              {/* Step Header — always visible */}
              <button
                type="button"
                onClick={() => setActiveStep(step.num)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-[var(--q-radius-md)] border transition-all duration-[var(--q-duration-fast)] text-left',
                  isActive
                    ? 'border-[var(--q-accent-primary)]/40 bg-[var(--q-accent-glow)] shadow-sm'
                    : step.complete
                    ? 'border-[var(--q-border-default)] bg-card hover:bg-accent/50'
                    : 'border-[var(--q-border-subtle)] bg-card/50 hover:bg-accent/30'
                )}
              >
                {/* Step number circle */}
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors',
                  step.complete
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : isActive
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {step.complete ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    step.num
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-sm font-medium',
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {step.label}
                    </span>
                    {step.num === 2 && step.complete && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                        +25% accuracy
                      </Badge>
                    )}
                    {step.num === 3 && !step.complete && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                        Optional
                      </Badge>
                    )}
                  </div>
                  {/* Collapsed summary for completed, non-active steps */}
                  {step.complete && !isActive && step.num === 1 && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {idea.slice(0, 60)}{idea.length > 60 ? '...' : ''} — {location}
                    </p>
                  )}
                  {step.complete && !isActive && step.num === 2 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[
                        financialInputs.startup_investment && `$${Number(financialInputs.startup_investment).toLocaleString()} invest`,
                        financialInputs.monthly_revenue && `$${Number(financialInputs.monthly_revenue).toLocaleString()}/mo`,
                      ].filter(Boolean).join(' · ') || 'Numbers added'}
                    </p>
                  )}
                </div>

                <ChevronRight className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform shrink-0',
                  isActive && 'rotate-90'
                )} />
              </button>

              {/* Step Content — expanded */}
              <div className={cn(
                'overflow-hidden transition-all duration-300 ease-in-out',
                isActive ? 'max-h-[800px] opacity-100 mt-2' : 'max-h-0 opacity-0'
              )}>
                <div className="px-4 py-3 rounded-lg border border-border bg-card space-y-4">
                  {step.num === 1 && (
                    <>
                      {/* Quick-start templates */}
                      {!idea.trim() && !location.trim() && !isLoading && (
                        <QuickStartTemplates
                          onSelect={(templateIdea, templateLocation) => {
                            onIdeaChange(templateIdea);
                            onLocationChange(templateLocation);
                          }}
                          disabled={isLoading}
                        />
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="idea" className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Brain className="w-4 h-4 text-muted-foreground" />
                          Business Idea
                        </Label>
                        <Textarea
                          id="idea"
                          value={idea}
                          onChange={(e) => handleIdeaChange(e.target.value)}
                          placeholder="e.g. Coffee shop with remote work focus in a high-foot-traffic neighborhood"
                          rows={3}
                          disabled={isLoading}
                          aria-invalid={!!errors.idea}
                          className={cn(
                            "resize-none transition-colors text-sm",
                            errors.idea && "border-destructive focus-visible:ring-destructive"
                          )}
                        />
                        <div className="flex justify-between items-center">
                          {errors.idea ? (
                            <p className="text-xs text-destructive">{errors.idea}</p>
                          ) : (
                            <span className="text-xs text-muted-foreground">Min 10 chars — more detail = better analysis</span>
                          )}
                          <span className={cn("text-xs tabular-nums", idea.length > 5000 ? "text-destructive" : "text-muted-foreground")}>
                            {idea.length.toLocaleString()}/5,000
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location" className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          Location
                        </Label>
                        <Input
                          id="location"
                          value={location}
                          onChange={(e) => handleLocationChange(e.target.value)}
                          placeholder="e.g. Denver, Colorado"
                          disabled={isLoading}
                          aria-invalid={!!errors.location}
                          className={cn("transition-colors text-sm", errors.location && "border-destructive focus-visible:ring-destructive")}
                        />
                        {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
                      </div>

                      {/* Industry selector */}
                      <IndustrySelector
                        value={financialInputs.selected_industry || 'auto'}
                        onChange={(value) => onFinancialInputsChange({
                          ...financialInputs,
                          selected_industry: value === 'auto' ? undefined : value
                        })}
                        disabled={isLoading}
                      />
                    </>
                  )}

                  {step.num === 2 && (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Add your estimates for more accurate projections. Leave empty to use industry benchmarks.
                      </p>
                      <AdvancedFinancialInputs
                        financialInputs={financialInputs}
                        onChange={onFinancialInputsChange}
                        disabled={isLoading}
                      />
                    </>
                  )}

                  {step.num === 3 && (
                    <>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Lightbulb className="w-3.5 h-3.5 text-primary" />
                        <span>Optional but strongly recommended for reliable projections</span>
                      </div>

                      {/* Churn + additional details */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Monthly Churn Rate (%)</Label>
                          <Input
                            type="number"
                            value={financialInputs.churn_rate || ''}
                            onChange={(e) => onFinancialInputsChange({ ...financialInputs, churn_rate: e.target.value ? Number(e.target.value) : undefined })}
                            placeholder="5"
                            disabled={isLoading}
                            className="text-sm h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Monthly Costs ($)</Label>
                          <Input
                            type="number"
                            value={financialInputs.monthly_costs || ''}
                            onChange={(e) => onFinancialInputsChange({ ...financialInputs, monthly_costs: e.target.value ? Number(e.target.value) : undefined })}
                            placeholder="8,000"
                            disabled={isLoading}
                            className="text-sm h-9"
                          />
                        </div>
                      </div>

                      {/* Document upload */}
                      {isAuthenticated && onUploadFiles && onRemoveFile ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                            <Label className="text-xs font-medium text-foreground">
                              Upload Documents
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
                      ) : (
                        <div className="p-3 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/30 text-center">
                          <FileText className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                          <p className="text-xs font-medium text-foreground">Document Analysis</p>
                          <p className="text-xs text-muted-foreground">Sign in to upload financial documents.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!isFormValid || isLoading}
        className="w-full gap-2 min-h-[48px] text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.01]"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            Analyze
          </>
        )}
      </Button>

      {/* Loading Progress */}
      {isLoading && (
        <AnalysisProgress
          isLoading={isLoading}
          startTime={analysisStartTime.current || undefined}
          onRetry={() => {
            analysisStartTime.current = Date.now();
            const form = document.querySelector('form');
            if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }}
          onCancel={onCancel}
        />
      )}
    </form>
  );
}
