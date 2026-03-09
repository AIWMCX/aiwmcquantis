import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { QSL, getQSLFromConfidence, QSL_CONFIG, shouldPulse } from '@/lib/quantis-safety-levels';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TrafficLightBadgeProps {
  confidenceScore: number;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

export function TrafficLightBadge({
  confidenceScore,
  size = 'md',
  showTooltip = true,
  className,
}: TrafficLightBadgeProps) {
  const [isVisible, setIsVisible] = useState(false);

  const { level, config, isPulsing } = useMemo(() => {
    const qslLevel = getQSLFromConfidence(confidenceScore);
    return {
      level: qslLevel,
      config: QSL_CONFIG[qslLevel],
      isPulsing: shouldPulse(qslLevel),
    };
  }, [confidenceScore]);

  // Entrance animation state
  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const badge = (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 transition-all duration-300',
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.8]',
        className
      )}
      style={{
        transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* Colored Dot */}
      <span
        className={cn(
          'rounded-full shrink-0',
          isPulsing && 'animate-[qslPulse_2s_ease-in-out_infinite]',
          size === 'sm' && 'w-[7px] h-[7px]',
          size === 'md' && 'w-2.5 h-2.5',
          size === 'lg' && 'w-3 h-3'
        )}
        style={{
          backgroundColor: config.color,
          boxShadow: isPulsing ? `0 0 8px ${config.color}` : undefined,
        }}
      />

      {/* Label Content */}
      {size === 'sm' && (
        <span className="text-xs font-medium text-muted-foreground">
          {Math.round(confidenceScore)}%
        </span>
      )}

      {size === 'md' && (
        <span className="text-xs font-medium text-foreground">
          {config.badge} · {config.label} · {Math.round(confidenceScore)}%
        </span>
      )}

      {size === 'lg' && (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">
            {config.badge} · {config.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {config.sub} · {Math.round(confidenceScore)}%
          </span>
        </div>
      )}
    </div>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="cursor-help">
            {badge}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="w-60 p-3 border rounded-[10px]"
          style={{
            backgroundColor: 'hsl(220 25% 12%)',
            borderColor: 'hsl(220 20% 22%)',
          }}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span className="font-semibold text-sm text-foreground">
                {config.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {config.disclaimer}
            </p>
            {(level === QSL.EXPLORATORY || level === QSL.PLANNING) && (
              <p
                className="text-xs font-medium mt-2"
                style={{ color: 'hsl(var(--q-accent-primary-hsl, 216 90% 60%))' }}
              >
                Fill more fields to improve →
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
