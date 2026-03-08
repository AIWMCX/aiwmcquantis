import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { VALIDATION_STAGES, getCurrentStage, getStageProgress, isStageComplete, getNextAction, getTotalConfidenceBoost } from '@/lib/journey-engine';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ValidationJourneyProps {
  analysisId?: string;
  onActionClick?: (actionId: string) => void;
}

export function ValidationJourney({ analysisId, onActionClick }: ValidationJourneyProps) {
  const { user } = useAuth();
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [expandedStage, setExpandedStage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch progress from database
  useEffect(() => {
    if (!user?.id || !analysisId) {
      setLoading(false);
      return;
    }

    const fetchProgress = async () => {
      const { data } = await supabase
        .from('user_validation_progress')
        .select('completed_actions')
        .eq('user_id', user.id)
        .eq('analysis_id', analysisId)
        .maybeSingle();

      if (data?.completed_actions) {
        setCompletedActions(data.completed_actions);
      }
      setLoading(false);
    };

    fetchProgress();
  }, [user?.id, analysisId]);

  // Auto-expand current stage
  useEffect(() => {
    if (!loading) {
      const current = getCurrentStage(completedActions);
      setExpandedStage(current.id);
    }
  }, [completedActions, loading]);

  const saveProgress = useCallback(async (actions: string[]) => {
    if (!user?.id || !analysisId) return;
    await supabase
      .from('user_validation_progress')
      .upsert({
        user_id: user.id,
        analysis_id: analysisId,
        completed_actions: actions,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,analysis_id' });
  }, [user?.id, analysisId]);

  const toggleAction = useCallback(async (actionId: string) => {
    const updated = completedActions.includes(actionId)
      ? completedActions.filter(a => a !== actionId)
      : [...completedActions, actionId];
    setCompletedActions(updated);
    await saveProgress(updated);
  }, [completedActions, saveProgress]);

  const currentStage = getCurrentStage(completedActions);
  const nextAction = getNextAction(completedActions);
  const totalBoost = getTotalConfidenceBoost(completedActions);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Validation Journey
        </h3>
        {totalBoost > 0 && (
          <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            +{totalBoost}% confidence
          </Badge>
        )}
      </div>

      {/* Next action hint */}
      {nextAction && (
        <div className="px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs text-primary font-medium">Next: {nextAction.label}</p>
          <p className="text-[10px] text-muted-foreground">{nextAction.description}</p>
        </div>
      )}

      {/* Vertical Stepper */}
      <div className="space-y-0">
        {VALIDATION_STAGES.map((stage, idx) => {
          const completed = isStageComplete(stage.id, completedActions);
          const isCurrent = currentStage.id === stage.id;
          const isFuture = stage.id > currentStage.id;
          const isExpanded = expandedStage === stage.id;
          const progress = getStageProgress(stage.id, completedActions);

          return (
            <div key={stage.id} className="relative">
              {/* Connector line */}
              {idx < VALIDATION_STAGES.length - 1 && (
                <div className={cn(
                  'absolute left-[13px] top-[28px] w-0.5 h-[calc(100%-12px)]',
                  completed ? 'bg-emerald-500' : 'bg-border'
                )} />
              )}

              {/* Stage row */}
              <button
                className="flex items-start gap-3 w-full text-left py-2 group"
                onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
              >
                {/* Circle indicator */}
                <div className="relative shrink-0 mt-0.5">
                  {completed ? (
                    <div className="w-[26px] h-[26px] rounded-full bg-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-[26px] h-[26px] rounded-full border-2 border-primary flex items-center justify-center animate-pulse">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    </div>
                  ) : (
                    <div className="w-[26px] h-[26px] rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                      <Circle className="w-3 h-3 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {/* Stage info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-xs font-semibold',
                      completed ? 'text-emerald-600 dark:text-emerald-400' : isCurrent ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {stage.name}
                    </span>
                    <Badge variant="outline" className={cn(
                      'text-[10px] px-1.5 py-0',
                      completed ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : isFuture ? 'text-muted-foreground border-border' : 'text-primary border-primary/30'
                    )}>
                      +{stage.confidenceBoost}%
                    </Badge>
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 text-muted-foreground ml-auto" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
                    )}
                  </div>
                  <p className={cn('text-[11px]', isFuture ? 'text-muted-foreground/60' : 'text-muted-foreground')}>
                    {stage.description}
                  </p>
                  {isCurrent && !isExpanded && (
                    <Progress value={progress} className="h-1 mt-1.5" />
                  )}
                </div>
              </button>

              {/* Expanded checklist */}
              {isExpanded && (
                <div className="ml-10 mb-3 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                  {stage.requiredActions.map(actionId => {
                    const action = stage.actionLabels[actionId];
                    const done = completedActions.includes(actionId);
                    return (
                      <button
                        key={actionId}
                        className={cn(
                          'flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md transition-colors text-xs',
                          done ? 'bg-emerald-500/10' : 'hover:bg-muted/50',
                          isFuture && !done && 'opacity-50'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onActionClick) onActionClick(actionId);
                          else toggleAction(actionId);
                        }}
                      >
                        {done ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className={cn(done && 'line-through text-muted-foreground')}>
                          {action?.label || actionId}
                        </span>
                      </button>
                    );
                  })}
                  {isCurrent && (
                    <Progress value={progress} className="h-1 mt-1" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
