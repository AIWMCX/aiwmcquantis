/**
 * MarketSizingCard — surfaces the TAM/SAM/SOM block from a PRO analysis.
 * Triggered via useProExtension() which calls /functions/v1/analyze-pro-extension.
 *
 * If no PRO analysis has been run yet, renders a CTA. The hook handles the
 * 402 TierGateBlock and shows the upgrade toast.
 */
import React from 'react';
import { Globe2, Loader2, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProExtension } from '@/hooks/useSpecTier';
import type { PlusAnalysisJson } from '@/services/specTierApi';

interface Props {
  /**
   * PLUS analysis input. Either a full PlusAnalysisJson (spec-tier path) or the
   * minimal adapter object built from a dashboard analysis via
   * businessResultToPlusInput(). analyze-pro-extension accepts both.
   */
  plusAnalysis?: PlusAnalysisJson | Record<string, unknown>;
}

const TIERS = [
  {
    key: 'tam',
    label: 'TAM',
    subtitle: 'Total Addressable',
    accent: 'from-sky-500/20 to-sky-500/5',
  },
  {
    key: 'sam',
    label: 'SAM',
    subtitle: 'Serviceable Addressable',
    accent: 'from-violet-500/20 to-violet-500/5',
  },
  {
    key: 'som',
    label: 'SOM',
    subtitle: 'Serviceable Obtainable',
    accent: 'from-emerald-500/20 to-emerald-500/5',
  },
] as const;

function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export function MarketSizingCard({ plusAnalysis }: Props) {
  const mutation = useProExtension();
  const sizing = mutation.data?.market_sizing;

  const run = () => {
    if (!plusAnalysis) return;
    mutation.mutate({ plusAnalysis });
  };

  return (
    <section className="q-card p-4 sm:p-5 flex flex-col gap-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Market Sizing</h3>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
          PLUS+ · TAM / SAM / SOM
        </span>
      </header>

      {!sizing && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Generate institutional-grade TAM / SAM / SOM with derivation methodology and investor
            framing. Requires a completed PLUS analysis as input.
          </p>
          <Button
            type="button"
            onClick={run}
            disabled={mutation.isPending || !plusAnalysis}
            className="w-full sm:w-auto"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sizing market…
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" /> Generate market sizing
              </>
            )}
          </Button>
          {!plusAnalysis && (
            <p className="text-[11px] text-muted-foreground/80">
              Run a PLUS analysis first to enable market sizing.
            </p>
          )}
        </div>
      )}

      {sizing && (
        <>
          <p className="text-[11px] text-muted-foreground/80 -mt-1">
            AI-modeled estimate — not derived from the deterministic financial
            engine or a direct market-data benchmark. Treat as a starting
            hypothesis to validate, not a verified figure.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TIERS.map((tier) => {
            const block = sizing[tier.key];
            const pct =
              tier.key === 'sam'
                ? (block as { tam_pct?: number }).tam_pct
                : tier.key === 'som'
                  ? (block as { sam_pct?: number }).sam_pct
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
        </>
      )}
    </section>
  );
}
