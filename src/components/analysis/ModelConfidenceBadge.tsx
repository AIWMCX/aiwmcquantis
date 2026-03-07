import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, ShieldQuestion, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

interface ConfidenceFactor {
  factor: string;
  score: number;
  weight: number;
  explanation: string;
}

interface ModelConfidenceData {
  confidence: number;
  assumption_risk: number;
  recommendation_level: 'safe' | 'caution' | 'high_risk';
  factors: ConfidenceFactor[];
  similar_cases_count?: number;
}

interface ModelConfidenceBadgeProps {
  confidence?: ModelConfidenceData;
}

export function ModelConfidenceBadge({ confidence }: ModelConfidenceBadgeProps) {
  if (!confidence) return null;

  const pct = Math.round(confidence.confidence * 100);

  const config = {
    safe: {
      icon: ShieldCheck,
      label: 'Safe',
      color: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      ring: 'text-emerald-500',
      barColor: 'bg-emerald-500',
    },
    caution: {
      icon: ShieldQuestion,
      label: 'Caution',
      color: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30',
      ring: 'text-amber-500',
      barColor: 'bg-amber-500',
    },
    high_risk: {
      icon: ShieldAlert,
      label: 'High Risk',
      color: 'text-destructive',
      bg: 'bg-destructive/10 border-destructive/30',
      ring: 'text-destructive',
      barColor: 'bg-destructive',
    },
  }[confidence.recommendation_level];

  const Icon = config.icon;

  return (
    <div className="section-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Icon className={cn('w-5 h-5', config.ring)} />
          AIWMC Model Confidence
        </h3>
        <div className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-full border font-bold text-lg', config.bg, config.color)}>
          {pct}%
          <span className="text-sm font-semibold">({config.label})</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {confidence.recommendation_level === 'safe'
          ? 'This analysis is well-calibrated with strong supporting data.'
          : confidence.recommendation_level === 'caution'
          ? 'Some assumptions need validation. Review flagged items before making decisions.'
          : 'Significant modeling uncertainty. Treat results as directional estimates only.'}
      </p>

      {/* Overall bar */}
      <div className="mb-4">
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', config.barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Low confidence</span>
          <span>High confidence</span>
        </div>
      </div>

      {/* Factor breakdown */}
      <Accordion type="single" collapsible>
        <AccordionItem value="factors" className="border-none">
          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
            Factor Breakdown ({confidence.factors.length} signals)
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              {confidence.factors.map((f, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{f.factor}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        w:{Math.round(f.weight * 100)}%
                      </span>
                      <Badge variant="outline" className="text-xs font-mono">
                        {Math.round(f.score * 100)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        f.score >= 0.7 ? 'bg-emerald-500' : f.score >= 0.4 ? 'bg-amber-500' : 'bg-destructive'
                      )}
                      style={{ width: `${Math.round(f.score * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{f.explanation}</p>
                </div>
              ))}
            </div>

            {confidence.similar_cases_count !== undefined && (
              <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border">
                Based on {confidence.similar_cases_count} similar analyses in our case library.
              </p>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
