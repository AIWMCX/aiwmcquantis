import React, { useState, useEffect } from 'react';
import { Mail, X, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLeadCapture } from '@/hooks/useLeadCapture';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface PostAnalysisEmailCaptureProps {
  ideaTitle?: string;
  monthlyProfit?: string;
  onDismiss: () => void;
}

/**
 * PostAnalysisEmailCapture — Shows after a free analysis completes for unauthenticated users.
 * "Want to save this analysis and run unlimited validations? Enter your email."
 * Expected conversion: 20–40% of free users who complete an analysis.
 */
export function PostAnalysisEmailCapture({ ideaTitle, monthlyProfit, onDismiss }: PostAnalysisEmailCaptureProps) {
  const { isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  
  const { captureLead, isSubmitting, isSuccess } = useLeadCapture({
    source: 'scroll_popup',
    offer: 'free_analysis',
  });

  // Don't show for authenticated users
  useEffect(() => {
    if (isAuthenticated) return;
    
    // Check if already dismissed this session
    const dismissed = sessionStorage.getItem('quantis_post_analysis_dismissed');
    if (dismissed) return;
    
    // Show immediately — user just saw their score and 3 risks. They want the rest.
    // Tiny 400ms delay so it doesn't pop in before the results render.
    const timer = setTimeout(() => setIsVisible(true), 400);
    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  if (isAuthenticated || !isVisible) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await captureLead(email, {
      trigger: 'post_analysis',
      idea_title: ideaTitle,
      monthly_profit: monthlyProfit,
    });
    if (result.success) {
      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        setIsVisible(false);
        onDismiss();
      }, 4000);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('quantis_post_analysis_dismissed', 'true');
    setIsVisible(false);
    onDismiss();
  };

  if (isSuccess) {
    return (
      <div className="mt-6 rounded-xl border-2 border-primary/30 bg-primary/5 p-6 text-center animate-fade-in">
        <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-1">You're in! 🎉</h3>
        <p className="text-sm text-muted-foreground">
          Check your inbox — we've sent your analysis summary and a link to save your results.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "mt-6 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-6 relative animate-fade-in",
      "shadow-lg shadow-primary/5"
    )}>
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-foreground/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground mb-1">
            Save this analysis before it's gone
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {monthlyProfit 
              ? `Your idea projects ${monthlyProfit}/mo. Drop your email to save these results, get the unlock link for the full report (Monte Carlo, P&L, action plan), and reload anytime.`
              : 'Drop your email to save these results, get the unlock link for the full report (Monte Carlo, P&L, action plan), and reload anytime.'
            }
          </p>
          
          <form onSubmit={handleSubmit} className="mt-3 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11"
                required
                autoComplete="email"
              />
            </div>
            <Button 
              type="submit" 
              disabled={isSubmitting || !email.includes('@')}
              className="gap-2 h-11 px-6 whitespace-nowrap"
            >
              {isSubmitting ? 'Saving...' : 'Save & Continue'}
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>
          
          <p className="text-xs text-muted-foreground/70 mt-2">
            No spam. Your analysis is saved instantly. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
