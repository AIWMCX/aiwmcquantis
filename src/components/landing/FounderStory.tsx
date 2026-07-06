import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Linkedin } from 'lucide-react';
import founderPortrait from '@/assets/founder-portrait.png';
import { GlassCard, Reveal, SectionHeader } from '@/components/ui/glass-card';

const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

const invariants = [
  { code: 'I-1', text: 'the deterministic engine always runs first' },
  { code: 'I-2', text: 'AI never originates a number' },
  { code: 'I-3', text: 'we log every adjustment and show it' },
];

export function FounderStory() {
  return (
    <section aria-labelledby="why-i-built-quantis" className="aiwmc-section-wash py-20 md:py-28">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHeader
          eyebrow="Why I built Quantis"
          title="A senior FP&A partner — the one I wished those founders had."
          subtitle="I watched founders raise on pretty decks, then crash when reality arrived. They had passion, drive, even customers — but no one told them the financial truth early enough."
        />

        <div className="mt-14 grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)] gap-8 md:gap-12 items-start">
          {/* Portrait — kept per SoW option (a) "real founder portrait humanizes",
              no more device-frame product screenshot */}
          <Reveal>
            <div
              className="w-full max-w-[220px] mx-auto md:max-w-none rounded-2xl overflow-hidden"
              style={{
                aspectRatio: '4 / 5',
                border: '1px solid rgba(148,163,255,0.18)',
                boxShadow: '0 24px 60px -18px rgba(2,6,23,0.65)',
              }}
            >
              <img
                src={founderPortrait}
                alt="Bogdan Jeltov, founder of AIWMC Quantis"
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
            </div>
            <a
              href="https://www.linkedin.com/in/bogdan-jeltov/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] hover:underline"
              style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}
            >
              <Linkedin className="w-3.5 h-3.5" />
              Bogdan Jeltov · founder
            </a>
          </Reveal>

          {/* Right column */}
          <div className="space-y-8">
            {/* Constitutional invariants — DM Mono per SoW */}
            <GlassCard glow="violet" className="p-6 md:p-7">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-4"
                style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}
              >
                Constitutional invariants
              </p>
              <ul className="space-y-3">
                {invariants.map((inv) => (
                  <li key={inv.code} className="flex items-start gap-3">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-md flex-shrink-0"
                      style={{
                        ...MONO,
                        background: 'rgba(148,163,255,0.14)',
                        color: 'var(--aiwmc-grad-violet)',
                      }}
                    >
                      {inv.code}
                    </span>
                    <span className="text-sm leading-relaxed" style={{ ...MONO, color: 'hsl(var(--foreground))' }}>
                      {inv.text}
                    </span>
                  </li>
                ))}
              </ul>
            </GlassCard>

            <Reveal delay={80}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Link to="/app">
                  <Button size="lg" className="gap-2 h-[52px] px-7 text-base font-semibold">
                    Run your pre-mortem with me now
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <span className="text-xs uppercase tracking-[0.14em]" style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}>
                  &lt; 90 sec · no signup
                </span>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
