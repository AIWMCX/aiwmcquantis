import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookmarkCheck, FileDown, History, Clock, Star, Shield, TrendingUp } from 'lucide-react';
import { FreeVsProMatrix } from '@/components/FreeVsProMatrix';

interface SignupPromptProps {
  ideaScore?: number;
}

function getHeadline(score?: number): string {
  if (!score) return 'Save your analysis — it expires in 24 hours';
  if (score >= 8) return `High-potential idea detected. Save before it expires.`;
  if (score >= 5) return `Your idea scored ${score}/10 — save it and track progress`;
  return `Score ${score}/10 — save the baseline to track improvements`;
}

function getSubtext(score?: number): string {
  if (!score) return 'Create a free account to store and compare up to 3 analyses. No credit card required.';
  if (score >= 8) return 'This scenario passed our realism grading. Save it now and revisit the full report anytime.';
  if (score >= 5) return 'Save your current score and come back as you refine the numbers over time.';
  return 'Save the baseline now so you can compare improvements week by week.';
}

export function SignupPrompt({ ideaScore }: SignupPromptProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 59, seconds: 59 });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) return { hours: 0, minutes: 0, seconds: 0 };
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="section-card border-primary/30 bg-primary/5">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <BookmarkCheck className="w-6 h-6 text-primary" />
        </div>

        {/* Score badge */}
        {ideaScore && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold">
            <Star className="w-3.5 h-3.5" />
            Realism score: {ideaScore}/10
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {getHeadline(ideaScore)}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {getSubtext(ideaScore)}
          </p>
        </div>

        {/* Countdown timer */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-warning" />
          <span className="text-muted-foreground">Results expire in:</span>
          <span className="font-mono font-bold text-foreground tabular-nums">
            {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
          </span>
        </div>

        {/* What you get */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-md mx-auto">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <History className="w-4 h-4 text-primary shrink-0" />
            Save & compare scenarios
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileDown className="w-4 h-4 text-primary shrink-0" />
            Export reports
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="w-4 h-4 text-primary shrink-0" />
            3 free analyses / month
          </div>
        </div>

        {/* Analysis definition */}
        <p className="text-xs text-muted-foreground/70">
          1 analysis = 1 business scenario, fully graded & benchmarked. Unlimited edits.
        </p>

        <Link to="/auth?returnUrl=/app">
          <Button size="lg" className="gap-2 min-h-[48px] shadow-md hover:scale-[1.02] transition-all">
            Save My Results — Free
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>

        {/* Trust signals */}
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Shield className="w-3 h-3" />
            AES-256 encrypted
          </div>
          <span className="text-muted-foreground/30">·</span>
          <p className="text-xs text-muted-foreground">
            No credit card. 30 seconds to sign up.
          </p>
        </div>
      </div>
    </div>
  );
}
