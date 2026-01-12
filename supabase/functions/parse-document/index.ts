import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParseRequest {
  fileUrl: string;
  fileName: string;
  fileType: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const contentType = fileResponse.headers.get("content-type") || "";

    // Handle different file types
    if (fileType === "txt" || contentType.includes("text/plain")) {
      // Plain text - read directly
      content = await fileResponse.text();
    } 
    else if (fileType === "csv" || contentType.includes("text/csv")) {
      // CSV - parse and format as readable text
      const csvText = await fileResponse.text();
      content = parseCSV(csvText);
    }
    else if (fileType === "pdf" || contentType.includes("application/pdf")) {
      // PDF - use Lovable AI for extraction
      const arrayBuffer = await fileResponse.arrayBuffer();
      content = await extractWithAI(arrayBuffer, fileName, "pdf");
    }
    else if (fileType === "docx" || contentType.includes("wordprocessingml")) {
      // DOCX - extract using AI
      const arrayBuffer = await fileResponse.arrayBuffer();
      content = await extractWithAI(arrayBuffer, fileName, "docx");
    }
    else if (fileType === "xlsx" || fileType === "xls" || contentType.includes("spreadsheetml")) {
      // Excel - extract using AI
      const arrayBuffer = await fileResponse.arrayBuffer();
      content = await extractWithAI(arrayBuffer, fileName, "excel");
    }
    else {
      // Try to read as text
      try {
        content = await fileResponse.text();
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        content,
        fileName,
        fileType,
        charCount: content.length 
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

async function extractWithAI(arrayBuffer: ArrayBuffer, fileName: string, fileType: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    console.warn("LOVABLE_API_KEY not configured, returning placeholder");
    return `[Document: ${fileName}]\n\nNote: Document parsing requires AI configuration. Please contact support to enable full document parsing.\n\nFile type: ${fileType}\nFile size: ${arrayBuffer.byteLength} bytes`;
  }

  // Convert to base64 for the AI
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
  );

  try {
    // Use Gemini's vision capability for document understanding
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
                text: `Extract ALL text content from this ${fileType.toUpperCase()} document named "${fileName}". 
                
For financial documents (invoices, revenue statements, reports):
- Extract all numbers, amounts, dates
- Identify line items, totals, subtotals
- Note any percentages, growth rates, or comparisons
- Include headers, footers, and any tabular data

For marketing documents:
- Extract campaign names, budgets, metrics
- Note any KPIs, ROI figures, conversion rates
- Include target audience information

For general documents:
- Preserve the document structure (headings, sections)
- Include all text content
- Note any important figures or data points

Return the extracted content in a clean, readable format. If this is a spreadsheet, format data in rows.`
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
      
      // Fallback: return basic info about the file
      return `[Document: ${fileName}]\n\nFile type: ${fileType}\nFile size: ${arrayBuffer.byteLength} bytes\n\nNote: Full content extraction unavailable. The AI analysis will use the document information provided above.`;
    }

    const result = await response.json();
    const extractedContent = result.choices?.[0]?.message?.content || "";
    
    if (!extractedContent) {
      return `[Document: ${fileName}]\n\nUnable to extract content from this document. Please ensure the file is not password-protected or corrupted.`;
    }

    return `=== Document: ${fileName} ===\n\n${extractedContent}`;

  } catch (error) {
    console.error("AI extraction failed:", error);
    return `[Document: ${fileName}]\n\nFile type: ${fileType}\nFile size: ${arrayBuffer.byteLength} bytes\n\nNote: Content extraction encountered an error. Basic file information is included above.`;
  }
}
