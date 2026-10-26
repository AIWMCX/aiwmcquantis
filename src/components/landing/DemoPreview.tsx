import React, { useState, useEffect, useRef } from 'react';
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
  Coffee,
  Monitor,
  ShoppingBag,
} from 'lucide-react';
import { trackCtaClick } from '@/lib/analytics';
import { cn } from '@/lib/utils';

interface IndustryDemo {
  label: string;
  icon: React.ElementType;
  idea: string;
  location: string;
  metrics: { label: string; value: string; numericValue: number; prefix: string; suffix: string; subValue?: string; color: string }[];
  insights: string[];
  risks: string[];
}

const INDUSTRY_DEMOS: IndustryDemo[] = [
  {
    label: 'Coffee Shop',
    icon: Coffee,
    idea: 'Coffee shop with remote work focus',
    location: 'Denver, CO',
    metrics: [
      { label: 'Monthly Profit', value: '$4,200', numericValue: 4200, prefix: '$', suffix: '', subValue: 'Conservative estimate', color: 'text-success' },
      { label: 'Payback Period', value: '7.1 months', numericValue: 7.1, prefix: '', suffix: ' months', subValue: 'Based on $30K investment', color: 'text-primary' },
      { label: 'Annual ROI', value: '168%', numericValue: 168, prefix: '', suffix: '%', subValue: 'First year projection', color: 'text-success' },
    ],
    insights: [
      'Target 85 customers/month for profitability',
      'CAC should stay under $45 for positive unit economics',
      'Peak season: March–May offers 40% revenue boost',
    ],
    risks: [
      'Competition: 3 similar businesses within 2mi radius',
      'Seasonal dependency requires cash reserves',
    ],
  },
  {
    label: 'SaaS App',
    icon: Monitor,
    idea: 'Project management SaaS for small teams',
    location: 'San Francisco, CA',
    metrics: [
      { label: 'Monthly Profit', value: '$12,000', numericValue: 12000, prefix: '$', suffix: '', subValue: 'At 400 paying users', color: 'text-success' },
      { label: 'Payback Period', value: '4.8 months', numericValue: 4.8, prefix: '', suffix: ' months', subValue: 'Based on $50K investment', color: 'text-primary' },
      { label: 'Annual ROI', value: '289%', numericValue: 289, prefix: '', suffix: '%', subValue: 'First year projection', color: 'text-success' },
    ],
    insights: [
      'LTV:CAC ratio of 3.2x — healthy unit economics',
      'Freemium model needs 6% conversion rate to break even',
      'Monthly churn must stay under 3% to sustain growth',
    ],
    risks: [
      'Market: 327+ direct competitors identified',
      'CAC rising 22% YoY in this category',
    ],
  },
  {
    label: 'E-commerce',
    icon: ShoppingBag,
    idea: 'Sustainable fashion e-commerce brand',
    location: 'New York, NY',
    metrics: [
      { label: 'Monthly Profit', value: '$6,800', numericValue: 6800, prefix: '$', suffix: '', subValue: 'Conservative estimate', color: 'text-success' },
      { label: 'Payback Period', value: '9.3 months', numericValue: 9.3, prefix: '', suffix: ' months', subValue: 'Based on $40K investment', color: 'text-primary' },
      { label: 'Annual ROI', value: '204%', numericValue: 204, prefix: '', suffix: '%', subValue: 'First year projection', color: 'text-success' },
    ],
    insights: [
      'Average order value of $87 drives strong margins',
      'Repeat purchase rate of 34% keeps LTV high',
      'Q4 (Oct–Dec) accounts for 38% of annual revenue',
    ],
    risks: [
      'Supplier concentration risk — 1 vendor = 60% of supply',
      'Returns rate above 18% will erode profitability',
    ],
  },
];

const MetricIcon: Record<string, React.ElementType> = {
  'Monthly Profit': DollarSign,
  'Payback Period': Clock,
  'Annual ROI': TrendingUp,
};

/** Animates a number from 0 → target over ~600ms */
function useCountUp(target: number, trigger: number) {
  const [display, setDisplay] = useState(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const duration = 600;
    const start = performance.now();
    const from = 0;

    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (target - from) * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, trigger]);

  return display;
}

function AnimatedMetric({ metric, trigger }: {
  metric: IndustryDemo['metrics'][0];
  trigger: number;
}) {
  const raw = useCountUp(metric.numericValue, trigger);
  const Icon = MetricIcon[metric.label] || TrendingUp;

  // Format the displayed number
  let formatted: string;
  if (metric.suffix === '%' || metric.suffix === '') {
    if (metric.numericValue >= 1000) {
      formatted = Math.round(raw).toLocaleString('en-US');
    } else if (metric.numericValue % 1 !== 0) {
      formatted = raw.toFixed(1);
    } else {
      formatted = Math.round(raw).toString();
    }
  } else {
    // months — show one decimal
    formatted = raw.toFixed(1);
  }

  return (
    <div className="p-4 rounded-xl border border-border bg-background transition-all duration-300">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('w-4 h-4', metric.color)} />
        <span className="text-sm text-muted-foreground">{metric.label}</span>
      </div>
      <div className={cn('text-2xl md:text-3xl font-bold tabular-nums', metric.color)}>
        {metric.prefix}{formatted}{metric.suffix}
      </div>
      {metric.subValue && <div className="text-xs text-muted-foreground mt-1">{metric.subValue}</div>}
    </div>
  );
}

export function DemoPreview() {
  const [activeTab, setActiveTab] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [visible, setVisible] = useState(true);

  const handleTabChange = (i: number) => {
    if (i === activeTab) return;
    // Fade out → switch → fade in
    setVisible(false);
    setTimeout(() => {
      setActiveTab(i);
      setAnimKey(k => k + 1);
      setVisible(true);
    }, 180);
  };

  const demo = INDUSTRY_DEMOS[activeTab];

  return (
    <section id="demo-preview" className="py-8 md:py-12 bg-background overflow-hidden">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-6">
          <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">Interactive Sample Report</p>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
            See What You'll Get — Pick an Industry
          </h2>
          <p className="text-sm text-muted-foreground">
            Switch between industries to see how the engine adapts to each business type.
          </p>
        </div>

        {/* Industry Tabs */}
        <div className="flex justify-center gap-2 mb-6">
          {INDUSTRY_DEMOS.map((d, i) => (
            <button
              key={d.label}
              onClick={() => handleTabChange(i)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                activeTab === i
                  ? 'bg-primary text-primary-foreground shadow-md scale-105'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <d.icon className="w-4 h-4" />
              {d.label}
            </button>
          ))}
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
                <div
                  className={cn(
                    'transition-all duration-200',
                    visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
                  )}
                >
                  <div className="font-semibold text-foreground text-sm md:text-base">Business Analysis Report</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><demo.icon className="w-3 h-3" /> {demo.idea} • {demo.location}</div>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                Sample
              </div>
            </div>

            {/* Animated content area */}
            <div
              className={cn(
                'transition-all duration-200',
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              )}
            >
              <div className="p-4 md:p-6">
                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {demo.metrics.map((metric) => (
                    <AnimatedMetric key={`${metric.label}-${animKey}`} metric={metric} trigger={animKey} />
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
                      {demo.insights.map((insight) => (
                        <li key={insight} className="text-sm text-muted-foreground flex items-start gap-2">
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
                      {demo.risks.map((risk) => (
                        <li key={risk} className="text-sm text-muted-foreground flex items-start gap-2">
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
          </div>

          {/* CTA OUTSIDE the blur */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              This is a sample. Get <strong className="text-foreground">your</strong> personalized report:
            </p>
            <Link
              to="/app"
              onClick={() => trackCtaClick('get_my_version', 'demo_preview')}
            >
              <Button size="lg" className="w-full md:w-auto gap-2 shadow-xl min-h-[56px] text-base hover:scale-[1.02] transition-all">
                <TrendingUp className="w-5 h-5" />
                Get My Version of This Report →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
