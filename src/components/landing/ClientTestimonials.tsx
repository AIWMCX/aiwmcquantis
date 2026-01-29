import React from 'react';
import { Sparkles, Shield, Zap, Calculator, TrendingUp, Target } from 'lucide-react';

/**
 * ClientTestimonials - Replaced with verifiable feature highlights
 * 
 * IMPORTANT: All fake testimonials and unverified statistics have been removed
 * per marketing accuracy policy. This component now shows verified platform capabilities.
 */

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  metric?: string;
}

const verifiableFeatures: Feature[] = [
  {
    icon: Calculator,
    title: 'Transparent Calculations',
    description: 'Every number shows its formula. See exactly how ROI, payback period, and margins are calculated.',
    metric: '12 variables',
  },
  {
    icon: TrendingUp,
    title: 'Industry Benchmarks',
    description: 'Analysis powered by real industry data across multiple sectors and regions.',
    metric: '1,000+ benchmarks',
  },
  {
    icon: Zap,
    title: 'Fast Results',
    description: 'Get comprehensive business analysis in under 2 minutes, not weeks.',
    metric: '<2 min',
  },
];

export function ClientTestimonials() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Built for Transparency
          </h2>
          <p className="text-muted-foreground">
            Unlike black-box AI tools, Quantis shows you exactly how every number is calculated
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {verifiableFeatures.map((feature, index) => (
            <div
              key={index}
              className="relative p-6 rounded-2xl border bg-card transition-all duration-300 border-border hover:border-primary/30 hover:shadow-md"
            >
              {/* Icon */}
              <div className="mb-4 p-3 rounded-xl bg-primary/10 w-fit">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>

              {/* Metric Badge */}
              {feature.metric && (
                <div className="inline-block mb-3 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {feature.metric}
                </div>
              )}

              {/* Content */}
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Platform Capabilities - Verifiable Stats Only */}
        <div className="mt-10 md:mt-12 pt-6 md:pt-8 border-t border-border">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Shield className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-foreground">Secure & Private</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">AES-256 encryption</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-foreground">AI-Powered</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Claude 3.5 analysis</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Target className="w-5 h-5 text-warning" />
                <span className="text-sm font-medium text-foreground">3 Scenarios</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Conservative to optimistic</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
