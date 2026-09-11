import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ProgressIndicator } from './ProgressIndicator';
import { SampleDataOption } from './SampleDataOption';
import { Zap, ArrowRight, ArrowLeft, User, Target, Rocket } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';

const WIZARD_STEPS = ['Welcome', 'Choose Path', 'Get Started'];

interface QuickStartWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: (idea?: string, location?: string) => void;
  userName?: string;
}

export const QuickStartWizard = React.memo(function QuickStartWizard({
  open,
  onClose,
  onComplete,
  userName,
}: QuickStartWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPath, setSelectedPath] = useState<'sample' | 'blank' | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');

  const handleNext = useCallback(() => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      trackEvent('onboarding_wizard_next', { step: currentStep + 1 });
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      trackEvent('onboarding_wizard_back', { step: currentStep - 1 });
    }
  }, [currentStep]);

  const handleSelectSample = useCallback((idea: string, location: string) => {
    setSelectedPath('sample');
    setSelectedIdea(idea);
    setSelectedLocation(location);
    handleNext();
  }, [handleNext]);

  const handleStartBlank = useCallback(() => {
    setSelectedPath('blank');
    handleNext();
  }, [handleNext]);

  const handleComplete = useCallback(() => {
    trackEvent('onboarding_wizard_completed', { path: selectedPath });
    if (selectedPath === 'sample' && selectedIdea && selectedLocation) {
      onComplete(selectedIdea, selectedLocation);
    } else {
      onComplete();
    }
  }, [onComplete, selectedPath, selectedIdea, selectedLocation]);

  const displayName = userName?.split(' ')[0] || 'there';

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                Hey {displayName}! 👋
              </h2>
              <p className="text-muted-foreground">
                Use your first Decision Run on a real choice or a guided sample.
              </p>
            </div>

            <div className="space-y-2 text-left">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                What Quantis will show you:
              </p>
              <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                <p className="text-sm font-semibold text-foreground">
                  A complete financial decision model
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Analysis, failure pre-mortem, scenario ranges, and the assumptions driving the answer.
                </p>
              </div>
            </div>

            <Button onClick={handleNext} className="w-full gap-2" size="lg">
              Let's Go
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        );

      case 1:
        return (
          <div className="py-4">
            <SampleDataOption
              onSelectSample={handleSelectSample}
              onStartBlank={handleStartBlank}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <Rocket className="w-8 h-8 text-success" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                You're All Set!
              </h2>
              <p className="text-muted-foreground">
                {selectedPath === 'sample'
                  ? "We've pre-filled a sample business. Review the assumptions, then run the analysis."
                  : "Enter the business and location, add any numbers you know, then run the analysis."}
              </p>
            </div>

            {selectedPath === 'sample' && (
              <div className="p-4 rounded-lg bg-muted/50 text-left space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Pre-filled Example
                </p>
                <p className="text-sm text-foreground line-clamp-2">{selectedIdea}</p>
                <p className="text-xs text-muted-foreground">{selectedLocation}</p>
              </div>
            )}

            <div className="space-y-3">
              <Button onClick={handleComplete} className="w-full gap-2" size="lg">
                Start Decision Run
                <Zap className="w-4 h-4" />
              </Button>
              
              <Button variant="ghost" onClick={handleBack} className="w-full gap-2">
                <ArrowLeft className="w-4 h-4" />
                Choose Different Example
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-4">
          <ProgressIndicator
            steps={WIZARD_STEPS}
            currentStep={currentStep}
          />
          <DialogTitle className="sr-only">
            {WIZARD_STEPS[currentStep]}
          </DialogTitle>
        </DialogHeader>

        {renderStepContent()}

        {/* Skip option */}
        {currentStep < WIZARD_STEPS.length - 1 && (
          <p className="text-center">
            <button
              onClick={() => {
                trackEvent('onboarding_wizard_skipped', { at_step: currentStep });
                onClose();
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Skip and explore on my own
            </button>
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
});
