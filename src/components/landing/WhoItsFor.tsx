import React from 'react';
import { Rocket, BarChart3, Search } from 'lucide-react';

const PERSONAS = [
  {
    icon: Rocket,
    title: 'Founders',
    description: 'Validate ideas before burning runway.',
    bullets: [
      'Know if your model survives revenue shocks before you build.',
      'See which assumptions are fragile before talking to investors.',
      'Get a clear go / no-go signal based on real benchmarks.',
    ],
  },
  {
    icon: BarChart3,
    title: 'Operators',
    description: 'Test expansion, pricing, and hiring decisions.',
    bullets: [
      'Stress-test pricing changes before rolling them out.',
      'Model the impact of new hires on your runway.',
      'Find the safest levers to pull when growth stalls.',
    ],
  },
  {
    icon: Search,
    title: 'Investors & Advisors',
    description: 'Sanity-check models before writing checks.',
    bullets: [
      'Spot fragile assumptions in pitch decks instantly.',
      "Compare a founder's projections against industry benchmarks.",
      'Generate risk reports to share with your portfolio.',
    ],
  },
];

export function WhoItsFor() {
  return (
    <section id="who-its-for" className="py-16 md:py-24 bg-muted/30">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built for Serious Founders and Operators
          </h2>
          <p className="text-lg text-muted-foreground">
            Whether you're validating a new idea, scaling an existing business, or evaluating a deal — Quantis gives you the financial truth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PERSONAS.map(({ icon: Icon, title, description, bullets }) => (
            <div
              key={title}
              className="p-6 rounded-2xl border border-border bg-card hover:border-primary/20 transition-colors"
            >
              <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{description}</p>
              <ul className="space-y-2">
                {bullets.map((b) => (
                  <li key={b} className="text-sm text-foreground/80 flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span> {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}