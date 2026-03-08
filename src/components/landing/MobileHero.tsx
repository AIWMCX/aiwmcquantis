import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, MapPin, Lightbulb, ArrowRight, BarChart3, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { trackCtaClick, trackEvent, trackAnalysisFunnel } from '@/lib/analytics';
import { LiveCounter } from './LiveCounter';

const VALUE_BADGES = [
  { icon: BarChart3, text: 'Revenue projections' },
  { icon: AlertTriangle, text: 'Risk flags identified' },
  { icon: CheckCircle2, text: 'Action plan included' },
];

export function MobileHero() {
  const navigate = useNavigate();
  const [quickIdea, setQuickIdea] = useState('');
  const [quickLocation, setQuickLocation] = useState('');

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickIdea.trim().length < 5 || quickLocation.trim().length < 2) return;

    trackEvent('hero_quick_submit', { idea_length: quickIdea.length, location: quickLocation });
    trackCtaClick('see_preview_numbers', 'hero_form');
    trackAnalysisFunnel('started', { source: 'hero_form', idea_length: quickIdea.length });

    sessionStorage.setItem('hero_prefill', JSON.stringify({
      idea: quickIdea.trim(),
      location: quickLocation.trim()
    }));
    navigate('/app');
  };

  const isFormValid = quickIdea.trim().length >= 5 && quickLocation.trim().length >= 2;

  return (
    <section id="main-content" className="relative overflow-hidden" aria-label="Hero">
      {/* Gradient background using design tokens */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{ background: 'var(--q-gradient-hero)' }} />
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl animate-pulse bg-[var(--q-accent-glow)]" />
        <div className="absolute top-40 right-10 w-96 h-96 rounded-full blur-3xl animate-pulse bg-[var(--q-accent-glow)] opacity-50" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-1/4 w-64 h-64 rounded-full blur-3xl animate-pulse bg-[var(--q-accent-glow)] opacity-30" style={{ animationDelay: '2s' }} />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        />
      </div>

      <div className="relative container max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-16">
        <div className="text-center max-w-4xl mx-auto">

          {/* Live Counter */}
          <div className="flex justify-center mb-4 md:mb-6">
            <LiveCounter />
          </div>

          {/* Animated metric preview */}
          <div className="q-metric-reveal flex justify-center mb-4">
            <span className="text-metric-md text-[var(--q-status-green)] bg-[var(--q-status-green-bg)] border border-[var(--q-status-green-border)] rounded-full px-4 py-1.5">
              $14,200/mo
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-display text-[var(--q-text-primary)] mb-3 leading-tight">
            Find Out Where Your Business Model Breaks
            <span className="text-[var(--q-accent-primary)] block mt-1">Before You Spend a Dollar</span>
          </h1>

          {/* Core promise */}
          <p className="text-body text-[var(--q-text-secondary)] font-medium mb-2 md:mb-3 max-w-2xl mx-auto">
            Enter your idea. Get a full financial stress-test with risk map, cash-flow projection, and scenario analysis &mdash; free, in under 3 minutes.
          </p>

          {/* Supporting bullets */}
          <ul className="text-body-sm text-[var(--q-text-secondary)] space-y-1.5 mb-4 md:mb-6 max-w-xl mx-auto text-left">
            <li className="flex items-start gap-2"><span className="text-[var(--q-accent-primary)] font-bold">&#8226;</span> GPT + Gemini dual-verified financial projections.</li>
            <li className="flex items-start gap-2"><span className="text-[var(--q-accent-primary)] font-bold">&#8226;</span> See which assumptions break under stress scenarios.</li>
            <li className="flex items-start gap-2"><span className="text-[var(--q-accent-primary)] font-bold">&#8226;</span> Click any number to see the formula and benchmark behind it.</li>
          </ul>

          {/* FORM */}
          <form
            onSubmit={handleQuickSubmit}
            className="q-card max-w-xl mx-auto p-4 sm:p-6 mb-4 md:mb-6"
            style={{ boxShadow: 'var(--q-shadow-glow-blue)' }}
          >
            <div className="space-y-3">
              <div className="relative">
                <Lightbulb className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--q-text-tertiary)]" />
                <Input
                  type="text"
                  placeholder="Your business idea (e.g., Coffee shop with remote work focus)"
                  value={quickIdea}
                  onChange={(e) => setQuickIdea(e.target.value)}
                  className="pl-10 h-12 text-base bg-[var(--q-bg-input)] border-[var(--q-border-default)]"
                  maxLength={200}
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--q-text-tertiary)]" />
                <Input
                  type="text"
                  placeholder="Location (e.g., Denver, Colorado)"
                  value={quickLocation}
                  onChange={(e) => setQuickLocation(e.target.value)}
                  className="pl-10 h-12 text-base bg-[var(--q-bg-input)] border-[var(--q-border-default)]"
                  maxLength={100}
                />
              </div>
              <Button
                type="submit"
                disabled={!isFormValid}
                size="lg"
                data-event-id="start_validation_click"
                className="w-full gap-2 text-base sm:text-lg py-6 min-h-[56px] transition-all duration-300 hover:scale-[1.02]"
                style={{ background: 'var(--q-gradient-accent)' }}
              >
                <Zap className="w-5 h-5" />
                Run Free Validation
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>

          {/* Friction reducers */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-[var(--q-text-secondary)] mb-4 md:mb-6">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-[var(--q-status-green)]" /> No credit card</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-[var(--q-status-green)]" /> Results in under 3 min</span>
            <Link to="/risk-gallery" className="flex items-center gap-1 text-[var(--q-accent-primary)] hover:underline">
              <BarChart3 className="w-3.5 h-3.5" /> See example scenarios
            </Link>
          </div>

          {/* Value badges */}
          <div className="hidden md:block">
            <p className="text-body-sm text-[var(--q-text-secondary)] mb-3">
              Built for early-stage founders, consultants, and indie builders
              validating ideas before investing time and money.
            </p>
            <div className="q-stagger flex flex-wrap items-center justify-center gap-3">
              {VALUE_BADGES.map(({ icon: Icon, text }, i) => (
                <div
                  key={text}
                  className="q-metric-reveal inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--q-accent-glow)] border border-[var(--q-accent-primary)]/20 text-sm font-semibold text-[var(--q-text-primary)]"
                  style={{ '--index': i } as React.CSSProperties}
                >
                  <Icon className="w-4 h-4 text-[var(--q-accent-primary)]" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
