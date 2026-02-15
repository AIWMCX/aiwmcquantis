import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Lock, ArrowRight, BookmarkCheck, FileDown, History } from 'lucide-react';

interface SignupPromptProps {
  ideaScore?: number;
}

export function SignupPrompt({ ideaScore }: SignupPromptProps) {
  return (
    <div className="section-card border-primary/30 bg-primary/5">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <BookmarkCheck className="w-6 h-6 text-primary" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {ideaScore && ideaScore >= 7
              ? 'Great score! Save your analysis'
              : 'Save your analysis for free'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create a free account to keep your results and unlock more features.
          </p>
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
          <Button size="lg" className="gap-2 min-h-[48px]">
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
