import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Zap } from 'lucide-react';
import founderPortrait from '@/assets/founder-portrait.png';

const promises = [
  'No hype numbers without confidence attached.',
  'We log every assumption and show where we adjust it.',
  "If we can't estimate something responsibly, we say so.",
];

export function FounderStory() {
  return (
    <section className="py-20 md:py-28" style={{ background: 'var(--q-bg-elevated)' }}>
      <div className="container max-w-5xl mx-auto px-4 sm:px-6">
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
              {promises.map(p => (
                <li key={p} className="flex items-start gap-3 justify-center md:justify-start">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--q-status-green)' }} />
                  <span className="text-sm" style={{ color: 'var(--q-text-secondary)' }}>{p}</span>
                </li>
              ))}
            </ul>

            <Link to="/app">
              <Button
                size="lg"
                className="gap-2 text-base font-semibold px-7 h-[52px] transition-transform hover:scale-[1.02]"
                style={{ background: 'var(--q-gradient-accent)' }}
              >
                <Zap className="w-5 h-5" />
                Run your pre-mortem with me now →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
