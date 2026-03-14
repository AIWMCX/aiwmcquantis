import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, ArrowRight, Shield, Star } from 'lucide-react';
import { trackCtaClick, trackEvent, trackAnalysisFunnel } from '@/lib/analytics';

export function MobileHero() {
  const navigate = useNavigate();

  const handleStressTest = () => {
    trackCtaClick('run_free_stress_test', 'hero_primary');
    trackAnalysisFunnel('started', { source: 'hero_cta' });
    navigate('/app');
  };

  const handleSampleReport = () => {
    trackCtaClick('see_sample_report', 'hero_secondary');
    navigate('/examples');
  };

  return (
    <section className="relative overflow-hidden" aria-label="Hero" style={{ minHeight: '640px' }}>
      {/* Background: gradient + grid lines + center glow */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{ background: 'var(--q-gradient-hero)' }} />
        {/* SVG grid lines at 4% opacity */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h80M0 0v80' stroke='%23000' stroke-width='0.5' fill='none'/%3E%3C/svg%3E")`,
            backgroundSize: '80px 80px',
          }}
        />
        {/* Center radial glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(ellipse, var(--q-accent-primary) 0%, transparent 70%)',
            opacity: 0.03,
          }}
        />
      </div>

      <div className="relative flex flex-col items-center justify-center min-h-[640px] md:min-h-[calc(100vh-64px)] px-4 sm:px-6 pt-10 pb-4 md:pt-16 md:pb-8">
        <div className="text-center max-w-[760px] mx-auto space-y-6 md:space-y-8">

          {/* Eyebrow pill */}
          <div className="flex justify-center animate-fade-in" style={{ animationFillMode: 'both' }}>
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-[var(--q-status-ai-bg)] border border-[var(--q-status-ai-border)] text-[var(--q-status-ai)]">
              <Zap className="w-3.5 h-3.5" />
              Pre-Mortem Engine &middot; Dual-AI Verified
            </span>
          </div>

          {/* Headline */}
          <h1
            className="animate-fade-in text-[clamp(2rem,5.5vw,3.5rem)] leading-[1.1] font-bold text-[var(--q-text-primary)]"
            style={{ fontFamily: 'var(--q-font-heading)', animationDelay: '80ms', animationFillMode: 'both' }}
          >
            Find out exactly where{' '}
            <br className="hidden sm:block" />
            your business breaks —{' '}
            <br className="hidden sm:block" />
            before you spend a dollar.
          </h1>

          {/* Subheadline */}
          <p
            className="animate-fade-in text-base md:text-lg text-[var(--q-text-secondary)] max-w-[580px] mx-auto leading-relaxed"
            style={{ fontFamily: 'var(--q-font-body)', animationDelay: '160ms', animationFillMode: 'both' }}
          >
            Enter your idea. Get a precision stress-test with risk map,
            3-year projections, and the scenarios where your business
            survives — and doesn't. In 90 seconds.
          </p>

          {/* CTA Row */}
          <div
            className="animate-fade-in flex flex-col sm:flex-row items-center justify-center gap-3"
            style={{ animationDelay: '240ms', animationFillMode: 'both' }}
          >
            <Button
              onClick={handleStressTest}
              size="lg"
              className="gap-2 text-base font-semibold px-7 h-[52px] min-w-[240px] transition-transform hover:scale-[1.02]"
              style={{ background: 'var(--q-gradient-accent)' }}
              data-event-id="start_validation_click"
            >
              <Zap className="w-5 h-5" />
              Run Free Stress-Test
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleSampleReport}
              variant="ghost"
              size="lg"
              className="gap-2 text-base font-medium px-7 h-[52px] text-[var(--q-text-secondary)] hover:text-[var(--q-text-primary)] border border-[var(--q-border-default)]"
            >
              See Sample Report
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Caption below CTAs */}
          <p
            className="animate-fade-in text-xs text-[var(--q-text-tertiary)]"
            style={{ animationDelay: '320ms', animationFillMode: 'both' }}
          >
            No credit card &middot; Free forever for one analysis &middot; 90 seconds
          </p>

          {/* Social proof row */}
          <div
            className="animate-fade-in flex flex-wrap items-center justify-center gap-3 md:gap-5"
            style={{ animationDelay: '400ms', animationFillMode: 'both' }}
          >
            <span className="flex items-center gap-1.5 text-xs md:text-sm text-[var(--q-text-secondary)]">
              <span className="text-[var(--q-status-yellow)]">
                <Star className="w-3.5 h-3.5 fill-current" />
              </span>
              4.9/5 from 847 founders
            </span>
            <span className="hidden md:block w-px h-4 bg-[var(--q-border-default)]" />
            <span className="flex items-center gap-1.5 text-xs md:text-sm text-[var(--q-text-secondary)]">
              Featured on Product Hunt
            </span>
            <span className="hidden md:block w-px h-4 bg-[var(--q-border-default)]" />
            <span className="flex items-center gap-1.5 text-xs md:text-sm text-[var(--q-text-secondary)]">
              <Shield className="w-3.5 h-3.5" />
              SOC 2 Compliant
            </span>
          </div>
        </div>

        {/* Hero preview — truncated product mockup */}
        <div
          className="animate-fade-in relative mt-8 md:mt-12 w-full max-w-[720px] mx-auto"
          style={{ animationDelay: '500ms', animationFillMode: 'both' }}
        >
          <div
            className="rounded-t-[var(--q-radius-lg)] border border-b-0 border-[var(--q-border-default)] bg-[var(--q-bg-surface)] p-4 sm:p-6 overflow-hidden"
            style={{ boxShadow: 'var(--q-shadow-elevated)' }}
          >
            {/* Simulated KPI strip */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Break-Even', value: 'Month 7', color: 'var(--q-status-green)' },
                { label: 'Revenue M12', value: '$14,200', color: 'var(--q-chart-1)' },
                { label: 'Cash Runway', value: '18 mo', color: 'var(--q-accent-primary)' },
                { label: 'LTV:CAC', value: '4.2x', color: 'var(--q-status-green)' },
              ].map(kpi => (
                <div key={kpi.label} className="text-center p-2 rounded-[var(--q-radius-md)] bg-[var(--q-bg-elevated)]">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--q-text-tertiary)]">{kpi.label}</p>
                  <p className="text-sm md:text-base font-bold tabular-nums" style={{ color: kpi.color, fontFamily: 'var(--q-font-mono, JetBrains Mono, monospace)' }}>
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Simulated stress map top */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'MARKET', score: 78 },
                { label: 'MARGIN', score: 65 },
              ].map(block => (
                <div key={block.label} className="p-3 rounded-[var(--q-radius-md)] bg-[var(--q-bg-elevated)] border border-[var(--q-border-subtle)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--q-text-tertiary)]">{block.label}</span>
                    <span className="text-xs font-bold tabular-nums text-[var(--q-status-green)]" style={{ fontFamily: 'var(--q-font-mono, monospace)' }}>{block.score}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--q-bg-overlay)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--q-status-green)] transition-all duration-1000"
                      style={{ width: `${block.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fade gradient at bottom — scroll incentive */}
          <div
            className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, transparent, var(--q-bg-base))',
            }}
          />
        </div>
      </div>
    </section>
  );
}
