import React from 'react';
import { Quote } from 'lucide-react';

const testimonials = [
  {
    quote: 'This is the first tool that argues with my assumptions instead of nodding along.',
    name: 'Sarah K.',
    role: 'Startup Advisor, SCORE',
    initials: 'SK',
  },
  {
    quote: "I ran my food truck idea through Quantis and it showed me I'd burn through runway in 6 months. Saved me $40K.",
    name: 'Marcus D.',
    role: 'First-time Founder',
    initials: 'MD',
  },
  {
    quote: 'The pre-mortem report is what I wish every pitch deck included. It shows founders actually understand their risks.',
    name: 'Priya R.',
    role: 'Angel Investor',
    initials: 'PR',
  },
  {
    quote: 'We use it to validate client ideas before building financial models. Cuts our scoping time in half.',
    name: 'James L.',
    role: 'Business Consultant',
    initials: 'JL',
  },
];

export function Testimonials() {
  return (
    <section className="py-20 md:py-28" style={{ background: 'var(--q-bg-elevated)' }}>
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-sm font-semibold tracking-wider uppercase mb-3" style={{ color: 'var(--q-accent-primary)' }}>
            Vetted by Operators
          </p>
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: 'var(--q-text-primary)', fontFamily: 'var(--q-font-heading)' }}
          >
            What founders and advisors say
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map(t => (
            <div
              key={t.name}
              className="p-6 rounded-2xl"
              style={{ background: 'var(--q-bg-surface)', border: '1px solid var(--q-border-subtle)' }}
            >
              <Quote className="w-5 h-5 mb-4 opacity-30" style={{ color: 'var(--q-accent-primary)' }} />
              <p className="text-base leading-relaxed mb-5" style={{ color: 'var(--q-text-primary)' }}>
                "{t.quote}"
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--q-accent-glow)', color: 'var(--q-accent-primary)' }}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--q-text-primary)' }}>{t.name}</p>
                  <p className="text-xs" style={{ color: 'var(--q-text-tertiary)' }}>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center mt-10 text-xs" style={{ color: 'var(--q-text-tertiary)' }}>
          Used by: early-stage founders, startup advisors, lenders, and consultants
        </p>
      </div>
    </section>
  );
}
