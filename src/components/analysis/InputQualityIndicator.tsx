import React, { useMemo } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  AlertTriangle,
  Lightbulb,
  Brain,
  MapPin,
  Building2,
  DollarSign,
  FileText,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { OptionalFinancialInputs } from '@/types/analysis';
import type { UploadedFile } from '@/hooks/useFileUpload';

interface InputQualityIndicatorProps {
  idea: string;
  location: string;
  financialInputs: OptionalFinancialInputs;
  files?: UploadedFile[];
  isAuthenticated?: boolean;
}

interface QualityFactor {
  id: string;
  label: string;
  icon: React.ElementType;
  weight: number; // Out of 100
  score: number; // 0-100 based on completion
  status: 'complete' | 'partial' | 'missing';
  improvement?: string;
}

function calculateIdeaScore(idea: string): { score: number; status: 'complete' | 'partial' | 'missing' } {
  const length = idea.trim().length;
  if (length === 0) return { score: 0, status: 'missing' };
  if (length < 50) return { score: 20, status: 'partial' };
  if (length < 150) return { score: 50, status: 'partial' };
  if (length < 500) return { score: 75, status: 'partial' };
  if (length < 1000) return { score: 90, status: 'complete' };
  return { score: 100, status: 'complete' };
}

function calculateLocationScore(location: string): { score: number; status: 'complete' | 'partial' | 'missing' } {
  const length = location.trim().length;
  if (length === 0) return { score: 0, status: 'missing' };
  if (length < 3) return { score: 30, status: 'partial' };
  // Check if it includes city and country/state
  if (location.includes(',') || length > 10) return { score: 100, status: 'complete' };
  return { score: 70, status: 'partial' };
}

function calculateIndustryScore(industry?: string): { score: number; status: 'complete' | 'partial' | 'missing' } {
  if (!industry || industry === 'auto') return { score: 50, status: 'partial' };
  return { score: 100, status: 'complete' };
}

function calculateFinancialsScore(inputs: OptionalFinancialInputs): { score: number; status: 'complete' | 'partial' | 'missing'; filledCount: number } {
  const numericKeys = ['startup_investment', 'monthly_revenue', 'average_price', 'expected_customers', 'monthly_costs', 'cac', 'churn_rate'] as const;
  const filledCount = numericKeys.filter(key => {
    const v = inputs[key];
    return v !== undefined && v !== null && v > 0;
  }).length;
  
  const totalFields = numericKeys.length;
  const score = Math.round((filledCount / totalFields) * 100);
  
  if (filledCount === 0) return { score: 0, status: 'missing', filledCount };
  if (filledCount === totalFields) return { score: 100, status: 'complete', filledCount };
  return { score, status: 'partial', filledCount };
}

function calculateDocumentsScore(files?: UploadedFile[]): { score: number; status: 'complete' | 'partial' | 'missing' } {
  if (!files || files.length === 0) return { score: 0, status: 'missing' };
  if (files.length >= 3) return { score: 100, status: 'complete' };
  return { score: Math.round((files.length / 3) * 100), status: 'partial' };
}

export function InputQualityIndicator({
  idea,
  location,
  financialInputs,
  files = [],
  isAuthenticated = false,
}: InputQualityIndicatorProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const { factors, totalScore, completedCount, improvements } = useMemo(() => {
    const ideaResult = calculateIdeaScore(idea);
    const locationResult = calculateLocationScore(location);
    const industryResult = calculateIndustryScore(financialInputs.selected_industry);
    const financialsResult = calculateFinancialsScore(financialInputs);
    const documentsResult = calculateDocumentsScore(files);

    const factorsList: QualityFactor[] = [
      {
        id: 'idea',
        label: 'Business Description',
        icon: Brain,
        weight: 35,
        score: ideaResult.score,
        status: ideaResult.status,
        improvement: ideaResult.status !== 'complete' 
          ? idea.length < 150 
            ? 'Add more detail about your value proposition, target customers, and revenue model'
            : 'Include competitive advantages and market positioning'
          : undefined,
      },
      {
        id: 'location',
        label: 'Market Location',
        icon: MapPin,
        weight: 15,
        score: locationResult.score,
        status: locationResult.status,
        improvement: locationResult.status !== 'complete'
          ? 'Specify city and country for accurate local market data'
          : undefined,
      },
      {
        id: 'industry',
        label: 'Industry Selection',
        icon: Building2,
        weight: 10,
        score: industryResult.score,
        status: industryResult.status,
        improvement: industryResult.status !== 'complete'
          ? 'Select your industry for +10% confidence boost'
          : undefined,
      },
      {
        id: 'financials',
        label: 'Financial Details',
        icon: DollarSign,
        weight: 30,
        score: financialsResult.score,
        status: financialsResult.status,
        improvement: financialsResult.status !== 'complete'
          ? `Expand Advanced Financial Details (${financialsResult.filledCount}/7 fields)`
          : undefined,
      },
    ];

    // Only show documents factor for authenticated users
    if (isAuthenticated) {
      factorsList.push({
        id: 'documents',
        label: 'Business Documents',
        icon: FileText,
        weight: 10,
        score: documentsResult.score,
        status: documentsResult.status,
        improvement: documentsResult.status !== 'complete'
          ? 'Upload financial statements or business documents for deeper analysis'
          : undefined,
      });
    }

    // Calculate weighted score
    const totalWeight = factorsList.reduce((sum, f) => sum + f.weight, 0);
    const weightedScore = factorsList.reduce((sum, f) => sum + (f.score * f.weight / 100), 0);
    const normalizedScore = Math.round((weightedScore / totalWeight) * 100);

    const completed = factorsList.filter(f => f.status === 'complete').length;
    const improvementsList = factorsList
      .filter(f => f.improvement)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map(f => ({ label: f.label, improvement: f.improvement!, icon: f.icon }));

    return {
      factors: factorsList,
      totalScore: normalizedScore,
      completedCount: completed,
      improvements: improvementsList,
    };
  }, [idea, location, financialInputs, files, isAuthenticated]);

  const getScoreConfig = (score: number) => {
    if (score >= 80) return {
      color: 'text-success',
      bg: 'bg-success/10',
      progressColor: '[&>div]:bg-success',
      label: 'Excellent',
      description: 'Your analysis will be highly accurate',
    };
    if (score >= 60) return {
      color: 'text-primary',
      bg: 'bg-primary/10',
      progressColor: '[&>div]:bg-primary',
      label: 'Good',
      description: 'Add more details for better accuracy',
    };
    if (score >= 40) return {
      color: 'text-warning',
      bg: 'bg-warning/10',
      progressColor: '[&>div]:bg-warning',
      label: 'Basic',
      description: 'Analysis will use industry averages',
    };
    return {
      color: 'text-muted-foreground',
      bg: 'bg-muted/50',
      progressColor: '[&>div]:bg-muted-foreground',
      label: 'Minimal',
      description: 'Add more information to start',
    };
  };

  const config = getScoreConfig(totalScore);

  const getStatusIcon = (status: 'complete' | 'partial' | 'missing') => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'partial':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'missing':
        return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  // Don't show if nothing entered yet
  if (!idea.trim() && !location.trim()) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full px-4 py-3 h-auto flex items-center justify-between hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div className={cn("p-1.5 rounded-md", config.bg)}>
                <TrendingUp className={cn("w-4 h-4", config.color)} />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Input Quality</span>
                  <Badge variant="outline" className={cn("text-xs font-bold", config.color)}>
                    {totalScore}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {completedCount}/{factors.length} complete
              </span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>

        {/* Progress bar always visible */}
        <div className="px-4 pb-3">
          <Progress value={totalScore} className={cn("h-2", config.progressColor)} />
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {/* Factor breakdown */}
            <div className="grid gap-2">
              {factors.map((factor) => (
                <div
                  key={factor.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-md transition-colors",
                    factor.status === 'complete' ? "bg-success/5" : "bg-muted/30"
                  )}
                >
                  <factor.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{factor.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{factor.weight}% weight</span>
                        {getStatusIcon(factor.status)}
                      </div>
                    </div>
                    <Progress value={factor.score} className="h-1.5 mt-1.5" />
                  </div>
                </div>
              ))}
            </div>

            {/* Top improvements */}
            {improvements.length > 0 && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Quick Improvements</span>
                </div>
                <ul className="space-y-1.5">
                  {improvements.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <item.icon className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                      <span>{item.improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
