import React, { useMemo } from 'react';
import { MapPin, TrendingUp, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AnalysisTopBarProps {
  idea: string;
  location: string;
  reliabilityScore: number;
  reliabilityGain?: number;
  gainHint?: string;
  onGainClick?: () => void;
}

export function AnalysisTopBar({
  idea,
  location,
  reliabilityScore,
  reliabilityGain = 0,
  gainHint,
  onGainClick,
}: AnalysisTopBarProps) {
  const ringColor = useMemo(() => {
    if (reliabilityScore >= 75) return 'text-emerald-500';
    if (reliabilityScore >= 50) return 'text-amber-500';
    return 'text-destructive';
  }, [reliabilityScore]);

  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (reliabilityScore / 100) * circumference;

  if (!idea.trim() && !location.trim()) return null;

  return (
    <div className="mb-4 px-4 py-3 rounded-lg border border-border bg-card flex items-center justify-between gap-4 animate-in fade-in duration-300">
      {/* Left: Idea + Location */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate max-w-[180px] sm:max-w-[300px] lg:max-w-[500px]">
            {idea || 'Describe your business idea...'}
          </p>
        </div>
        {location && (
          <Badge variant="outline" className="shrink-0 gap-1 text-xs">
            <MapPin className="w-3 h-3" />
            {location}
          </Badge>
        )}
      </div>

      {/* Right: Reliability ring + gain pill */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Radial ring */}
        <div className="relative w-11 h-11 flex items-center justify-center">
          <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
            <circle
              cx="22" cy="22" r="18"
              className="stroke-muted"
              strokeWidth="3"
              fill="none"
            />
            <circle
              cx="22" cy="22" r="18"
              className={cn('transition-all duration-700 ease-out', ringColor)}
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <span className="absolute text-xs font-bold text-foreground tabular-nums">
            {reliabilityScore}%
          </span>
        </div>

        {/* Gain pill */}
        {reliabilityGain > 0 && (
          <button
            onClick={onGainClick}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            <TrendingUp className="w-3 h-3" />
            +{reliabilityGain}%
            {gainHint && (
              <span className="hidden sm:inline text-primary/70 ml-0.5">{gainHint}</span>
            )}
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
