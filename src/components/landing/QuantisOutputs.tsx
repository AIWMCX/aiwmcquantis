import React from 'react';
import { BarChart3, Skull, Receipt, ArrowRight } from 'lucide-react';

const outputs = [
  {
    icon: BarChart3,
    title: 'BI Report',
    description: 'Full 36-month P&L, unit economics, benchmark percentiles.',
    bullet: 'See if your model ever pays back — and why.',
    color: 'var(--q-chart-1)',
  },
  {
    icon: Skull,
    title: 'Pre-Mortem Analysis',
    description: 'We assume your business failed in 18 months, then explain how.',
    bullet: 'Top 5 failure stories with probability and mitigation steps.',
    color: 'var(--q-status-red)',
  },
  {
    icon: Receipt,
    title: 'Invoice Capacity Check',
    description: 'Connect your invoices. See if your model can support that volume and margin.',
    bullet: 'Revenue vs projection, margin health, payment risk.',
    color: 'var(--q-status-green)',
  },
];

export function QuantisOutputs() {
  return (
    <section className="py-20 md:py-28" style={{ background: 'var(--q-bg-surface)' }}>
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-sm font-semibold tracking-wider uppercase mb-3" style={{ color: 'var(--q-accent-primary)' }}>
            What Quantis Actually Does
          </p>
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: 'var(--q-text-primary)', fontFamily: 'var(--q-font-heading)' }}
          >
            Three engines. One verdict.
          </h2>
          <p style={{ color: 'var(--q-text-secondary)' }}>
            Every analysis runs all three — you get the full picture, not a fragment.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {outputs.map(o => (
            <div
              key={o.title}
              className="group relative p-7 rounded-2xl transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'var(--q-bg-elevated)',
                border: '1px solid var(--q-border-subtle)',
                boxShadow: 'var(--q-shadow-card)',
              }}
            >
              {/* Glow accent top line */}
              <div
                className="absolute top-0 left-6 right-6 h-[2px] rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ background: o.color }}
              />

              <div className="p-3 rounded-xl w-fit mb-5" style={{ background: `color-mix(in srgb, ${o.color} 12%, transparent)` }}>
                <o.icon className="w-6 h-6" style={{ color: o.color }} />
              </div>

              <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--q-text-primary)', fontFamily: 'var(--q-font-heading)' }}>
                {o.title}
              </h3>

              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--q-text-secondary)' }}>
                {o.description}
              </p>

              <p className="text-sm font-medium" style={{ color: 'var(--q-text-primary)' }}>
                → {o.bullet}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
