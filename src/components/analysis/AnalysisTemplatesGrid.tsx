import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, TrendingUp, Users, DollarSign, Target, Shield,
  Clock, Zap, ArrowRight, Upload
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
  /** Solid gradient for the icon orb */
  orbBg: string;
  /** Ring color class */
  orbRing: string;
  /** Colored meta-info (clock/zap) */
  accentColor: string;
  /** Card border */
  cardBorder: string;
}

const TEMPLATES: AnalysisTemplate[] = [
  {
    id: 'financial-health',
    icon: BarChart3,
    title: 'Financial Health Check',
    description: 'Profitability, margins, cash flow, and runway analysis',
    questions: '3 questions',
    time: '60 sec',
    popular: true,
    idea: 'I need a financial health check for my existing business to analyze profitability, cash flow management, and identify areas to improve margins',
    location: 'New York, USA',
    orbBg: 'from-emerald-400 via-teal-500 to-emerald-700',
    orbRing: 'ring-emerald-400/35',
    accentColor: 'text-emerald-500 dark:text-emerald-400',
    cardBorder: 'border-emerald-400/20 hover:border-emerald-400/50',
  },
  {
    id: 'growth-analysis',
    icon: TrendingUp,
    title: 'Growth Analysis',
    description: 'Revenue scaling strategy, market expansion, and growth levers',
    questions: '4 questions',
    time: '90 sec',
    popular: true,
    idea: 'Analyze growth strategy for my business — best channels for customer acquisition, revenue scaling tactics, and market expansion opportunities',
    location: 'San Francisco, USA',
    orbBg: 'from-blue-500 via-indigo-500 to-blue-700',
    orbRing: 'ring-blue-400/35',
    accentColor: 'text-blue-500 dark:text-blue-400',
    cardBorder: 'border-blue-400/20 hover:border-blue-400/50',
  },
  {
    id: 'customer-metrics',
    icon: Users,
    title: 'Customer Metrics',
    description: 'CAC, LTV, churn rates, and retention analysis',
    questions: '3 questions',
    time: '60 sec',
    popular: true,
    idea: 'Analyze my customer acquisition cost, lifetime value, churn rate, and retention metrics to optimize unit economics and improve customer profitability',
    location: 'London, UK',
    orbBg: 'from-violet-500 via-purple-500 to-violet-700',
    orbRing: 'ring-violet-400/35',
    accentColor: 'text-violet-500 dark:text-violet-400',
    cardBorder: 'border-violet-400/20 hover:border-violet-400/50',
  },
  {
    id: 'cost-optimization',
    icon: DollarSign,
    title: 'Cost Optimization',
    description: 'Find inefficiencies and reduce operating expenses',
    questions: '4 questions',
    time: '90 sec',
    idea: 'Evaluate my business cost structure to identify inefficiencies, reduce fixed and variable expenses, and improve overall profitability margins',
    location: 'Chicago, USA',
    orbBg: 'from-amber-400 via-orange-500 to-amber-600',
    orbRing: 'ring-amber-400/35',
    accentColor: 'text-amber-500 dark:text-amber-400',
    cardBorder: 'border-amber-400/20 hover:border-amber-400/50',
  },
  {
    id: 'competitive-position',
    icon: Target,
    title: 'Competitive Position',
    description: 'Market positioning, competitors, and differentiation',
    questions: '4 questions',
    time: '90 sec',
    idea: 'Analyze my competitive position in the market — identify main competitors, assess competitive advantages, and find differentiation opportunities',
    location: 'Austin, Texas',
    orbBg: 'from-pink-400 via-rose-500 to-pink-700',
    orbRing: 'ring-pink-400/35',
    accentColor: 'text-pink-500 dark:text-pink-400',
    cardBorder: 'border-pink-400/20 hover:border-pink-400/50',
  },
  {
    id: 'risk-assessment',
    icon: Shield,
    title: 'Risk Assessment',
    description: 'Identify risks, threats, and mitigation strategies',
    questions: '3 questions',
    time: '60 sec',
    idea: 'Conduct a comprehensive risk assessment for my business — identify financial, operational, market, and regulatory risks with mitigation strategies',
    location: 'Miami, Florida',
    orbBg: 'from-red-500 via-rose-500 to-red-700',
    orbRing: 'ring-red-400/35',
    accentColor: 'text-red-500 dark:text-red-400',
    cardBorder: 'border-red-400/20 hover:border-red-400/50',
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
          Choose a template. Answer a few questions. Get insights in about 90 seconds.
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
                'group relative text-left p-4 rounded-xl border transition-all duration-200 overflow-hidden',
                'bg-card backdrop-blur-sm',
                'hover:shadow-lg hover:scale-[1.02] active:scale-[0.99]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                template.cardBorder
              )}
            >
              {template.popular && (
                <Badge className="absolute top-2.5 right-2.5 bg-primary/90 text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 tracking-widest uppercase rounded-md">
                  Popular
                </Badge>
              )}

              <div className="flex items-start gap-3">
                {/* Quantis icon orb — deep solid gradient with specular highlight */}
                <div className={cn(
                  'relative flex items-center justify-center w-11 h-11 rounded-[12px] shrink-0',
                  'bg-gradient-to-br',
                  template.orbBg,
                  'ring-2',
                  template.orbRing,
                  'shadow-lg',
                  'transition-all duration-200 group-hover:scale-110 group-hover:shadow-xl'
                )}>
                  <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                  {/* Specular highlight top-left */}
                  <div className="absolute top-1 left-1 w-4 h-2.5 rounded-full bg-white/30 blur-[4px] pointer-events-none" />
                  {/* Bottom depth shadow inner */}
                  <div className="absolute bottom-0 inset-x-0 h-1/2 rounded-b-[12px] bg-black/15 pointer-events-none" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground text-sm leading-snug pr-10">{template.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                    {template.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] font-medium text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className={cn('w-3 h-3 shrink-0', template.accentColor)} />
                      {template.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className={cn('w-3 h-3 shrink-0', template.accentColor)} />
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
      <div className={cn(
        'relative p-4 rounded-xl border border-dashed border-primary/30',
        'bg-gradient-to-br from-primary/5 to-primary/3',
        'flex flex-col sm:flex-row items-center justify-between gap-3 overflow-hidden'
      )}>
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
            <Upload className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Need Custom Analysis?</p>
            <p className="text-xs text-muted-foreground">
              Upload your own data (PDF, Excel, CSV) and ask specific questions
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/60"
          onClick={() => onSelect('', '')}
          disabled={disabled}
        >
          Custom Analysis
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

