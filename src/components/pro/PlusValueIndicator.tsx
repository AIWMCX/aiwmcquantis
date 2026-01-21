import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Brain, 
  Database, 
  Target, 
  Sparkles,
  CheckCircle2,
  BarChart3,
  LineChart,
  Zap
} from 'lucide-react';

interface PerformanceMetric {
  label: string;
  freeValue: number;
  plusValue: number;
  unit: string;
  description: string;
  icon: React.ReactNode;
}

const performanceMetrics: PerformanceMetric[] = [
  {
    label: 'Forecast Accuracy',
    freeValue: 72,
    plusValue: 94,
    unit: '%',
    description: 'Based on industry benchmarks validation',
    icon: <Target className="w-4 h-4" />
  },
  {
    label: 'Data Sources',
    freeValue: 3,
    plusValue: 47,
    unit: '+',
    description: 'Real-time industry intelligence feeds',
    icon: <Database className="w-4 h-4" />
  },
  {
    label: 'Financial Variables',
    freeValue: 8,
    plusValue: 24,
    unit: '',
    description: 'Comprehensive calculation engine',
    icon: <BarChart3 className="w-4 h-4" />
  },
  {
    label: 'AI Learning Cycles',
    freeValue: 0,
    plusValue: 1200,
    unit: '+',
    description: 'Self-evolving model optimization',
    icon: <Brain className="w-4 h-4" />
  }
];

const plusAdvantages = [
  {
    title: 'Proprietary Industry Benchmarks',
    description: 'Access to 47+ industry datasets with real business metrics, margins, and market data updated monthly.',
    icon: <Database className="w-5 h-5" />
  },
  {
    title: 'Advanced Financial Engine',
    description: '24-variable mathematical model with LTV, CAC, payback period, and break-even calculations.',
    icon: <LineChart className="w-5 h-5" />
  },
  {
    title: 'Self-Evolving AI Memory',
    description: 'Every analysis improves accuracy. Our AI learns from patterns to deliver increasingly precise projections.',
    icon: <Brain className="w-5 h-5" />
  },
  {
    title: 'Document Intelligence™',
    description: 'Extract real numbers from your financial documents. Real data = real results.',
    icon: <Sparkles className="w-5 h-5" />
  }
];

export function PlusValueIndicator() {
  return (
    <div className="space-y-6">
      {/* Active Status Banner */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-background overflow-hidden">
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Plus Intelligence Active</p>
                <p className="text-sm text-muted-foreground">
                  Your analyses use enhanced accuracy mode
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10">
              <Zap className="w-3 h-3 mr-1" />
              Premium Engine
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Performance Comparison */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Your Plus Advantage</CardTitle>
          </div>
          <CardDescription>
            Compare analysis quality between tiers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {performanceMetrics.map((metric, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-primary/10 text-primary">
                    {metric.icon}
                  </div>
                  <span className="font-medium text-sm">{metric.label}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">
                    Free: {metric.freeValue}{metric.unit}
                  </span>
                  <span className="text-primary font-semibold">
                    Plus: {metric.plusValue}{metric.unit}
                  </span>
                </div>
              </div>
              <div className="relative">
                {/* Free tier bar (background) */}
                <Progress 
                  value={metric.freeValue} 
                  className="h-2 bg-muted"
                />
                {/* Plus tier bar (overlay) */}
                <div 
                  className="absolute top-0 left-0 h-2 rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all"
                  style={{ width: `${metric.plusValue}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Exclusive Features */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Exclusive Plus Capabilities</CardTitle>
          </div>
          <CardDescription>
            Features that deliver real, actionable results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {plusAdvantages.map((advantage, index) => (
              <div 
                key={index}
                className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    {advantage.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{advantage.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {advantage.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ROI Statement */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="flex items-start gap-3">
          <Target className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-foreground">
              Why Plus Matters for Your Business
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Every dollar invested in accurate analysis saves $47 in failed ventures and missed opportunities. 
              Plus delivers bank-ready projections that investors trust.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
