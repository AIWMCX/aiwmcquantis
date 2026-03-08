import React from 'react';
import { ShieldCheck, CheckCircle2, Info, AlertTriangle, XCircle, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import type { ConfidenceTier, ConfidenceOutput } from '@/services/confidence-scorer';
import { CONFIDENCE_BADGE_CONFIG } from '@/services/confidence-scorer';

interface ConfidenceBadgeProps {
  confidence: ConfidenceOutput | null | undefined;
}

const ICON_MAP: Record<string, React.ElementType> = {
  ShieldCheck,
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
};

const COLOR_MAP: Record<string, { text: string; bg: string; bar: string }> = {
  emerald: {
    text: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    bar: 'bg-emerald-500',
  },
  blue: {
    text: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
    bar: 'bg-blue-500',
  },
  amber: {
    text: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
    bar: 'bg-amber-500',
  },
  orange: {
    text: 'text-orange-700 dark:text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/30',
    bar: 'bg-orange-500',
  },
  red: {
    text: 'text-destructive',
    bg: 'bg-destructive/10 border-destructive/30',
    bar: 'bg-destructive',
  },
};

const FACTOR_LABELS: Record<string, string> = {
  consensus: 'AI Model Agreement',
  completeness: 'Data Completeness',
  benchmark: 'Benchmark Alignment',
  freshness_penalty: 'Data Freshness',
  sample_bonus: 'Sample Size Bonus',
};

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  if (!confidence) return null;

  const config = CONFIDENCE_BADGE_CONFIG[confidence.tier];
  const colors = COLOR_MAP[config.color] || COLOR_MAP.amber;
  const Icon = ICON_MAP[config.icon] || Info;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Icon className={cn('w-4 h-4', colors.text)} />
          Output Confidence
        </h3>
        <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full border font-bold text-sm', colors.bg, colors.text)}>
          {Math.round(confidence.score)}%
          <span className="text-xs font-semibold">({config.label})</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-3">{config.description}</p>

      {/* Score bar */}
      <div className="mb-3">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', colors.bar)}
            style={{ width: `${Math.min(100, confidence.score)}%` }}
          />
        </div>
      </div>

      {/* Warnings */}
      {confidence.warnings.length > 0 && (
        <div className="space-y-1 mb-3">
          {confidence.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Breakdown */}
      <Accordion type="single" collapsible>
        <AccordionItem value="breakdown" className="border-none">
          <AccordionTrigger className="text-xs font-medium py-1.5 hover:no-underline">
            Score Breakdown
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pt-1">
              {Object.entries(confidence.breakdown).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{FACTOR_LABELS[key] || key}</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {value > 0 ? '+' : ''}{typeof value === 'number' ? value.toFixed(1) : value}
                  </Badge>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
