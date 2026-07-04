import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Globe, Clock, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * SocialProofBar — Social-proof strip shown below the hero.
 *
 * "Plans stress-tested" is now backed by the `public_metrics` table's
 * `plans_stress_tested` row — a bigint value guarded by a BEFORE UPDATE
 * trigger that rejects any decrease. Uniform for every visitor (no more
 * per-browser localStorage divergence) and impossible to regress via a
 * coding accident. Seeded at 175, grows only when real events call
 * bump_public_metric(). See migration 20260704120000.
 *
 * The 4th stat is a live "analyses today" tick sourced from the real
 * `analyses` table (count of rows created in the last 24h). This is an
 * honest, real-time activity signal — replaces the previous fabricated
 * "33% chance of +1 every 15 seconds" client-side ticker.
 */

const PLANS_METRIC_KEY = 'plans_stress_tested';
const POLL_INTERVAL_MS = 30_000; // Poll every 30 seconds

export function SocialProofBar() {
  const [plansCount, setPlansCount] = useState<number>(175);
  const [analysesToday, setAnalysesToday] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [metricRes, todayRes] = await Promise.all([
        (supabase as any)
          .from('public_metrics')
          .select('value')
          .eq('key', PLANS_METRIC_KEY)
          .maybeSingle(),
        (supabase as any)
          .from('analyses')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', yesterday),
      ]);

      if (cancelled) return;

      if (metricRes.data && typeof metricRes.data.value === 'number') {
        // Client-side floor mirroring the DB monotonic guarantee — even if a
        // future migration ever mis-seeds, the UI still shows non-decreasing.
        setPlansCount((prev) => Math.max(prev, metricRes.data.value));
      }
      if (typeof todayRes.count === 'number') {
        setAnalysesToday(todayRes.count);
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
    { icon: Clock, value: '90s', label: 'Average analysis time' },
    {
      icon: Activity,
      value: analysesToday === null ? '—' : analysesToday.toLocaleString(),
      label: 'Analyses in last 24h',
    },
  ];

  return (
    <div className="border-y" style={{ borderColor: 'var(--q-border-default)', background: 'var(--q-bg-elevated)' }}>
      <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: 'var(--q-accent-glow)' }}>
                <stat.icon className="w-4 h-4" style={{ color: 'var(--q-accent-primary)' }} />
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--q-text-primary)' }}>
                  {stat.value}
                </p>
                <p className="text-xs" style={{ color: 'var(--q-text-tertiary)' }}>
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
