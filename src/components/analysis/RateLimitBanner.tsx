import React, { useEffect, useState } from 'react';
import { AlertCircle, LogIn, UserPlus, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface RateLimitBannerProps {
  message: string;
  isAuthenticated: boolean;
  onDismiss: () => void;
}

/**
 * Prominent banner displayed when rate limit is hit.
 * Gives users a clear next step (wait, sign in, or upgrade).
 */
export function RateLimitBanner({ message, isAuthenticated, onDismiss }: RateLimitBannerProps) {
  // Try to extract retry time from message (e.g., "try again in 1 minute")
  const match = message.match(/(\d+)\s*minute/i);
  const initialSeconds = match ? parseInt(match[1], 10) * 60 : 60;
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onDismiss();
      return;
    }
    const interval = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, [secondsLeft, onDismiss]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/40 animate-fade-in">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-destructive">
            Too Many Requests
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {message.replace(/^RATE_LIMIT_EXCEEDED:\s*/i, '')}
          </p>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <div className="flex items-center gap-1 text-xs font-medium bg-muted px-2 py-1 rounded">
              <Clock className="w-3.5 h-3.5" />
              Retry in {formatTime(secondsLeft)}
            </div>

            {!isAuthenticated && (
              <>
                <Button asChild size="sm" variant="default" className="h-7 text-xs gap-1.5">
                  <Link to="/auth">
                    <LogIn className="w-3.5 h-3.5" />
                    Sign In
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1.5">
                  <Link to="/auth?mode=signup">
                    <UserPlus className="w-3.5 h-3.5" />
                    Create Account
                  </Link>
                </Button>
              </>
            )}

            {isAuthenticated && (
              <Button asChild size="sm" variant="default" className="h-7 text-xs gap-1.5">
                <Link to="/#pricing">
                  <Zap className="w-3.5 h-3.5" />
                  Upgrade to Plus
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
