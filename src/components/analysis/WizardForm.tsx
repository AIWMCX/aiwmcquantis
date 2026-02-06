import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Brain, MapPin, Send, Loader2, ArrowLeft, ArrowRight, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { WizardProgress } from './WizardProgress';
import { AdvancedFinancialInputs } from './AdvancedFinancialInputs';
import { IndustrySelector } from './IndustrySelector';
import { FileUploader } from './FileUploader';
import { AnalysisProgress } from './AnalysisProgress';
import { AnonymousUsageNotice } from './AnonymousUsageNotice';
import { DraftRecoveryBanner } from './DraftRecoveryBanner';
import type { OptionalFinancialInputs } from '@/types/analysis';
import type { UploadedFile } from '@/hooks/useFileUpload';
import { secureSetItem, secureGetItem, secureRemoveItem } from '@/lib/secureStorage';

const WIZARD_STEPS = [
  { title: 'Business Idea', description: 'Describe your concept' },
  { title: 'Location', description: 'Where you\'ll operate' },
  { title: 'Financials', description: 'Optional estimates' },
  { title: 'Documents', description: 'Upload files' },
];

const DRAFT_KEY = 'quantis_wizard_draft';
const SAVE_DELAY_MS = 2000;

interface WizardDraft {
  step: number;
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
  const [currentStep, setCurrentStep] = useState(1);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftAge, setDraftAge] = useState<string | null>(null);
  const analysisStartTime = useRef<number | null>(null);
  
  // Track when analysis starts
  useEffect(() => {
    if (isLoading && !analysisStartTime.current) {
      analysisStartTime.current = Date.now();
    } else if (!isLoading) {
      analysisStartTime.current = null;
    }
  }, [isLoading]);
  const [isRestored, setIsRestored] = useState(false);

  // Check for prefill from mini-demo
  useEffect(() => {
    const prefill = localStorage.getItem('quantis_prefill');
    if (prefill) {
      try {
        const { idea: prefillIdea, location: prefillLocation } = JSON.parse(prefill);
        if (prefillIdea) onIdeaChange(prefillIdea);
        if (prefillLocation) onLocationChange(prefillLocation);
        localStorage.removeItem('quantis_prefill');
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
          // Only show draft if it has meaningful content
          if (draft.idea?.trim().length > 5 || draft.location?.trim().length > 2) {
            setHasDraft(true);
            
            // Calculate age
            const ageMs = Date.now() - draft.savedAt;
            const ageMinutes = Math.floor(ageMs / 60000);
            const ageHours = Math.floor(ageMinutes / 60);
            const ageDays = Math.floor(ageHours / 24);
            
            if (ageDays > 0) {
              setDraftAge(`${ageDays} day${ageDays > 1 ? 's' : ''} ago`);
            } else if (ageHours > 0) {
              setDraftAge(`${ageHours} hour${ageHours > 1 ? 's' : ''} ago`);
            } else if (ageMinutes > 0) {
              setDraftAge(`${ageMinutes} minute${ageMinutes > 1 ? 's' : ''} ago`);
            } else {
              setDraftAge('just now');
            }
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
          step: currentStep,
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
  }, [idea, location, financialInputs, currentStep, hasDraft, isRestored]);

  const restoreDraft = useCallback(async () => {
    try {
      const draft = await secureGetItem<WizardDraft>(DRAFT_KEY);
      if (draft && typeof draft === 'object') {
        onIdeaChange(draft.idea || '');
        onLocationChange(draft.location || '');
        onFinancialInputsChange(draft.financialInputs || {});
        setCurrentStep(draft.step || 1);
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

  // Step validation
  const isStep1Valid = idea.trim().length >= 10;
  const isStep2Valid = location.trim().length >= 2;
  
  const canProceed = (step: number): boolean => {
    switch (step) {
      case 1: return isStep1Valid;
      case 2: return isStep2Valid;
      case 3: return true; // Optional
      case 4: return true; // Optional
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4 && canProceed(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

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
    <form onSubmit={handleSubmit} className="section-card space-y-6">
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
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Business Idea Analysis</h2>
      </div>

      {/* Progress */}
      <WizardProgress 
        currentStep={currentStep} 
        totalSteps={4} 
        steps={WIZARD_STEPS} 
      />

      {/* Step 1: Business Idea */}
      {currentStep === 1 && (
        <div className="space-y-4 animate-fade-in">
          <div className="space-y-2">
            <Label htmlFor="idea" className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Brain className="w-4 h-4 text-muted-foreground" />
              Describe Your Business Idea
            </Label>
            <Textarea
              id="idea"
              value={idea}
              onChange={(e) => handleIdeaChange(e.target.value)}
              placeholder="Describe your idea in detail: what you plan to do, what problem you solve, who your customer is, your business model..."
              rows={8}
              disabled={isLoading}
              aria-invalid={!!errors.idea}
              className={cn(
                "resize-none transition-colors min-h-[200px]",
                errors.idea && "border-destructive focus-visible:ring-destructive"
              )}
            />
            <div className="flex justify-between items-center">
              {errors.idea ? (
                <p className="text-sm text-destructive">{errors.idea}</p>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Minimum 10 characters — more detail = better analysis
                </span>
              )}
              <span className={cn(
                "text-xs font-medium",
                idea.length > 5000 ? "text-destructive" : idea.length > 4000 ? "text-amber-500" : "text-muted-foreground"
              )}>
                {idea.length.toLocaleString()}/5,000
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Location & Industry */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-fade-in">
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              Country or City
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => handleLocationChange(e.target.value)}
              placeholder="New York, USA"
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

          <IndustrySelector
            value={financialInputs.selected_industry || 'auto'}
            onChange={(value) => onFinancialInputsChange({ 
              ...financialInputs, 
              selected_industry: value === 'auto' ? undefined : value 
            })}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Step 3: Financial Details */}
      {currentStep === 3 && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Optional:</strong> Add your own estimates for more accurate projections. 
              Leave empty to use industry benchmarks.
            </p>
          </div>

          <AdvancedFinancialInputs
            financialInputs={financialInputs}
            onChange={onFinancialInputsChange}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Step 4: Documents */}
      {currentStep === 4 && (
        <div className="space-y-4 animate-fade-in">
          {isAuthenticated && onUploadFiles && onRemoveFile ? (
            <>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium text-foreground">
                  Upload Business Documents <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
              </div>
              <p className="text-xs text-muted-foreground -mt-1">
                Upload revenue statements, invoices, marketing reports, or financial data for deeper AI analysis.
              </p>
              <FileUploader
                files={files}
                isUploading={isUploading}
                disabled={isLoading}
                maxFiles={maxFiles}
                allowedExtensions={allowedExtensions}
                onUpload={onUploadFiles}
                onRemove={onRemoveFile}
              />
            </>
          ) : (
            <div className="p-6 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/30 text-center">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Document Analysis Available</p>
              <p className="text-xs text-muted-foreground">
                Sign in to upload revenue statements, invoices, and financial reports for comprehensive analysis.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center gap-3 pt-4">
        {currentStep > 1 && (
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={isLoading}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        )}

        <div className="flex-1" />

        {currentStep < 4 ? (
          <Button
            type="button"
            onClick={handleNext}
            disabled={!canProceed(currentStep) || isLoading}
            className="gap-2"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={!isFormValid || isLoading}
            className="gap-2 min-w-[140px]"
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
        )}
      </div>

      {/* Loading Progress - Enhanced with real-time stages */}
      {isLoading && (
        <AnalysisProgress 
          isLoading={isLoading}
          startTime={analysisStartTime.current || undefined}
          onRetry={() => {
            analysisStartTime.current = Date.now();
            // Re-submit the form
            const form = document.querySelector('form');
            if (form) {
              form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
          }}
          onCancel={onCancel}
        />
      )}

      {/* Skip to end button */}
      {currentStep < 4 && !isLoading && isStep1Valid && isStep2Valid && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setCurrentStep(4)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip optional steps →
          </button>
        </div>
      )}
    </form>
  );
}
