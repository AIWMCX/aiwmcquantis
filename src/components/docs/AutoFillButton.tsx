import React, { useState } from 'react';
import { Zap, ChevronDown, Loader2, FileText, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAnalysisAutoFill, type AnalysisSummary, type AutoFillData } from '@/hooks/useAnalysisAutoFill';

interface AutoFillButtonProps {
  onAutoFill: (data: AutoFillData) => void;
  disabled?: boolean;
  className?: string;
}

export function AutoFillButton({ onAutoFill, disabled, className }: AutoFillButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { analyses, isLoading, hasAnalyses, getAutoFillData, getMostRecentAutoFill } = useAnalysisAutoFill();

  const handleQuickFill = () => {
    const data = getMostRecentAutoFill();
    if (data) {
      onAutoFill(data);
    }
  };

  const handleSelectAnalysis = (analysisId: string) => {
    const data = getAutoFillData(analysisId);
    if (data) {
      onAutoFill(data);
      setIsOpen(false);
    }
  };

  if (!hasAnalyses && !isLoading) {
    return null; // Don't show button if no analyses exist
  }

  return (
    <>
      <div className={cn('flex items-center gap-2', className)}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleQuickFill}
          disabled={disabled || isLoading || !hasAnalyses}
          className="gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          Auto-fill from Analysis
        </Button>

        {analyses.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(true)}
            disabled={disabled || isLoading}
            className="px-2"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Select Analysis to Auto-Fill
            </DialogTitle>
            <DialogDescription>
              Choose a business analysis to auto-populate your document fields
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[400px] overflow-y-auto py-2">
            {analyses.map((analysis, index) => (
              <AnalysisCard
                key={analysis.id}
                analysis={analysis}
                isFirst={index === 0}
                onClick={() => handleSelectAnalysis(analysis.id)}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface AnalysisCardProps {
  analysis: AnalysisSummary;
  isFirst: boolean;
  onClick: () => void;
}

function AnalysisCard({ analysis, isFirst, onClick }: AnalysisCardProps) {
  const businessName =
    analysis.idea?.split(' ').slice(0, 4).join(' ') || 'Business Analysis';

  const monthlyRevenue =
    analysis.result?.financial_analysis?.scenarios?.base?.revenue ?? analysis.monthly_profit ?? 0;

  const roi = analysis.result?.financial_analysis?.returns?.roi_year_1 ?? 0;
  
  const createdDate = new Date(analysis.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-lg border text-left transition-all',
        'hover:border-primary/50 hover:bg-primary/5',
        'focus:outline-none focus:ring-2 focus:ring-primary/20',
        isFirst && 'border-primary/30 bg-primary/5'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-foreground truncate">{businessName}</span>
            {isFirst && (
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                Most Recent
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <Calendar className="w-3 h-3" />
            <span>{createdDate}</span>
            {analysis.location && (
              <>
                <span className="mx-1">•</span>
                <span className="truncate">{analysis.location}</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            {monthlyRevenue > 0 && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-success" />
                <span className="font-medium text-foreground">
                  ${monthlyRevenue.toLocaleString('en-US')}/mo
                </span>
              </div>
            )}
            {roi > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium text-foreground">
                  {roi}% ROI
                </span>
              </div>
            )}
          </div>
        </div>
        
        {analysis.confidence_score && (
          <div className="flex-shrink-0">
            <div 
              className={cn(
                'text-xs font-medium px-2 py-1 rounded-full',
                analysis.confidence_score >= 80 ? 'bg-success/10 text-success' :
                analysis.confidence_score >= 60 ? 'bg-primary/10 text-primary' :
                'bg-warning/10 text-warning'
              )}
            >
              {analysis.confidence_score}%
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
