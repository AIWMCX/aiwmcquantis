import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, ArrowRight, Shield, Star, TrendingUp, AlertTriangle, Clock, DollarSign, Coffee } from 'lucide-react';
import { trackCtaClick, trackAnalysisFunnel } from '@/lib/analytics';
import { QuantisHeroDemo } from './QuantisHeroDemo';
import { LiveCounter } from './LiveCounter';
import { supabase } from '@/integrations/supabase/client';

/* ── Animated counter for instrument panel ── */
function AnimatedMetric({ end, prefix = '', suffix = '', duration = 2000 }: { end: number; prefix?: string; suffix?: string; duration?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * end));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [end, duration]);
  return <>{prefix}{value.toLocaleString()}{suffix}</>;
}

export function MobileHero() {
  const navigate = useNavigate();
  const [analysisCount, setAnalysisCount] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const { count, error } = await supabase
          .from('analyses')
          .select('*', { count: 'exact', head: true });
        if (!error && count !== null) setAnalysisCount(count);
      } catch {}
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handlePreMortem = () => {
    trackCtaClick('run_pre_mortem', 'hero_primary');
    trackAnalysisFunnel('started', { source: 'hero_cta' });
    navigate('/app');
  };

  const handleViewReport = () => {
    trackCtaClick('view_real_report', 'hero_secondary');
    navigate('/examples');
  };

  const handleTrySample = () => {
    trackCtaClick('try_sample_coffee_shop', 'hero_sample');
    localStorage.setItem('prefill_analysis', JSON.stringify({
      idea: 'Specialty coffee shop with local pastries and co-working space',
      location: 'Austin, TX',
      selected_industry: 'coffee_shop',
      startup_investment: 45000,
      average_price: 6.50,
      expected_customers: 80,
      monthly_costs: 8500,
    }));
    navigate('/app');
  };

  const metrics = [
    { icon: Clock, label: 'Break-Even', value: 'Month 14', status: 'warning' as const },
    { icon: DollarSign, label: 'Revenue M12', value: '$8,400', status: 'neutral' as const },
    { icon: TrendingUp, label: 'Cash Runway', value: '9 mo', status: 'danger' as const },
    { icon: AlertTriangle, label: 'Risk Score', value: 'HIGH', status: 'danger' as const },
  ];

  const statusColor = {
    success: 'var(--q-status-green)',
    warning: 'var(--q-status-yellow)',
    danger: 'var(--q-status-red)',
    neutral: 'var(--q-accent-primary)',
  };

  return (
    <section className="relative overflow-hidden" aria-label="Hero" style={{ minHeight: '720px' }}>
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{ background: 'var(--q-gradient-hero)' }} />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h60M0 0v60' stroke='%23fff' stroke-width='0.5' fill='none'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
          }}
        />
        {/* Cinematic glow behind portrait */}
        <div
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(ellipse, var(--q-accent-primary) 0%, transparent 70%)',
            opacity: 0.06,
          }}
        />
      </div>

      <div className="relative container max-w-7xl mx-auto px-4 sm:px-6">
        {/* Main split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center min-h-[720px] py-12 lg:py-20">

          {/* LEFT — Live Demo Dashboard */}
          <div className="relative w-full max-w-[640px] mx-auto lg:mx-0 order-2 lg:order-1">
            <QuantisHeroDemo />
          </div>

          {/* RIGHT — Copy + CTA */}
          <div className="space-y-6 md:space-y-8 order-1 lg:order-2 text-center lg:text-left">
            {/* Eyebrow pill */}
            <div className="flex justify-center lg:justify-start animate-fade-in" style={{ animationFillMode: 'both' }}>
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider" style={{ background: 'var(--q-status-ai-bg)', border: '1px solid var(--q-status-ai-border)', color: 'var(--q-status-ai)' }}>
                <Zap className="w-3.5 h-3.5" />
                Financial Pre-Mortem Engine &middot; Dual-AI Verified
              </span>
            </div>

            {/* H1 — cinematic two-liner */}
            <h1
              className="animate-fade-in text-[clamp(2rem,5vw,3.5rem)] leading-[1.08] font-bold"
              style={{ fontFamily: 'var(--q-font-heading)', color: 'var(--q-text-primary)', animationDelay: '80ms', animationFillMode: 'both' }}
            >
              I built an AI that tells
              <br />
              founders the truth.
              <br />
              <span style={{ color: 'var(--q-accent-primary)' }}>
                Before investors and reality do.
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="animate-fade-in text-base md:text-lg max-w-[560px] mx-auto lg:mx-0 leading-relaxed"
              style={{ fontFamily: 'var(--q-font-body)', color: 'var(--q-text-secondary)', animationDelay: '160ms', animationFillMode: 'both' }}
            >
              {analysisCount && analysisCount > 10
                ? `${analysisCount.toLocaleString()} business models stress-tested so far. `
                : ''}
              Quantis simulates 1,000+ futures, flags fatal assumptions, and gives you
              a proceed/pivot/kill verdict in 90 seconds.
            </p>

            {/* CTA Row */}
            <div
              className="animate-fade-in flex flex-col items-center lg:items-start gap-4 w-full max-w-[400px] mx-auto lg:mx-0"
              style={{ animationDelay: '240ms', animationFillMode: 'both' }}
            >
              <Button
                onClick={handlePreMortem}
                size="lg"
                className="w-full text-base font-semibold h-[52px] transition-transform hover:scale-[1.02]"
                style={{ background: 'var(--q-gradient-accent)' }}
                data-event-id="run_pre_mortem_click"
              >
                Run my 90-second pre-mortem
              </Button>
              <div className="flex gap-3 w-full">
                <Button
                  onClick={handleViewReport}
                  variant="ghost"
                  size="lg"
                  className="flex-1 text-sm font-medium h-[44px]"
                  style={{ color: 'var(--q-text-secondary)', border: '1px solid var(--q-border-default)' }}
                >
                  View a real report
                </Button>
                <Button
                  onClick={handleTrySample}
                  variant="ghost"
                  size="lg"
                  className="flex-1 text-sm font-medium h-[44px]"
                  style={{ color: 'var(--q-accent-primary)', border: '1px solid var(--q-accent-primary)', background: 'var(--q-accent-glow)' }}
                >
                  Try: Coffee Shop in Austin
                </Button>
              </div>
            </div>

            {/* Trust strip */}
            <div
              className="animate-fade-in flex flex-wrap items-center justify-center lg:justify-start gap-4"
              style={{ animationDelay: '320ms', animationFillMode: 'both' }}
            >
              <span className="text-xs" style={{ color: 'var(--q-text-tertiary)' }}>
                No card &middot; One free analysis
              </span>
              <span className="w-px h-3" style={{ background: 'var(--q-border-default)' }} />
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--q-text-tertiary)' }}>
                <Star className="w-3 h-3" style={{ color: 'var(--q-status-yellow)' }} />
                1,000+ benchmarks
              </span>
              <span className="w-px h-3" style={{ background: 'var(--q-border-default)' }} />
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--q-text-tertiary)' }}>
                <Shield className="w-3.5 h-3.5" />
                SOC 2 ready
              </span>
            </div>

            {/* Live Counter */}
            <div className="animate-fade-in flex justify-center lg:justify-start" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
              <LiveCounter />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
