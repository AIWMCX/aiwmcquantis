/**
 * MarketSizingCard — surfaces the TAM/SAM/SOM block.
 *
 * Available to PLUS and PRO users. The card auto-derives the required
 * PLUS analysis JSON from the current analysis context (idea, location,
 * financials) so the user only sees a single "Generate market sizing"
 * action — no separate "run PLUS first" step.
 *
 * Pipeline on click:
 *   1. Derive a Monte Carlo result from result.financial_analysis (annual revenue).
 *   2. Call analyze-plus to mint a PLUS analysis JSON.
 *   3. Pipe that into analyze-pro-extension to get TAM/SAM/SOM.
 *
 * If the user is on FREE/PLUS, analyze-pro-extension returns 402 → handled
 * by useProExtension's toast. PLUS users get a clean upsell; PRO users get
 * a full sizing block.
 */
import React, { useState } from 'react';
import { Globe2, Loader2, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProExtension, usePlusAnalysis } from '@/hooks/useSpecTier';
import { runMonteCarlo, type MonteCarloResult } from '@/lib/monte-carlo';
import type { PlusAnalysisJson } from '@/services/specTierApi';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { toast } from 'sonner';

interface Props {
  /** Existing PLUS analysis JSON, if one was already minted this session. */
  plusAnalysis?: PlusAnalysisJson;
  /** Current analysis context — used to auto-run PLUS when needed. */
  idea?: string;
  location?: string;
  industry?: string;
  result?: AnalysisResult | null;
}

const TIERS = [
  { key: 'tam', label: 'TAM', subtitle: 'Total Addressable', accent: 'from-sky-500/20 to-sky-500/5' },
  { key: 'sam', label: 'SAM', subtitle: 'Serviceable Addressable', accent: 'from-violet-500/20 to-violet-500/5' },
  { key: 'som', label: 'SOM', subtitle: 'Serviceable Obtainable', accent: 'from-emerald-500/20 to-emerald-500/5' },
] as const;

function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

/** Derive a fast MonteCarloResult on annual revenue from the existing analysis. */
async function deriveMonteCarlo(result: AnalysisResult): Promise<MonteCarloResult> {
  const baseMonthly =
    result.financial_analysis?.scenarios?.base?.revenue ??
    (result as any)?.monthly_revenue?.realistic ??
    10_000;
  const annual = Math.max(1_000, baseMonthly * 12);
  return runMonteCarlo({
    iterations: 1000,
    seed: 42,
    params: [
      {
        name: 'annual_revenue',
        baseValue: annual,
        minValue: annual * 0.6,
        maxValue: annual * 1.4,
        distribution: 'triangular',
      },
    ],
    outputFn: (p) => p.annual_revenue,
  });
}

export function MarketSizingCard({ plusAnalysis, idea, location, industry, result }: Props) {
  const proMutation = useProExtension();
  const plusMutation = usePlusAnalysis();
  const [autoBusy, setAutoBusy] = useState(false);
  const sizing = proMutation.data?.market_sizing;

  const canAutoRun = Boolean(idea && location && result);
  const isBusy = proMutation.isPending || plusMutation.isPending || autoBusy;

  const run = async () => {
    try {
      // 1. Use existing PLUS analysis if provided.
      if (plusAnalysis) {
        proMutation.mutate({ plusAnalysis });
        return;
      }
      // 2. Auto-derive: MonteCarlo → analyze-plus → analyze-pro-extension.
      if (!canAutoRun || !result || !idea || !location) {
        toast.error('Run an analysis first', {
          description: 'Market sizing needs an idea, location, and analysis result.',
        });
        return;
      }
      setAutoBusy(true);
      const mc = await deriveMonteCarlo(result);
      const plus = await plusMutation.mutateAsync({
        idea,
        location,
        industry,
        stage: 'IDEA',
        monteCarlo: mc,
      });
      await proMutation.mutateAsync({ plusAnalysis: plus });
    } catch (err) {
      // Toasts already surfaced by the underlying hooks (402, 429, etc.)
      console.error('[MarketSizingCard] run failed:', err);
    } finally {
      setAutoBusy(false);
    }
  };

  return (
    <section className="q-card p-4 sm:p-5 flex flex-col gap-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Market Sizing</h3>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
          PLUS / PRO · TAM / SAM / SOM
        </span>
      </header>

      {!sizing && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Generate institutional-grade TAM / SAM / SOM with derivation methodology and investor framing,
            grounded in your current analysis (idea, location, projected revenue).
          </p>
          <Button
            type="button"
            onClick={run}
            disabled={isBusy || (!plusAnalysis && !canAutoRun)}
            className="w-full sm:w-auto"
          >
            {isBusy ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {plusMutation.isPending ? 'Preparing PLUS context…' : 'Sizing market…'}
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" /> Generate market sizing
              </>
            )}
          </Button>
          {!plusAnalysis && !canAutoRun && (
            <p className="text-[11px] text-muted-foreground/80">
              Run an analysis first to enable market sizing.
            </p>
          )}
        </div>
      )}

      {sizing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TIERS.map((tier) => {
            const block = sizing[tier.key];
            const pct = tier.key === 'sam' ? (block as { tam_pct?: number }).tam_pct
              : tier.key === 'som' ? (block as { sam_pct?: number }).sam_pct
              : undefined;
            return (
              <article
                key={tier.key}
                className={`rounded-lg border border-border/60 p-4 bg-gradient-to-br ${tier.accent}`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
                    {tier.label}
                  </span>
                  {typeof pct === 'number' && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {pct.toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xl font-semibold text-foreground tabular-nums">
                  {formatUsd(block.value_usd)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{tier.subtitle}</div>
                <p className="mt-3 text-xs text-muted-foreground line-clamp-3">
                  {block.investor_framing}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
