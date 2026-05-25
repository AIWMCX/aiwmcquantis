import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardShellProps {
  step: number;
  totalSteps: number;
  stepLabels: string[];
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  isSubmitting?: boolean;
  children: ReactNode;
}

export function WizardShell({
  step,
  totalSteps,
  stepLabels,
  onBack,
  onNext,
  nextLabel = 'Next',
  nextDisabled,
  isSubmitting,
  children,
}: WizardShellProps) {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      {/* Step indicator — sticky on mobile */}
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            {stepLabels.map((label, i) => {
              const n = i + 1;
              const active = n === step;
              const done = n < step;
              return (
                <div key={label} className="flex flex-1 items-center gap-2 min-w-0">
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                      active && 'border-primary bg-primary text-primary-foreground',
                      done && 'border-primary/40 bg-primary/10 text-primary',
                      !active && !done && 'border-border text-muted-foreground',
                    )}
                  >
                    {n}
                  </div>
                  <span
                    className={cn(
                      'hidden truncate text-sm sm:inline',
                      active ? 'font-medium text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {label}
                  </span>
                  {n < totalSteps && (
                    <div className="hidden h-px flex-1 bg-border sm:block" aria-hidden />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-muted-foreground sm:hidden">
            Step {step} of {totalSteps} — <span className="font-medium text-foreground">{stepLabels[step - 1]}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</div>

      {/* Sticky bottom nav — finger-friendly */}
      <div className="sticky bottom-0 z-10 border-t bg-background/95 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={!onBack || isSubmitting}
            className="min-h-[44px]"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <Button
            type="button"
            onClick={onNext}
            disabled={nextDisabled || isSubmitting}
            className="min-h-[44px] min-w-[140px]"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {nextLabel}
                <ChevronRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
