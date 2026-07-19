import React from 'react';
import { Zap, LogIn, UserPlus, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { BENCHMARK_COUNT_DISPLAY } from '@/config/canonical-facts';

interface AnonymousUsageNoticeProps {
  className?: string;
}

/**
 * Notice shown to anonymous users about their limited free analysis.
 * Insight-first language with trust signals.
 */
export function AnonymousUsageNotice({ className }: AnonymousUsageNoticeProps) {
  return (
    <div className={`p-4 rounded-lg bg-primary/5 border border-primary/20 ${className || ''}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Zap className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">
              Preview Mode
            </p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              1 free analysis
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            See how Quantis grades your plan against <strong className="text-foreground">{BENCHMARK_COUNT_DISPLAY} benchmark data points</strong>.
            Sign in to save your free analysis and unlock the path to the <strong className="text-foreground">full report (Monte Carlo, P&L, action plan)</strong>.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Button asChild size="sm" variant="default" className="h-8 text-xs gap-1.5">
              <Link to="/auth">
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-8 text-xs gap-1.5">
              <Link to="/auth?mode=signup">
                <UserPlus className="w-3.5 h-3.5" />
                Create Free Account
              </Link>
            </Button>
            <div className="flex items-center gap-1 ml-auto text-xs text-muted-foreground/60">
              <Shield className="w-3 h-3" />
              AES-256
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
