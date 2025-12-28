import React from 'react';
import { Brain, MapPin, Send, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AdvancedFinancialInputs } from './AdvancedFinancialInputs';
import type { OptionalFinancialInputs } from '@/types/analysis';

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
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Business Idea Analysis</h2>
      </div>

      {/* Business Idea */}
      <div className="space-y-2">
        <Label htmlFor="idea" className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Brain className="w-4 h-4 text-muted-foreground" />
          Your Business Idea
        </Label>
        <Textarea
          id="idea"
          value={idea}
          onChange={(e) => handleIdeaChange(e.target.value)}
          placeholder="Describe your idea in detail: what you plan to do, what problem you solve, who your customer is..."
          rows={4}
          disabled={isLoading}
          className={cn(
            "resize-none transition-colors",
            errors.idea && "border-destructive focus-visible:ring-destructive"
          )}
        />
        <div className="flex justify-between items-center">
          {errors.idea ? (
            <p className="text-sm text-destructive">{errors.idea}</p>
          ) : (
            <span className="text-xs text-muted-foreground">Minimum 10 characters</span>
          )}
          <span className={cn(
            "text-xs",
            idea.length > 500 ? "text-destructive" : "text-muted-foreground"
          )}>
            {idea.length}/500
          </span>
        </div>
      </div>

      {/* Location */}
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
          className={cn(
            "transition-colors",
            errors.location && "border-destructive focus-visible:ring-destructive"
          )}
        />
        {errors.location && (
          <p className="text-sm text-destructive">{errors.location}</p>
        )}
      </div>

      {/* Advanced Financial Inputs */}
      <AdvancedFinancialInputs
        financialInputs={financialInputs}
        onChange={onFinancialInputsChange}
        disabled={isLoading}
      />

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
          <strong className="text-foreground">💡 Tip:</strong> The more detailed your description, the more accurate the analysis. 
          Expand "Advanced Financial Details" to boost confidence by up to 40%.
        </p>
      </div>
    </form>
  );
}
