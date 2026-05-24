/**
 * MarketSizingCard — surfaces the TAM / SAM / SOM block.
 *
 * The previous implementation chained analyze-plus → analyze-pro-extension
 * before showing anything. analyze-plus runs gemini-2.5-pro for ~45s and
 * frequently returned 502 (gateway timeout), leaving the card stuck on
 * "Preparing PLUS context…".
 *
 * This rewrite computes TAM/SAM/SOM deterministically from the existing
 * analysis (src/lib/market-sizing.ts) so the card *always* renders data
 * the moment the user has an analysis result. No edge function call, no
 * spinner, no failure mode.
 */
import React, { useMemo } from 'react';
import { Globe2 } from 'lucide-react';
import { computeMarketSizing, formatUsd } from '@/lib/market-sizing';
import type { BusinessAnalysisResult } from '@/types/analysis';

interface Props {
  idea?: string;
  location?: string;
  industry?: string;
  result?: BusinessAnalysisResult | null;
}

const TIERS = [
  { key: 'tam', label: 'TAM', subtitle: 'Total Addressable', accent: 'from-sky-500/20 to-sky-500/5' },
  { key: 'sam', label: 'SAM', subtitle: 'Serviceable Addressable', accent: 'from-violet-500/20 to-violet-500/5' },
  { key: 'som', label: 'SOM', subtitle: 'Serviceable Obtainable', accent: 'from-emerald-500/20 to-emerald-500/5' },
] as const;

export function MarketSizingCard({ idea, location, result }: Props) {
  const sizing = useMemo(() => {
    if (!result) return null;
    return computeMarketSizing(result, { idea, location });
  }, [result, idea, location]);

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

      {!sizing ? (
        <p className="text-xs text-muted-foreground leading-relaxed">
          Run an analysis first to see TAM / SAM / SOM grounded in your idea, location, and projected revenue.
        </p>
      ) : (
        <>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Anchored on projected annual revenue of{' '}
            <span className="font-mono text-foreground">{formatUsd(sizing.annual_revenue_usd)}</span>
            {' '}· derivation: <span className="font-mono">{sizing.derivation.replace(/_/g, ' ')}</span>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TIERS.map((tier) => {
              const block = sizing[tier.key];
              return (
                <article
                  key={tier.key}
                  className={`rounded-lg border border-border/60 p-4 bg-gradient-to-br ${tier.accent}`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
                      {tier.label}
                    </span>
                    {typeof block.pct === 'number' && block.pct > 0 && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {block.pct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xl font-semibold text-foreground tabular-nums">
                    {formatUsd(block.value_usd)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{tier.subtitle}</div>
                  <p className="mt-3 text-xs text-muted-foreground line-clamp-4">
                    {block.investor_framing}
                  </p>
                  <p className="mt-2 text-[10px] font-mono text-muted-foreground/70">
                    {block.methodology}
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
