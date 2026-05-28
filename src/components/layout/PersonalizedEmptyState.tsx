import React from 'react';
import { 
  ArrowRight, 
  TrendingUp, 
  Clock,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

interface PersonalizedEmptyStateProps {
  analysisCount: number;
  remainingAnalyses?: number;
  isRateLimited?: boolean;
  lastAnalysis?: {
    idea: string;
    timestamp: Date;
  };
  onStartAnalysis: () => void;
  onTrySample?: () => void;
  onUpgrade?: () => void;
  className?: string;
}

export const PersonalizedEmptyState = React.memo(function PersonalizedEmptyState({
  analysisCount,
  remainingAnalyses,
  isRateLimited = false,
  lastAnalysis,
  onStartAnalysis,
  onTrySample,
  onUpgrade,
  className,
}: PersonalizedEmptyStateProps) {
  const handleStartAnalysis = () => {
    trackEvent('empty_state_cta', { 
      action: 'start_analysis', 
      user_type: analysisCount === 0 ? 'new' : 'returning',
      analysis_count: analysisCount,
    });
    onStartAnalysis();
  };

  const handleTrySample = () => {
    trackEvent('empty_state_cta', { action: 'try_sample' });
    onTrySample?.();
  };

  const handleUpgrade = () => {
    trackEvent('empty_state_cta', { action: 'upgrade' });
    onUpgrade?.();
  };

  // Rate Limited State
  if (isRateLimited) {
    return (
      <div className={cn('rounded-xl border border-border bg-card p-8 md:p-12 flex flex-col items-center justify-center min-h-[360px] text-center', className)}>
        <Clock className="w-10 h-10 text-muted-foreground mb-4" />
        
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Free analyses used
        </h3>
        
        <p className="text-muted-foreground max-w-sm mb-6 text-sm leading-relaxed">
          Upgrade to Plus for unlimited analyses, AI Document Intelligence, and professional PDF exports.
        </p>

        <Button onClick={handleUpgrade} className="gap-2">
          <Zap className="w-4 h-4" />
          Upgrade to Plus
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          14-days free trial included
        </p>
      </div>
    );
  }

  // New User State (0 analyses)
  if (analysisCount === 0) {
    return (
      <div className={cn('rounded-xl border border-border bg-card p-8 md:p-12 flex flex-col items-center justify-center min-h-[360px] text-center', className)}>
        <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4">
          No analyses yet
        </p>

        <h3 className="text-2xl font-bold text-foreground mb-3">
          Run your first analysis
        </h3>
        
        <p className="text-muted-foreground max-w-md mb-8 text-sm leading-relaxed">
          Enter a business idea and location. Get financial projections, risk assessment, and a business plan in under 2 minutes.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button size="lg" onClick={handleStartAnalysis} className="gap-2 min-w-[200px]">
            Start Analysis
            <ArrowRight className="w-4 h-4" />
          </Button>
          
          {onTrySample && (
            <Button variant="outline" size="lg" onClick={handleTrySample}>
              Try a sample
            </Button>
          )}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            3 free analyses
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            50+ cities
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            No credit card
          </span>
        </div>
      </div>
    );
  }

  // Returning User State (has analyses)
  return (
    <div className={cn('rounded-xl border border-border bg-card p-8 md:p-12 flex flex-col items-center justify-center min-h-[360px] text-center', className)}>
      <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4">
        Ready to go
      </p>

      <h3 className="text-xl font-semibold text-foreground mb-2">
        Start a new analysis
      </h3>
      
      {lastAnalysis && (
        <p className="text-sm text-muted-foreground mb-4">
          Last: <span className="font-medium text-foreground">{truncate(lastAnalysis.idea, 40)}</span>
        </p>
      )}

      {remainingAnalyses !== undefined && (
        <div className="mb-6 px-4 py-2 rounded-md bg-muted/50 border border-border">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{analysisCount}</span> completed
            {remainingAnalyses > 0 && (
              <span className="text-muted-foreground"> · <span className="font-semibold text-primary">{remainingAnalyses}</span> remaining</span>
            )}
          </p>
        </div>
      )}

      <Button size="lg" onClick={handleStartAnalysis} className="gap-2">
        <TrendingUp className="w-4 h-4" />
        New Analysis
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
});

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}
