import React from 'react';
import { Flame, Target, Trophy, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useEngagement } from '@/hooks/useEngagement';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { MILESTONES, STREAK_MILESTONES } from '@/lib/engagementTypes';

interface ProgressTrackerProps {
  compact?: boolean;
}

export function ProgressTracker({ compact = false }: ProgressTrackerProps) {
  const { engagement, isLoading } = useEngagement();
  const { isFree, remainingAnalyses } = useSubscription();

  if (isLoading || !engagement) {
    return null;
  }

  const nextMilestone = MILESTONES.find(m => !engagement.milestones_achieved.includes(m.id));
  const nextStreakMilestone = STREAK_MILESTONES.find(s => s.days > engagement.current_streak);
  
  // Calculate progress to next analysis milestone
  const analysisProgress = Math.min(100, (engagement.total_analyses / (nextMilestone ? 
    (nextMilestone.condition.value as number) : 10)) * 100);

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        {engagement.current_streak > 0 && (
          <div className="flex items-center gap-1.5 text-primary">
            <Flame className="w-4 h-4" />
            <span className="font-medium">{engagement.current_streak}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Target className="w-4 h-4" />
          <span>{engagement.total_analyses}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border border-border bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Your Progress</h3>
        {engagement.engagement_tier !== 'new' && (
          <span className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium capitalize',
            engagement.engagement_tier === 'power' && 'bg-primary/10 text-primary',
            engagement.engagement_tier === 'active' && 'bg-accent text-accent-foreground',
            engagement.engagement_tier === 'dormant' && 'bg-muted text-muted-foreground',
          )}>
            {engagement.engagement_tier}
          </span>
        )}
      </div>

      {/* Streak */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            'p-1.5 rounded-md',
            engagement.current_streak > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          )}>
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {engagement.current_streak > 0 
                ? `${engagement.current_streak} day streak` 
                : 'Start a streak!'}
            </p>
            {nextStreakMilestone && engagement.current_streak > 0 && (
              <p className="text-xs text-muted-foreground">
                {nextStreakMilestone.days - engagement.current_streak} days to {nextStreakMilestone.badge}
              </p>
            )}
          </div>
        </div>
        {engagement.longest_streak > 0 && (
          <span className="text-xs text-muted-foreground">
            Best: {engagement.longest_streak}
          </span>
        )}
      </div>

      {/* Analyses count */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Target className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">
              {engagement.total_analyses} analyses
            </span>
          </div>
          {isFree && (
            <span className="text-xs text-muted-foreground">
              {remainingAnalyses}/3 left this month
            </span>
          )}
        </div>
        {nextMilestone && (
          <>
            <Progress value={analysisProgress} className="h-1.5" />
            <p className="text-xs text-muted-foreground mt-1">
              {(nextMilestone.condition.value as number) - engagement.total_analyses} more to earn "{nextMilestone.name}"
            </p>
          </>
        )}
      </div>

      {/* Achievements */}
      {engagement.milestones_achieved.length > 0 && (
        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-1.5 mb-2">
            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xs font-medium text-muted-foreground">
              Achievements ({engagement.milestones_achieved.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {engagement.milestones_achieved.map(id => {
              const milestone = MILESTONES.find(m => m.id === id);
              if (!milestone) return null;
              return (
                <span
                  key={id}
                  className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                  title={milestone.description}
                >
                  {milestone.name}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
