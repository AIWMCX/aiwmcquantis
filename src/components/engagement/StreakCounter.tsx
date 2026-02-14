import React from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEngagement } from '@/hooks/useEngagement';
import { STREAK_MILESTONES } from '@/lib/engagementTypes';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StreakCounterProps {
  className?: string;
}

export function StreakCounter({ className }: StreakCounterProps) {
  const { engagement } = useEngagement();

  if (!engagement || engagement.current_streak === 0) {
    return null;
  }

  const currentMilestone = [...STREAK_MILESTONES]
    .reverse()
    .find(m => engagement.current_streak >= m.days);
  
  const nextMilestone = STREAK_MILESTONES.find(m => m.days > engagement.current_streak);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-full',
              'bg-primary/10 text-primary text-sm font-medium',
              'hover:bg-primary/20 transition-colors cursor-default',
              className
            )}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{engagement.current_streak}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-medium">
              {engagement.current_streak} day streak!
            </p>
            {currentMilestone && (
              <p className="text-xs text-muted-foreground">
                Badge: {currentMilestone.badge}
              </p>
            )}
            {nextMilestone && (
              <p className="text-xs text-muted-foreground mt-1">
                {nextMilestone.days - engagement.current_streak} more for "{nextMilestone.badge}"
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
