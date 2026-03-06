import React from 'react';
import { Database, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface BenchmarkConfidence {
  adjusted_score: number;
  confidence_label: 'high' | 'medium' | 'low';
  staleness_factor: number;
  is_stale: boolean;
  explanation: string;
}

interface BenchmarkConfidenceIndicatorProps {
  confidence?: BenchmarkConfidence;
  className?: string;
}

export function BenchmarkConfidenceIndicator({ confidence, className }: BenchmarkConfidenceIndicatorProps) {
  if (!confidence) return null;

  const { adjusted_score, confidence_label, is_stale, explanation } = confidence;

  const labelConfig = {
    high: { 
      color: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      icon: CheckCircle2,
      progressColor: '[&>div]:bg-emerald-500',
    },
    medium: { 
      color: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      icon: Info,
      progressColor: '[&>div]:bg-amber-500',
    },
    low: { 
      color: 'text-destructive',
      bg: 'bg-destructive/10 border-destructive/20',
      icon: AlertCircle,
      progressColor: '[&>div]:bg-destructive',
    },
  };

  const config = labelConfig[confidence_label];
  const Icon = config.icon;

  return (
    <div className={cn("p-3 rounded-lg border", config.bg, className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Benchmark Data Quality</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Icon className={cn("w-3.5 h-3.5", config.color)} />
          <Badge variant="outline" className={cn("text-xs capitalize", config.color)}>
            {confidence_label}
          </Badge>
        </div>
      </div>
      <Progress value={adjusted_score} className={cn("h-1.5 mb-1.5", config.progressColor)} />
      <p className="text-xs text-muted-foreground">{explanation}</p>
      {is_stale && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Benchmark data may be outdated — results carry higher uncertainty
        </p>
      )}
    </div>
  );
}
