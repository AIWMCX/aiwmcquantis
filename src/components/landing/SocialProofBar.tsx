import React, { useState, useEffect } from 'react';
import { TrendingUp, Globe, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * SocialProofBar — Social-proof strip shown below the hero.
 *
 * Both "Plans stress-tested" and "Analyses (total)" are backed by the
 * public_metrics table, each with the BEFORE UPDATE monotonic-guard trigger
 * (see 20260704120000), and grow only when a real analysis_complete funnel
 * event fires, via the AFTER INSERT trigger on funnel_events (see
 * 20260706170000).
 *
 * CORRECTED 2026-07-25 (Domain 17 audit, P0-27): the original seeds (175 /
 * 1,247, chosen 2026-07-04/06) had no basis in real historical volume — the
 * entire project has only ever recorded 88 real analysis_complete events.
 * The trigger mechanism itself was confirmed working correctly (organic
 * increments, not fabricated), but was compounding on a false floor the
 * whole time, so the displayed number stayed ~14x overstated. Both DB rows
 * and these frontend seeds reset to 88 — the real, directly-verifiable
 * count of the exact event this trigger tracks. See migration
 * correct_public_metrics_fabricated_seed.
 *
 * Removed the previous "Analyses in last 24h" ticker — it read as a dead
 * product signal during quiet periods (showed "0"). The cumulative counter
 * is honest (only bumped by real events) AND always trending upward, which
 * is what a visitor needs to see.
 *
 * Uniform for every visitor: no localStorage, no per-browser divergence,
 * no client-side "chance of +1" fake ticker.
 */

const PLANS_METRIC_KEY = 'plans_stress_tested';
const ANALYSES_METRIC_KEY = 'analyses_total';
const POLL_INTERVAL_MS = 30_000;

// Initial floors — mirror the corrected DB values so we render sensible
// numbers during the first fetch round-trip (avoids a flicker on load).
// IMPORTANT: these must never be set higher than the true current DB value
// — the fetch below uses Math.max(prev, real) as a monotonic guard against
// a *lower* real value ever regressing what's shown, which means a
// hardcoded seed above the real value would permanently mask it and this
// exact class of bug (P0-27) would recur silently. Update these only to
// match a deliberate, verified DB correction, never to an arbitrary number.
const PLANS_SEED = 88;
const ANALYSES_SEED = 88;
const MONO_STYLE: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontVariantNumeric: 'tabular-nums',
};

export function SocialProofBar() {
  const [plansCount, setPlansCount] = useState<number>(PLANS_SEED);
  const [analysesTotal, setAnalysesTotal] = useState<number>(ANALYSES_SEED);


  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      const [plansRes, analysesRes] = await Promise.all([
        // deno-lint-ignore no-explicit-any
        (supabase as any)
          .from('public_metrics')
          .select('value')
          .eq('key', PLANS_METRIC_KEY)
          .maybeSingle(),
        // deno-lint-ignore no-explicit-any
        (supabase as any)
          .from('public_metrics')
          .select('value')
          .eq('key', ANALYSES_METRIC_KEY)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      // Client-side floor mirroring the DB monotonic guarantee — even if a
      // future migration ever mis-seeds, the UI still shows non-decreasing.
      if (plansRes.data && typeof plansRes.data.value === 'number') {
        setPlansCount((prev) => Math.max(prev, plansRes.data.value));
      }
      if (analysesRes.data && typeof analysesRes.data.value === 'number') {
        setAnalysesTotal((prev) => Math.max(prev, analysesRes.data.value));
      }
    };

    // Initial fetch after a short delay so LCP isn't blocked by network
    const t = setTimeout(fetchAll, 800);
    const poll = setInterval(fetchAll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
      clearInterval(poll);
    };
  }, []);

  const stats = [
    {
      icon: TrendingUp,
      value: `${plansCount.toLocaleString()}+`,
      label: 'Plans stress-tested',
    },
    { icon: Globe, value: '50+', label: 'Cities covered' },
    {
      icon: Activity,
      value: analysesTotal.toLocaleString(),
      label: 'Analyses run (total)',
    },
  ];

  return (
    <section
      aria-label="Live product metrics"
      className="border-y"
      style={{
        borderColor: 'hsl(var(--foreground) / 0.08)',
        background: 'hsl(var(--background))',
      }}
    >
      <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-7">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
          {stats.map((stat, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="p-2 rounded-md"
                style={{
                  background: 'hsl(var(--foreground) / 0.05)',
                  border: '1px solid hsl(var(--foreground) / 0.08)',
                }}
              >
                <stat.icon
                  className="w-4 h-4"
                  style={{ color: 'var(--aiwmc-grad-brand, hsl(var(--primary)))' }}
                />
              </div>
              <div className="min-w-0">
                <p
                  className="text-xl md:text-[1.375rem] font-bold leading-none mb-1"
                  style={{ ...MONO_STYLE, color: 'hsl(var(--foreground))', letterSpacing: '-0.01em' }}
                >
                  {stat.value}
                </p>
                <p
                  className="text-[11px] uppercase font-medium truncate"
                  style={{
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    letterSpacing: '0.1em',
                    color: 'hsl(var(--foreground) / 0.55)',
                  }}
                >
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
