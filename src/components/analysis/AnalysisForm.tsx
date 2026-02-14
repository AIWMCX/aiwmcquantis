import React from 'react';
import { Brain, MapPin, Send, Loader2, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AdvancedFinancialInputs } from './AdvancedFinancialInputs';
import { IndustrySelector } from './IndustrySelector';
import { FileUploader } from './FileUploader';
import { AnonymousUsageNotice } from './AnonymousUsageNotice';
import { InputQualityIndicator } from './InputQualityIndicator';
import type { OptionalFinancialInputs } from '@/types/analysis';
import type { UploadedFile } from '@/hooks/useFileUpload';

interface AnalysisFormProps {
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
  // File upload props
  files?: UploadedFile[];
  isUploading?: boolean;
  maxFiles?: number;
  allowedExtensions?: string[];
  onUploadFiles?: (files: FileList | File[]) => void;
  onRemoveFile?: (fileId: string) => void;
  isAuthenticated?: boolean;
}

export function AnalysisForm({
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
  files = [],
  isUploading = false,
  maxFiles = 5,
  allowedExtensions = ['.pdf', '.docx', '.xlsx', '.xls', '.csv', '.txt'],
  onUploadFiles,
  onRemoveFile,
  isAuthenticated = false,
}: AnalysisFormProps) {
  const handleIdeaChange = (value: string) => {
    onIdeaChange(value);
    if (errors.idea) onClearError('idea');
  };

  const handleLocationChange = (value: string) => {
    onLocationChange(value);
    if (errors.location) onClearError('location');
  };

  return (
    <form onSubmit={onSubmit} className="section-card space-y-6">
      {/* Anonymous User Notice */}
      {!isAuthenticated && <AnonymousUsageNotice />}
      
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Business Idea Analysis</h2>
      </div>

      {/* Business Idea */}
      <div className="space-y-2">
        <Label htmlFor="idea" className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Brain className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          Your Business Idea
        </Label>
        <Textarea
          id="idea"
          value={idea}
          onChange={(e) => handleIdeaChange(e.target.value)}
          placeholder="Describe your idea in detail: what you plan to do, what problem you solve, who your customer is, your business model..."
          rows={5}
          disabled={isLoading}
          aria-describedby={errors.idea ? "idea-error" : "idea-hint"}
          aria-invalid={!!errors.idea}
          className={cn(
            "resize-none transition-colors min-h-[140px] md:min-h-[200px]",
            errors.idea && "border-destructive focus-visible:ring-destructive"
          )}
        />
        <div className="flex justify-between items-center">
          {errors.idea ? (
            <p id="idea-error" className="text-sm text-destructive" role="alert">{errors.idea}</p>
          ) : (
            <span id="idea-hint" className="text-xs text-muted-foreground">More detail = better analysis</span>
          )}
          <span 
            className={cn(
              "text-xs font-medium",
              idea.length > 5000 ? "text-destructive" : idea.length > 4000 ? "text-amber-500" : "text-muted-foreground"
            )}
            aria-live="polite"
            aria-atomic="true"
          >
            {idea.length > 999 ? `${(idea.length / 1000).toFixed(1)}k` : idea.length}/5k
          </span>
        </div>
        <div className="flex justify-between items-center">
          {errors.idea ? (
            <p id="idea-error" className="text-sm text-destructive" role="alert">{errors.idea}</p>
          ) : (
            <span id="idea-hint" className="text-xs text-muted-foreground">Minimum 10 characters — more detail = better analysis</span>
          )}
          <span 
            className={cn(
              "text-xs font-medium",
              idea.length > 5000 ? "text-destructive" : idea.length > 4000 ? "text-amber-500" : "text-muted-foreground"
            )}
            aria-live="polite"
            aria-atomic="true"
          >
            {idea.length.toLocaleString()}/5,000
          </span>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location" className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MapPin className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          Country or City
        </Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => handleLocationChange(e.target.value)}
          placeholder="New York, USA"
          disabled={isLoading}
          aria-describedby={errors.location ? "location-error" : undefined}
          aria-invalid={!!errors.location}
          className={cn(
            "transition-colors",
            errors.location && "border-destructive focus-visible:ring-destructive"
          )}
        />
        {errors.location && (
          <p id="location-error" className="text-sm text-destructive" role="alert">{errors.location}</p>
        )}
      </div>

      {/* Industry Selector */}
      <IndustrySelector
        value={financialInputs.selected_industry || 'auto'}
        onChange={(value) => onFinancialInputsChange({ 
          ...financialInputs, 
          selected_industry: value === 'auto' ? undefined : value 
        })}
        disabled={isLoading}
      />

      {/* Advanced Financial Inputs */}
      <AdvancedFinancialInputs
        financialInputs={financialInputs}
        onChange={onFinancialInputsChange}
        disabled={isLoading}
      />

      {/* Input Quality Indicator */}
      <InputQualityIndicator
        idea={idea}
        location={location}
        financialInputs={financialInputs}
        files={files}
        isAuthenticated={isAuthenticated}
      />

      {/* Document Upload Section */}
      {isAuthenticated && onUploadFiles && onRemoveFile && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium text-foreground">
              Upload Business Documents <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Upload revenue statements, invoices, marketing reports, or financial data for deeper AI analysis based on real numbers.
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
        </div>
      )}

      {/* Upgrade prompt for non-authenticated users */}
      {!isAuthenticated && (
        <div className="p-4 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/30">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Document Analysis Available</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sign in to upload revenue statements, invoices, and financial reports for comprehensive analysis based on your real business data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!isFormValid || isLoading}
        className="w-full h-12 text-base font-semibold gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            Calculate
            <Send className="w-4 h-4" />
          </>
        )}
      </Button>

      {/* Loading Progress */}
      {isLoading && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-foreground">Running AI analysis...</p>
              <p className="text-muted-foreground text-xs">Usually takes 15-30 seconds</p>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {['Gathering market data', 'Financial calculations', 'Competitor analysis', 'Building plan'].map((step, i) => (
              <div key={step} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div 
                  className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" 
                  style={{ animationDelay: `${i * 200}ms` }} 
                />
                {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tip */}
      <div className="p-3 rounded-lg bg-muted/50">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Pro Tip:</strong> For best results, provide detailed descriptions (up to 5,000 characters) and upload real financial documents. 
          The AI will analyze actual numbers from your revenue statements and marketing data for precise insights.
        </p>
      </div>
    </form>
  );
}
