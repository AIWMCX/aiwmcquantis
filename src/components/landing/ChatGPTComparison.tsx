import React from 'react';
import { X, Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const COMPARISONS = [
  {
    competitor: 'ChatGPT',
    weakness: 'Guesses numbers',
    quantis: '12-variable math engine',
  },
  {
    competitor: 'Excel',
    weakness: 'You build from scratch',
    quantis: 'Pre-built with 1,000 benchmarks',
  },
  {
    competitor: 'Consultants',
    weakness: '$2,000+ and 2 weeks',
    quantis: 'Free',
  },
];

export function ChatGPTComparison() {
  return (
    <section className="py-10 md:py-14 bg-background">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6">
        <h2 className="text-xl md:text-2xl font-bold text-foreground text-center mb-2">
          Why not just use ChatGPT?
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-8 max-w-lg mx-auto">
          ChatGPT generates text. Quantis calculates structured financial logic.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COMPARISONS.map((item) => (
            <div
              key={item.competitor}
              className="rounded-xl border border-border bg-card p-5 space-y-4"
            >
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {item.competitor}
              </p>

              {/* Weakness */}
              <div className="flex items-start gap-2">
                <X className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{item.weakness}</span>
              </div>

              {/* Quantis advantage */}
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">{item.quantis}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link to="/app">
            <Button variant="outline" size="sm" className="gap-2">
              Try it yourself — free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
