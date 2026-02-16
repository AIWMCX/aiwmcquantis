import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  ArrowRight as ArrowRightIcon
} from 'lucide-react';
import { trackCtaClick } from '@/lib/analytics';

interface DemoMetric {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ElementType;
  color: string;
}

const demoMetrics: DemoMetric[] = [
  { label: 'Monthly Profit', value: '$4,200', subValue: 'Conservative estimate', icon: DollarSign, color: 'text-success' },
  { label: 'Payback Period', value: '7.1 months', subValue: 'Based on $30K investment', icon: Clock, color: 'text-primary' },
  { label: 'Annual ROI', value: '168%', subValue: 'First year projection', icon: TrendingUp, color: 'text-success' },
];

const demoInsights = [
  'Target 85 customers/month for profitability',
  'CAC should stay under $45 for positive unit economics',
  'Peak season: March-May offers 40% revenue boost',
];

const demoRisks = [
  'Competition: 3 similar businesses within 2mi radius',
  'Seasonal dependency requires cash reserves',
];

export function DemoPreview() {
  return (
    <section id="demo-preview" className="py-8 md:py-12 bg-background overflow-hidden">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-6">
          <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">Sample Report</p>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
            See What You'll Get in 3 Minutes
          </h2>
          <p className="text-sm text-muted-foreground">
            Example output: "Coffee shop in downtown Denver"
          </p>
        </div>

        {/* Demo Card */}
        <div className="relative max-w-4xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 blur-3xl -z-10" />
          
          <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            {/* Header Bar */}
            <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm md:text-base">Business Analysis Report</div>
                  <div className="text-xs text-muted-foreground">Coffee Shop • Denver, CO</div>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                Sample
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {demoMetrics.map((metric) => (
                  <div key={metric.label} className="p-4 rounded-xl border border-border bg-background">
                    <div className="flex items-center gap-2 mb-2">
                      <metric.icon className={`w-4 h-4 ${metric.color}`} />
                      <span className="text-sm text-muted-foreground">{metric.label}</span>
                    </div>
                    <div className={`text-2xl md:text-3xl font-bold ${metric.color}`}>{metric.value}</div>
                    {metric.subValue && <div className="text-xs text-muted-foreground mt-1">{metric.subValue}</div>}
                  </div>
                ))}
              </div>

              {/* Insights & Risks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl border border-border bg-background">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-base">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    Key Insights
                  </h3>
                  <ul className="space-y-2">
                    {demoInsights.map((insight, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-success mt-0.5">•</span>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-xl border border-border bg-background">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-base">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Risk Factors
                  </h3>
                  <ul className="space-y-2">
                    {demoRisks.map((risk, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-warning mt-0.5">•</span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Blurred teaser */}
              <div className="relative">
                <div className="filter blur-sm pointer-events-none select-none">
                  <div className="p-4 rounded-xl border border-border bg-muted/30 mb-4">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/60 to-card" />
              </div>
            </div>
          </div>

          {/* CTA OUTSIDE the blur — clearly clickable */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              This is a sample. Get <strong className="text-foreground">your</strong> numbers:
            </p>
            <Link
              to="/app"
              onClick={() => trackCtaClick('see_my_numbers', 'demo_preview')}
            >
              <Button size="lg" className="w-full md:w-auto gap-2 shadow-xl min-h-[56px] text-base hover:scale-[1.02] transition-all">
                <TrendingUp className="w-5 h-5" />
                See My Numbers — Free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
