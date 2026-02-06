import React from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  TrendingUp, 
  Users, 
  Clock,
  Lightbulb,
  Zap
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
      <div className={cn('section-card flex flex-col items-center justify-center min-h-[400px] text-center', className)}>
        <div className="p-4 rounded-2xl bg-warning/10 mb-6">
          <Clock className="w-12 h-12 text-warning" />
        </div>
        
        <h3 className="text-xl font-semibold text-foreground mb-2">
          You've used your free analyses today
        </h3>
        
        <p className="text-muted-foreground max-w-md mb-6">
          Upgrade to Plus for unlimited analyses and unlock powerful features 
          like AI Document Intelligence and bank-ready PDF exports.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button onClick={handleUpgrade} className="gap-2">
            <Zap className="w-4 h-4" />
            Upgrade to Plus
          </Button>
          <p className="text-xs text-muted-foreground">
            14-day free trial • No credit card required
          </p>
        </div>

        {/* Value comparison */}
        <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border max-w-sm">
          <p className="text-sm font-medium text-foreground mb-2">
            What you're missing:
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground text-left">
            <li className="flex items-center gap-2">
              <span className="text-success">✓</span> Unlimited business analyses
            </li>
            <li className="flex items-center gap-2">
              <span className="text-success">✓</span> AI Document Intelligence
            </li>
            <li className="flex items-center gap-2">
              <span className="text-success">✓</span> Bank-ready PDF exports
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // New User State (0 analyses)
  if (analysisCount === 0) {
    return (
      <div className={cn('section-card flex flex-col items-center justify-center min-h-[400px] text-center', className)}>
        <div className="p-4 rounded-2xl bg-primary/10 mb-6 animate-pulse">
          <Sparkles className="w-12 h-12 text-primary" />
        </div>
        
        <h3 className="text-2xl font-bold text-foreground mb-2">
          Your First Analysis is Free
        </h3>
        
        <p className="text-muted-foreground max-w-md mb-8">
          Enter your business idea and get instant financial projections, 
          market analysis, and a complete business plan in under 2 minutes.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Button size="lg" onClick={handleStartAnalysis} className="gap-2 min-w-[200px]">
            <Lightbulb className="w-5 h-5" />
            Enter My Business Idea
            <ArrowRight className="w-4 h-4" />
          </Button>
          
          {onTrySample && (
            <Button variant="outline" size="lg" onClick={handleTrySample} className="gap-2">
              Try a Sample Analysis
            </Button>
          )}
        </div>

        {/* Social proof */}
        <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span>Join <strong className="text-foreground">12,500+</strong> entrepreneurs</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-success" />
            <span><strong className="text-foreground">$2.3M+</strong> funding raised</span>
          </div>
        </div>
      </div>
    );
  }

  // Returning User State (has analyses)
  return (
    <div className={cn('section-card flex flex-col items-center justify-center min-h-[400px] text-center', className)}>
      <div className="p-4 rounded-2xl bg-primary/10 mb-6">
        <TrendingUp className="w-12 h-12 text-primary" />
      </div>
      
      <h3 className="text-xl font-semibold text-foreground mb-2">
        Ready for Another Analysis?
      </h3>
      
      {lastAnalysis && (
        <p className="text-sm text-muted-foreground mb-4">
          Last analysis: <span className="font-medium text-foreground">{truncate(lastAnalysis.idea, 40)}</span>
        </p>
      )}

      {/* Progress tracker */}
      {remainingAnalyses !== undefined && (
        <div className="mb-6 p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{analysisCount}</span> analyses completed 
            {remainingAnalyses > 0 && (
              <> • <span className="font-bold text-primary">{remainingAnalyses}</span> remaining this month</>
            )}
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button size="lg" onClick={handleStartAnalysis} className="gap-2">
          <Sparkles className="w-5 h-5" />
          Start New Analysis
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
});

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}
