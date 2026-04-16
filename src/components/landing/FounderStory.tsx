import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Zap } from 'lucide-react';
import founderPortrait from '@/assets/founder-portrait.png';

const testimonials = [
  {
    quote: 'Found 3 fatal assumptions in my restaurant concept before spending $40K on a lease.',
    name: 'Marcus T.',
    role: 'Restaurant Founder',
    city: 'Denver, CO',
  },
  {
    quote: 'The Monte Carlo simulation showed my SaaS had a 78% survival rate — gave me the confidence to quit my job.',
    name: 'Priya K.',
    role: 'SaaS Founder',
    city: 'Austin, TX',
  },
  {
    quote: 'My business plan looked great until Quantis showed my runway was 5 months short of break-even. Saved me $23K.',
    name: 'Alex M.',
    role: 'E-commerce Founder',
    city: 'Portland, OR',
  },
];

const promises = [
  'No hype numbers without confidence attached.',
  'We log every assumption and show where we adjust it.',
  "If we can't estimate something responsibly, we say so.",
];

export function FounderStory() {
  return (
    <section className="py-20 md:py-28" style={{ background: 'var(--q-bg-elevated)' }}>
      <div className="container max-w-5xl mx-auto px-4 sm:px-6">
        {/* Testimonials — replace self-quote */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-[9px] p-5" style={{
              background: 'var(--q-bg-surface)',
              border: '1px solid var(--q-border-default)',
            }}>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--q-text-primary)', fontFamily: 'var(--q-font-body)' }}>
                "{t.quote}"
              </p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: 'var(--q-accent-glow)', color: 'var(--q-accent-primary)' }}>
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="text-[12px] font-semibold" style={{ color: 'var(--q-text-primary)' }}>{t.name}</div>
                  <div className="text-[10px]" style={{ color: 'var(--q-text-tertiary)' }}>{t.role} · {t.city}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[280px_1fr] gap-10 lg:gap-16 items-start">
          {/* Portrait */}
          <div className="flex justify-center md:justify-start">
            <div
              className="w-[180px] h-[220px] lg:w-[260px] lg:h-[320px] rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 20px 50px -15px rgba(0,0,0,0.4)' }}
            >
              <img
                src={founderPortrait}
                alt="Bogdan Jeltov"
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>

          {/* Story */}
          <div className="text-center md:text-left">
            <p className="text-sm font-semibold tracking-wider uppercase mb-4" style={{ color: 'var(--q-accent-primary)' }}>
              Why I Built Quantis
            </p>

            <div className="space-y-4 mb-8">
              <p className="text-lg leading-relaxed" style={{ color: 'var(--q-text-primary)', fontFamily: 'var(--q-font-body)' }}>
                I watched founders raise on pretty decks, then crash when reality arrived.
                They had passion, drive, even customers — but no one told them the financial truth early enough.
              </p>
              <p className="text-lg leading-relaxed" style={{ color: 'var(--q-text-primary)', fontFamily: 'var(--q-font-body)' }}>
                Quantis is the senior FP&A partner I wished they had — one that tells you the truth, even when it hurts.
              </p>
            </div>

            {/* My promise */}
            <p className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--q-text-primary)' }}>
              My promise:
            </p>
            <ul className="space-y-3 mb-8">
              {promises.map((p) => (
                <li key={p} className="flex items-start gap-3 text-left">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--aiwmc-green)' }} />
                  <span className="text-base leading-relaxed" style={{ color: 'var(--q-text-secondary)' }}>{p}</span>
                </li>
              ))}
            </ul>

            <div className="flex gap-4 justify-center md:justify-start">
              <Link to="/app">
                <Button size="lg" className="font-bold transition-transform hover:scale-[1.02]" style={{ background: 'var(--q-gradient-accent)', borderRadius: '6px' }}>
                  <Zap className="w-4 h-4 mr-2" />
                  Validate My Business Idea — Free
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Community trust bar */}
        <div className="mt-16 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--q-text-disabled)', letterSpacing: '0.1em' }}>
            Used by founders from these communities
          </p>
          <div className="flex flex-wrap justify-center gap-6 opacity-50">
            {['Product Hunt', 'Indie Hackers', 'Y Combinator', 'r/entrepreneur'].map(name => (
              <span key={name} className="text-[13px] font-semibold" style={{ color: 'var(--q-text-tertiary)' }}>{name}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
