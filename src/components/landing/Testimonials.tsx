import React from 'react';
import { Quote } from 'lucide-react';

const testimonials = [
  {
    quote: 'Quantis showed my LTV:CAC was 1.2x — I was scaling a money-losing machine. Restructured pricing before burning another $30K.',
    name: 'Oleg M.',
    role: 'SaaS Founder',
    initials: 'OM',
    result: 'Saved $30,000',
  },
  {
    quote: 'The stress map flagged my payroll ratio at 48% of revenue. Cut it to 32% and hit profitability in month 4.',
    name: 'Vlad K.',
    role: 'Restaurant Owner',
    initials: 'VK',
    result: '$6,400/mo saved',
  },
  {
    quote: 'Break-even at 22 months? The tool told me to renegotiate my lease first. Dropped it to 14 months.',
    name: 'Aleksandr T.',
    role: 'Real Estate Investor',
    initials: 'AT',
    result: '8 months faster ROI',
  },
  {
    quote: 'I ran 3 scenarios before launch. The conservative projection was dead accurate at month 6.',
    name: 'Andrew P.',
    role: 'E-commerce Founder',
    initials: 'AP',
    result: '$14K/mo revenue hit',
  },
  {
    quote: 'I use Quantis to pre-mortem every client pitch. The risk index catches what spreadsheets miss.',
    name: 'Mike S.',
    role: 'Business Consultant',
    initials: 'MS',
    result: '12 clients retained',
  },
  {
    quote: 'Quantis flagged my rent-to-revenue ratio at 34%. Industry median is 12%. I found a cheaper location and saved $2,800/mo.',
    name: 'Natasha R.',
    role: 'Yoga Studio Owner',
    initials: 'NR',
    result: '$2,800/mo saved',
  },
  {
    quote: 'The benchmark corridor showed my CAC was 3x the industry P75. Switched channels and cut acquisition cost from $145 to $38.',
    name: 'Daniel W.',
    role: 'D2C Founder',
    initials: 'DW',
    result: 'CAC cut by 74%',
  },
  {
    quote: 'Quantis told me my coffee shop would break even in 18 months — not 6 like my spreadsheet said. It was right. Glad I planned for it.',
    name: 'Carlos G.',
    role: 'Café Owner, Austin',
    initials: 'CG',
    result: 'Avoided cash crisis',
  },
  {
    quote: 'I was about to invest $85K into a gym. Quantis stress-test showed survival probability at 31%. I pivoted to a lighter model and saved my savings.',
    name: 'Priya K.',
    role: 'Fitness Entrepreneur',
    initials: 'PK',
    result: '$85K protected',
  },
  {
    quote: 'Ran the analysis for my client's franchise. Quantis caught a $4,200/mo hidden cost gap in their projections. That's why they pay me.',
    name: 'James L.',
    role: 'Franchise Advisor',
    initials: 'JL',
    result: '$4,200/mo gap found',
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
            Real results, in dollars
          </h2>
          <p className="text-base" style={{ color: 'var(--q-text-secondary)' }}>
            Founders and advisors who used Quantis before making financial decisions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map(t => (
            <div
              key={t.name}
              className="p-6 rounded-2xl flex flex-col justify-between"
              style={{ background: 'var(--q-bg-surface)', border: '1px solid var(--q-border-subtle)' }}
            >
              <div>
                <Quote className="w-5 h-5 mb-4 opacity-30" style={{ color: 'var(--q-accent-primary)' }} />
                <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--q-text-primary)' }}>
                  "{t.quote}"
                </p>
              </div>
              <div>
                {/* Dollar result badge */}
                <div
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold mb-4"
                  style={{ background: 'var(--q-accent-glow)', color: 'var(--q-accent-primary)' }}
                >
                  {t.result}
                </div>
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
            </div>
          ))}
        </div>

        <p className="text-center mt-10 text-xs" style={{ color: 'var(--q-text-tertiary)' }}>
          Used by: early-stage founders, startup advisors, lenders, and consultants across 50+ cities
        </p>
      </div>
    </section>
  );
}
