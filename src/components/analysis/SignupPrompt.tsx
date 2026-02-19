import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Lock, ArrowRight, BookmarkCheck, FileDown, History, Clock, Star } from 'lucide-react';

interface SignupPromptProps {
  ideaScore?: number;
}

function getHeadline(score?: number): string {
  if (!score) return 'Save your analysis for free';
  if (score >= 8) return `Strong opportunity! Save before it expires.`;
  if (score >= 5) return `Your idea scored ${score}/10 — save it and track progress`;
  return `Score ${score}/10 — refine and track improvements for free`;
}

function getSubtext(score?: number): string {
  if (!score) return 'Create a free account to keep your results and unlock more features.';
  if (score >= 8) return 'This is a high-potential idea. Save it now and revisit the full report anytime.';
  if (score >= 5) return 'Save your current score and come back as you improve the idea over time.';
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
            Your idea scored {ideaScore}/10
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
          <span className="text-muted-foreground">Results saved for:</span>
          <span className="font-mono font-bold text-foreground tabular-nums">
            {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-md mx-auto">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <History className="w-4 h-4 text-primary shrink-0" />
            Analysis history
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileDown className="w-4 h-4 text-primary shrink-0" />
            PDF exports
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4 text-primary shrink-0" />
            3 free / month
          </div>
        </div>

        <Link to="/auth?returnUrl=/app">
          <Button size="lg" className="gap-2 min-h-[48px] shadow-md hover:scale-[1.02] transition-all">
            Save My Results — Free
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>

        <p className="text-xs text-muted-foreground">
          No credit card required. Takes 30 seconds.
        </p>
      </div>
    </div>
  );
}
