import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, TrendingUp, Users, DollarSign, Target, Shield,
  Clock, Zap, ArrowRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

interface AnalysisTemplate {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  questions: string;
  time: string;
  popular?: boolean;
  idea: string;
  location: string;
  color: string;
}

const TEMPLATES: AnalysisTemplate[] = [
  {
    id: 'financial-health',
    icon: BarChart3,
    title: 'Financial Health Check',
    description: 'Profitability, margins, cash flow, and runway analysis',
    questions: '3 questions',
    time: '60 seconds',
    popular: true,
    idea: 'I need a financial health check for my existing business to analyze profitability, cash flow management, and identify areas to improve margins',
    location: 'New York, USA',
    color: 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40',
  },
  {
    id: 'growth-analysis',
    icon: TrendingUp,
    title: 'Growth Analysis',
    description: 'Revenue scaling strategy, market expansion, and growth levers',
    questions: '4 questions',
    time: '90 seconds',
    popular: true,
    idea: 'Analyze growth strategy for my business — best channels for customer acquisition, revenue scaling tactics, and market expansion opportunities',
    location: 'San Francisco, USA',
    color: 'bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40',
  },
  {
    id: 'customer-metrics',
    icon: Users,
    title: 'Customer Metrics',
    description: 'CAC, LTV, churn rates, and retention analysis',
    questions: '3 questions',
    time: '60 seconds',
    popular: true,
    idea: 'Analyze my customer acquisition cost, lifetime value, churn rate, and retention metrics to optimize unit economics and improve customer profitability',
    location: 'London, UK',
    color: 'bg-violet-500/10 border-violet-500/20 hover:border-violet-500/40',
  },
  {
    id: 'cost-optimization',
    icon: DollarSign,
    title: 'Cost Optimization',
    description: 'Find inefficiencies and reduce expenses',
    questions: '4 questions',
    time: '90 seconds',
    idea: 'Evaluate my business cost structure to identify inefficiencies, reduce fixed and variable expenses, and improve overall profitability margins',
    location: 'Chicago, USA',
    color: 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40',
  },
  {
    id: 'competitive-position',
    icon: Target,
    title: 'Competitive Position',
    description: 'Market positioning, competitors, and differentiation',
    questions: '4 questions',
    time: '90 seconds',
    idea: 'Analyze my competitive position in the market — identify main competitors, assess competitive advantages, and find differentiation opportunities',
    location: 'Austin, Texas',
    color: 'bg-pink-500/10 border-pink-500/20 hover:border-pink-500/40',
  },
  {
    id: 'risk-assessment',
    icon: Shield,
    title: 'Risk Assessment',
    description: 'Identify risks, threats, and mitigation strategies',
    questions: '3 questions',
    time: '60 seconds',
    idea: 'Conduct a comprehensive risk assessment for my business — identify financial, operational, market, and regulatory risks with mitigation strategies',
    location: 'Miami, Florida',
    color: 'bg-destructive/10 border-destructive/20 hover:border-destructive/40',
  },
];

interface AnalysisTemplatesGridProps {
  onSelect: (idea: string, location: string) => void;
  disabled?: boolean;
  className?: string;
}

export function AnalysisTemplatesGrid({ onSelect, disabled, className }: AnalysisTemplatesGridProps) {
  const navigate = useNavigate();

  const handleSelect = (template: AnalysisTemplate) => {
    if (disabled) return;
    trackEvent('analysis_template_selected', { template_id: template.id });
    onSelect(template.idea, template.location);
  };

  return (
    <div className={cn('space-y-5', className)}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-1">
          What Would You Like to Analyze?
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose a template. Answer a few questions. Get insights in 60 seconds.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelect(template)}
              disabled={disabled}
              className={cn(
                'relative text-left p-4 rounded-xl border-2 transition-all duration-200',
                'hover:shadow-md hover:scale-[1.02]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                template.color
              )}
            >
              {template.popular && (
                <Badge className="absolute -top-2 right-3 bg-primary text-primary-foreground text-[10px] px-2 py-0.5">
                  POPULAR
                </Badge>
              )}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-background/80 shrink-0">
                  <Icon className="w-5 h-5 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm">{template.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {template.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {template.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {template.questions}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom Analysis CTA */}
      <div className="p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-center sm:text-left">
          <p className="font-semibold text-foreground text-sm">Need Custom Analysis?</p>
          <p className="text-xs text-muted-foreground">
            Upload your own data (PDF, Excel, CSV) and ask specific questions
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => {
            onSelect('', '');
          }}
          disabled={disabled}
        >
          Custom Analysis
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
