import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { withUtm } from '@/lib/utm';
import { trackCtaClick } from '@/lib/analytics';
import founderPortrait from '@/assets/founder-portrait.png';

/**
 * BuiltByFounder
 *
 * Tight merge of the legacy FounderStory + OpenTheHood sections.
 * One scroll, one CTA. Founder portrait + brutal-honesty promise + the
 * three engineering pillars that justify the verdict.
 *
 * Memory rule: landing CTAs are text-only (no icons).
 */

const PROMISES = [
  'No hype numbers without confidence attached.',
  'Every assumption is logged and editable.',
  "If we can't estimate something responsibly, we say so.",
] as const;

const PILLARS = [
  {
    label: 'Deterministic engine',
    detail: 'decimal.js math. Same idea, same numbers — every run.',
  },
  {
    label: 'Dual-AI consensus',
    detail: 'Two independent models must agree before we ship a verdict.',
  },
  {
    label: '95,500 benchmarks',
    detail: 'BLS, Census, IBISWorld — every projection cites its source.',
  },
] as const;

export function BuiltByFounder() {
  return (
    <section
      aria-labelledby="built-by-founder-heading"
      className="py-16 md:py-20"
      style={{ background: 'var(--q-bg-elevated, hsl(var(--muted) / 0.4))' }}
    >
      <div className="container max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[240px_1fr] gap-8 lg:gap-12 items-start">
          {/* Portrait */}
          <div className="flex justify-center md:justify-start">
            <div
              className="w-[160px] h-[200px] lg:w-[220px] lg:h-[270px] rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 20px 50px -15px rgba(0,0,0,0.35)' }}
            >
              <img
                src={founderPortrait}
                alt="Bogdan Beltov, founder of AIWMC Quantis"
                width={220}
                height={270}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>

          {/* Copy */}
          <div className="text-center md:text-left">
            <p
              className="text-xs font-semibold tracking-wider uppercase mb-3"
              style={{ color: 'var(--q-accent-primary, hsl(var(--primary)))' }}
            >
              Built by Bogdan Beltov · Why this exists
            </p>

            <h2
              id="built-by-founder-heading"
              className="font-bold leading-tight mb-3"
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                color: 'var(--q-text-primary, hsl(var(--foreground)))',
                letterSpacing: '-0.02em',
              }}
            >
              I watched founders raise on pretty decks, then crash when reality arrived.
            </h2>
            <p
              className="text-base md:text-lg leading-relaxed mb-6"
              style={{ color: 'var(--q-text-secondary, hsl(var(--muted-foreground)))' }}
            >
              Quantis is the senior FP&amp;A partner I wish they'd had — one that tells you the truth, even when it hurts.
              No filler, no upsell-disguised-as-insight.
            </p>

            {/* Promises */}
            <ul className="space-y-2 mb-6 max-w-xl mx-auto md:mx-0">
              {PROMISES.map(p => (
                <li key={p} className="flex items-start gap-2.5 text-left">
                  <CheckCircle2
                    className="w-4 h-4 mt-0.5 shrink-0"
                    style={{ color: 'var(--q-status-success, #16a34a)' }}
                    aria-hidden="true"
                  />
                  <span className="text-sm" style={{ color: 'var(--q-text-secondary, hsl(var(--foreground) / 0.8))' }}>
                    {p}
                  </span>
                </li>
              ))}
            </ul>

            {/* Three pillars — why the verdict is trustworthy */}
            <div className="grid sm:grid-cols-3 gap-2.5 mb-6">
              {PILLARS.map(pillar => (
                <div
                  key={pillar.label}
                  className="rounded-xl p-3 text-left border"
                  style={{
                    background: 'var(--q-bg-base, hsl(var(--background)))',
                    borderColor: 'var(--q-border-default, hsl(var(--border)))',
                  }}
                >
                  <p
                    className="text-[11px] font-bold uppercase tracking-wider mb-1"
                    style={{ color: 'var(--q-accent-primary, hsl(var(--primary)))' }}
                  >
                    {pillar.label}
                  </p>
                  <p
                    className="text-xs leading-snug"
                    style={{ color: 'var(--q-text-secondary, hsl(var(--muted-foreground)))' }}
                  >
                    {pillar.detail}
                  </p>
                </div>
              ))}
            </div>

            <Link
              to={withUtm('/app', { source: 'homepage', campaign: 'built_by_founder' })}
              onClick={() => trackCtaClick('built_by_founder_cta', 'built_by_founder')}
            >
              <Button size="lg" className="min-h-[52px] px-7 text-base font-semibold">
                Run my pre-mortem — free
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
