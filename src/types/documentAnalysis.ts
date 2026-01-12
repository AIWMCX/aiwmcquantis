// ============================================
// DOCUMENT ANALYSIS & EXTRACTION TYPES
// ============================================

/**
 * Structured financial data extracted from business documents
 */
export interface ExtractedFinancials {
  revenue?: {
    total?: number;
    monthly?: number;
    quarterly?: number;
    annual?: number;
    breakdown?: Record<string, number>;
  };
  costs?: {
    total?: number;
    monthly?: number;
    breakdown?: Record<string, number>;
  };
  metrics?: {
    roi?: number;
    profit_margin?: number;
    net_profit?: number;
    conversion_rate?: number;
    customer_count?: number;
    mrr?: number;
    arr?: number;
    cac?: number;
    ltv?: number;
  };
  investment?: {
    total?: number;
    breakdown?: Record<string, number>;
  };
  document_type: DocumentType;
  confidence: number;
  key_findings: string[];
  source_document: string;
  extraction_notes: string[];
}

export type DocumentType = 
  | 'revenue_statement' 
  | 'invoice' 
  | 'marketing_report' 
  | 'financial_forecast' 
  | 'general' 
  | 'unknown';

/**
 * Document insight showing how a document improved the analysis
 */
export interface DocumentInsight {
  document_name: string;
  document_type: DocumentType;
  metrics_extracted: MetricExtraction[];
  confidence_boost: number;
  impact_summary: string;
}

export interface MetricExtraction {
  metric_name: string;
  value: number | string;
  source: string;
  used_in_calculation: boolean;
}

/**
 * Aggregate document analysis summary
 */
export interface DocumentAnalysisSummary {
  total_documents: number;
  documents_with_financials: number;
  total_confidence_boost: number;
  primary_data_sources: string[];
  extracted_values: {
    revenue?: { value: number; source: string };
    costs?: { value: number; source: string };
    investment?: { value: number; source: string };
    roi?: { value: number; source: string };
    mrr?: { value: number; source: string };
    customer_count?: { value: number; source: string };
    cac?: { value: number; source: string };
    ltv?: { value: number; source: string };
  };
}

/**
 * Helper function to get confidence boost based on document type
 */
export function getDocumentConfidenceBoost(docType: DocumentType): number {
  switch (docType) {
    case 'revenue_statement':
      return 15;
    case 'financial_forecast':
      return 12;
    case 'invoice':
      return 8;
    case 'marketing_report':
      return 10;
    case 'general':
      return 5;
    default:
      return 0;
  }
}

/**
 * Helper function to get human-readable document type label
 */
export function getDocumentTypeLabel(docType: DocumentType): string {
  switch (docType) {
    case 'revenue_statement':
      return 'Revenue Statement';
    case 'financial_forecast':
      return 'Financial Forecast';
    case 'invoice':
      return 'Invoice';
    case 'marketing_report':
      return 'Marketing Report';
    case 'general':
      return 'Business Document';
    default:
      return 'Document';
  }
}

/**
 * Aggregate financials from multiple documents
 */
export function aggregateDocumentFinancials(
  documents: ExtractedFinancials[]
): DocumentAnalysisSummary {
  const summary: DocumentAnalysisSummary = {
    total_documents: documents.length,
    documents_with_financials: 0,
    total_confidence_boost: 0,
    primary_data_sources: [],
    extracted_values: {}
  };

  for (const doc of documents) {
    const hasFinancials = doc.revenue || doc.costs || doc.metrics || doc.investment;
    if (hasFinancials) {
      summary.documents_with_financials++;
    }

    // Calculate confidence boost
    summary.total_confidence_boost += getDocumentConfidenceBoost(doc.document_type);

    // Add to data sources
    if (doc.source_document) {
      summary.primary_data_sources.push(doc.source_document);
    }

    // Extract and prioritize values (later documents override earlier ones)
    if (doc.revenue?.monthly) {
      summary.extracted_values.revenue = {
        value: doc.revenue.monthly,
        source: doc.source_document
      };
    } else if (doc.revenue?.total) {
      // Estimate monthly from total (assume quarterly if > 100k, annual otherwise)
      const divisor = doc.revenue.total > 100000 ? 3 : 12;
      summary.extracted_values.revenue = {
        value: Math.round(doc.revenue.total / divisor),
        source: doc.source_document
      };
    }

    if (doc.costs?.monthly) {
      summary.extracted_values.costs = {
        value: doc.costs.monthly,
        source: doc.source_document
      };
    }

    if (doc.investment?.total) {
      summary.extracted_values.investment = {
        value: doc.investment.total,
        source: doc.source_document
      };
    }

    if (doc.metrics?.roi) {
      summary.extracted_values.roi = {
        value: doc.metrics.roi,
        source: doc.source_document
      };
    }

    if (doc.metrics?.mrr) {
      summary.extracted_values.mrr = {
        value: doc.metrics.mrr,
        source: doc.source_document
      };
    }

    if (doc.metrics?.customer_count) {
      summary.extracted_values.customer_count = {
        value: doc.metrics.customer_count,
        source: doc.source_document
      };
    }

    if (doc.metrics?.cac) {
      summary.extracted_values.cac = {
        value: doc.metrics.cac,
        source: doc.source_document
      };
    }

    if (doc.metrics?.ltv) {
      summary.extracted_values.ltv = {
        value: doc.metrics.ltv,
        source: doc.source_document
      };
    }
  }

  // Cap total confidence boost
  summary.total_confidence_boost = Math.min(25, summary.total_confidence_boost);

  return summary;
}
