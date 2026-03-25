import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Pencil, Hexagon, ShieldCheck, ArrowRight } from 'lucide-react';

const steps = [
  {
    num: '01',
    icon: Pencil,
    title: 'Tell us what you know',
    body: 'Industry, city, a few numbers. We fill in the gaps from 1,000+ benchmarks.',
  },
  {
    num: '02',
    icon: Hexagon,
    title: 'Quantis simulates 1,000 futures',
    body: 'Dual-AI checks, risk stress-tests, and pre-mortem engine run in the background.',
    badges: ['GPT-4o mini', 'Gemini'],
  },
  {
    num: '03',
    icon: ShieldCheck,
    title: 'You get an investor-grade dossier',
    body: 'Verdict, P&L, risk matrix, launch plan, and invoice capacity in one PDF + dashboard.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 md:py-28" style={{ background: 'var(--q-bg-base)' }}>
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold tracking-wider uppercase mb-3" style={{ color: 'var(--q-accent-primary)' }}>
            How It Works
          </p>
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: 'var(--q-text-primary)', fontFamily: 'var(--q-font-heading)' }}
          >
            90 seconds. Full clarity.
          </h2>
          <p style={{ color: 'var(--q-text-secondary)' }}>
            No spreadsheets, no guesswork — just verified financial intelligence.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Dashed connector (desktop) */}
          <svg className="hidden md:block absolute top-16 left-0 w-full h-1 pointer-events-none" style={{ zIndex: 0 }}>
            <line x1="33%" y1="0" x2="66%" y2="0" stroke="var(--q-border-default)" strokeWidth="2" strokeDasharray="8 6" />
          </svg>

          {steps.map(s => (
            <div
              key={s.num}
              className="relative z-10 p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'var(--q-bg-surface)',
                border: '1px solid var(--q-border-subtle)',
                boxShadow: 'var(--q-shadow-card)',
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold" style={{ color: 'var(--q-accent-primary)', fontFamily: 'var(--q-font-heading)' }}>
                  {s.num}
                </span>
                <div className="p-2 rounded-xl" style={{ background: 'var(--q-accent-glow)' }}>
                  <s.icon className="w-5 h-5" style={{ color: 'var(--q-accent-primary)' }} />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--q-text-primary)' }}>{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--q-text-secondary)' }}>{s.body}</p>

              {s.badges && (
                <div className="flex gap-2 mt-4">
                  {s.badges.map(b => (
                    <span
                      key={b}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full"
                      style={{ background: 'var(--q-status-ai-bg)', color: 'var(--q-status-ai)', border: '1px solid var(--q-status-ai-border)' }}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-14">
          <Link to="/app">
            <Button
              size="lg"
              className="gap-2 h-[52px] px-8 text-base font-semibold"
              style={{ background: 'var(--q-gradient-accent)', border: 'none' }}
            >
              Run my first analysis free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
