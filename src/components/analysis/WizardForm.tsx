import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Brain, MapPin, Send, Loader2, ChevronDown, FileText } from 'lucide-react';
import { QuickStartTemplates } from './QuickStartTemplates';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftAge, setDraftAge] = useState<string | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  const analysisStartTime = useRef<number | null>(null);

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

  // Debounced auto-save
  useEffect(() => {
    if (hasDraft && !isRestored) return;
    if (!idea.trim() && !location.trim()) return;

    const timeout = setTimeout(async () => {
      try {
        const draft: WizardDraft = {
          idea,
          location,
          industry: financialInputs.selected_industry || 'auto',
          financialInputs,
          savedAt: Date.now(),
        };
        await secureSetItem(DRAFT_KEY, draft);
      } catch (e) {
        console.error('Failed to save draft:', e);
      }
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
    } catch (e) {
      console.error('Failed to restore draft:', e);
    }
  }, [onIdeaChange, onLocationChange, onFinancialInputsChange]);

  const dismissDraft = useCallback(() => {
    setHasDraft(false);
    setIsRestored(true);
  }, []);

  const clearDraft = useCallback(() => {
    try {
      secureRemoveItem(DRAFT_KEY);
      setHasDraft(false);
    } catch (e) {
      console.error('Failed to clear draft:', e);
    }
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

  return (
    <form onSubmit={handleSubmit} className="section-card space-y-5">
      {/* Draft Recovery Banner */}
      {hasDraft && !isRestored && (
        <DraftRecoveryBanner
          draftAge={draftAge || 'recently'}
          onRestore={restoreDraft}
          onDismiss={dismissDraft}
        />
      )}

      {/* Anonymous User Notice */}
      {!isAuthenticated && <AnonymousUsageNotice />}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Brain className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Analyze Your Idea</h2>
      </div>

      {/* Quick-start templates — show when form is empty */}
      {!idea.trim() && !location.trim() && !isLoading && (
        <QuickStartTemplates
          onSelect={(templateIdea, templateLocation) => {
            onIdeaChange(templateIdea);
            onLocationChange(templateLocation);
          }}
          disabled={isLoading}
        />
      )}

      {/* Business Idea */}
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
          rows={4}
          disabled={isLoading}
          aria-invalid={!!errors.idea}
          className={cn(
            "resize-none transition-colors",
            errors.idea && "border-destructive focus-visible:ring-destructive"
          )}
        />
        <div className="flex justify-between items-center">
          {errors.idea ? (
            <p className="text-sm text-destructive">{errors.idea}</p>
          ) : (
            <span className="text-xs text-muted-foreground">
              Min 10 characters — more detail = better analysis
            </span>
          )}
          <span className={cn(
            "text-xs font-medium",
            idea.length > 5000 ? "text-destructive" : "text-muted-foreground"
          )}>
            {idea.length.toLocaleString()}/5,000
          </span>
        </div>
      </div>

      {/* Location */}
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
          className={cn(
            "transition-colors",
            errors.location && "border-destructive focus-visible:ring-destructive"
          )}
        />
        {errors.location && (
          <p className="text-sm text-destructive">{errors.location}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!isFormValid || isLoading}
        className="w-full gap-2 min-h-[48px] text-base"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Analyze
          </>
        )}
      </Button>

      {/* Advanced Options (collapsible) */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              advancedOpen && "rotate-180"
            )} />
            {advancedOpen ? 'Hide' : 'Show'} advanced options
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-5 pt-2">
          {/* Industry selector */}
          <IndustrySelector
            value={financialInputs.selected_industry || 'auto'}
            onChange={(value) => onFinancialInputsChange({
              ...financialInputs,
              selected_industry: value === 'auto' ? undefined : value
            })}
            disabled={isLoading}
          />

          {/* Financial inputs */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground mb-4">
              <strong className="text-foreground">Optional:</strong> Add your own estimates for more accurate projections.
              Leave empty to use industry benchmarks.
            </p>
            <AdvancedFinancialInputs
              financialInputs={financialInputs}
              onChange={onFinancialInputsChange}
              disabled={isLoading}
            />
          </div>

          {/* Document upload */}
          {isAuthenticated && onUploadFiles && onRemoveFile ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium text-foreground">
                  Upload Documents <span className="text-muted-foreground font-normal">(Optional)</span>
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
            <div className="p-4 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/30 text-center">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Document Analysis</p>
              <p className="text-xs text-muted-foreground">
                Sign in to upload financial documents for deeper analysis.
              </p>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Loading Progress */}
      {isLoading && (
        <AnalysisProgress
          isLoading={isLoading}
          startTime={analysisStartTime.current || undefined}
          onRetry={() => {
            analysisStartTime.current = Date.now();
            const form = document.querySelector('form');
            if (form) {
              form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
          }}
          onCancel={onCancel}
        />
      )}
    </form>
  );
}
