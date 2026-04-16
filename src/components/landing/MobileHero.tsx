import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, Shield, TrendingUp, Clock } from 'lucide-react';
import { trackCtaClick, trackAnalysisFunnel } from '@/lib/analytics';
import { QuantisHeroDemo } from './QuantisHeroDemo';
import { LiveCounter } from './LiveCounter';
import { supabase } from '@/integrations/supabase/client';

/* ── Animated counter ── */
function AnimatedMetric({ end, prefix = '', suffix = '', duration = 1200 }: { end: number; prefix?: string; suffix?: string; duration?: number }) {
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

  const stats = [
    { value: 229, suffix: '+', label: 'Plans stress-tested' },
    { value: 50, suffix: '+', label: 'Cities covered' },
    { value: 90, suffix: 's', label: 'Avg analysis time' },
    { value: 95500, suffix: '', label: 'Benchmark data points' },
  ];

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
        <div
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(ellipse, var(--q-full-color) 0%, transparent 70%)',
            opacity: 0.06,
          }}
        />
      </div>

      <div className="relative container max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-[45%_55%] gap-8 lg:gap-16 items-center min-h-[720px] py-12 lg:py-20">

          {/* LEFT — Copy + CTA (order-1 on mobile, stays left on desktop) */}
          <div className="space-y-6 md:space-y-8 order-1 text-center lg:text-left">
            {/* Eyebrow pill */}
            <div className="flex justify-center lg:justify-start animate-fade-in" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[9px] font-bold uppercase" style={{
                letterSpacing: '0.1em',
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.25)',
                color: '#3B82F6',
              }}>
                <Zap className="w-3.5 h-3.5" />
                Financial Pre-Mortem Engine &middot; Dual-AI Verified
              </span>
            </div>

            {/* H1 */}
            <h1 className="animate-fade-in" style={{
              fontSize: 'var(--q-fs-hero)',
              fontFamily: 'var(--q-font-heading)',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: 1.0,
              animationDelay: '100ms',
              animationFillMode: 'both',
            }}>
              <span style={{ color: '#FFFFFF' }}>90% of businesses fail in 5 years.</span>
              <br />
              <span style={{ color: '#3B82F6' }}>Most had a plan. None had validation.</span>
            </h1>

            {/* Body */}
            <p className="animate-fade-in max-w-[420px] mx-auto lg:mx-0" style={{
              fontSize: '15px',
              fontWeight: 400,
              color: '#94A3B8',
              lineHeight: 1.65,
              fontFamily: 'var(--q-font-body)',
              animationDelay: '200ms',
              animationFillMode: 'both',
            }}>
              Find out in 90 seconds if your business idea will make money —{' '}
              <span className="font-semibold" style={{ color: 'var(--q-text-primary)' }}>
                or cost you everything.
              </span>
              {' '}95,500 real benchmarks. Free. No signup required.
            </p>

            {/* CTA Row */}
            <div className="animate-fade-in flex flex-col items-center lg:items-start gap-3 w-full max-w-[400px] mx-auto lg:mx-0"
              style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
              <Button
                onClick={handlePreMortem}
                size="lg"
                className="w-full text-[15px] font-bold h-[52px] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'var(--q-gradient-accent)', borderRadius: '6px', color: '#fff' }}
                data-event-id="run_pre_mortem_click"
              >
                Validate My Business Idea — Free →
              </Button>
              <div className="flex gap-3 w-full">
                <Button onClick={handleViewReport} variant="ghost" size="lg"
                  className="flex-1 text-sm font-medium h-[44px]"
                  style={{ color: 'var(--q-text-secondary)', border: '1px solid #1E3A5F', borderRadius: '6px' }}>
                  View a real report →
                </Button>
                <Button onClick={handleTrySample} variant="ghost" size="lg"
                  className="flex-1 text-sm font-medium h-[44px]"
                  style={{ color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.08)', borderRadius: '6px' }}>
                  Try: Coffee Shop
                </Button>
              </div>
            </div>

            {/* Trust pills */}
            <p className="animate-fade-in text-[11px]" style={{ color: '#64748B', animationDelay: '400ms', animationFillMode: 'both' }}>
              No signup required &nbsp;·&nbsp; No credit card &nbsp;·&nbsp; Results in 90 seconds
            </p>

            {/* Social proof counter */}
            <div className="animate-fade-in flex justify-center lg:justify-start" style={{ animationDelay: '450ms', animationFillMode: 'both' }}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold" style={{
                background: 'rgba(16,185,129,0.1)',
                color: '#10B981',
              }}>
                → <AnimatedMetric end={analysisCount ?? 229} /> businesses analyzed
              </span>
            </div>

            {/* Stats row */}
            <div className="animate-fade-in grid grid-cols-4 gap-3 max-w-[480px] mx-auto lg:mx-0" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
              {stats.map(s => (
                <div key={s.label} className="text-center lg:text-left">
                  <div className="text-[18px] font-black" style={{ color: 'var(--q-text-primary)', letterSpacing: '-0.04em' }}>
                    <AnimatedMetric end={s.value} suffix={s.suffix} />
                  </div>
                  <div className="text-[10px]" style={{ color: '#64748B' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Live Counter */}
            <div className="animate-fade-in flex justify-center lg:justify-start" style={{ animationDelay: '550ms', animationFillMode: 'both' }}>
              <LiveCounter />
            </div>
          </div>

          {/* RIGHT — Live Demo Dashboard */}
          <div className="relative w-full max-w-[640px] mx-auto lg:mx-0 order-2 animate-fade-in" style={{ animationDelay: '600ms', animationFillMode: 'both' }}>
            <QuantisHeroDemo />
          </div>
        </div>
      </div>
    </section>
  );
}
