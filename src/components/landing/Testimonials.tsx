import React from 'react';
import { Quote } from 'lucide-react';

const testimonials = [
  {
    quote: 'Quantis showed my LTV:CAC was 1.2x — I was scaling a money-losing machine. Restructured pricing before burning another $30K.',
    name: 'Oleg M.',
    role: 'SaaS Founder',
    initials: 'OM',
  },
  {
    quote: 'The stress map flagged my payroll ratio at 48% of revenue. Cut it to 32% and hit profitability in month 4.',
    name: 'Vlad K.',
    role: 'Restaurant Owner',
    initials: 'VK',
  },
  {
    quote: 'Break-even at 22 months? The tool told me to renegotiate my lease first. Dropped it to 14 months.',
    name: 'Aleksandr T.',
    role: 'Real Estate Investor',
    initials: 'AT',
  },
  {
    quote: 'I ran 3 scenarios before launch. The conservative projection was dead accurate at month 6.',
    name: 'Andrew P.',
    role: 'E-commerce Founder',
    initials: 'AP',
  },
  {
    quote: 'I use Quantis to pre-mortem every client pitch. The risk index catches what spreadsheets miss.',
    name: 'Mike S.',
    role: 'Business Consultant',
    initials: 'MS',
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
