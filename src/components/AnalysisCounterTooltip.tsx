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
  isFree: boolean;
}

/**
 * Shows remaining analyses with a tooltip defining what "analysis" means.
 * Reduces ambiguity per audit point #4.
 */
export function AnalysisCounterTooltip({ remainingAnalyses, isFree }: AnalysisCounterTooltipProps) {
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
            {remainingAnalyses} of 3 remaining
            <HelpCircle className="w-3 h-3 text-muted-foreground/50" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[220px] text-xs">
          <p className="font-medium mb-1">What counts as 1 analysis?</p>
          <p className="text-muted-foreground">
            One business scenario that we fully grade and benchmark. 
            You can edit the same scenario unlimited times — only new scenarios count.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
