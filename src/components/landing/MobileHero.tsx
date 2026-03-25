import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, ArrowRight, Shield, Star, TrendingUp, AlertTriangle, Clock, DollarSign } from 'lucide-react';
import { trackCtaClick, trackAnalysisFunnel } from '@/lib/analytics';
import founderPortrait from '@/assets/founder-portrait.png';

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

  const handlePreMortem = () => {
    trackCtaClick('run_pre_mortem', 'hero_primary');
    trackAnalysisFunnel('started', { source: 'hero_cta' });
    navigate('/app');
  };

  const handleViewReport = () => {
    trackCtaClick('view_real_report', 'hero_secondary');
    navigate('/examples');
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

          {/* LEFT — Founder Portrait */}
          <div className="relative flex flex-col items-center lg:items-start order-2 lg:order-1">
            <div className="relative w-[280px] h-[340px] sm:w-[320px] sm:h-[400px] lg:w-[400px] lg:h-[500px] rounded-2xl overflow-hidden" style={{ boxShadow: '0 25px 60px -12px rgba(0,0,0,0.5)' }}>
              {/* Portrait image */}
              <img
                src={founderPortrait}
                alt="Bogdan Jeltov — Founder of AIWMC Quantis"
                className="w-full h-full object-cover object-top"
              />
              {/* Cinematic gradient overlay on bottom */}
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(to top, rgba(10,14,26,0.85) 0%, rgba(10,14,26,0.3) 40%, transparent 60%)',
              }} />
              {/* Overlaid quote */}
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                <p className="text-sm sm:text-base leading-relaxed italic" style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--q-font-body)' }}>
                  "Most tools help you present your idea nicely. I wanted the one that tells you if it survives."
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--q-accent-primary)' }}>
                  Bogdan Jeltov · Founder
                </p>
              </div>
            </div>
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
              Quantis runs a financial pre-mortem on your business model. It simulates
              1,000+ futures, flags fatal assumptions, and gives you a proceed/pivot/kill
              verdict in 90 seconds.
            </p>

            {/* CTA Row */}
            <div
              className="animate-fade-in flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
              style={{ animationDelay: '240ms', animationFillMode: 'both' }}
            >
              <Button
                onClick={handlePreMortem}
                size="lg"
                className="gap-2 text-base font-semibold px-7 h-[52px] min-w-[260px] transition-transform hover:scale-[1.02]"
                style={{ background: 'var(--q-gradient-accent)' }}
                data-event-id="run_pre_mortem_click"
              >
                <Zap className="w-5 h-5" />
                Run my 90-second pre-mortem →
              </Button>
              <Button
                onClick={handleViewReport}
                variant="ghost"
                size="lg"
                className="gap-2 text-base font-medium px-7 h-[52px]"
                style={{ color: 'var(--q-text-secondary)', border: '1px solid var(--q-border-default)' }}
              >
                View a real report →
              </Button>
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
          </div>
        </div>

        {/* INSTRUMENT PANEL — below the split */}
        <div
          className="animate-fade-in relative -mt-4 mb-12 max-w-4xl mx-auto"
          style={{ animationDelay: '450ms', animationFillMode: 'both' }}
        >
          <div
            className="rounded-2xl p-5 sm:p-6"
            style={{
              background: 'var(--q-bg-surface)',
              border: '1px solid var(--q-border-subtle)',
              boxShadow: '0 20px 50px -15px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* Label */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--q-text-tertiary)' }}>
                Live Example: Specialty coffee shop in Austin, TX
              </span>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--q-status-red)' }}
              >
                HIGH RISK
              </span>
            </div>

            {/* 4 metric cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {metrics.map(m => (
                <div
                  key={m.label}
                  className="p-4 rounded-xl text-center"
                  style={{ background: 'var(--q-bg-elevated)', border: '1px solid var(--q-border-subtle)' }}
                >
                  <m.icon className="w-4 h-4 mx-auto mb-2" style={{ color: statusColor[m.status] }} />
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--q-text-tertiary)' }}>{m.label}</p>
                  <p
                    className="text-lg sm:text-xl font-bold tabular-nums"
                    style={{ color: statusColor[m.status], fontFamily: 'var(--q-font-mono, monospace)' }}
                  >
                    {m.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
