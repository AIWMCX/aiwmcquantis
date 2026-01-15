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
    try {
      toast.info('Generating Executive Report...', { duration: 2000 });
      await generatePdf(result);
      toast.success('Executive Report downloaded successfully');
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  const handleLegacyExportPDF = () => {
    const printContent = contentRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Business Analysis: ${result.metadata.idea}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
            h2 { color: #374151; margin-top: 30px; }
            h3 { color: #4b5563; }
            .metric { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 10px 0; }
            .metric-value { font-size: 24px; font-weight: bold; color: #1f2937; }
            .section { margin: 20px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
            th { background: #f9fafb; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>🧠 Business Analysis</h1>
          <p><strong>Idea:</strong> ${result.metadata.idea}</p>
          <p><strong>Location:</strong> ${result.metadata.location}</p>
          <p><strong>Date:</strong> ${new Date(result.metadata.generated_at).toLocaleDateString('en-US')}</p>
          <p><strong>Confidence Level:</strong> ${result.confidence_score}%</p>
          
          <h2>📊 Financial Analysis</h2>
          <div class="metric">
            <div>Startup Investment</div>
            <div class="metric-value">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(result.financial_analysis.startup_investment.total)}</div>
          </div>
          <div class="metric">
            <div>Monthly Revenue (MRR)</div>
            <div class="metric-value">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(getMonthlyRevenue(result.financial_analysis))}</div>
          </div>
          <div class="metric">
            <div>Monthly Profit</div>
            <div class="metric-value">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(getMonthlyProfit(result.financial_analysis))}</div>
          </div>
          <div class="metric">
            <div>Payback Period</div>
            <div class="metric-value">${getPaybackMonths(result.financial_analysis)} months</div>
          </div>
          
          <h2>📋 Business Plan</h2>
          <div class="section">
            <h3>Summary</h3>
            <p>${result.business_plan.executive_summary}</p>
            
            <h3>Product</h3>
            <p>${result.business_plan.product_description}</p>
            
            <h3>Target Audience</h3>
            <p>${result.business_plan.target_audience}</p>
          </div>
          
          <h2>📈 Marketing</h2>
          <div class="section">
            <p><strong>CAC:</strong> ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(result.marketing_plan.cac)}</p>
            <p><strong>LTV:</strong> ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(result.marketing_plan.ltv)}</p>
            <p>${result.marketing_plan.positioning}</p>
          </div>
          
          <div class="footer">
            <p>Generated by AIWMC Quantis™ • ${new Date().toLocaleString('en-US')}</p>
            <p>Limitations: ${result.limitations.join(', ')}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
