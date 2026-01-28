import React, { useRef, useMemo } from 'react';
import { FileDown, RefreshCw, CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinancialSummary } from './FinancialSummary';
import { BusinessPlanSection } from './BusinessPlanSection';
import { MarketingSection } from './MarketingSection';
import { MarketAnalysisSection } from './MarketAnalysisSection';
import { ValidationSection } from './ValidationSection';
import { ActionableInsights } from './ActionableInsights';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { DocumentInsights } from './DocumentInsights';
import { cn } from '@/lib/utils';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { getMonthlyProfit, getPaybackMonths, getMonthlyRevenue } from '@/types/analysis';
import type { ExtractedFinancials, DocumentAnalysisSummary } from '@/types/documentAnalysis';
import { usePdfExport } from '@/hooks/usePdfExport';
import { toast } from 'sonner';

interface AnalysisResultsProps {
  result: BusinessAnalysisResult;
  onReset?: () => void;
}

export function AnalysisResults({ result, onReset }: AnalysisResultsProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { generatePdf, isGenerating } = usePdfExport();

  // Convert documents_used to ExtractedFinancials format for DocumentInsights
  const documentInsightsData = useMemo(() => {
    if (!result.documents_used || result.documents_used.length === 0) {
      return { documents: [] as ExtractedFinancials[], summary: null };
    }

    // Convert DocumentUsage[] to ExtractedFinancials[] format
    const documents: ExtractedFinancials[] = result.documents_used.map(doc => ({
      document_type: doc.document_type as ExtractedFinancials['document_type'],
      confidence: doc.confidence,
      key_findings: doc.metrics_extracted,
      source_document: doc.source_document,
      extraction_notes: [],
    }));

    // Build summary from result data
    const summary: DocumentAnalysisSummary = {
      total_documents: result.documents_used.length,
      documents_with_financials: result.documents_used.filter(d => d.metrics_extracted.length > 0).length,
      total_confidence_boost: result.document_analysis_summary?.confidenceBoost || 0,
      primary_data_sources: result.documents_used.map(d => d.source_document),
      extracted_values: {}
    };

    return { documents, summary };
  }, [result.documents_used, result.document_analysis_summary]);

  const handleExportPDF = async () => {
    const toastId = 'pdf-generation';
    
    try {
      toast.loading('Generating your Executive Report...', { 
        id: toastId,
        description: 'This may take up to 30 seconds for the 8-page report.',
      });
      
      await generatePdf(result);
      
      toast.success('Executive Report downloaded!', { 
        id: toastId,
        description: 'Your professional 8-page PDF report is ready.',
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : '';
      
      if (errorMessage.includes('TIMEOUT')) {
        toast.error('PDF generation timed out', { 
          id: toastId,
          description: 'Please try again. If the problem persists, try with a simpler analysis.',
        });
      } else if (errorMessage.includes('VALIDATION')) {
        toast.error('Analysis data incomplete', { 
          id: toastId,
          description: 'Please run a new analysis to generate a complete report.',
        });
      } else {
        toast.error('Failed to generate PDF', { 
          id: toastId,
          description: 'Please try again or contact support if the issue persists.',
        });
      }
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    if (score >= 60) return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
    return 'bg-destructive/10 text-destructive border-destructive/30';
  };

  const getConfidenceIcon = (score: number) => {
    if (score >= 80) return CheckCircle2;
    if (score >= 60) return Info;
    return AlertCircle;
  };

  const ConfidenceIcon = getConfidenceIcon(result.confidence_score);

  return (
    <div className="space-y-6" ref={contentRef}>
      {/* Header */}
      <div className="section-card">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">{result.metadata.idea}</h2>
            <p className="text-muted-foreground">📍 {result.metadata.location}</p>
            {result.metadata.industry_detected && (
              <Badge variant="outline" className="text-xs">
                Industry: {result.metadata.industry_detected}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button 
            onClick={handleExportPDF} 
            variant="outline" 
            className="gap-2"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            {isGenerating ? 'Generating...' : 'Download Executive Report'}
          </Button>
          {onReset && (
            <Button onClick={onReset} variant="ghost" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              New Analysis
            </Button>
          )}
        </div>
      </div>

      {/* Confidence Indicator - Always visible at top */}
      <ConfidenceIndicator 
        score={result.confidence_score} 
        breakdown={result.validation?.confidence_breakdown}
        suggestions={result.validation?.improvement_suggestions}
      />

      {/* Validation Section - Show data quality */}
      {result.validation && (
        <ValidationSection validation={result.validation} />
      )}

      {/* Document Insights - Show how documents improved analysis */}
      {documentInsightsData.documents.length > 0 && documentInsightsData.summary && (
        <DocumentInsights 
          documents={documentInsightsData.documents}
          summary={documentInsightsData.summary}
        />
      )}

      {/* Actionable Insights - Priority action plan */}
      {result.actionable_insights && result.actionable_insights.insights.length > 0 && (
        <ActionableInsights insights={result.actionable_insights} />
      )}

      {/* Tabs for different sections */}
      <Tabs defaultValue="financial" className="w-full">
        <TabsList className="w-full grid grid-cols-4 mb-4">
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="business">Business Plan</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="market">Market</TabsTrigger>
        </TabsList>
        
        <TabsContent value="financial">
          <FinancialSummary financial={result.financial_analysis} />
        </TabsContent>
        
        <TabsContent value="business">
          <BusinessPlanSection plan={result.business_plan} />
        </TabsContent>
        
        <TabsContent value="marketing">
          <MarketingSection marketing={result.marketing_plan} />
        </TabsContent>
        
        <TabsContent value="market">
          <MarketAnalysisSection market={result.market_analysis} />
        </TabsContent>
      </Tabs>

      {/* Limitations & Sources */}
      <div className="section-card space-y-4">
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Data Sources</h4>
          <div className="flex flex-wrap gap-2">
            {result.data_sources.map((source, i) => (
              <Badge key={i} variant="outline" className="text-xs">{source}</Badge>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Analysis Limitations</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            {result.limitations.map((limitation, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                {limitation}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground pt-2 border-t border-border">
          Generated: {new Date(result.metadata.generated_at).toLocaleString('en-US')} • 
          Model: {result.metadata.model} • Version: {result.metadata.version}
        </p>
      </div>
    </div>
  );
}
