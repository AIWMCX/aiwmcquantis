import React, { useState } from 'react';
import { 
  Target, 
  AlertTriangle, 
  TrendingUp, 
  ChevronDown, 
  ChevronUp,
  Clock,
  DollarSign,
  Zap,
  Copy,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { ActionableInsightsAnalysis, ActionableInsight, ActionableTactic } from '@/types/analysis';

interface ActionableInsightsProps {
  insights: ActionableInsightsAnalysis;
}

const priorityConfig = {
  critical: {
    color: 'bg-destructive/10 text-destructive border-destructive/30',
    icon: AlertCircle,
    label: 'Critical',
    dotColor: 'bg-destructive'
  },
  high: {
    color: 'bg-warning/10 text-warning border-warning/30',
    icon: AlertTriangle,
    label: 'High',
    dotColor: 'bg-warning'
  },
  medium: {
    color: 'bg-primary/10 text-primary border-primary/30',
    icon: Info,
    label: 'Medium',
    dotColor: 'bg-primary'
  },
  low: {
    color: 'bg-success/10 text-success border-success/30',
    icon: CheckCircle2,
    label: 'Low',
    dotColor: 'bg-success'
  }
};

const effortConfig = {
  low: { label: 'Low Effort', color: 'bg-success/10 text-success' },
  medium: { label: 'Medium Effort', color: 'bg-warning/10 text-warning' },
  high: { label: 'High Effort', color: 'bg-destructive/10 text-destructive' }
};

const healthConfig = {
  critical: { color: 'text-destructive', label: 'Critical Issues', icon: AlertCircle },
  needs_work: { color: 'text-warning', label: 'Needs Work', icon: AlertTriangle },
  healthy: { color: 'text-success', label: 'Healthy', icon: CheckCircle2 },
  excellent: { color: 'text-success', label: 'Excellent', icon: CheckCircle2 }
};

function TacticCard({ tactic, index }: { tactic: ActionableTactic; index: number }) {
  return (
    <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-medium flex items-center justify-center">
          {index + 1}
        </span>
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-foreground">{tactic.action}</p>
          
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="flex items-center gap-1 text-success">
              <TrendingUp className="w-3 h-3" />
              {tactic.expected_impact}
            </span>
            
            <Badge variant="outline" className={cn("text-xs", effortConfig[tactic.effort].color)}>
              {effortConfig[tactic.effort].label}
            </Badge>
            
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              {tactic.timeframe}
            </span>
            
            {tactic.cost_estimate && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="w-3 h-3" />
                {tactic.cost_estimate}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: ActionableInsight }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const config = priorityConfig[insight.priority];
  const PriorityIcon = config.icon;
  
  const copyActionPlan = () => {
    const text = `
${insight.headline}

Current: ${insight.current_value} → Target: ${insight.target_value}
Gap: ${insight.gap}

Why It Matters:
${insight.why_it_matters}

Strategy: ${insight.action_plan.strategy}

Action Steps:
${insight.action_plan.tactics.map((t, i) => `${i + 1}. ${t.action} (${t.expected_impact}, ${t.effort} effort, ${t.timeframe})`).join('\n')}

Expected Outcome: ${insight.action_plan.expected_outcome}
Time to Result: ${insight.action_plan.time_to_result}
    `.trim();
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn("border-l-4 transition-all", 
        insight.priority === 'critical' && "border-l-destructive",
        insight.priority === 'high' && "border-l-warning",
        insight.priority === 'medium' && "border-l-primary",
        insight.priority === 'low' && "border-l-success"
      )}>
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className={cn("p-2 rounded-lg", config.color)}>
                  <PriorityIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={cn("text-xs", config.color)}>
                      {config.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{insight.metric_name}</span>
                  </div>
                  <CardTitle className="text-base font-semibold text-foreground">
                    {insight.headline}
                  </CardTitle>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>
            
            {/* Current vs Target */}
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="font-medium text-muted-foreground">Current:</span>
              <span className="font-semibold text-foreground">{insight.current_value}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium text-muted-foreground">Target:</span>
              <span className="font-semibold text-success">{insight.target_value}</span>
              <span className="text-xs text-muted-foreground ml-2">(Gap: {insight.gap})</span>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Why It Matters */}
            <div className="p-3 bg-muted/30 rounded-lg border border-border/30">
              <p className="text-xs font-medium text-muted-foreground mb-1">Why This Matters</p>
              <p className="text-sm text-foreground">{insight.why_it_matters}</p>
            </div>
            
            {/* Strategy */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Strategy</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{insight.action_plan.strategy}</p>
              
              {/* Tactics */}
              <div className="space-y-2">
                {insight.action_plan.tactics.map((tactic, i) => (
                  <TacticCard key={i} tactic={tactic} index={i} />
                ))}
              </div>
            </div>
            
            {/* Expected Outcome */}
            <div className="flex items-start justify-between gap-4 p-3 bg-success/5 rounded-lg border border-success/20">
              <div>
                <p className="text-xs font-medium text-success mb-1">Expected Outcome</p>
                <p className="text-sm text-foreground">{insight.action_plan.expected_outcome}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Time to result: {insight.action_plan.time_to_result}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  copyActionPlan();
                }}
                className="flex-shrink-0"
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function ActionableInsights({ insights }: ActionableInsightsProps) {
  if (!insights || !insights.summary) {
    return (
      <Card className="section-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Action Plan</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No red flags or action items were generated for this analysis. Try re-running the analysis or refining your inputs to surface targeted recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }
  const { summary } = insights;
  const healthKey = (summary.overall_health && healthConfig[healthKey]) ? summary.overall_health : 'fair';
  const HealthIcon = healthConfig[healthKey].icon;
  
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary Card */}
      <Card className="section-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Action Plan</CardTitle>
            <Badge variant="outline" className="ml-2">
              {summary.total_insights} {summary.total_insights === 1 ? 'Issue' : 'Issues'} Found
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Priority Breakdown */}
          <div className="flex flex-wrap gap-3">
            {summary.critical_count > 0 && (
              <div className="flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full", priorityConfig.critical.dotColor)} />
                <span className="text-sm font-medium">{summary.critical_count} Critical</span>
              </div>
            )}
            {summary.high_count > 0 && (
              <div className="flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full", priorityConfig.high.dotColor)} />
                <span className="text-sm font-medium">{summary.high_count} High</span>
              </div>
            )}
            {summary.medium_count > 0 && (
              <div className="flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full", priorityConfig.medium.dotColor)} />
                <span className="text-sm font-medium">{summary.medium_count} Medium</span>
              </div>
            )}
            {summary.low_count > 0 && (
              <div className="flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full", priorityConfig.low.dotColor)} />
                <span className="text-sm font-medium">{summary.low_count} Low</span>
              </div>
            )}
          </div>
          
          {/* Overall Health */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <HealthIcon className={cn("w-5 h-5", healthConfig[healthKey].color)} />
            <span className="text-sm">
              <span className="font-medium">Status: </span>
              <span className={healthConfig[healthKey].color}>
                {healthConfig[healthKey].label}
              </span>
            </span>
          </div>
          
          {/* Top Priority */}
          {summary.top_priority && (
            <div className="text-sm">
              <span className="font-medium text-foreground">Top Priority: </span>
              <span className="text-muted-foreground">{summary.top_priority}</span>
            </div>
          )}
          
          {/* Quick Wins */}
          {summary.quick_wins && summary.quick_wins.length > 0 && (
            <div className="text-sm">
              <span className="font-medium text-foreground">Quick Wins: </span>
              <span className="text-success">{summary.quick_wins.join(', ')}</span>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Individual Insights */}
      <div className="space-y-3">
        {insights.insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
}