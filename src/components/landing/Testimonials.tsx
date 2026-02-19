import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, MapPin, LineChart, ShieldAlert, Database, Layers, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UseCase {
  icon: React.ElementType;
  title: string;
  description: string;
  highlight: string;
  highlightLabel: string;
  prefill: { idea: string; location: string };
}

const USE_CASES: UseCase[] = [
  {
    icon: BarChart3,
    title: 'Coffee Shop Financial Check',
    description: 'Identified a $9K/mo cost gap in the pricing model before launch — flagged rent-to-revenue ratio as unsustainable for the chosen location.',
    highlight: '$9K/mo',
    highlightLabel: 'Cost gap found',
    prefill: { idea: 'Coffee shop with remote work focus in a high foot traffic neighborhood', location: 'Denver, Colorado' },
  },
  {
    icon: LineChart,
    title: 'SaaS Unit Economics',
    description: 'Calculated CAC, LTV, and payback period across 3 scenarios. Showed that the freemium model needed 4x more conversions to break even.',
    highlight: '4x',
    highlightLabel: 'Conversion gap',
    prefill: { idea: 'Project management SaaS for small remote teams', location: 'San Francisco, California' },
  },
  {
    icon: ShieldAlert,
    title: 'E-commerce Risk Scan',
    description: 'Flagged 3 critical risks: supplier concentration, negative unit economics at scale, and seasonal dependency — all before first inventory order.',
    highlight: '3',
    highlightLabel: 'Risks caught',
    prefill: { idea: 'Sustainable fashion e-commerce brand', location: 'New York, New York' },
  },
];

const PLATFORM_STATS = [
  { value: '1,000+', label: 'Industry Benchmarks', icon: Database },
  { value: '50+', label: 'Cities Covered', icon: MapPin },
  { value: '3', label: 'Scenario Types', icon: Layers },
  { value: '12', label: 'Financial Variables', icon: BarChart3 },
];

export function Testimonials() {
  const navigate = useNavigate();

  const handleTryThis = (prefill: { idea: string; location: string }) => {
    sessionStorage.setItem('hero_prefill', JSON.stringify(prefill));
    navigate('/app');
  };

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/[0.06] text-primary font-medium text-sm mb-4">
            <BarChart3 className="w-4 h-4" />
            Real Platform Output
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
            What Quantis Actually Finds
          </h2>
          <p className="text-muted-foreground">
            Real use-case scenarios showing what the analysis engine delivers
          </p>
        </div>

        {/* Use-Case Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {USE_CASES.map((useCase, index) => (
            <div
              key={index}
              className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 flex flex-col"
            >
              {/* Icon */}
              <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                <useCase.icon className="w-6 h-6 text-primary" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-foreground mb-3">
                {useCase.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed flex-1">
                {useCase.description}
              </p>

              {/* Metric badge */}
              <div className="flex items-center justify-between pt-4 border-t border-border mb-4">
                <span className="text-xs text-muted-foreground">{useCase.highlightLabel}</span>
                <span className="text-lg font-bold text-primary">{useCase.highlight}</span>
              </div>

              {/* Try This CTA */}
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleTryThis(useCase.prefill)}
              >
                Try This Idea →
              </Button>
            </div>
          ))}
        </div>

        {/* Platform Stats Row — real, verifiable */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {PLATFORM_STATS.map((stat, index) => (
            <div
              key={index}
              className="text-center p-4 rounded-xl bg-muted/50 border border-border"
            >
              <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
