import React, { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface CopyableMetricProps {
  label: string;
  value: string;
  rawValue?: string | number;
  icon?: React.ReactNode;
  color?: string;
  bgColor?: string;
  subtext?: string;
  className?: string;
}

export const CopyableMetric = React.memo(function CopyableMetric({
  label,
  value,
  rawValue,
  icon,
  color = 'text-foreground',
  bgColor = 'bg-muted',
  subtext,
  className,
}: CopyableMetricProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      const textToCopy = rawValue !== undefined ? String(rawValue) : value;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [value, rawValue]);

  return (
    <div
      className={cn(
        "group relative p-4 rounded-lg border border-border bg-card",
        "hover:bg-accent/50 transition-colors",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {icon && (
            <div className={cn("p-1.5 rounded-md", bgColor)}>
              {icon}
            </div>
          )}
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
        </div>
        
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className={cn(
                  "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
                  copied && "opacity-100"
                )}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {copied ? 'Copied!' : 'Copy value'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <p className={cn("text-xl font-bold", color)}>{value}</p>
      
      {subtext && (
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
      )}
    </div>
  );
});
