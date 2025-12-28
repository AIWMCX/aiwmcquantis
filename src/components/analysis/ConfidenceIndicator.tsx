import React, { useState } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  ChevronDown, 
  ChevronUp,
  Lightbulb,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { ConfidenceBreakdown } from '@/types/analysis';

interface ConfidenceIndicatorProps {
  score: number;
  breakdown?: ConfidenceBreakdown;
  suggestions?: string[];
}

export function ConfidenceIndicator({ score, breakdown, suggestions }: ConfidenceIndicatorProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const getScoreConfig = (s: number) => {
    if (s >= 80) return {
      color: 'text-success',
      bg: 'bg-success/10',
      border: 'border-success/30',
      label: 'High Confidence',
      icon: CheckCircle2,
      description: 'Analysis based on comprehensive input data and validated calculations.'
    };
    if (s >= 60) return {
      color: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-primary/30',
      label: 'Medium Confidence',
      icon: Info,
      description: 'Analysis uses some assumptions. Provide more details to increase accuracy.'
    };
    if (s >= 40) return {
      color: 'text-warning',
      bg: 'bg-warning/10',
      border: 'border-warning/30',
      label: 'Low Confidence',
      icon: AlertCircle,
      description: 'Analysis heavily relies on industry averages. Critical data missing.'
    };
    return {
      color: 'text-destructive',
      bg: 'bg-destructive/10',
      border: 'border-destructive/30',
      label: 'Very Low Confidence',
      icon: AlertCircle,
      description: 'Insufficient data for reliable analysis. This is a rough estimate only.'
    };
  };

  const config = getScoreConfig(score);
  const Icon = config.icon;

  const breakdownItems = breakdown ? [
    { label: 'Input Completeness', value: breakdown.input_completeness, weight: '40%' },
    { label: 'Data Quality', value: breakdown.data_quality, weight: '30%' },
    { label: 'Validation Pass', value: breakdown.validation_score, weight: '20%' },
    { label: 'Industry Match', value: breakdown.industry_relevance, weight: '10%' },
  ] : [];

  return (
    <Card className={cn("border", config.border, config.bg)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className={cn("p-2 rounded-lg", config.bg)}>
              <Icon className={cn("w-5 h-5", config.color)} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Analysis Reliability
                <Badge variant="outline" className={cn("text-sm font-bold", config.border, config.color)}>
                  {score}%
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
            </div>
          </div>

          {breakdown && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="flex-shrink-0"
            >
              {showBreakdown ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <Collapsible open={showBreakdown} onOpenChange={setShowBreakdown}>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Score Breakdown */}
            {breakdown && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Confidence Breakdown
                </h4>
                <div className="space-y-2">
                  {breakdownItems.map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium">
                          {item.value}% <span className="text-xs text-muted-foreground">({item.weight})</span>
                        </span>
                      </div>
                      <Progress 
                        value={item.value} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>

                {/* Details */}
                {breakdown.details && breakdown.details.length > 0 && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <h5 className="text-xs font-semibold text-muted-foreground mb-2">Analysis Notes</h5>
                    <ul className="space-y-1">
                      {breakdown.details.map((detail, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-muted-foreground mt-0.5">•</span>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Improvement Suggestions */}
            {suggestions && suggestions.length > 0 && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  How to Improve Accuracy
                </h4>
                <ul className="space-y-2">
                  {suggestions.map((suggestion, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary font-bold">→</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}