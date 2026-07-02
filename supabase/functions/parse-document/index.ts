import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';
import { aiCall } from '../_shared/llm-call.ts';


import { maybeHealthResponse } from '../_shared/health.ts';
const FUNCTION_NAME = 'parse-document';
const FUNCTION_VERSION = '1.0.0';

// Module-scope logger for helpers outside the request handler.
const log = createLogger('parse-document', 'module');

// Security headers for all responses
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
};

// CORS configuration - tightened for production
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = [
    "https://aiwmcquantis.com",
    "https://www.aiwmcquantis.com",
    "http://localhost:5173",
    "http://localhost:8080",
  ];
  
  // Also allow Lovable preview domains
  const isLovablePreview = origin?.includes(".lovable.app") || origin?.includes(".lovable.dev") || origin?.includes(".lovableproject.com");
  const isAllowed = origin && (allowedOrigins.includes(origin) || isLovablePreview);
  
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    ...securityHeaders,
  };
}

interface ParseRequest {
  fileUrl: string;
  fileName: string;
  fileType: string;
}

// ========== EXTRACTED FINANCIALS STRUCTURE ==========
interface ExtractedFinancials {
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
  document_type: 'revenue_statement' | 'invoice' | 'marketing_report' | 'financial_forecast' | 'general' | 'unknown';
  confidence: number;
  key_findings: string[];
  source_document: string;
  extraction_notes: string[];
}

serve(async (req) => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
  const reqId = getRequestId(req);
  const log = createLogger('parse-document', reqId);

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Validate content type
    const contentType = req.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return new Response(
        JSON.stringify({ error: "Content-Type must be application/json" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== ENTITLEMENT GATE: aiDocIntelligence ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required for document parsing", code: "AUTH_REQUIRED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token", code: "INVALID_AUTH" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    const { requireFeature, EntitlementError } = await import("../_shared/entitlements.ts");
    try {
      await requireFeature(supabaseService, userId, 'aiDocIntelligence', '/parse-document');
    } catch (e) {
      if (e instanceof EntitlementError) return e.toResponse(corsHeaders);
      throw e;
    }
    log.info(`[parse-document] user=${userId} authorized`);
    // ========== END ENTITLEMENT GATE ==========

    const { fileUrl, fileName, fileType } = await req.json() as ParseRequest;

    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: "fileUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== SSRF GUARD ==========
    // Only allow fetching from this project's Supabase Storage endpoint.
    // Blocks arbitrary URLs (internal metadata endpoints, localhost, private IPs,
    // attacker-controlled hosts, non-http(s) schemes).
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(fileUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: "fileUrl must be a valid URL", code: "INVALID_URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const storageOrigin = new URL(supabaseUrl).origin;
    const isAllowedHost = parsedUrl.origin === storageOrigin;
    const isAllowedPath = parsedUrl.pathname.startsWith("/storage/v1/object/");
    if (
      (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") ||
      !isAllowedHost ||
      !isAllowedPath
    ) {
      log.warn(`[parse-document] Blocked non-storage fileUrl for user=${userId}: ${parsedUrl.origin}${parsedUrl.pathname}`);
      return new Response(
        JSON.stringify({
          error: "fileUrl must point to this project's document storage",
          code: "UNTRUSTED_FILE_URL",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // ========== END SSRF GUARD ==========

    // ========== DOCUMENT SIZE LIMIT (100KB) ==========
    const MAX_DOCUMENT_SIZE = 102400; // 100KB limit
    log.info(`Parsing document: ${fileName} (${fileType})`);

    // Fetch the file with size check
    const fileResponse = await fetch(fileUrl, { redirect: "error" });

    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.status}`);
    }

    // Check content-length header if available
    const contentLength = fileResponse.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_DOCUMENT_SIZE) {
      log.info(`Document rejected: ${fileName} is ${parseInt(contentLength)} bytes (limit: ${MAX_DOCUMENT_SIZE})`);
      return new Response(
        JSON.stringify({ 
          error: "Document too large. Maximum size is 100KB",
          code: "DOCUMENT_TOO_LARGE",
          size: parseInt(contentLength),
          limit: MAX_DOCUMENT_SIZE
        }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // (file already fetched above; reuse fileResponse)
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.status}`);
    }

    let content = "";
    let extractedFinancials: ExtractedFinancials | null = null;
    const fileContentType = fileResponse.headers.get("content-type") || "";

    // Handle different file types
    if (fileType === "txt" || fileContentType.includes("text/plain")) {
      // Plain text - read directly
      content = await fileResponse.text();
      extractedFinancials = extractFinancialsFromText(content, fileName);
    } 
    else if (fileType === "csv" || fileContentType.includes("text/csv")) {
      // CSV - parse and format as readable text
      const csvText = await fileResponse.text();
      content = parseCSV(csvText);
      extractedFinancials = extractFinancialsFromText(content, fileName);
    }
    else if (fileType === "pdf" || fileContentType.includes("application/pdf")) {
      // PDF - use Lovable AI for extraction with structured output
      const arrayBuffer = await fileResponse.arrayBuffer();
      const result = await extractWithAI(arrayBuffer, fileName, "pdf");
      content = result.content;
      extractedFinancials = result.financials;
    }
    else if (fileType === "docx" || fileContentType.includes("wordprocessingml")) {
      // DOCX - extract using AI with structured output
      const arrayBuffer = await fileResponse.arrayBuffer();
      const result = await extractWithAI(arrayBuffer, fileName, "docx");
      content = result.content;
      extractedFinancials = result.financials;
    }
    else if (fileType === "xlsx" || fileType === "xls" || fileContentType.includes("spreadsheetml")) {
      // Excel - extract using AI with structured output
      const arrayBuffer = await fileResponse.arrayBuffer();
      const result = await extractWithAI(arrayBuffer, fileName, "excel");
      content = result.content;
      extractedFinancials = result.financials;
    }
    else {
      // Try to read as text
      try {
        content = await fileResponse.text();
        extractedFinancials = extractFinancialsFromText(content, fileName);
      } catch {
        content = "[Unable to extract content from this file type]";
      }
    }

    // Truncate if too long (max 50000 chars to fit in prompt)
    const maxLength = 50000;
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + "\n\n[Content truncated due to length...]";
    }

    log.info(`Extracted ${content.length} characters from ${fileName}`);
    if (extractedFinancials) {
      log.info(`Document type: ${extractedFinancials.document_type}, Confidence: ${extractedFinancials.confidence}%`);
      log.info(`Key findings: ${extractedFinancials.key_findings.length}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        content,
        fileName,
        fileType,
        charCount: content.length,
        extractedFinancials
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    log.error("Parse document error:", error);
    const origin = req.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to parse document",
        content: "" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseCSV(csvText: string): string {
  const lines = csvText.split("\n").filter(line => line.trim());
  if (lines.length === 0) return "";

  const result: string[] = [];
  result.push("=== SPREADSHEET DATA ===\n");

  // Try to parse as CSV
  const rows = lines.map(line => {
    // Simple CSV parsing (handles basic cases)
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  });

  // Format as table
  if (rows.length > 0) {
    const headers = rows[0];
    result.push(`Columns: ${headers.join(" | ")}\n`);
    result.push(`Total rows: ${rows.length - 1}\n\n`);

    // Show first 100 rows
    const dataRows = rows.slice(1, 101);
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const formattedRow = headers.map((h, j) => `${h}: ${row[j] || ""}`).join(", ");
      result.push(`Row ${i + 1}: ${formattedRow}`);
    }

    if (rows.length > 101) {
      result.push(`\n... and ${rows.length - 101} more rows`);
    }
  }

  return result.join("\n");
}

// Simple pattern-based extraction for text files
function extractFinancialsFromText(text: string, fileName: string): ExtractedFinancials {
  const financials: ExtractedFinancials = {
    document_type: 'general',
    confidence: 30,
    key_findings: [],
    source_document: fileName,
    extraction_notes: ['Basic pattern extraction - AI extraction recommended for complex documents']
  };

  // Detect document type based on keywords
  const textLower = text.toLowerCase();
  if (textLower.includes('revenue statement') || textLower.includes('income statement') || textLower.includes('profit and loss')) {
    financials.document_type = 'revenue_statement';
    financials.confidence = 50;
  } else if (textLower.includes('invoice') || textLower.includes('bill to')) {
    financials.document_type = 'invoice';
    financials.confidence = 50;
  } else if (textLower.includes('marketing') || textLower.includes('campaign') || textLower.includes('conversion')) {
    financials.document_type = 'marketing_report';
    financials.confidence = 50;
  } else if (textLower.includes('forecast') || textLower.includes('projection') || textLower.includes('budget')) {
    financials.document_type = 'financial_forecast';
    financials.confidence = 50;
  }

  // Extract key metrics
  const revenueMatch = text.match(/(?:total|gross|net)\s*revenue[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);
  const profitMatch = text.match(/(?:net|gross)\s*profit[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);
  const roiMatch = text.match(/roi[:\s]*([\d.]+)%?/i);
  const mrrMatch = text.match(/(?:mrr|monthly recurring)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);

  if (revenueMatch) {
    const value = parseFloat(revenueMatch[1].replace(/,/g, ''));
    financials.revenue = { total: value };
    financials.key_findings.push(`Total Revenue: $${value.toLocaleString()}`);
    financials.confidence += 10;
  }

  if (profitMatch) {
    const value = parseFloat(profitMatch[1].replace(/,/g, ''));
    financials.metrics = { ...financials.metrics, profit_margin: value };
    financials.key_findings.push(`Profit: $${value.toLocaleString()}`);
    financials.confidence += 10;
  }

  if (roiMatch) {
    const value = parseFloat(roiMatch[1]);
    financials.metrics = { ...financials.metrics, roi: value };
    financials.key_findings.push(`ROI: ${value}%`);
    financials.confidence += 10;
  }

  if (mrrMatch) {
    const value = parseFloat(mrrMatch[1].replace(/,/g, ''));
    financials.metrics = { ...financials.metrics, mrr: value };
    financials.key_findings.push(`MRR: $${value.toLocaleString()}`);
    financials.confidence += 10;
  }

  financials.confidence = Math.min(80, financials.confidence);
  return financials;
}

interface AIExtractionResult {
  content: string;
  financials: ExtractedFinancials;
}

async function extractWithAI(arrayBuffer: ArrayBuffer, fileName: string, fileType: string): Promise<AIExtractionResult> {
  const defaultFinancials: ExtractedFinancials = {
    document_type: 'unknown',
    confidence: 20,
    key_findings: [],
    source_document: fileName,
    extraction_notes: ['AI extraction not available']
  };

  if (!Deno.env.get("LOVABLE_API_KEY")) {
    log.warn("LOVABLE_API_KEY not configured, returning placeholder");
    return {
      content: `[Document: ${fileName}]\n\nNote: Document parsing requires AI configuration. Please contact support to enable full document parsing.\n\nFile type: ${fileType}\nFile size: ${arrayBuffer.byteLength} bytes`,
      financials: defaultFinancials
    };
  }

  // Convert to base64 for the AI
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
  );

  try {
    // Use Gemini's vision capability with structured extraction prompt
    const aiResult = await aiCall(
      {
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a financial data extraction specialist. Extract ALL content and financial data from this ${fileType.toUpperCase()} document named "${fileName}".

## EXTRACTION REQUIREMENTS

### 1. Full Text Content
Extract all text preserving structure:
- Headers, sections, paragraphs
- Tables formatted as rows
- All numbers, dates, amounts

### 2. Structured Financial Data
Extract these specific metrics when found:

REVENUE DATA:
- Total Revenue (any period)
- Monthly Revenue / MRR
- Quarterly Revenue
- Annual Revenue / ARR
- Revenue by category/service

COST DATA:
- Total Expenses/Costs
- Monthly Operating Costs
- Cost breakdown by category

KEY METRICS:
- ROI (Return on Investment)
- Profit Margin %
- Net Profit amount
- Customer Count
- CAC (Customer Acquisition Cost)
- LTV (Customer Lifetime Value)
- Conversion Rate

INVESTMENT DATA:
- Initial Investment
- Capital Expenditure
- Startup Costs

### 3. Document Classification
Identify document type:
- revenue_statement (income/P&L statements)
- invoice (bills, invoices)
- marketing_report (campaigns, metrics)
- financial_forecast (projections, budgets)
- general (other business documents)

## OUTPUT FORMAT

First, provide the extracted text content.

Then, at the end of your response, include a JSON block with extracted financials:

\`\`\`json
{
  "document_type": "revenue_statement|invoice|marketing_report|financial_forecast|general",
  "revenue": {"total": number_or_null, "monthly": number_or_null, "quarterly": number_or_null, "annual": number_or_null, "breakdown": {"category": "amount"}},
  "costs": {"total": number_or_null, "monthly": number_or_null, "breakdown": {"category": "amount"}},
  "metrics": {"roi": number_or_null, "profit_margin": number_or_null, "net_profit": number_or_null, "customer_count": number_or_null, "mrr": number_or_null, "arr": number_or_null, "cac": number_or_null, "ltv": number_or_null},
  "investment": {"total": number_or_null, "breakdown": {"category": "amount"}},
  "key_findings": ["Finding 1: specific value"],
  "confidence": 0-100
}
\`\`\`

Be precise with numbers. Include currency and period context in key_findings.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/${fileType === "pdf" ? "pdf" : "octet-stream"};base64,${base64}`
                }
              }
            ]
          }
        ],
        max_tokens: 16000,
      },
      { task: 'parse-document', timeoutMs: 60_000, metadata: { fileName, fileType, bytes: arrayBuffer.byteLength } },
    );

    if (!aiResult.ok) {
      log.error("AI extraction error:", aiResult.status, aiResult.error);
      return {
        content: `[Document: ${fileName}]\n\nFile type: ${fileType}\nFile size: ${arrayBuffer.byteLength} bytes\n\nNote: Full content extraction unavailable. The AI analysis will use the document information provided above.`,
        financials: defaultFinancials
      };
    }

    const choices = aiResult.data.choices as Array<{ message?: { content?: string } }> | undefined;
    const extractedContent = choices?.[0]?.message?.content || "";

    // Parse extracted financials from JSON block
    let parsedFinancials: ExtractedFinancials = {
      ...defaultFinancials,
      confidence: 60,
      extraction_notes: ['AI extraction completed']
    };

    // Try to extract JSON from the response
    const jsonMatch = extractedContent.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const jsonData = JSON.parse(jsonMatch[1]);
        parsedFinancials = {
          document_type: jsonData.document_type || 'general',
          revenue: jsonData.revenue,
          costs: jsonData.costs,
          metrics: jsonData.metrics,
          investment: jsonData.investment,
          key_findings: jsonData.key_findings || [],
          confidence: jsonData.confidence || 70,
          source_document: fileName,
          extraction_notes: ['AI extraction with structured output']
        };
      } catch (parseErr) {
        log.warn("Failed to parse JSON from AI response:", parseErr);
        parsedFinancials.extraction_notes = ['AI extraction completed, JSON parsing failed'];
      }
    }

    // Remove JSON block from content for cleaner text
    const cleanContent = extractedContent.replace(/```json[\s\S]*?```/g, '').trim();

    return {
      content: cleanContent || extractedContent,
      financials: parsedFinancials
    };

  } catch (error) {
    log.error("AI extraction failed:", error);
    return {
      content: `[Document: ${fileName}]\n\nFile type: ${fileType}\nFile size: ${arrayBuffer.byteLength} bytes\n\nNote: AI extraction failed. The analysis will proceed with limited document context.`,
      financials: defaultFinancials
    };
  }
}
