import React, { useState, useEffect } from 'react';
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
  Zap,
  Play
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
  {
    label: 'Monthly Profit',
    value: '$4,200',
    subValue: 'Conservative estimate',
    icon: DollarSign,
    color: 'text-success',
  },
  {
    label: 'Payback Period',
    value: '7.1 months',
    subValue: 'Based on $30K investment',
    icon: Clock,
    color: 'text-primary',
  },
  {
    label: 'Annual ROI',
    value: '168%',
    subValue: 'First year projection',
    icon: TrendingUp,
    color: 'text-success',
  },
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
  const [isVisible, setIsVisible] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    const element = document.getElementById('demo-preview');
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible && animationStep < 5) {
      const timer = setTimeout(() => {
        setAnimationStep(prev => prev + 1);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isVisible, animationStep]);

  return (
    <section id="demo-preview" className="py-16 md:py-24 bg-background overflow-hidden">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            Live Demo
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            See What Your Report Looks Like
          </h2>
          <p className="text-muted-foreground">
            Sample analysis for: "Coffee shop in downtown Denver"
          </p>
        </div>

        {/* Demo Card */}
        <div className="relative max-w-4xl mx-auto">
          {/* Glow Effect */}
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
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                Live Demo
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="p-4 md:p-6">
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 transition-all duration-500 ${animationStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {demoMetrics.map((metric, index) => (
                  <div 
                    key={metric.label}
                    className="p-4 rounded-xl border border-border bg-background"
                    style={{ 
                      transitionDelay: `${index * 100}ms`,
                      opacity: animationStep >= 1 ? 1 : 0,
                      transform: animationStep >= 1 ? 'translateY(0)' : 'translateY(10px)'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <metric.icon className={`w-4 h-4 ${metric.color}`} />
                      <span className="text-sm text-muted-foreground">{metric.label}</span>
                    </div>
                    <div className={`text-2xl md:text-3xl font-bold ${metric.color}`}>
                      {metric.value}
                    </div>
                    {metric.subValue && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {metric.subValue}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Insights & Risks */}
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 transition-all duration-500 ${animationStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {/* Key Insights */}
                <div className="p-4 rounded-xl border border-border bg-background">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    Key Insights
                  </h4>
                  <ul className="space-y-2">
                    {demoInsights.map((insight, i) => (
                      <li 
                        key={i}
                        className="text-sm text-muted-foreground flex items-start gap-2"
                        style={{
                          opacity: animationStep >= 3 ? 1 : 0,
                          transitionDelay: `${i * 100}ms`
                        }}
                      >
                        <span className="text-success mt-0.5">•</span>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Risks */}
                <div className="p-4 rounded-xl border border-border bg-background">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Risk Factors
                  </h4>
                  <ul className="space-y-2">
                    {demoRisks.map((risk, i) => (
                      <li 
                        key={i}
                        className="text-sm text-muted-foreground flex items-start gap-2"
                        style={{
                          opacity: animationStep >= 3 ? 1 : 0,
                          transitionDelay: `${i * 100}ms`
                        }}
                      >
                        <span className="text-warning mt-0.5">•</span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Blurred Content Preview */}
              <div 
                className={`relative transition-all duration-500 ${animationStep >= 4 ? 'opacity-100' : 'opacity-0'}`}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/80 to-card z-10" />
                <div className="filter blur-sm pointer-events-none">
                  <div className="p-4 rounded-xl border border-border bg-muted/30 mb-4">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </div>
                  <div className="p-4 rounded-xl border border-border bg-muted/30">
                    <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </div>
                </div>
                
                {/* CTA Overlay - Enhanced for mobile */}
                <div className="absolute inset-0 flex items-center justify-center z-20 px-4">
                  <Link 
                    to="/app"
                    onClick={() => trackCtaClick('unlock_full_report', 'demo_preview')}
                    className="w-full md:w-auto"
                  >
                    <Button size="lg" className="w-full md:w-auto gap-2 shadow-2xl min-h-[56px] text-base animate-pulse-subtle hover:animate-none">
                      <Play className="w-5 h-5" />
                      Get Your Full Report Free
                      <ArrowRight className="w-4 h-4 hidden sm:block" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Touch Prompt */}
          <p className="text-center text-sm text-muted-foreground mt-4 md:hidden font-medium">
            👆 Tap above to get your free analysis
          </p>
        </div>
      </div>
    </section>
  );
}
