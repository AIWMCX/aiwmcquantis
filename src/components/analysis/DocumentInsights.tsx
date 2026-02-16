import React from 'react';
import { FileText, TrendingUp, CheckCircle2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ExtractedFinancials, 
  DocumentAnalysisSummary,
  getDocumentTypeLabel,
  getDocumentConfidenceBoost
} from '@/types/documentAnalysis';

interface DocumentInsightsProps {
  documents: ExtractedFinancials[];
  summary: DocumentAnalysisSummary;
}

export function DocumentInsights({ documents, summary }: DocumentInsightsProps) {
  if (documents.length === 0) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Document-Powered Analysis
          <Badge variant="secondary" className="ml-2 text-xs">
            +{summary.total_confidence_boost}% Confidence
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>
            Analyzed {summary.total_documents} document{summary.total_documents > 1 ? 's' : ''} with {summary.documents_with_financials} containing financial data
          </span>
        </div>

        {/* Extracted Values */}
        {Object.keys(summary.extracted_values).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Data Used in Analysis
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {summary.extracted_values.revenue && (
                <ExtractedValueCard
                  label="Monthly Revenue"
                  value={formatCurrency(summary.extracted_values.revenue.value)}
                  source={summary.extracted_values.revenue.source}
                />
              )}
              {summary.extracted_values.mrr && (
                <ExtractedValueCard
                  label="MRR"
                  value={formatCurrency(summary.extracted_values.mrr.value)}
                  source={summary.extracted_values.mrr.source}
                />
              )}
              {summary.extracted_values.investment && (
                <ExtractedValueCard
                  label="Investment"
                  value={formatCurrency(summary.extracted_values.investment.value)}
                  source={summary.extracted_values.investment.source}
                />
              )}
              {summary.extracted_values.costs && (
                <ExtractedValueCard
                  label="Monthly Costs"
                  value={formatCurrency(summary.extracted_values.costs.value)}
                  source={summary.extracted_values.costs.source}
                />
              )}
              {summary.extracted_values.roi && (
                <ExtractedValueCard
                  label="ROI"
                  value={`${summary.extracted_values.roi.value}%`}
                  source={summary.extracted_values.roi.source}
                />
              )}
              {summary.extracted_values.customer_count && (
                <ExtractedValueCard
                  label="Customer Count"
                  value={summary.extracted_values.customer_count.value.toLocaleString()}
                  source={summary.extracted_values.customer_count.source}
                />
              )}
              {summary.extracted_values.cac && (
                <ExtractedValueCard
                  label="CAC"
                  value={formatCurrency(summary.extracted_values.cac.value)}
                  source={summary.extracted_values.cac.source}
                />
              )}
              {summary.extracted_values.ltv && (
                <ExtractedValueCard
                  label="LTV"
                  value={formatCurrency(summary.extracted_values.ltv.value)}
                  source={summary.extracted_values.ltv.source}
                />
              )}
            </div>
          </div>
        )}

        {/* Document Details */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Processed Documents
          </h4>
          <div className="space-y-2">
            {documents.map((doc, index) => (
              <DocumentCard key={index} document={doc} />
            ))}
          </div>
        </div>

        {/* How it helps */}
        <div className="text-xs text-muted-foreground flex items-start gap-2 pt-2 border-t border-border">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Your documents provide real business data that replaces AI estimates, resulting in more accurate financial projections and recommendations.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

interface ExtractedValueCardProps {
  label: string;
  value: string;
  source: string;
}

function ExtractedValueCard({ label, value, source }: ExtractedValueCardProps) {
  // Truncate source filename if too long
  const shortSource = source.length > 25 
    ? source.substring(0, 22) + '...' 
    : source;

  return (
    <div className="bg-background rounded-lg p-3 border border-border/50">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
      <div className="text-xs text-primary/70 truncate" title={source}>
        From: {shortSource}
      </div>
    </div>
  );
}

interface DocumentCardProps {
  document: ExtractedFinancials;
}

function DocumentCard({ document }: DocumentCardProps) {
  const confidenceBoost = getDocumentConfidenceBoost(document.document_type);
  const typeLabel = getDocumentTypeLabel(document.document_type);
  
  // Truncate filename if too long
  const shortName = document.source_document.length > 35 
    ? document.source_document.substring(0, 32) + '...' 
    : document.source_document;

  return (
    <div className="flex items-start justify-between gap-2 p-2 rounded bg-background/50 border border-border/30">
      <div className="flex items-start gap-2 min-w-0">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="text-sm font-medium truncate" title={document.source_document}>
            {shortName}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge variant="outline" className="text-xs">
              {typeLabel}
            </Badge>
            {document.key_findings.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {document.key_findings.length} finding{document.key_findings.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </div>
      {confidenceBoost > 0 && (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs shrink-0">
          +{confidenceBoost}%
        </Badge>
      )}
    </div>
  );
}
