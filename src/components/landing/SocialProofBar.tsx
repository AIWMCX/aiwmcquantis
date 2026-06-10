import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Globe, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * SocialProofBar — Real-time social proof strip shown below the hero.
 * Uses actual DB counts where possible, with honest fallbacks.
 */
export function SocialProofBar() {
  const [analysisCount, setAnalysisCount] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const { count, error } = await supabase
          .from('analyses')
          .select('*', { count: 'exact', head: true });
        if (!error && count !== null) setAnalysisCount(count);
      } catch {}
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const stats = [
    {
      icon: TrendingUp,
      value: analysisCount ? `${analysisCount.toLocaleString()}+` : '—',
      label: 'Plans stress-tested',
    },
    {
      icon: Globe,
      value: '50+',
      label: 'Cities covered',
    },
    {
      icon: Clock,
      value: '90s',
      label: 'Average analysis time',
    },
    {
      icon: Users,
      value: '97,500',
      label: 'Benchmark data points',
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
                <p className="text-lg font-bold" style={{ color: 'var(--q-text-primary)' }}>
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
