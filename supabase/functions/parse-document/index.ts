import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========== SUBSCRIPTION VERIFICATION ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          error: "Authentication required for document parsing",
          code: "AUTH_REQUIRED"
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Verify user authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid authentication",
          code: "INVALID_AUTH"
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify Plus or Pro subscription using service role
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    const { data: subscription, error: subError } = await supabaseService
      .from("subscriptions")
      .select("plan_id, status, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subError) {
      console.error("Subscription check error:", subError);
    }

    const isValidSubscription = subscription && 
      (subscription.status === "active" || subscription.status === "trialing") &&
      (subscription.plan_id === "plus" || subscription.plan_id === "pro") &&
      (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());

    if (!isValidSubscription) {
      console.log(`Document upload blocked for user ${user.id}: plan=${subscription?.plan_id}, status=${subscription?.status}`);
      return new Response(
        JSON.stringify({ 
          error: "Document Intelligence requires Plus or Pro subscription",
          code: "SUBSCRIPTION_REQUIRED",
          current_plan: subscription?.plan_id || "free"
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Document upload authorized for user ${user.id}: plan=${subscription.plan_id}`);
    // ========== END SUBSCRIPTION VERIFICATION ==========

    const { fileUrl, fileName, fileType } = await req.json() as ParseRequest;

    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: "fileUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Parsing document: ${fileName} (${fileType})`);

    // Fetch the file
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.status}`);
    }

    let content = "";
    let extractedFinancials: ExtractedFinancials | null = null;
    const contentType = fileResponse.headers.get("content-type") || "";

    // Handle different file types
    if (fileType === "txt" || contentType.includes("text/plain")) {
      // Plain text - read directly
      content = await fileResponse.text();
      extractedFinancials = extractFinancialsFromText(content, fileName);
    } 
    else if (fileType === "csv" || contentType.includes("text/csv")) {
      // CSV - parse and format as readable text
      const csvText = await fileResponse.text();
      content = parseCSV(csvText);
      extractedFinancials = extractFinancialsFromText(content, fileName);
    }
    else if (fileType === "pdf" || contentType.includes("application/pdf")) {
      // PDF - use Lovable AI for extraction with structured output
      const arrayBuffer = await fileResponse.arrayBuffer();
      const result = await extractWithAI(arrayBuffer, fileName, "pdf");
      content = result.content;
      extractedFinancials = result.financials;
    }
    else if (fileType === "docx" || contentType.includes("wordprocessingml")) {
      // DOCX - extract using AI with structured output
      const arrayBuffer = await fileResponse.arrayBuffer();
      const result = await extractWithAI(arrayBuffer, fileName, "docx");
      content = result.content;
      extractedFinancials = result.financials;
    }
    else if (fileType === "xlsx" || fileType === "xls" || contentType.includes("spreadsheetml")) {
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

    console.log(`Extracted ${content.length} characters from ${fileName}`);
    if (extractedFinancials) {
      console.log(`Document type: ${extractedFinancials.document_type}, Confidence: ${extractedFinancials.confidence}%`);
      console.log(`Key findings: ${extractedFinancials.key_findings.length}`);
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
    console.error("Parse document error:", error);
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

  // Common currency patterns
  const currencyPattern = /\$[\d,]+(?:\.\d{2})?/g;
  const percentPattern = /[\d.]+%/g;
  
  const amounts = text.match(currencyPattern) || [];
  const percentages = text.match(percentPattern) || [];

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
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  const defaultFinancials: ExtractedFinancials = {
    document_type: 'unknown',
    confidence: 20,
    key_findings: [],
    source_document: fileName,
    extraction_notes: ['AI extraction not available']
  };
  
  if (!LOVABLE_API_KEY) {
    console.warn("LOVABLE_API_KEY not configured, returning placeholder");
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
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
  "revenue": {
    "total": number_or_null,
    "monthly": number_or_null,
    "quarterly": number_or_null,
    "annual": number_or_null,
    "breakdown": {"category": amount}
  },
  "costs": {
    "total": number_or_null,
    "monthly": number_or_null,
    "breakdown": {"category": amount}
  },
  "metrics": {
    "roi": number_or_null,
    "profit_margin": number_or_null,
    "net_profit": number_or_null,
    "customer_count": number_or_null,
    "mrr": number_or_null,
    "arr": number_or_null,
    "cac": number_or_null,
    "ltv": number_or_null
  },
  "investment": {
    "total": number_or_null,
    "breakdown": {"category": amount}
  },
  "key_findings": ["Finding 1: specific value", "Finding 2: specific metric"],
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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI extraction error:", response.status, errorText);
      
      return {
        content: `[Document: ${fileName}]\n\nFile type: ${fileType}\nFile size: ${arrayBuffer.byteLength} bytes\n\nNote: Full content extraction unavailable. The AI analysis will use the document information provided above.`,
        financials: defaultFinancials
      };
    }

    const result = await response.json();
    const extractedContent = result.choices?.[0]?.message?.content || "";
    
    if (!extractedContent) {
      return {
        content: `[Document: ${fileName}]\n\nUnable to extract content from this document. Please ensure the file is not password-protected or corrupted.`,
        financials: defaultFinancials
      };
    }

    // Parse the structured JSON from the response
    let financials: ExtractedFinancials = {
      document_type: 'general',
      confidence: 50,
      key_findings: [],
      source_document: fileName,
      extraction_notes: ['AI-powered extraction']
    };

    // Try to extract JSON block from response
    const jsonMatch = extractedContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsedData = JSON.parse(jsonMatch[1]);
        
        financials = {
          document_type: parsedData.document_type || 'general',
          confidence: Math.min(95, parsedData.confidence || 60),
          key_findings: parsedData.key_findings || [],
          source_document: fileName,
          extraction_notes: ['AI-powered extraction with structured data'],
          revenue: parsedData.revenue,
          costs: parsedData.costs,
          metrics: parsedData.metrics,
          investment: parsedData.investment
        };
        
        // Boost confidence based on data found
        if (financials.revenue?.total) financials.confidence = Math.min(95, financials.confidence + 5);
        if (financials.metrics?.roi) financials.confidence = Math.min(95, financials.confidence + 5);
        if (financials.metrics?.mrr) financials.confidence = Math.min(95, financials.confidence + 5);
        
        console.log(`Successfully parsed structured financials: ${JSON.stringify(financials.metrics)}`);
      } catch (e) {
        console.warn("Failed to parse structured JSON from AI response:", e);
        financials.extraction_notes.push('Structured data parsing failed - using text content only');
      }
    }

    // Remove JSON block from content for cleaner text
    const cleanContent = extractedContent.replace(/```json[\s\S]*?```/g, '').trim();

    return {
      content: `=== Document: ${fileName} ===\n\n${cleanContent}`,
      financials
    };

  } catch (error) {
    console.error("AI extraction failed:", error);
    return {
      content: `[Document: ${fileName}]\n\nFile type: ${fileType}\nFile size: ${arrayBuffer.byteLength} bytes\n\nNote: Content extraction encountered an error. Basic file information is included above.`,
      financials: defaultFinancials
    };
  }
}
