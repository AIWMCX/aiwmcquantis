import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft, Lightbulb, Target, BarChart3, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

interface TourStep {
  id: string;
  target: string; // CSS selector
  title: string;
  content: string;
  icon: React.ElementType;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'idea_input',
    target: '[data-tour="idea-input"]',
    title: 'Describe Your Business',
    content: 'Start by describing your business idea in detail. The more specific you are, the better your analysis will be.',
    icon: Lightbulb,
    position: 'bottom',
  },
  {
    id: 'location_select',
    target: '[data-tour="location-select"]',
    title: 'Choose Your Location',
    content: 'Select your target market. We adjust rent, salary and demand estimates for 15 US metros; elsewhere we use the US average.',
    icon: Target,
    position: 'bottom',
  },
  {
    id: 'analyze_button',
    target: '[data-tour="analyze-button"]',
    title: 'Run Your Analysis',
    content: 'Click here to get your complete business analysis in under 2 minutes.',
    icon: BarChart3,
    position: 'top',
  },
  {
    id: 'results_section',
    target: '[data-tour="results"]',
    title: 'Your Results',
    content: 'View financial projections, business plan, and AI recommendations here.',
    icon: FileText,
    position: 'top',
  },
];

interface OnboardingTourProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingTour = React.memo(function OnboardingTour({
  isActive,
  onComplete,
  onSkip,
}: OnboardingTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);

  const currentStep = TOUR_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  const updateTooltipPosition = useCallback(() => {
    if (!currentStep) return;

    const targetElement = document.querySelector(currentStep.target);
    if (!targetElement) {
      // Target not found, skip to next step or end tour
      if (currentStepIndex < TOUR_STEPS.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
      } else {
        onComplete();
      }
      return;
    }

    const rect = targetElement.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipHeight = 180;
    const padding = 12;

    let top = 0;
    let left = 0;

    switch (currentStep.position) {
      case 'top':
        top = rect.top - tooltipHeight - padding;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = rect.bottom + padding;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - padding;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + padding;
        break;
    }

    // Keep within viewport
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));

    setTooltipPosition({ top, left });
    setIsVisible(true);

    // Highlight target element
    targetElement.classList.add('tour-highlight');

    return () => {
      targetElement.classList.remove('tour-highlight');
    };
  }, [currentStep, currentStepIndex, onComplete]);

  useEffect(() => {
    if (!isActive) {
      setIsVisible(false);
      return;
    }

    const cleanup = updateTooltipPosition();

    const handleResize = () => updateTooltipPosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
      cleanup?.();
    };
  }, [isActive, updateTooltipPosition]);

  const handleNext = () => {
    trackEvent('onboarding_tour_next', { step: currentStep.id });
    
    // Remove highlight from current element
    const currentTarget = document.querySelector(currentStep.target);
    currentTarget?.classList.remove('tour-highlight');

    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    trackEvent('onboarding_tour_prev', { step: currentStep.id });
    
    const currentTarget = document.querySelector(currentStep.target);
    currentTarget?.classList.remove('tour-highlight');
    
    setCurrentStepIndex(prev => Math.max(0, prev - 1));
  };

  const handleSkip = () => {
    trackEvent('onboarding_tour_skipped', { at_step: currentStep.id });
    
    const currentTarget = document.querySelector(currentStep.target);
    currentTarget?.classList.remove('tour-highlight');
    
    onSkip();
  };

  if (!isActive || !isVisible) return null;

  const Icon = currentStep.icon;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40" />

      {/* Tooltip */}
      <Card
        className="fixed z-50 w-80 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
        style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground">{currentStep.title}</h4>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSkip} className="h-6 w-6">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-4">{currentStep.content}</p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {currentStepIndex + 1} of {TOUR_STEPS.length}
            </span>
            
            <div className="flex gap-2">
              {currentStepIndex > 0 && (
                <Button variant="ghost" size="sm" onClick={handlePrev}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              <Button size="sm" onClick={handleNext}>
                {isLastStep ? 'Finish' : 'Next'}
                {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
});
