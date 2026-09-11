import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface AnalysisCounterTooltipProps {
  remainingAnalyses: number;
  totalLimit?: number;
  isFree: boolean;
}

/**
 * Shows remaining Decision Runs with a tooltip defining what one run includes.
 * Reduces ambiguity per audit point #4.
 */
export function AnalysisCounterTooltip({ remainingAnalyses, totalLimit = 5, isFree }: AnalysisCounterTooltipProps) {
  if (!isFree) {
    return (
      <span className="text-xs text-muted-foreground">Unlimited analyses</span>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-help">
            {remainingAnalyses} of {totalLimit} Decision Runs remaining
            <HelpCircle className="w-3 h-3 text-muted-foreground/50" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[220px] text-xs">
          <p className="font-medium mb-1">What counts as 1 Decision Run?</p>
          <p className="text-muted-foreground">
            One complete financial analysis with validation, failure pre-mortem, and an included scenario set.
            Previewing or editing scenarios inside that run does not use another run.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
