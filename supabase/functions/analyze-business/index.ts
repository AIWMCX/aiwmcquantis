import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// Embedded benchmarks are now seeded via database migration - no import needed

// ========== NEW INTELLIGENCE MODULES ==========
import { 
  getEnhancedLocationMultiplier, 
  getLocationMultiplier,
  calculateLocationAdjustedCosts,
  type LocationMultiplierResult 
} from "./location-intelligence.ts";

import { 
  detectSubIndustry, 
  applySubIndustryModifiers,
  getSubIndustryChurnRate,
  type SubIndustryResult 
} from "./sub-industry-detection.ts";

// ========== QUANTIS 2.0 ENGINE ==========
import { 
  processQuantisAnalysis,
  type QuantisEngineInput,
  type QuantisEngineOutput,
  QUANTIS_ENGINE_INFO
} from "./quantis-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-id, x-fingerprint",
};

// ========== SECURITY UTILITIES ==========

/**
 * Validates HTTP request for security issues
 */
function validateHttpRequest(req: Request): { valid: boolean; error?: string } {
  // Check content type for POST requests
  const contentType = req.headers.get('content-type');
  if (req.method !== 'GET' && req.method !== 'OPTIONS' && !contentType?.includes('application/json')) {
    return { valid: false, error: 'Invalid content type. Expected application/json' };
  }
  
  // Check request size (1MB limit to prevent DoS)
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 1048576) {
    return { valid: false, error: 'Request too large. Maximum size is 1MB' };
  }
  
  return { valid: true };
}

/**
 * Sanitizes input string to prevent XSS and injection attacks
 */
function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/<[^>]*>/g, '')      // Remove HTML tags
    .replace(/[<>{}]/g, '')       // Remove dangerous chars
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '')      // Remove event handlers like onclick=
    .replace(/data:/gi, '')       // Remove data: protocol
    .trim();
}

/**
 * Validates input string for dangerous patterns
 */
function validateInputSafety(input: string, fieldName: string): { valid: boolean; error?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  // Check for XSS patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:\s*text\/html/i,
    /&#x/i,
    /&#\d+;/i,
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(input)) {
      return { valid: false, error: `${fieldName} contains invalid characters` };
    }
  }
  
  return { valid: true };
}

/**
 * Validates numeric input is within safe bounds
 */
function validateNumericInput(value: unknown, min: number, max: number, fieldName: string): { valid: boolean; error?: string; value?: number } {
  if (value === undefined || value === null) {
    return { valid: true }; // Optional field
  }
  
  const num = Number(value);
  
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }
  
  if (num < min || num > max) {
    return { valid: false, error: `${fieldName} must be between ${min} and ${max}` };
  }
  
  return { valid: true, value: num };
}

// ========== END SECURITY UTILITIES ==========

interface OptionalFinancialInputs {
  startup_investment?: number;
  monthly_revenue?: number;
  average_price?: number;
  expected_customers?: number;
  monthly_costs?: number;
  cac?: number;
  churn_rate?: number;
}

interface DocumentData {
  name: string;
  type: string;
  parsedContent: string;
  extractedFinancials?: ExtractedDocumentFinancials;
}

interface ExtractedDocumentFinancials {
  revenue?: { total?: number; monthly?: number; quarterly?: number; annual?: number; breakdown?: Record<string, number> };
  costs?: { total?: number; monthly?: number; breakdown?: Record<string, number> };
  metrics?: { roi?: number; profit_margin?: number; net_profit?: number; conversion_rate?: number; customer_count?: number; mrr?: number; arr?: number; cac?: number; ltv?: number };
  investment?: { total?: number; breakdown?: Record<string, number> };
  document_type: string;
  confidence: number;
  key_findings: string[];
  source_document: string;
  extraction_notes: string[];
}

interface AnalysisRequest {
  idea: string;
  location: string;
  financial_inputs?: OptionalFinancialInputs;
  selected_industry?: string;
  documents?: DocumentData[];
}

// ========== DATABASE BENCHMARK TYPES ==========

interface DatabaseBenchmarkRecord {
  id: string;
  industry_id: string;
  industry_name: string;
  region: string | null;
  keywords: string[] | null;
  cogs_percent_min: number | null;
  cogs_percent_max: number | null;
  cogs_percent_avg: number | null;
  gross_margin_min: number | null;
  gross_margin_max: number | null;
  gross_margin_avg: number | null;
  net_margin_min: number | null;
  net_margin_max: number | null;
  net_margin_avg: number | null;
  cac_min: number | null;
  cac_max: number | null;
  cac_typical: number | null;
  ltv_min: number | null;
  ltv_max: number | null;
  ltv_typical: number | null;
  ltv_cac_ratio_min: number | null;
  ltv_cac_ratio_max: number | null;
  average_check_min: number | null;
  average_check_max: number | null;
  orders_per_client: number | null;
  client_lifetime_months: number | null;
  salaries_fixed: number | null;
  rent_fixed: number | null;
  utilities_fixed: number | null;
  other_fixed: number | null;
  market_size_usd: number | null;
  growth_rate_percent: number | null;
  competition_level: string | null;
  confidence_score: number | null;
  sample_size: number | null;
  source: string | null;
  additional_metrics: Record<string, unknown> | null;
}

interface BenchmarkResult {
  benchmark: IndustryBenchmarks;
  source: 'database' | 'hardcoded' | 'hybrid';
  confidence: number;
  matchedIndustryId: string;
  matchedRegion: string | null;
  sampleSize: number | null;
  dataSource: string | null;
}

// ========== MULTI-INDUSTRY BENCHMARK SYSTEM ==========

interface IndustryBenchmarks {
  id: string;
  name: string;
  cogs_percent: number;
  salaries_fixed: number;
  rent_fixed: number;
  utilities_fixed: number;
  other_fixed: number;
  cac_min: number;
  cac_max: number;
  cac_typical: number;
  average_check_min: number;
  average_check_max: number;
  orders_per_client: number;
  client_lifetime_months: number;
  ltv_cac_min: number;
  ltv_cac_max: number;
  net_margin_min: number;
  net_margin_max: number;
  keywords: string[];
}

const INDUSTRY_BENCHMARKS: IndustryBenchmarks[] = [
  {
    id: 'saas',
    name: 'SaaS / Software',
    cogs_percent: 20,
    salaries_fixed: 8000,
    rent_fixed: 500,
    utilities_fixed: 200,
    other_fixed: 1000,
    cac_min: 50,
    cac_max: 500,
    cac_typical: 150,
    average_check_min: 20,
    average_check_max: 500,
    orders_per_client: 1,
    client_lifetime_months: 24,
    ltv_cac_min: 3,
    ltv_cac_max: 8,
    net_margin_min: 15,
    net_margin_max: 40,
    keywords: ['saas', 'software', 'app', 'platform', 'subscription', 'api', 'cloud', 'service', 'automation', 'digital product', 'web app', 'mobile app', 'tool', 'dashboard']
  },
  {
    id: 'ecommerce',
    name: 'E-commerce / Retail',
    cogs_percent: 55,
    salaries_fixed: 4000,
    rent_fixed: 1500,
    utilities_fixed: 300,
    other_fixed: 800,
    cac_min: 15,
    cac_max: 80,
    cac_typical: 35,
    average_check_min: 30,
    average_check_max: 200,
    orders_per_client: 3,
    client_lifetime_months: 12,
    ltv_cac_min: 3,
    ltv_cac_max: 6,
    net_margin_min: 5,
    net_margin_max: 15,
    keywords: ['store', 'shop', 'ecommerce', 'e-commerce', 'retail', 'marketplace', 'online store', 'dropshipping', 'products', 'selling', 'merch', 'merchandise']
  },
  {
    id: 'food_service',
    name: 'Food & Beverage',
    cogs_percent: 38,
    salaries_fixed: 6000,
    rent_fixed: 2000,
    utilities_fixed: 500,
    other_fixed: 1200,
    cac_min: 8,
    cac_max: 30,
    cac_typical: 15,
    average_check_min: 8,
    average_check_max: 40,
    orders_per_client: 4,
    client_lifetime_months: 6,
    ltv_cac_min: 3,
    ltv_cac_max: 6,
    net_margin_min: 5,
    net_margin_max: 15,
    keywords: ['restaurant', 'cafe', 'bakery', 'food', 'delivery', 'catering', 'coffee', 'bar', 'kitchen', 'meal', 'pizza', 'burger', 'sushi', 'dessert', 'cake', 'pastry', 'пекарня', 'ресторан', 'кафе', 'доставка еды']
  },
  {
    id: 'consulting',
    name: 'Consulting / Professional Services',
    cogs_percent: 15,
    salaries_fixed: 10000,
    rent_fixed: 1000,
    utilities_fixed: 200,
    other_fixed: 500,
    cac_min: 100,
    cac_max: 1000,
    cac_typical: 300,
    average_check_min: 500,
    average_check_max: 5000,
    orders_per_client: 1,
    client_lifetime_months: 18,
    ltv_cac_min: 3,
    ltv_cac_max: 10,
    net_margin_min: 20,
    net_margin_max: 50,
    keywords: ['consulting', 'consultant', 'agency', 'services', 'professional', 'advisor', 'coach', 'coaching', 'training', 'b2b', 'enterprise']
  },
  {
    id: 'fitness',
    name: 'Fitness / Wellness',
    cogs_percent: 25,
    salaries_fixed: 5000,
    rent_fixed: 3000,
    utilities_fixed: 500,
    other_fixed: 800,
    cac_min: 20,
    cac_max: 100,
    cac_typical: 50,
    average_check_min: 50,
    average_check_max: 200,
    orders_per_client: 1,
    client_lifetime_months: 8,
    ltv_cac_min: 3,
    ltv_cac_max: 6,
    net_margin_min: 15,
    net_margin_max: 35,
    keywords: ['gym', 'fitness', 'yoga', 'pilates', 'wellness', 'health', 'workout', 'training', 'sport', 'crossfit', 'personal trainer', 'spa', 'massage']
  },
  {
    id: 'education',
    name: 'Education / Online Courses',
    cogs_percent: 20,
    salaries_fixed: 4000,
    rent_fixed: 500,
    utilities_fixed: 100,
    other_fixed: 500,
    cac_min: 30,
    cac_max: 200,
    cac_typical: 80,
    average_check_min: 50,
    average_check_max: 500,
    orders_per_client: 2,
    client_lifetime_months: 12,
    ltv_cac_min: 3,
    ltv_cac_max: 8,
    net_margin_min: 25,
    net_margin_max: 60,
    keywords: ['course', 'education', 'learning', 'online course', 'tutorial', 'training', 'school', 'academy', 'bootcamp', 'teaching', 'edtech', 'e-learning']
  },
  {
    id: 'healthcare',
    name: 'Healthcare / Medical',
    cogs_percent: 30,
    salaries_fixed: 12000,
    rent_fixed: 3000,
    utilities_fixed: 500,
    other_fixed: 2000,
    cac_min: 50,
    cac_max: 300,
    cac_typical: 120,
    average_check_min: 100,
    average_check_max: 1000,
    orders_per_client: 3,
    client_lifetime_months: 24,
    ltv_cac_min: 3,
    ltv_cac_max: 8,
    net_margin_min: 10,
    net_margin_max: 30,
    keywords: ['health', 'medical', 'clinic', 'doctor', 'dental', 'therapy', 'telehealth', 'pharmacy', 'healthcare', 'hospital', 'patient']
  },
  {
    id: 'fintech',
    name: 'Fintech / Financial Services',
    cogs_percent: 15,
    salaries_fixed: 15000,
    rent_fixed: 2000,
    utilities_fixed: 300,
    other_fixed: 3000,
    cac_min: 30,
    cac_max: 200,
    cac_typical: 80,
    average_check_min: 10,
    average_check_max: 100,
    orders_per_client: 12,
    client_lifetime_months: 36,
    ltv_cac_min: 3,
    ltv_cac_max: 10,
    net_margin_min: 20,
    net_margin_max: 50,
    keywords: ['fintech', 'finance', 'banking', 'payment', 'invest', 'trading', 'crypto', 'wallet', 'money', 'insurance', 'lending', 'credit']
  },
  {
    id: 'media',
    name: 'Media / Content / Entertainment',
    cogs_percent: 25,
    salaries_fixed: 5000,
    rent_fixed: 1000,
    utilities_fixed: 200,
    other_fixed: 800,
    cac_min: 5,
    cac_max: 50,
    cac_typical: 20,
    average_check_min: 5,
    average_check_max: 30,
    orders_per_client: 1,
    client_lifetime_months: 12,
    ltv_cac_min: 3,
    ltv_cac_max: 8,
    net_margin_min: 15,
    net_margin_max: 40,
    keywords: ['media', 'content', 'streaming', 'video', 'podcast', 'entertainment', 'news', 'blog', 'publishing', 'newsletter', 'creator', 'influencer']
  },
  {
    id: 'real_estate',
    name: 'Real Estate / Property',
    cogs_percent: 10,
    salaries_fixed: 8000,
    rent_fixed: 2000,
    utilities_fixed: 300,
    other_fixed: 1500,
    cac_min: 200,
    cac_max: 2000,
    cac_typical: 500,
    average_check_min: 1000,
    average_check_max: 20000,
    orders_per_client: 1,
    client_lifetime_months: 60,
    ltv_cac_min: 3,
    ltv_cac_max: 10,
    net_margin_min: 10,
    net_margin_max: 30,
    keywords: ['real estate', 'property', 'rental', 'housing', 'apartment', 'home', 'realty', 'broker', 'agent', 'landlord', 'lease']
  },
  {
    id: 'logistics',
    name: 'Logistics / Delivery',
    cogs_percent: 45,
    salaries_fixed: 6000,
    rent_fixed: 3000,
    utilities_fixed: 800,
    other_fixed: 2000,
    cac_min: 20,
    cac_max: 100,
    cac_typical: 40,
    average_check_min: 10,
    average_check_max: 100,
    orders_per_client: 8,
    client_lifetime_months: 12,
    ltv_cac_min: 3,
    ltv_cac_max: 6,
    net_margin_min: 5,
    net_margin_max: 15,
    keywords: ['logistics', 'delivery', 'shipping', 'courier', 'freight', 'transport', 'warehouse', 'fulfillment', 'supply chain']
  },
  {
    id: 'general',
    name: 'General Business',
    cogs_percent: 35,
    salaries_fixed: 5000,
    rent_fixed: 1500,
    utilities_fixed: 300,
    other_fixed: 1000,
    cac_min: 30,
    cac_max: 150,
    cac_typical: 60,
    average_check_min: 30,
    average_check_max: 300,
    orders_per_client: 2,
    client_lifetime_months: 12,
    ltv_cac_min: 3,
    ltv_cac_max: 6,
    net_margin_min: 10,
    net_margin_max: 25,
    keywords: []
  }
];

// ========== DATABASE BENCHMARK FUNCTIONS ==========

/**
 * Fetches all industry benchmarks from the database
 * Auto-seeds from embedded data if empty
 */
async function fetchDatabaseBenchmarks(supabase: SupabaseClient): Promise<DatabaseBenchmarkRecord[]> {
  try {
    // First, auto-seed if empty
    await autoSeedBenchmarksIfEmpty(supabase);
    
    const { data, error } = await supabase
      .from('industry_benchmarks')
      .select('*');
    
    if (error) {
      console.error('Failed to fetch benchmarks from database:', error.message);
      return [];
    }
    
    console.log(`Fetched ${data?.length || 0} benchmark records from database`);
    return data || [];
  } catch (err) {
    console.error('Database benchmark fetch error:', err);
    return [];
  }
}

/**
 * Transforms a database benchmark record into the IndustryBenchmarks interface
 * Uses defaults from hardcoded benchmarks if database values are null
 */
function transformDbBenchmark(db: DatabaseBenchmarkRecord, fallback?: IndustryBenchmarks): IndustryBenchmarks {
  // Find a default fallback from hardcoded benchmarks
  const defaultBenchmark = fallback || INDUSTRY_BENCHMARKS.find(i => i.id === 'general')!;
  
  return {
    id: db.industry_id,
    name: db.industry_name,
    cogs_percent: db.cogs_percent_avg ?? defaultBenchmark.cogs_percent,
    salaries_fixed: db.salaries_fixed ?? defaultBenchmark.salaries_fixed,
    rent_fixed: db.rent_fixed ?? defaultBenchmark.rent_fixed,
    utilities_fixed: db.utilities_fixed ?? defaultBenchmark.utilities_fixed,
    other_fixed: db.other_fixed ?? defaultBenchmark.other_fixed,
    cac_min: db.cac_min ?? defaultBenchmark.cac_min,
    cac_max: db.cac_max ?? defaultBenchmark.cac_max,
    cac_typical: db.cac_typical ?? defaultBenchmark.cac_typical,
    average_check_min: db.average_check_min ?? defaultBenchmark.average_check_min,
    average_check_max: db.average_check_max ?? defaultBenchmark.average_check_max,
    orders_per_client: db.orders_per_client ?? defaultBenchmark.orders_per_client,
    client_lifetime_months: db.client_lifetime_months ?? defaultBenchmark.client_lifetime_months,
    ltv_cac_min: db.ltv_cac_ratio_min ?? defaultBenchmark.ltv_cac_min,
    ltv_cac_max: db.ltv_cac_ratio_max ?? defaultBenchmark.ltv_cac_max,
    net_margin_min: db.net_margin_min ?? defaultBenchmark.net_margin_min,
    net_margin_max: db.net_margin_max ?? defaultBenchmark.net_margin_max,
    keywords: db.keywords ?? [],
  };
}

/**
 * Calculates keyword match score between business idea and benchmark keywords
 */
function calculateKeywordScore(businessIdea: string, keywords: string[]): number {
  if (!keywords || keywords.length === 0) return 0;
  
  const ideaLower = businessIdea.toLowerCase();
  let score = 0;
  
  for (const keyword of keywords) {
    const kw = keyword.toLowerCase();
    if (ideaLower.includes(kw)) {
      // Longer keywords are more specific and worth more points
      score += kw.length;
    }
  }
  
  return score;
}

/**
 * Enhanced industry detection that queries database first, then falls back to hardcoded
 * Returns benchmark with source tracking
 */
async function detectIndustryFromDatabase(
  businessIdea: string,
  location: string,
  dbBenchmarks: DatabaseBenchmarkRecord[],
  selectedIndustryId?: string
): Promise<BenchmarkResult> {
  const ideaLower = businessIdea.toLowerCase();
  const locationLower = location.toLowerCase();
  
  // If user explicitly selected an industry, try to find it
  if (selectedIndustryId && selectedIndustryId !== 'auto') {
    // First check database
    const dbMatch = dbBenchmarks.find(db => db.industry_id === selectedIndustryId);
    if (dbMatch) {
      console.log(`Using user-selected industry from database: ${dbMatch.industry_name}`);
      return {
        benchmark: transformDbBenchmark(dbMatch),
        source: 'database',
        confidence: dbMatch.confidence_score ?? 80,
        matchedIndustryId: dbMatch.industry_id,
        matchedRegion: dbMatch.region,
        sampleSize: dbMatch.sample_size,
        dataSource: dbMatch.source,
      };
    }
    
    // Then check hardcoded
    const hardcodedMatch = INDUSTRY_BENCHMARKS.find(i => i.id === selectedIndustryId);
    if (hardcodedMatch) {
      console.log(`Using user-selected industry from hardcoded: ${hardcodedMatch.name}`);
      return {
        benchmark: hardcodedMatch,
        source: 'hardcoded',
        confidence: 75,
        matchedIndustryId: hardcodedMatch.id,
        matchedRegion: null,
        sampleSize: null,
        dataSource: 'default_benchmarks',
      };
    }
  }
  
  // ===== PHASE 1: Search database benchmarks =====
  if (dbBenchmarks.length > 0) {
    let bestDbMatch: DatabaseBenchmarkRecord | null = null;
    let bestDbScore = 0;
    let regionMatch: DatabaseBenchmarkRecord | null = null;
    
    for (const db of dbBenchmarks) {
      const keywords = db.keywords || [];
      let score = calculateKeywordScore(ideaLower, keywords);
      
      // Bonus for region match
      if (db.region && locationLower.includes(db.region.toLowerCase())) {
        score += 50; // Significant bonus for region match
        if (score > bestDbScore) {
          regionMatch = db;
        }
      }
      
      if (score > bestDbScore) {
        bestDbScore = score;
        bestDbMatch = db;
      }
    }
    
    // Use region-matched benchmark if available and has good score
    if (regionMatch && bestDbScore >= 20) {
      console.log(`Matched database benchmark with region: ${regionMatch.industry_name} (${regionMatch.region}), score: ${bestDbScore}`);
      return {
        benchmark: transformDbBenchmark(regionMatch),
        source: 'database',
        confidence: regionMatch.confidence_score ?? 80,
        matchedIndustryId: regionMatch.industry_id,
        matchedRegion: regionMatch.region,
        sampleSize: regionMatch.sample_size,
        dataSource: regionMatch.source,
      };
    }
    
    // Use best matching benchmark if score is high enough
    if (bestDbMatch && bestDbScore >= 10) {
      console.log(`Matched database benchmark: ${bestDbMatch.industry_name}, score: ${bestDbScore}`);
      return {
        benchmark: transformDbBenchmark(bestDbMatch),
        source: 'database',
        confidence: bestDbMatch.confidence_score ?? 80,
        matchedIndustryId: bestDbMatch.industry_id,
        matchedRegion: bestDbMatch.region,
        sampleSize: bestDbMatch.sample_size,
        dataSource: bestDbMatch.source,
      };
    }
  }
  
  // ===== PHASE 2: Fall back to hardcoded benchmarks =====
  let bestMatch: IndustryBenchmarks | null = null;
  let bestScore = 0;
  
  for (const industry of INDUSTRY_BENCHMARKS) {
    if (industry.id === 'general') continue;
    
    let score = 0;
    for (const keyword of industry.keywords) {
      if (ideaLower.includes(keyword.toLowerCase())) {
        score += keyword.length;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = industry;
    }
  }
  
  const finalBenchmark = bestMatch || INDUSTRY_BENCHMARKS.find(i => i.id === 'general')!;
  console.log(`Using hardcoded benchmark: ${finalBenchmark.name}, score: ${bestScore}`);
  
  return {
    benchmark: finalBenchmark,
    source: 'hardcoded',
    confidence: bestScore > 0 ? 75 : 60,
    matchedIndustryId: finalBenchmark.id,
    matchedRegion: null,
    sampleSize: null,
    dataSource: 'default_benchmarks',
  };
}

/**
 * Legacy function for backward compatibility - uses hardcoded benchmarks only
 */
function detectIndustry(businessIdea: string): IndustryBenchmarks {
  const ideaLower = businessIdea.toLowerCase();
  
  let bestMatch: IndustryBenchmarks | null = null;
  let bestScore = 0;
  
  for (const industry of INDUSTRY_BENCHMARKS) {
    if (industry.id === 'general') continue;
    
    let score = 0;
    for (const keyword of industry.keywords) {
      if (ideaLower.includes(keyword.toLowerCase())) {
        score += keyword.length;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = industry;
    }
  }
  
  return bestMatch || INDUSTRY_BENCHMARKS.find(i => i.id === 'general')!;
}

// LEGACY getLocationMultiplier is now imported from location-intelligence.ts
// This comment preserves line numbers for reference - the old 3-tier system has been replaced
// with granular 50+ city multipliers for salary, rent, utilities, and marketing costs

// Tool schema for AI
const analysisToolSchema = {
  type: "function",
  function: {
    name: "submit_analysis",
    description: "Submit business analysis with realistic industry benchmarks",
    parameters: {
      type: "object",
      properties: {
        financial_json: { type: "string", description: "JSON object with financial metrics" },
        business_json: { type: "string", description: "JSON with business plan sections" },
        marketing_json: { type: "string", description: "JSON with marketing plan" },
        market_json: { type: "string", description: "JSON with market analysis" },
        confidence: { type: "number" },
        sources: { type: "string" },
        limitations: { type: "string" }
      },
      required: ["financial_json", "business_json", "marketing_json", "market_json", "confidence"]
    }
  }
};

function safeParseJSON(str: string, fallback: any): any {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    try {
      return JSON.parse(str.replace(/'/g, '"'));
    } catch {
      return fallback;
    }
  }
}

// ========== STRICT FINANCIAL CALCULATOR ==========

interface CalculationAudit {
  formula: string;
  inputs: Record<string, number>;
  result: number;
  isValid: boolean;
  notes?: string;
}

interface StrictFinancialResult {
  mrr: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPercent: number;
  grossProfit: number;
  grossMarginPercent: number;
  expenses: {
    cogs: number;
    salaries: number;
    rent: number;
    utilities: number;
    marketing: number;
    other: number;
  };
  cac: number;
  ltv: number;
  ltvCacRatio: number;
  averageCheck: number;
  ordersMonthly: number;
  clientsActive: number;
  newClientsNeeded: number;
  startupInvestment: number;
  paybackMonths: number;
  roiYear1Percent: number;
  breakEvenRevenue: number;
  revenueFor45kProfit: number;
  isProfitable: boolean;
  corrections: Array<{ field: string; original: number; corrected: number; reason: string }>;
  audit: CalculationAudit[];
  industryDetected: string;
}

function calculateStrictFinancials(
  rawMrr: number,
  rawInvestment: number,
  rawCac: number,
  rawLtv: number,
  rawAvgCheck: number,
  benchmarks: IndustryBenchmarks,
  locationMultipliers: LocationMultiplierResult,
  subIndustry: SubIndustryResult | null,
  userProvidedCosts?: number,
  userProvidedChurnRate?: number,
  userProvidedCustomers?: number
): StrictFinancialResult {
  const corrections: Array<{ field: string; original: number; corrected: number; reason: string }> = [];
  const audit: CalculationAudit[] = [];
  
  // ===== ENHANCED: Apply granular location multipliers =====
  const adjustedSalaries = Math.round(benchmarks.salaries_fixed * locationMultipliers.salary);
  const adjustedRent = Math.round(benchmarks.rent_fixed * locationMultipliers.rent);
  const adjustedUtilities = Math.round(benchmarks.utilities_fixed * locationMultipliers.utility);
  const adjustedOther = Math.round(benchmarks.other_fixed * locationMultipliers.overall);
  
  // Log location adjustment details
  console.log(`Location adjustments: salary=${locationMultipliers.salary}x, rent=${locationMultipliers.rent}x, utility=${locationMultipliers.utility}x, marketing=${locationMultipliers.marketing}x`);
  if (locationMultipliers.matched) {
    console.log(`Matched city: ${locationMultipliers.matchedCity} (${locationMultipliers.region})`);
  }
  
  // ===== ENHANCED: Apply sub-industry modifiers to benchmarks =====
  let effectiveBenchmarks = { ...benchmarks };
  let effectiveChurnRate = userProvidedChurnRate || 0.08; // Default 8% monthly
  
  if (subIndustry && subIndustry.confidence > 50) {
    const modified = applySubIndustryModifiers(
      {
        cac_typical: benchmarks.cac_typical,
        cac_min: benchmarks.cac_min,
        cac_max: benchmarks.cac_max,
        client_lifetime_months: benchmarks.client_lifetime_months,
        net_margin_min: benchmarks.net_margin_min,
        net_margin_max: benchmarks.net_margin_max,
      },
      subIndustry.modifiers
    );
    
    effectiveBenchmarks = {
      ...benchmarks,
      cac_typical: modified.cac_typical,
      cac_min: modified.cac_min,
      cac_max: modified.cac_max,
      client_lifetime_months: modified.client_lifetime_months,
      net_margin_min: modified.net_margin_min,
      net_margin_max: modified.net_margin_max,
    };
    
    // Use sub-industry churn rate if user didn't provide one
    if (!userProvidedChurnRate) {
      effectiveChurnRate = getSubIndustryChurnRate(subIndustry);
    }
    
    console.log(`Sub-industry detected: ${subIndustry.subIndustryName} (${subIndustry.businessModel}, ${subIndustry.targetScale})`);
    console.log(`Applied modifiers: CAC=${subIndustry.modifiers.cac_multiplier}x, LTV=${subIndustry.modifiers.ltv_multiplier}x, Churn=${subIndustry.modifiers.churn_multiplier}x`);
    console.log(`Effective churn rate: ${(effectiveChurnRate * 100).toFixed(1)}%/month`);
    
    audit.push({
      formula: 'Sub-Industry Detection',
      inputs: {
        'Business Model': subIndustry.businessModel,
        'Target Scale': subIndustry.targetScale,
        'CAC Multiplier': subIndustry.modifiers.cac_multiplier,
        'LTV Multiplier': subIndustry.modifiers.ltv_multiplier,
        'Churn Multiplier': subIndustry.modifiers.churn_multiplier,
      },
      result: subIndustry.confidence,
      isValid: true,
      notes: `${subIndustry.subIndustryName}: Keywords matched: ${subIndustry.detectedKeywords.join(', ') || 'none'}`
    });
  }
  
  // ===== STEP 1: Validate and correct input values =====
  
  // 1.1 Average Check
  let avgCheck = rawAvgCheck;
  if (avgCheck < benchmarks.average_check_min || avgCheck > benchmarks.average_check_max) {
    const corrected = Math.round((benchmarks.average_check_min + benchmarks.average_check_max) / 2);
    if (avgCheck < benchmarks.average_check_min) {
      corrections.push({
        field: 'average_check',
        original: avgCheck,
        corrected,
        reason: `Average check $${avgCheck} is below market minimum $${benchmarks.average_check_min} for ${benchmarks.name}`
      });
    } else {
      corrections.push({
        field: 'average_check',
        original: avgCheck,
        corrected,
        reason: `Average check $${avgCheck} exceeds market maximum $${benchmarks.average_check_max} for ${benchmarks.name}`
      });
    }
    avgCheck = corrected;
  }
  
  // 1.2 CAC - Use effectiveBenchmarks for sub-industry adjusted ranges
  let cac = rawCac;
  if (cac < effectiveBenchmarks.cac_min) {
    corrections.push({
      field: 'cac',
      original: cac,
      corrected: effectiveBenchmarks.cac_typical,
      reason: `CAC $${cac} is unrealistically low. Minimum is $${effectiveBenchmarks.cac_min} for ${subIndustry?.subIndustryName || benchmarks.name}.`
    });
    cac = effectiveBenchmarks.cac_typical;
  } else if (cac > effectiveBenchmarks.cac_max) {
    corrections.push({
      field: 'cac',
      original: cac,
      corrected: effectiveBenchmarks.cac_max,
      reason: `CAC $${cac} is too high for ${subIndustry?.subIndustryName || benchmarks.name}. Adjusted to maximum $${effectiveBenchmarks.cac_max}`
    });
    cac = effectiveBenchmarks.cac_max;
  }
  
  // Apply location marketing multiplier to CAC
  const locationAdjustedCac = Math.round(cac * locationMultipliers.marketing);
  if (locationAdjustedCac !== cac) {
    audit.push({
      formula: 'Location-Adjusted CAC',
      inputs: { 'Base CAC': cac, 'Marketing Multiplier': locationMultipliers.marketing },
      result: locationAdjustedCac,
      isValid: true,
      notes: `$${cac} × ${locationMultipliers.marketing}x = $${locationAdjustedCac} (${locationMultipliers.matchedCity || 'regional'} adjustment)`
    });
    cac = locationAdjustedCac;
  }
  
  // 1.3 LTV - calculate from formula with sub-industry adjusted lifetime
  // FORMULA: LTV = Avg_Check × Orders_per_Month × Lifetime_Months
  const effectiveLifetime = effectiveBenchmarks.client_lifetime_months;
  const calculatedLtv = avgCheck * benchmarks.orders_per_client * effectiveLifetime;
  
  audit.push({
    formula: 'LTV = Avg_Check × Orders_per_Month × Client_Lifetime',
    inputs: {
      'Average Check': avgCheck,
      'Orders/Month': benchmarks.orders_per_client,
      'Lifetime (months)': effectiveLifetime
    },
    result: calculatedLtv,
    isValid: true,
    notes: `$${avgCheck} × ${benchmarks.orders_per_client} × ${effectiveLifetime} = $${calculatedLtv}`
  });
  
  let ltv = calculatedLtv;
  
  if (Math.abs(rawLtv - calculatedLtv) > calculatedLtv * 0.5) {
    corrections.push({
      field: 'ltv',
      original: rawLtv,
      corrected: calculatedLtv,
      reason: `LTV recalculated: $${avgCheck} × ${benchmarks.orders_per_client} orders × ${effectiveLifetime} months = $${calculatedLtv}`
    });
  }
  
  // 1.4 Validate LTV:CAC ratio
  let ltvCacRatio = Math.round((ltv / cac) * 10) / 10;
  
  audit.push({
    formula: 'LTV:CAC = LTV / CAC',
    inputs: { LTV: ltv, CAC: cac },
    result: ltvCacRatio,
    isValid: ltvCacRatio >= benchmarks.ltv_cac_min && ltvCacRatio <= benchmarks.ltv_cac_max,
    notes: `$${ltv} / $${cac} = ${ltvCacRatio}x (healthy: ${benchmarks.ltv_cac_min}-${benchmarks.ltv_cac_max}x)`
  });
  
  if (ltvCacRatio > benchmarks.ltv_cac_max) {
    const targetLtv = cac * benchmarks.ltv_cac_max;
    corrections.push({
      field: 'ltv_cac_ratio',
      original: ltvCacRatio,
      corrected: benchmarks.ltv_cac_max,
      reason: `LTV:CAC ${ltvCacRatio}x is unrealistically high (max ${benchmarks.ltv_cac_max}x). LTV adjusted to $${targetLtv}`
    });
    ltv = targetLtv;
    ltvCacRatio = benchmarks.ltv_cac_max;
  }
  
  // ===== STEP 2: Calculate expense structure =====
  
  const mrr = rawMrr;
  
  // 2.1 COGS (variable cost)
  const cogs = Math.round(mrr * (benchmarks.cogs_percent / 100));
  
  audit.push({
    formula: 'COGS = Revenue × COGS%',
    inputs: { 'Revenue': mrr, 'COGS%': benchmarks.cogs_percent },
    result: cogs,
    isValid: true,
    notes: `$${mrr} × ${benchmarks.cogs_percent}% = $${cogs}`
  });
  
  // 2.2 Fixed costs
  const salaries = adjustedSalaries;
  const rent = adjustedRent;
  const utilities = adjustedUtilities;
  const other = adjustedOther;
  const fixedCosts = salaries + rent + utilities + other;
  
  // 2.3 Marketing cost - Use dynamic churn rate from sub-industry detection
  const revenuePerClient = avgCheck * benchmarks.orders_per_client;
  
  // Use user-provided customers if available
  const clientsActive = userProvidedCustomers && userProvidedCustomers > 0 
    ? userProvidedCustomers 
    : Math.ceil(mrr / revenuePerClient);
  
  // ENHANCED: Use sub-industry specific churn rate instead of hardcoded 25%
  const monthlyChurnPercent = effectiveChurnRate * 100;
  const newClientsNeeded = Math.ceil(clientsActive * effectiveChurnRate);
  const marketing = newClientsNeeded * cac;
  
  audit.push({
    formula: 'Marketing = New_Clients × CAC',
    inputs: { 
      'Active Clients': clientsActive,
      'Monthly Churn Rate': `${monthlyChurnPercent.toFixed(1)}%`,
      'New Clients Needed': newClientsNeeded,
      'CAC': cac 
    },
    result: marketing,
    isValid: true,
    notes: `${clientsActive} clients × ${monthlyChurnPercent.toFixed(1)}% churn = ${newClientsNeeded} new clients × $${cac} = $${marketing}${userProvidedCustomers ? ' (user-provided customer count)' : ''}`
  });
  
  // 2.4 Total expenses - CRITICAL: Use user-provided costs if available
  let totalExpenses: number;
  let expenseSource: 'user' | 'calculated' = 'calculated';
  
  if (userProvidedCosts && userProvidedCosts > 0) {
    // User provided their own monthly costs - use them directly
    totalExpenses = userProvidedCosts;
    expenseSource = 'user';
    
    audit.push({
      formula: 'Total_Expenses = User_Provided_Costs',
      inputs: { 'User Monthly Costs': userProvidedCosts },
      result: totalExpenses,
      isValid: true,
      notes: `Using user-provided monthly costs: $${userProvidedCosts.toLocaleString()}`
    });
  } else {
    // Calculate from industry benchmarks
    totalExpenses = cogs + fixedCosts + marketing;
    
    audit.push({
      formula: 'Total_Expenses = COGS + Fixed_Costs + Marketing',
      inputs: { 
        'COGS': cogs, 
        'Salaries': salaries,
        'Rent': rent,
        'Utilities': utilities,
        'Other': other,
        'Marketing': marketing 
      },
      result: totalExpenses,
      isValid: true,
      notes: `$${cogs} + $${salaries} + $${rent} + $${utilities} + $${other} + $${marketing} = $${totalExpenses}`
    });
  }
  
  // ===== STEP 3: Calculate profit metrics =====
  
  const netProfit = mrr - totalExpenses;
  const isProfitable = netProfit > 0;
  
  audit.push({
    formula: 'Net_Profit = Revenue - Expenses',
    inputs: { 'Revenue': mrr, 'Expenses': totalExpenses },
    result: netProfit,
    isValid: isProfitable,
    notes: `$${mrr} - $${totalExpenses} = $${netProfit} ${isProfitable ? '✓' : '❌ LOSS'}`
  });
  
  const netMarginPercent = mrr > 0 ? Math.round((netProfit / mrr) * 100) : 0;
  
  audit.push({
    formula: 'Net_Margin = (Profit / Revenue) × 100%',
    inputs: { 'Profit': netProfit, 'Revenue': mrr },
    result: netMarginPercent,
    isValid: netMarginPercent >= benchmarks.net_margin_min && netMarginPercent <= benchmarks.net_margin_max,
    notes: `($${netProfit} / $${mrr}) × 100 = ${netMarginPercent}% (healthy: ${benchmarks.net_margin_min}-${benchmarks.net_margin_max}%)`
  });
  
  const grossProfit = mrr - cogs;
  const grossMarginPercent = mrr > 0 ? Math.round((grossProfit / mrr) * 100) : 0;
  
  // ===== STEP 4: Calculate investment metrics =====
  
  const startupInvestment = rawInvestment;
  
  let paybackMonths = 0;
  if (startupInvestment > 0) {
    if (netProfit > 0) {
      paybackMonths = Math.ceil(startupInvestment / netProfit);
    } else {
      paybackMonths = 999;
    }
  }
  
  audit.push({
    formula: 'Payback = Investment / Monthly_Profit',
    inputs: { 'Investment': startupInvestment, 'Profit/mo': netProfit },
    result: paybackMonths,
    isValid: paybackMonths < 36 && paybackMonths > 0,
    notes: paybackMonths === 999 
      ? 'Business is unprofitable - payback impossible' 
      : `$${startupInvestment} / $${netProfit} = ${paybackMonths} months`
  });
  
  let roiYear1Percent = 0;
  if (startupInvestment > 0) {
    roiYear1Percent = Math.round((netProfit * 12 / startupInvestment) * 100);
  }
  
  audit.push({
    formula: 'ROI = (Profit × 12 / Investment) × 100%',
    inputs: { 'Profit/mo': netProfit, 'Investment': startupInvestment },
    result: roiYear1Percent,
    isValid: roiYear1Percent > 0,
    notes: `($${netProfit} × 12 / $${startupInvestment}) × 100 = ${roiYear1Percent}%`
  });
  
  const variableCostRatio = (benchmarks.cogs_percent / 100) + (marketing / mrr);
  const breakEvenRevenue = Math.round(fixedCosts / (1 - variableCostRatio));
  
  audit.push({
    formula: 'Break_Even = Fixed_Costs / (1 - Variable_Cost_Ratio)',
    inputs: { 
      'Fixed Costs': fixedCosts, 
      'Variable Cost %': Math.round(variableCostRatio * 100) 
    },
    result: breakEvenRevenue,
    isValid: true,
    notes: `$${fixedCosts} / (1 - ${Math.round(variableCostRatio * 100)}%) = $${breakEvenRevenue}/mo`
  });
  
  const targetProfit = 45000;
  const revenueFor45kProfit = Math.round((fixedCosts + targetProfit) / (1 - variableCostRatio));
  
  audit.push({
    formula: 'Revenue_for_$45k = (Fixed_Costs + $45000) / (1 - Variable%)',
    inputs: { 
      'Fixed Costs': fixedCosts, 
      'Target Profit': targetProfit,
      'Variable Cost %': Math.round(variableCostRatio * 100) 
    },
    result: revenueFor45kProfit,
    isValid: true,
    notes: `($${fixedCosts} + $${targetProfit}) / (1 - ${Math.round(variableCostRatio * 100)}%) = $${revenueFor45kProfit}/mo`
  });
  
  return {
    mrr,
    totalExpenses,
    netProfit,
    netMarginPercent,
    grossProfit,
    grossMarginPercent,
    expenses: {
      cogs,
      salaries,
      rent,
      utilities,
      marketing,
      other
    },
    cac,
    ltv,
    ltvCacRatio,
    averageCheck: avgCheck,
    ordersMonthly: Math.round(mrr / avgCheck),
    clientsActive,
    newClientsNeeded,
    startupInvestment,
    paybackMonths,
    roiYear1Percent,
    breakEvenRevenue,
    revenueFor45kProfit,
    isProfitable,
    corrections,
    audit,
    industryDetected: benchmarks.name
  };
}

// ========== ACTIONABLE INSIGHTS ENGINE ==========

interface ActionableTactic {
  action: string;
  expected_impact: string;
  effort: 'low' | 'medium' | 'high';
  timeframe: string;
  cost_estimate?: string;
}

interface ActionableInsight {
  id: string;
  metric_name: string;
  current_value: number | string;
  target_value: number | string;
  gap: number | string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'danger' | 'warning' | 'healthy' | 'excellent';
  headline: string;
  explanation: string;
  why_it_matters: string;
  action_plan: {
    strategy: string;
    tactics: ActionableTactic[];
    expected_outcome: string;
    time_to_result: string;
  };
}

interface InsightsSummary {
  total_insights: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  overall_health: 'critical' | 'needs_work' | 'healthy' | 'excellent';
  top_priority: string;
  quick_wins: string[];
}

interface ActionableInsightsAnalysis {
  summary: InsightsSummary;
  insights: ActionableInsight[];
  generated_at: string;
}

function generateActionableInsights(
  calc: StrictFinancialResult,
  benchmarks: IndustryBenchmarks
): ActionableInsightsAnalysis {
  const insights: ActionableInsight[] = [];
  const quickWins: string[] = [];

  // ===== 1. PROFITABILITY ANALYSIS =====
  if (!calc.isProfitable) {
    const lossAmount = Math.abs(calc.netProfit);
    const revenueGap = calc.breakEvenRevenue - calc.mrr;
    const percentIncrease = Math.round((revenueGap / calc.mrr) * 100);
    
    insights.push({
      id: 'profitability_loss',
      metric_name: 'Profitability',
      current_value: `-$${lossAmount.toLocaleString()}/mo`,
      target_value: `+$${Math.round(calc.mrr * 0.1).toLocaleString()}/mo`,
      gap: `$${(lossAmount + Math.round(calc.mrr * 0.1)).toLocaleString()}/mo`,
      priority: 'critical',
      status: 'danger',
      headline: 'Business is Currently Unprofitable',
      explanation: `You're losing $${lossAmount.toLocaleString()} every month. At this rate, you'll deplete $${(lossAmount * 12).toLocaleString()} in the first year.`,
      why_it_matters: `Without profitability, the business cannot sustain itself. You need to reach at least $${calc.breakEvenRevenue.toLocaleString()}/mo revenue (${percentIncrease}% increase) just to break even.`,
      action_plan: {
        strategy: 'Increase revenue while reducing unnecessary costs to reach profitability',
        tactics: [
          {
            action: `Increase prices by 15-20% across your product line`,
            expected_impact: `+$${Math.round(calc.mrr * 0.15).toLocaleString()}/mo revenue`,
            effort: 'low',
            timeframe: 'Immediate',
            cost_estimate: '$0'
          },
          {
            action: `Reduce marketing spend temporarily until profitable`,
            expected_impact: `-$${Math.round(calc.expenses.marketing * 0.3).toLocaleString()}/mo costs`,
            effort: 'low',
            timeframe: '1-2 weeks',
            cost_estimate: '$0'
          },
          {
            action: `Negotiate 10-15% reduction with suppliers or landlord`,
            expected_impact: `-$${Math.round((calc.expenses.rent + calc.expenses.cogs) * 0.1).toLocaleString()}/mo costs`,
            effort: 'medium',
            timeframe: '2-4 weeks',
            cost_estimate: '$0'
          }
        ],
        expected_outcome: `Reach break-even at $${calc.breakEvenRevenue.toLocaleString()}/mo within 2-3 months`,
        time_to_result: '6-10 weeks'
      }
    });
  } else if (calc.netMarginPercent < benchmarks.net_margin_min) {
    // Profitable but below industry margin
    const marginGap = benchmarks.net_margin_min - calc.netMarginPercent;
    
    insights.push({
      id: 'low_margin',
      metric_name: 'Net Margin',
      current_value: `${calc.netMarginPercent}%`,
      target_value: `${benchmarks.net_margin_min}%+`,
      gap: `${marginGap}%`,
      priority: 'high',
      status: 'warning',
      headline: 'Net Margin Below Industry Standard',
      explanation: `Your ${calc.netMarginPercent}% net margin is below the ${benchmarks.net_margin_min}% minimum typical for ${benchmarks.name}.`,
      why_it_matters: `Low margins leave little buffer for unexpected expenses, market downturns, or growth investments. Industry leaders typically achieve ${benchmarks.net_margin_min}-${benchmarks.net_margin_max}% margins.`,
      action_plan: {
        strategy: 'Optimize cost structure and pricing to improve margins',
        tactics: [
          {
            action: 'Review and eliminate non-essential operating expenses',
            expected_impact: `+${Math.round(marginGap * 0.4)}% margin improvement`,
            effort: 'low',
            timeframe: '1-2 weeks',
            cost_estimate: '$0'
          },
          {
            action: `Increase average transaction value through upsells`,
            expected_impact: `+$${Math.round(calc.averageCheck * 0.15)}/transaction`,
            effort: 'medium',
            timeframe: '3-4 weeks',
            cost_estimate: '$200-500'
          }
        ],
        expected_outcome: `Improve net margin from ${calc.netMarginPercent}% to ${benchmarks.net_margin_min}%+`,
        time_to_result: '4-8 weeks'
      }
    });
    
    quickWins.push('Review expenses');
  }

  // ===== 2. LTV:CAC RATIO ANALYSIS =====
  if (calc.ltvCacRatio < 3) {
    const targetRatio = 3;
    const gapRatio = Math.round((targetRatio - calc.ltvCacRatio) * 10) / 10;
    const targetCac = Math.round(calc.ltv / targetRatio);
    const cacReduction = calc.cac - targetCac;
    
    insights.push({
      id: 'ltv_cac_low',
      metric_name: 'LTV:CAC Ratio',
      current_value: `${calc.ltvCacRatio}x`,
      target_value: `${targetRatio}x+`,
      gap: `${gapRatio}x`,
      priority: calc.ltvCacRatio < 2 ? 'critical' : 'high',
      status: calc.ltvCacRatio < 2 ? 'danger' : 'warning',
      headline: 'Customer Acquisition is Too Expensive',
      explanation: `You're spending $${calc.cac} to acquire customers worth $${calc.ltv}. For every $1 in marketing, you only get $${calc.ltvCacRatio.toFixed(1)} back.`,
      why_it_matters: `Healthy businesses maintain 3-6x LTV:CAC. Below 3x means growth is unprofitable — you're essentially paying customers to use your service.`,
      action_plan: {
        strategy: 'Reduce CAC through organic channels while increasing customer lifetime value',
        tactics: [
          {
            action: 'Launch customer referral program with 15-20% discount incentive',
            expected_impact: `Reduce CAC by 25-30% (save $${Math.round(calc.cac * 0.25)}/customer)`,
            effort: 'medium',
            timeframe: '4-8 weeks to see results',
            cost_estimate: '$500 setup + referral discounts'
          },
          {
            action: 'Optimize ad targeting to highest-converting customer segments',
            expected_impact: 'Reduce CAC by 15-20%',
            effort: 'low',
            timeframe: '2-3 weeks',
            cost_estimate: '$0'
          },
          {
            action: 'Implement retention program to increase customer lifetime',
            expected_impact: `Increase LTV by $${Math.round(calc.ltv * 0.2)}`,
            effort: 'medium',
            timeframe: '2-4 months',
            cost_estimate: '$200-1000/month'
          }
        ],
        expected_outcome: `Improve LTV:CAC from ${calc.ltvCacRatio}x to ${targetRatio}x within 3 months`,
        time_to_result: '2-4 months'
      }
    });
    
    quickWins.push('Optimize ad targeting');
  } else if (calc.ltvCacRatio > 8) {
    insights.push({
      id: 'ltv_cac_high',
      metric_name: 'LTV:CAC Ratio',
      current_value: `${calc.ltvCacRatio}x`,
      target_value: '3-6x',
      gap: 'Underinvesting in growth',
      priority: 'medium',
      status: 'warning',
      headline: 'Potentially Underinvesting in Customer Acquisition',
      explanation: `Your ${calc.ltvCacRatio}x LTV:CAC is unusually high, which may indicate you're not investing enough in growth.`,
      why_it_matters: `While high LTV:CAC seems good, ratios above 6-8x often mean missed growth opportunities. Competitors spending more on acquisition may capture market share.`,
      action_plan: {
        strategy: 'Increase marketing investment to capture more market share',
        tactics: [
          {
            action: 'Increase marketing budget by 30-50%',
            expected_impact: `Acquire ${Math.round(calc.newClientsNeeded * 0.5)}+ additional customers/month`,
            effort: 'low',
            timeframe: 'Immediate',
            cost_estimate: `$${Math.round(calc.expenses.marketing * 0.4)}/month`
          },
          {
            action: 'Test new marketing channels (influencers, partnerships)',
            expected_impact: 'Diversify customer acquisition sources',
            effort: 'medium',
            timeframe: '4-8 weeks',
            cost_estimate: '$1000-5000'
          }
        ],
        expected_outcome: 'Accelerate growth while maintaining healthy unit economics',
        time_to_result: '1-3 months'
      }
    });
  }

  // ===== 3. PAYBACK PERIOD ANALYSIS =====
  if (calc.paybackMonths > 24 && calc.paybackMonths < 999) {
    insights.push({
      id: 'payback_long',
      metric_name: 'Payback Period',
      current_value: `${calc.paybackMonths} months`,
      target_value: '12-18 months',
      gap: `${calc.paybackMonths - 18} months`,
      priority: calc.paybackMonths > 36 ? 'critical' : 'high',
      status: calc.paybackMonths > 36 ? 'danger' : 'warning',
      headline: 'Investment Recovery Takes Too Long',
      explanation: `At current profit of $${calc.netProfit.toLocaleString()}/mo, it will take ${calc.paybackMonths} months to recover your $${calc.startupInvestment.toLocaleString()} investment.`,
      why_it_matters: `Long payback periods increase risk significantly. Market conditions, competition, and technology can change dramatically over ${Math.round(calc.paybackMonths / 12)} years.`,
      action_plan: {
        strategy: 'Accelerate profitability to reduce payback period',
        tactics: [
          {
            action: 'Increase monthly profit by 25% through pricing optimization',
            expected_impact: `Reduce payback by ${Math.round(calc.paybackMonths * 0.2)} months`,
            effort: 'medium',
            timeframe: '1-2 months',
            cost_estimate: '$0'
          },
          {
            action: 'Focus on highest-margin products/services',
            expected_impact: '+5-10% net margin improvement',
            effort: 'medium',
            timeframe: '2-4 weeks',
            cost_estimate: '$0'
          }
        ],
        expected_outcome: `Reduce payback from ${calc.paybackMonths} to under 18 months`,
        time_to_result: '3-6 months'
      }
    });
  } else if (calc.paybackMonths > 12 && calc.paybackMonths <= 24) {
    insights.push({
      id: 'payback_moderate',
      metric_name: 'Payback Period',
      current_value: `${calc.paybackMonths} months`,
      target_value: '<12 months',
      gap: `${calc.paybackMonths - 12} months`,
      priority: 'medium',
      status: 'warning',
      headline: 'Room to Improve Investment Recovery',
      explanation: `Your ${calc.paybackMonths}-month payback is acceptable but could be optimized to under 12 months.`,
      why_it_matters: `Faster payback means quicker access to profits for reinvestment, reducing overall business risk.`,
      action_plan: {
        strategy: 'Optimize operations for faster profitability',
        tactics: [
          {
            action: 'Streamline operations to reduce overhead by 10%',
            expected_impact: `+$${Math.round(calc.totalExpenses * 0.1).toLocaleString()}/mo profit`,
            effort: 'medium',
            timeframe: '4-6 weeks',
            cost_estimate: '$0'
          }
        ],
        expected_outcome: `Reduce payback from ${calc.paybackMonths} to under 12 months`,
        time_to_result: '3-6 months'
      }
    });
  }

  // ===== 4. CAC EFFICIENCY ANALYSIS =====
  if (calc.cac > benchmarks.cac_max) {
    const overspend = calc.cac - benchmarks.cac_max;
    const monthlyWaste = overspend * calc.newClientsNeeded;
    
    insights.push({
      id: 'cac_high',
      metric_name: 'Customer Acquisition Cost',
      current_value: `$${calc.cac}`,
      target_value: `$${benchmarks.cac_typical}`,
      gap: `$${overspend} above max`,
      priority: 'high',
      status: 'warning',
      headline: 'Customer Acquisition Cost Exceeds Industry Maximum',
      explanation: `Your CAC of $${calc.cac} is above the ${benchmarks.name} industry maximum of $${benchmarks.cac_max}.`,
      why_it_matters: `You're potentially wasting $${monthlyWaste.toLocaleString()}/month on inefficient customer acquisition. This directly impacts profitability.`,
      action_plan: {
        strategy: 'Optimize marketing spend to reach industry-standard CAC',
        tactics: [
          {
            action: 'Audit marketing channels and cut lowest-performing 20%',
            expected_impact: `-$${Math.round(overspend * 0.4)}/customer`,
            effort: 'low',
            timeframe: '1-2 weeks',
            cost_estimate: '$0'
          },
          {
            action: 'Improve website/landing page conversion rate',
            expected_impact: 'Reduce CAC by 20-30%',
            effort: 'medium',
            timeframe: '3-4 weeks',
            cost_estimate: '$500-2000'
          }
        ],
        expected_outcome: `Reduce CAC from $${calc.cac} to $${benchmarks.cac_typical}`,
        time_to_result: '4-8 weeks'
      }
    });
    
    quickWins.push('Audit marketing channels');
  }

  // ===== 5. BREAK-EVEN GAP ANALYSIS =====
  if (calc.mrr < calc.breakEvenRevenue && calc.isProfitable === false) {
    // Already covered in profitability, add specific break-even guidance
  } else if (calc.mrr > calc.breakEvenRevenue && calc.mrr < calc.revenueFor45kProfit) {
    const gapTo45k = calc.revenueFor45kProfit - calc.mrr;
    
    insights.push({
      id: 'scale_opportunity',
      metric_name: 'Revenue Growth',
      current_value: `$${calc.mrr.toLocaleString()}/mo`,
      target_value: `$${calc.revenueFor45kProfit.toLocaleString()}/mo`,
      gap: `$${gapTo45k.toLocaleString()}/mo`,
      priority: 'medium',
      status: 'healthy',
      headline: 'Opportunity to Scale to Strong Profitability',
      explanation: `You're above break-even. Increasing revenue by $${gapTo45k.toLocaleString()}/mo would bring you to $45k annual profit.`,
      why_it_matters: `This represents a ${Math.round((gapTo45k / calc.mrr) * 100)}% revenue increase needed for strong profitability and growth reinvestment capability.`,
      action_plan: {
        strategy: 'Systematic revenue growth through multiple channels',
        tactics: [
          {
            action: 'Increase customer frequency with loyalty program',
            expected_impact: `+$${Math.round(gapTo45k * 0.3).toLocaleString()}/mo`,
            effort: 'medium',
            timeframe: '4-6 weeks',
            cost_estimate: '$300-800'
          },
          {
            action: 'Launch upselling strategy for existing customers',
            expected_impact: '+15-25% average transaction value',
            effort: 'low',
            timeframe: '1-2 weeks',
            cost_estimate: '$0'
          }
        ],
        expected_outcome: `Reach $${calc.revenueFor45kProfit.toLocaleString()}/mo for $45k annual profit`,
        time_to_result: '4-8 months'
      }
    });
  }

  // ===== 6. ROI ANALYSIS =====
  if (calc.roiYear1Percent < 20 && calc.isProfitable) {
    insights.push({
      id: 'low_roi',
      metric_name: 'Year 1 ROI',
      current_value: `${calc.roiYear1Percent}%`,
      target_value: '25%+',
      gap: `${25 - calc.roiYear1Percent}%`,
      priority: 'medium',
      status: 'warning',
      headline: 'Return on Investment Below Target',
      explanation: `Your ${calc.roiYear1Percent}% first-year ROI may not justify the risk compared to alternative investments.`,
      why_it_matters: `A business should typically return 25%+ annually to compensate for the risk and effort involved compared to passive investments.`,
      action_plan: {
        strategy: 'Improve profitability to increase ROI',
        tactics: [
          {
            action: 'Review all expenses for 10-15% reduction opportunities',
            expected_impact: `+${Math.round((calc.totalExpenses * 0.1 * 12 / calc.startupInvestment) * 100)}% ROI`,
            effort: 'medium',
            timeframe: '2-4 weeks',
            cost_estimate: '$0'
          }
        ],
        expected_outcome: `Improve Year 1 ROI from ${calc.roiYear1Percent}% to 25%+`,
        time_to_result: '3-6 months'
      }
    });
  }

  // ===== BUILD SUMMARY =====
  const criticalCount = insights.filter(i => i.priority === 'critical').length;
  const highCount = insights.filter(i => i.priority === 'high').length;
  const mediumCount = insights.filter(i => i.priority === 'medium').length;
  const lowCount = insights.filter(i => i.priority === 'low').length;
  
  let overallHealth: 'critical' | 'needs_work' | 'healthy' | 'excellent';
  if (criticalCount > 0) {
    overallHealth = 'critical';
  } else if (highCount > 0) {
    overallHealth = 'needs_work';
  } else if (mediumCount > 0) {
    overallHealth = 'healthy';
  } else {
    overallHealth = 'excellent';
  }
  
  const topPriority = insights.length > 0 ? insights[0].headline : 'Business fundamentals look healthy';
  
  // Sort insights by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    summary: {
      total_insights: insights.length,
      critical_count: criticalCount,
      high_count: highCount,
      medium_count: mediumCount,
      low_count: lowCount,
      overall_health: overallHealth,
      top_priority: topPriority,
      quick_wins: quickWins.slice(0, 3)
    },
    insights,
    generated_at: new Date().toISOString()
  };
}

function transformResponse(
  raw: any, 
  location: string, 
  benchmarks: IndustryBenchmarks, 
  locationMultipliers: LocationMultiplierResult,
  subIndustry: SubIndustryResult | null,
  userInputs?: OptionalFinancialInputs
) {
  const fa = safeParseJSON(raw.financial_json, {});
  const bp = safeParseJSON(raw.business_json, {});
  const mp = safeParseJSON(raw.marketing_json, {});
  const ma = safeParseJSON(raw.market_json, {});
  const sources = raw.sources ? raw.sources.split(',').map((s: string) => s.trim()) : ["Public sources", "Industry data"];
  const limits = raw.limitations ? raw.limitations.split(',').map((s: string) => s.trim()) : ["Estimates based on industry benchmarks"];

  // CRITICAL FIX: PRIORITIZE USER-PROVIDED VALUES over AI-generated values
  // This ensures user inputs like monthly_revenue=$15,000 are used, not AI's $150,000
  const rawMrr = userInputs?.monthly_revenue || fa.mrr || 50000;
  const rawInvestment = userInputs?.startup_investment || fa.startup_investment || 100000;
  const rawCac = userInputs?.cac || fa.cac || mp.cac || benchmarks.cac_typical;
  const rawLtv = fa.ltv || mp.ltv || 500;
  const rawAvgCheck = userInputs?.average_price || fa.average_check || (benchmarks.average_check_min + benchmarks.average_check_max) / 2;
  
  // User-provided operational data
  const userProvidedCosts = userInputs?.monthly_costs;
  const userProvidedChurnRate = userInputs?.churn_rate;
  const userProvidedCustomers = userInputs?.expected_customers;
  
  // Log input source for debugging
  console.log(`Input sources: MRR=${userInputs?.monthly_revenue ? 'USER' : 'AI'}($${rawMrr}), Investment=${userInputs?.startup_investment ? 'USER' : 'AI'}($${rawInvestment}), CAC=${userInputs?.cac ? 'USER' : 'AI'}($${rawCac})`);
  
  // Validation: warn if AI values significantly differ from user inputs
  if (userInputs?.monthly_revenue && fa.mrr) {
    const diff = Math.abs(fa.mrr - userInputs.monthly_revenue) / userInputs.monthly_revenue;
    if (diff > 0.2) {
      console.warn(`⚠️ AI estimated revenue $${fa.mrr} differs ${Math.round(diff * 100)}% from user input $${userInputs.monthly_revenue}`);
    }
  }
  if (userInputs?.startup_investment && fa.startup_investment) {
    const diff = Math.abs(fa.startup_investment - userInputs.startup_investment) / userInputs.startup_investment;
    if (diff > 0.2) {
      console.warn(`⚠️ AI estimated investment $${fa.startup_investment} differs ${Math.round(diff * 100)}% from user input $${userInputs.startup_investment}`);
    }
  }
  
  // Calculate with strict validation using enhanced multipliers and sub-industry
  const calc = calculateStrictFinancials(
    rawMrr, 
    rawInvestment, 
    rawCac, 
    rawLtv, 
    rawAvgCheck, 
    benchmarks, 
    locationMultipliers,
    subIndustry,
    userProvidedCosts,
    userProvidedChurnRate,
    userProvidedCustomers
  );
  
  // Build calculation summary in English
  const calculationsSummary = `
## Financial Calculations Audit

### Input Data
- Revenue (MRR): $${calc.mrr.toLocaleString()}
- Investment: $${calc.startupInvestment.toLocaleString()}
- Average Check: $${calc.averageCheck}
- CAC: $${calc.cac}
- LTV: $${calc.ltv.toLocaleString()}
- Industry: ${calc.industryDetected}

### Expense Structure
| Category | Amount | % of Revenue |
|----------|--------|--------------|
| COGS | $${calc.expenses.cogs.toLocaleString()} | ${Math.round(calc.expenses.cogs / calc.mrr * 100)}% |
| Salaries | $${calc.expenses.salaries.toLocaleString()} | ${Math.round(calc.expenses.salaries / calc.mrr * 100)}% |
| Rent | $${calc.expenses.rent.toLocaleString()} | ${Math.round(calc.expenses.rent / calc.mrr * 100)}% |
| Utilities | $${calc.expenses.utilities.toLocaleString()} | ${Math.round(calc.expenses.utilities / calc.mrr * 100)}% |
| Marketing | $${calc.expenses.marketing.toLocaleString()} | ${Math.round(calc.expenses.marketing / calc.mrr * 100)}% |
| Other | $${calc.expenses.other.toLocaleString()} | ${Math.round(calc.expenses.other / calc.mrr * 100)}% |
| **TOTAL** | **$${calc.totalExpenses.toLocaleString()}** | **${Math.round(calc.totalExpenses / calc.mrr * 100)}%** |

### Profit Calculation
**Profit = Revenue - Expenses**
$${calc.mrr.toLocaleString()} - $${calc.totalExpenses.toLocaleString()} = **$${calc.netProfit.toLocaleString()}** ${calc.isProfitable ? '✓' : '❌ LOSS'}

### Key Metrics
- **Net Margin:** ${calc.netMarginPercent}% ${calc.netMarginPercent >= benchmarks.net_margin_min ? '✓' : '⚠'}
- **LTV:CAC:** ${calc.ltvCacRatio}x ${calc.ltvCacRatio >= benchmarks.ltv_cac_min ? '✓' : '⚠'}
- **Payback:** ${calc.paybackMonths === 999 ? 'never' : calc.paybackMonths + ' months'}
- **Year 1 ROI:** ${calc.roiYear1Percent}%

### Break-even Points
- **For zero profit:** $${calc.breakEvenRevenue.toLocaleString()}/mo
- **For $45k profit:** $${calc.revenueFor45kProfit.toLocaleString()}/mo

### Formula Audit
${calc.audit.map(a => `- ${a.formula}: ${a.notes}`).join('\n')}
`.trim();

  return {
    financial_analysis: {
      inputs: {
        price_per_unit: calc.averageCheck,
        units_sold_monthly: calc.ordersMonthly,
        purchase_frequency: benchmarks.orders_per_client,
        upsell_per_customer: 0,
        cogs_per_unit: Math.round(calc.averageCheck * (benchmarks.cogs_percent / 100)),
        fixed_opex: calc.expenses.salaries + calc.expenses.rent + calc.expenses.utilities + calc.expenses.other,
        marketing_budget: calc.expenses.marketing,
        cac: calc.cac,
        startup_investment: calc.startupInvestment,
        capex: Math.round(calc.startupInvestment * 0.45),
        ltv: calc.ltv,
        churn_rate: Math.round(100 / benchmarks.client_lifetime_months) / 100
      },
      mrr: calc.mrr,
      arr: calc.mrr * 12,
      scenarios: (() => {
        // CRITICAL FIX: Calculate expenses from breakdown, not calc.totalExpenses
        const fixedCosts = calc.expenses.salaries + calc.expenses.rent + calc.expenses.utilities + calc.expenses.other;
        const variableCosts = calc.expenses.cogs + calc.expenses.marketing;
        const totalExpensesFromBreakdown = fixedCosts + variableCosts;
        
        // Pessimistic scenario: 20% less revenue, slightly less variable costs
        const pessRevenue = Math.round(calc.mrr * 0.8);
        const pessVariableCosts = Math.round(variableCosts * 0.85); // Less sales = less COGS/marketing
        const pessTotalExpenses = fixedCosts + pessVariableCosts;
        const pessNetProfit = pessRevenue - pessTotalExpenses;
        const pessNetMargin = pessRevenue > 0 ? Math.round((pessNetProfit / pessRevenue) * 100) : 0;
        
        // Base scenario: current values
        const baseNetProfit = calc.mrr - totalExpensesFromBreakdown;
        const baseNetMargin = calc.mrr > 0 ? Math.round((baseNetProfit / calc.mrr) * 100) : 0;
        
        // Optimistic scenario: 25% more revenue, proportional variable cost increase
        const optRevenue = Math.round(calc.mrr * 1.25);
        const optVariableCosts = Math.round(variableCosts * 1.25);
        const optTotalExpenses = fixedCosts + optVariableCosts;
        const optNetProfit = optRevenue - optTotalExpenses;
        const optNetMargin = optRevenue > 0 ? Math.round((optNetProfit / optRevenue) * 100) : 0;
        
        return {
          pessimistic: {
            revenue: pessRevenue,
            variable_costs: pessVariableCosts,
            fixed_costs: fixedCosts,
            gross_profit: Math.round(pessRevenue - (calc.expenses.cogs * 0.85)),
            net_profit: pessNetProfit,
            gross_margin: calc.grossMarginPercent,
            net_margin: pessNetMargin
          },
          base: {
            revenue: calc.mrr,
            variable_costs: variableCosts,
            fixed_costs: fixedCosts,
            gross_profit: calc.grossProfit,
            net_profit: baseNetProfit,
            gross_margin: calc.grossMarginPercent,
            net_margin: baseNetMargin
          },
          optimistic: {
            revenue: optRevenue,
            variable_costs: optVariableCosts,
            fixed_costs: fixedCosts,
            gross_profit: Math.round(optRevenue - (calc.expenses.cogs * 1.25)),
            net_profit: optNetProfit,
            gross_margin: calc.grossMarginPercent,
            net_margin: optNetMargin
          }
        };
      })(),
      unit_economics: {
        contribution_margin: Math.round(calc.averageCheck - calc.averageCheck * (benchmarks.cogs_percent / 100)),
        contribution_margin_ratio: (100 - benchmarks.cogs_percent) / 100,
        cac: calc.cac,
        cac_payback_months: Math.ceil(calc.cac / (calc.averageCheck * (Math.max(calc.netMarginPercent, 5) / 100) * benchmarks.orders_per_client)),
        ltv: calc.ltv,
        ltv_cac_ratio: calc.ltvCacRatio
      },
      breakeven: {
        breakeven_units: Math.ceil(calc.breakEvenRevenue / calc.averageCheck),
        breakeven_revenue: calc.breakEvenRevenue,
        breakeven_months: calc.isProfitable ? Math.min(calc.paybackMonths, 24) : 0
      },
      returns: {
        payback_period_months: calc.paybackMonths,
        roi_year_1: calc.roiYear1Percent,
        roi_year_3: Math.round((calc.netProfit * 36 / calc.startupInvestment) * 100),
        npv_3_years: Math.round(calc.netProfit * 36 - calc.startupInvestment)
      },
      startup_investment: (() => {
        // CRITICAL FIX: Calculate breakdown items that sum EXACTLY to total
        const total = calc.startupInvestment;
        const rentDeposit = Math.round(calc.expenses.rent * 2);
        const equipment = Math.round(total * 0.40);
        const inventory = Math.round(total * 0.15);
        const legal = Math.min(2000, Math.round(total * 0.05));
        const marketingInitial = Math.round(total * 0.10);
        // Working capital absorbs the remainder to ensure exact sum
        const workingCapital = total - rentDeposit - equipment - inventory - legal - marketingInitial;
        
        // Validation: log if working capital is negative (indicates rent deposit is too high)
        if (workingCapital < 0) {
          console.warn(`⚠️ Investment breakdown issue: working_capital=${workingCapital}. Adjusting rent deposit.`);
        }
        
        const breakdown = {
          rent_deposit: rentDeposit,
          equipment: equipment,
          inventory: inventory,
          legal: legal,
          marketing_initial: marketingInitial,
          working_capital: Math.max(0, workingCapital)
        };
        
        // Final validation: ensure sum matches total
        const breakdownSum = Object.values(breakdown).reduce((a, b) => a + b, 0);
        if (breakdownSum !== total) {
          // Adjust working capital to match exactly
          breakdown.working_capital += (total - breakdownSum);
        }
        
        return {
          total,
          breakdown,
          reasoning: `Investment $${total.toLocaleString()}: equipment 40%, inventory 15%, working capital ${Math.round(Math.max(0, workingCapital) / total * 100)}%, marketing 10%, deposit & legal ${Math.round((rentDeposit + legal) / total * 100)}%`
        };
      })(),
      monthly_expenses: (() => {
        // CRITICAL FIX: Use expense breakdown as source of truth, ensure total = sum
        const breakdown = {
          rent: calc.expenses.rent,
          utilities: calc.expenses.utilities,
          salaries: calc.expenses.salaries,
          inventory_replenishment: calc.expenses.cogs,
          marketing: calc.expenses.marketing,
          other: calc.expenses.other
        };
        
        // Calculate actual sum of breakdown items
        const breakdownSum = Object.values(breakdown).reduce((a, b) => a + b, 0);
        
        // Log warning if there's a mismatch with calc.totalExpenses
        if (Math.abs(breakdownSum - calc.totalExpenses) > 1) {
          console.warn(`⚠️ Expense mismatch detected: breakdown sum=$${breakdownSum}, calc.totalExpenses=$${calc.totalExpenses}. Using sum.`);
        }
        
        return {
          total: breakdownSum, // Use the SUM as the total, not the separate calc.totalExpenses
          variable_costs: calc.expenses.cogs + calc.expenses.marketing,
          fixed_costs: calc.expenses.salaries + calc.expenses.rent + calc.expenses.utilities + calc.expenses.other,
          breakdown
        };
      })(),
      risk_analysis: {
        revenue_drop_20: {
          scenario: "Revenue drops 20%",
          description: "Demand decline, seasonality, or competition",
          impact_on_revenue: -20,
          impact_on_costs: 0,
          resulting_profit: Math.round((calc.mrr * 0.8) - calc.totalExpenses * 0.95),
          probability: "medium" as const
        },
        costs_rise_15: {
          scenario: "Costs increase 15%",
          description: "Inflation, supplier price increases, rent hikes",
          impact_on_revenue: 0,
          impact_on_costs: 15,
          resulting_profit: Math.round(calc.mrr - calc.totalExpenses * 1.15),
          probability: "high" as const
        },
        cac_doubles: {
          scenario: "CAC doubles",
          description: "Increased ad competition, market saturation",
          impact_on_revenue: 0,
          impact_on_costs: 0,
          resulting_profit: Math.round(calc.netProfit - calc.expenses.marketing),
          probability: "medium" as const
        },
        churn_increase: {
          scenario: "Churn increases 50%",
          description: "Quality issues, competitor offers, market shift",
          impact_on_revenue: -15,
          impact_on_costs: 0,
          resulting_profit: Math.round((calc.mrr * 0.85) - calc.totalExpenses),
          probability: "medium" as const
        }
      },
      calculations_summary: calculationsSummary,
      industry_detected: calc.industryDetected
    },
    business_plan: {
      executive_summary: bp.executive_summary || "",
      product_description: bp.product_description || "",
      target_audience: bp.target_audience || "",
      competitive_advantages: bp.competitive_advantages || "",
      operations: bp.operations || "",
      launch_steps: Array.isArray(bp.launch_steps) ? bp.launch_steps : [],
      risks: Array.isArray(bp.risks) ? bp.risks : []
    },
    marketing_plan: {
      positioning: mp.positioning || "",
      pricing_strategy: mp.pricing_strategy || "",
      channels: Array.isArray(mp.channels) ? mp.channels : [],
      cac: calc.cac,
      ltv: calc.ltv,
      first_3_months_plan: mp.first_3_months_plan || ""
    },
    market_analysis: {
      market_size: {
        tam: ma.tam || "",
        sam: ma.sam || "",
        som: ma.som || ""
      },
      trends: Array.isArray(ma.trends) ? ma.trends : [],
      competition: {
        main_competitors: Array.isArray(ma.competitors) ? ma.competitors : [],
        competitive_landscape: ma.competitive_landscape || "",
        market_gaps: ma.market_gaps || ""
      },
      barriers_to_entry: ma.barriers_to_entry || "",
      growth_opportunities: ma.growth_opportunities || ""
    },
    confidence_score: 0,
    data_sources: sources,
    limitations: limits,
    _calc: calc
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========== HTTP REQUEST VALIDATION ==========
    const httpValidation = validateHttpRequest(req);
    if (!httpValidation.valid) {
      console.error(`HTTP validation failed: ${httpValidation.error}`);
      return new Response(
        JSON.stringify({ error: httpValidation.error, code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== RATE LIMITING CONFIGURATION ==========
    const RATE_LIMITS = {
      anonymous: { requests: 1, windowMinutes: 60 },  // 1 request per hour for unauthenticated
      free: { requests: 2, windowMinutes: 60 },       // 2 requests per hour
      plus: { requests: 10, windowMinutes: 60 },      // 10 requests per hour  
      pro: { requests: 30, windowMinutes: 60 },       // 30 requests per hour
    };
    
    // Anonymous abuse prevention configuration
    const ANONYMOUS_LIMITS = {
      deviceLimit: 1,      // 1 request per device per hour
      ipLimit: 3,          // Max 3 requests per IP per hour (prevents incognito abuse)
      windowMinutes: 60,
    };
    
    // ========== USAGE ENFORCEMENT ==========
    const FREE_TIER_LIMIT = 3;
    let userId: string | null = null;
    let userPlan = 'free';
    let isAnonymous = true;
    
    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Service role client for rate limiting
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    
    const authHeader = req.headers.get("Authorization");
    
    if (authHeader) {
      // Authenticated user - check their subscription
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      
      const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
      
      if (!userError && user) {
        userId = user.id;
        isAnonymous = false;
        console.log(`Authenticated user: ${user.email}`);
        
        // Check subscription
        const { data: subscription } = await supabaseAuth
          .from('subscriptions')
          .select('plan_id, status')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (subscription && ['active', 'trialing'].includes(subscription.status)) {
          userPlan = subscription.plan_id;
        }
        
        console.log(`User plan: ${userPlan}`);
        
        // If free tier, check monthly usage
        if (userPlan === 'free') {
          const monthYear = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
          
          const { data: usage } = await supabaseAuth
            .from('usage_tracking')
            .select('analyses_count')
            .eq('user_id', user.id)
            .eq('month_year', monthYear)
            .maybeSingle();
          
          const currentUsage = usage?.analyses_count || 0;
          
          if (currentUsage >= FREE_TIER_LIMIT) {
            console.log(`User ${user.email} exceeded free tier limit: ${currentUsage}/${FREE_TIER_LIMIT}`);
            return new Response(
              JSON.stringify({ 
                error: "Monthly analysis limit reached. Upgrade to Pro for unlimited analyses.", 
                code: "USAGE_LIMIT_EXCEEDED",
                usage: { current: currentUsage, limit: FREE_TIER_LIMIT }
              }),
              { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }
    }
    
    // ========== ANONYMOUS USER RATE LIMITING (Per-Device + IP) ==========
    if (isAnonymous) {
      // Get device ID and fingerprint from headers
      const deviceId = req.headers.get('X-Device-Id') || 'unknown-device';
      const fingerprint = req.headers.get('X-Fingerprint') || '';
      
      // Get client IP for additional tracking
      const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
        || req.headers.get('cf-connecting-ip') 
        || req.headers.get('x-real-ip')
        || 'unknown-ip';
      
      console.log(`Anonymous request - Device: ${deviceId.substring(0, 8)}..., IP: ${clientIp.substring(0, 15)}..., Fingerprint: ${fingerprint.substring(0, 8)}...`);
      
      // Create hashes for storage (privacy-preserving)
      const encoder = new TextEncoder();
      
      // Hash the IP address
      const ipHashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(clientIp + 'quantis-salt'));
      const ipHash = Array.from(new Uint8Array(ipHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
      
      // Hash the fingerprint if provided
      let fingerprintHash: string | null = null;
      if (fingerprint && fingerprint.length > 10) {
        const fpHashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(fingerprint + 'quantis-fp-salt'));
        fingerprintHash = Array.from(new Uint8Array(fpHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
      }
      
      // Use the request body to check for duplicate submissions (after parsing)
      // We'll do the duplicate check after parsing the body below
      
      try {
        // First, do a pre-check without idea/location (we'll check duplicates after parsing body)
        // Check device, IP, and fingerprint limits
        const rateLimitParams: Record<string, any> = {
          p_device_id: deviceId,
          p_ip_hash: ipHash,
          p_idea_hash: 'pre-check', // Placeholder - will be checked properly after body parse
          p_location_hash: 'pre-check',
          p_window_minutes: ANONYMOUS_LIMITS.windowMinutes,
          p_device_limit: ANONYMOUS_LIMITS.deviceLimit,
          p_ip_limit: ANONYMOUS_LIMITS.ipLimit,
        };
        
        // Add fingerprint check if available (provides additional abuse protection)
        if (fingerprintHash) {
          rateLimitParams.p_fingerprint_hash = fingerprintHash;
          rateLimitParams.p_fingerprint_limit = 2; // Max 2 analyses per fingerprint per hour
        }
        
        const { data: rateLimitResult, error: rateLimitError } = await supabaseService
          .rpc('check_anonymous_rate_limit', rateLimitParams);
        
        if (rateLimitError) {
          console.error('Anonymous rate limit check failed:', rateLimitError);
          // Fall back to old method if new system fails
        } else if (rateLimitResult && !rateLimitResult.allowed) {
          const reason = rateLimitResult.reason as string;
          const resetAt = new Date(rateLimitResult.reset_at);
          const retryAfterSeconds = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
          
          console.log(`Anonymous rate limit exceeded - Reason: ${reason}, Device: ${deviceId.substring(0, 8)}`);
          
          return new Response(
            JSON.stringify({ 
              error: rateLimitResult.message || "Free analysis limit reached. Sign in for more.", 
              code: "ANONYMOUS_LIMIT_EXCEEDED",
              details: {
                reason,
                retry_after_seconds: retryAfterSeconds,
                reset_at: rateLimitResult.reset_at,
                suggestion: "Sign in to get 3 free analyses per month"
              }
            }),
            { 
              status: 429, 
              headers: { 
                ...corsHeaders, 
                "Content-Type": "application/json",
                "Retry-After": String(retryAfterSeconds),
              } 
            }
          );
        } else if (rateLimitResult) {
          console.log(`Anonymous rate limit check passed: Device remaining: ${rateLimitResult.device_remaining}, IP remaining: ${rateLimitResult.ip_remaining}`);
        }
      } catch (anonRlError) {
        console.error('Anonymous rate limit system error:', anonRlError);
        // Fall through to standard rate limiting
      }
    }
    // ========== END ANONYMOUS RATE LIMITING ==========
    
    // ========== AUTHENTICATED USER HOURLY RATE LIMITING ==========
    if (!isAnonymous && userId) {
      // Get rate limit config based on plan
      const rateLimitConfig = RATE_LIMITS[userPlan as keyof typeof RATE_LIMITS] || RATE_LIMITS.free;
      
      try {
        const { data: rateLimitResult, error: rateLimitError } = await supabaseService
          .rpc('check_rate_limit', {
            p_user_id: userId,
            p_endpoint: 'analyze-business',
            p_window_minutes: rateLimitConfig.windowMinutes,
            p_max_requests: rateLimitConfig.requests
          });
        
        if (rateLimitError) {
          console.error('Rate limit check failed:', rateLimitError);
          // Fail open - allow request but log the error
        } else if (rateLimitResult && !rateLimitResult.allowed) {
          console.log(`Rate limit exceeded for user ${userId}: ${rateLimitResult.current_count}/${rateLimitResult.limit}`);
          
          const resetAt = new Date(rateLimitResult.reset_at);
          const retryAfterSeconds = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
          
          return new Response(
            JSON.stringify({ 
              error: "Too many requests. Please wait before trying again.", 
              code: "RATE_LIMIT_EXCEEDED",
              details: {
                limit: rateLimitResult.limit,
                remaining: 0,
                reset_at: rateLimitResult.reset_at,
                retry_after_seconds: retryAfterSeconds,
                plan: userPlan
              }
            }),
            { 
              status: 429, 
              headers: { 
                ...corsHeaders, 
                "Content-Type": "application/json",
                "Retry-After": String(retryAfterSeconds),
                "X-RateLimit-Limit": String(rateLimitResult.limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": String(Math.floor(resetAt.getTime() / 1000))
              } 
            }
          );
        } else if (rateLimitResult) {
          console.log(`Rate limit check passed: ${rateLimitResult.current_count}/${rateLimitResult.limit} (${rateLimitResult.remaining} remaining)`);
        }
      } catch (rlError) {
        console.error('Rate limit system error:', rlError);
        // Fail open on error
      }
    }
    // ========== END RATE LIMITING ==========

    // ========== REQUEST BODY PARSING & VALIDATION ==========
    let requestBody: AnalysisRequest;
    try {
      requestBody = await req.json() as AnalysisRequest;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body", code: "PARSE_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { idea, location, financial_inputs, selected_industry, documents } = requestBody;

    // ========== INPUT VALIDATION & SANITIZATION ==========
    
    // Validate idea
    const ideaValidation = validateInputSafety(idea, 'Business idea');
    if (!ideaValidation.valid) {
      return new Response(
        JSON.stringify({ error: ideaValidation.error, code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const sanitizedIdea = sanitizeInput(idea);
    if (sanitizedIdea.length < 10) {
      return new Response(
        JSON.stringify({ error: "Business idea must be at least 10 characters", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (sanitizedIdea.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Business idea must not exceed 5000 characters", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate location
    const locationValidation = validateInputSafety(location, 'Location');
    if (!locationValidation.valid) {
      return new Response(
        JSON.stringify({ error: locationValidation.error, code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const sanitizedLocation = sanitizeInput(location);
    if (sanitizedLocation.length < 2) {
      return new Response(
        JSON.stringify({ error: "Please specify a location (at least 2 characters)", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (sanitizedLocation.length > 200) {
      return new Response(
        JSON.stringify({ error: "Location must not exceed 200 characters", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate financial inputs if provided
    if (financial_inputs) {
      const numericFields = [
        { key: 'startup_investment', min: 0, max: 100000000 },
        { key: 'monthly_revenue', min: 0, max: 100000000 },
        { key: 'average_price', min: 0, max: 1000000 },
        { key: 'expected_customers', min: 0, max: 10000000 },
        { key: 'monthly_costs', min: 0, max: 100000000 },
        { key: 'cac', min: 0, max: 100000 },
        { key: 'churn_rate', min: 0, max: 100 },
      ];
      
      for (const field of numericFields) {
        const value = financial_inputs[field.key as keyof OptionalFinancialInputs];
        if (value !== undefined && value !== null) {
          const validation = validateNumericInput(value, field.min, field.max, field.key);
          if (!validation.valid) {
            return new Response(
              JSON.stringify({ error: validation.error, code: "VALIDATION_ERROR" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }
    }

    // Use sanitized values for the rest of processing
    const idea_clean = sanitizedIdea;
    const location_clean = sanitizedLocation;

    console.log(`Processing analysis: idea=${idea_clean.substring(0, 50)}... location=${location_clean}`);

    // Build document context if files were uploaded
    let documentContext = '';
    let documentExtractedFinancials: ExtractedDocumentFinancials[] = [];
    
    if (documents && documents.length > 0) {
      // Collect extracted financials from documents
      documentExtractedFinancials = documents
        .filter(doc => doc.extractedFinancials)
        .map(doc => doc.extractedFinancials!);
      
      // Build key findings summary
      const keyFindings = documentExtractedFinancials
        .flatMap(ef => ef.key_findings)
        .slice(0, 10);
      
      documentContext = `

## UPLOADED BUSINESS DOCUMENTS
The user has provided the following business documents for analysis. Use this real data to make your analysis more accurate and specific.

${documents.map(doc => `
### ${doc.name} (${doc.type.toUpperCase()})
${doc.parsedContent}
`).join('\n')}

${keyFindings.length > 0 ? `
### KEY FINANCIAL DATA EXTRACTED FROM DOCUMENTS:
${keyFindings.map(f => `- ${f}`).join('\n')}
` : ''}

IMPORTANT: The above documents contain REAL business data (revenue statements, invoices, marketing reports, etc.). 
- Use the specific numbers, dates, and metrics from these documents
- Reference specific findings from these documents in your analysis
- Base your projections on the actual data provided, not generic estimates
- If the documents contain financial data, use those figures as the foundation for your analysis
`;
    }

    // ========== AGGREGATE DOCUMENT FINANCIALS ==========
    // Priority: User inputs > Document data > AI estimates
    let documentDerivedInputs: Partial<OptionalFinancialInputs> = {};
    
    if (documentExtractedFinancials.length > 0) {
      for (const docFin of documentExtractedFinancials) {
        // Revenue
        if (!documentDerivedInputs.monthly_revenue) {
          if (docFin.metrics?.mrr) {
            documentDerivedInputs.monthly_revenue = docFin.metrics.mrr;
            console.log(`Document data: MRR $${docFin.metrics.mrr} from ${docFin.source_document}`);
          } else if (docFin.revenue?.monthly) {
            documentDerivedInputs.monthly_revenue = docFin.revenue.monthly;
            console.log(`Document data: Monthly revenue $${docFin.revenue.monthly} from ${docFin.source_document}`);
          } else if (docFin.revenue?.quarterly) {
            documentDerivedInputs.monthly_revenue = Math.round(docFin.revenue.quarterly / 3);
            console.log(`Document data: Quarterly revenue $${docFin.revenue.quarterly} -> Monthly $${documentDerivedInputs.monthly_revenue} from ${docFin.source_document}`);
          } else if (docFin.revenue?.total) {
            // Assume quarterly if > 50k, otherwise monthly
            const divisor = docFin.revenue.total > 50000 ? 3 : 1;
            documentDerivedInputs.monthly_revenue = Math.round(docFin.revenue.total / divisor);
            console.log(`Document data: Total revenue $${docFin.revenue.total} -> Monthly $${documentDerivedInputs.monthly_revenue} from ${docFin.source_document}`);
          }
        }
        
        // Costs
        if (!documentDerivedInputs.monthly_costs && docFin.costs?.monthly) {
          documentDerivedInputs.monthly_costs = docFin.costs.monthly;
          console.log(`Document data: Monthly costs $${docFin.costs.monthly} from ${docFin.source_document}`);
        }
        
        // Investment
        if (!documentDerivedInputs.startup_investment && docFin.investment?.total) {
          documentDerivedInputs.startup_investment = docFin.investment.total;
          console.log(`Document data: Investment $${docFin.investment.total} from ${docFin.source_document}`);
        }
        
        // CAC
        if (!documentDerivedInputs.cac && docFin.metrics?.cac) {
          documentDerivedInputs.cac = docFin.metrics.cac;
          console.log(`Document data: CAC $${docFin.metrics.cac} from ${docFin.source_document}`);
        }
        
        // Customers
        if (!documentDerivedInputs.expected_customers && docFin.metrics?.customer_count) {
          documentDerivedInputs.expected_customers = docFin.metrics.customer_count;
          console.log(`Document data: Customers ${docFin.metrics.customer_count} from ${docFin.source_document}`);
        }
      }
    }
    
    // Merge: user inputs override document data
    const mergedFinancialInputs: OptionalFinancialInputs = {
      ...documentDerivedInputs,
      ...financial_inputs,
    };
    
    // Log data sources
    if (Object.keys(documentDerivedInputs).length > 0) {
      console.log('Document-derived inputs:', documentDerivedInputs);
      console.log('User-provided inputs:', financial_inputs);
      console.log('Merged inputs:', mergedFinancialInputs);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service is not configured", code: "CONFIG_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== DATABASE-DRIVEN INDUSTRY DETECTION ==========
    // Fetch benchmarks from database first, then fall back to hardcoded
    let dbBenchmarks: DatabaseBenchmarkRecord[] = [];
    try {
      dbBenchmarks = await fetchDatabaseBenchmarks(supabaseService);
    } catch (err) {
      console.error('Failed to fetch database benchmarks, using hardcoded:', err);
    }
    
    // Detect industry using database-first approach
    const benchmarkResult = await detectIndustryFromDatabase(
      idea_clean,
      location_clean,
      dbBenchmarks,
      selected_industry
    );
    
    const detectedIndustry = benchmarkResult.benchmark;
    const industryWasManuallySelected = selected_industry && selected_industry !== 'auto';
    const benchmarkSource = benchmarkResult.source;
    const benchmarkConfidence = benchmarkResult.confidence;
    const benchmarkDataSource = benchmarkResult.dataSource;
    const benchmarkSampleSize = benchmarkResult.sampleSize;
    const benchmarkMatchedRegion = benchmarkResult.matchedRegion;
    
    // ========== ENHANCED LOCATION INTELLIGENCE ==========
    const locationMultipliers = getEnhancedLocationMultiplier(location_clean);
    const locationMultiplier = locationMultipliers.overall; // Legacy compatibility
    
    // ========== SUB-INDUSTRY DETECTION ==========
    const subIndustry = detectSubIndustry(idea_clean, detectedIndustry.id);
    
    console.log(`Analyzing: "${idea_clean.substring(0, 40)}..." in ${location_clean} | Industry: ${detectedIndustry.name} (${benchmarkSource}${industryWasManuallySelected ? ', user-selected' : ', auto-detected'}) | Confidence: ${benchmarkConfidence}%`);
    console.log(`Location: ${locationMultipliers.matched ? locationMultipliers.matchedCity : 'regional'} (${locationMultipliers.region}) | salary=${locationMultipliers.salary}x, rent=${locationMultipliers.rent}x, marketing=${locationMultipliers.marketing}x`);
    if (subIndustry.confidence > 50) {
      console.log(`Sub-industry: ${subIndustry.subIndustryName} (${subIndustry.businessModel}, ${subIndustry.targetScale}) | CAC=${subIndustry.modifiers.cac_multiplier}x, LTV=${subIndustry.modifiers.ltv_multiplier}x`);
    }

    // Build user financial context for AI prompt
    const userFinancialContext = financial_inputs ? `
## USER-PROVIDED FINANCIAL DATA (IMPORTANT - USE THESE VALUES IN YOUR ANALYSIS!)
${financial_inputs.monthly_revenue ? `- Monthly Revenue: $${financial_inputs.monthly_revenue.toLocaleString()} (USE THIS EXACT VALUE)` : ''}
${financial_inputs.startup_investment ? `- Initial Investment: $${financial_inputs.startup_investment.toLocaleString()} (USE THIS EXACT VALUE)` : ''}
${financial_inputs.monthly_costs ? `- Monthly Operating Costs: $${financial_inputs.monthly_costs.toLocaleString()} (USE THIS EXACT VALUE)` : ''}
${financial_inputs.average_price ? `- Average Price/Transaction: $${financial_inputs.average_price}` : ''}
${financial_inputs.expected_customers ? `- Expected Monthly Customers: ${financial_inputs.expected_customers}` : ''}
${financial_inputs.cac ? `- Customer Acquisition Cost: $${financial_inputs.cac}` : ''}
${financial_inputs.churn_rate ? `- Monthly Churn Rate: ${financial_inputs.churn_rate}%` : ''}

Note: The user has provided specific financial data. Base your qualitative analysis (business plan, marketing, market analysis) on these realistic numbers.
` : '';

    // Build the enhanced McKinsey-level prompt
    const hasDocuments = documents && documents.length > 0;
    
    const prompt = `You are a Senior Partner at a top-tier management consulting firm (McKinsey, BCG, Bain) with 25 years of experience in strategic consulting, M&A, financial due diligence, and business transformation across multiple industries.

## YOUR EXPERTISE
- Led 500+ strategic engagements across Fortune 500 companies and high-growth startups
- Deep expertise in market entry strategy, competitive positioning, and operational excellence
- Proven track record in financial modeling, unit economics optimization, and value creation
- Specialize in turning complex business challenges into actionable strategic roadmaps

## ANALYSIS STANDARDS
Your analysis must meet the following quality standards:
1. **Data-Driven**: Every recommendation backed by specific numbers and metrics
2. **Actionable**: Clear, prioritized steps with timelines and resource requirements
3. **Risk-Aware**: Comprehensive risk assessment with mitigation strategies
4. **Realistic**: Based on industry benchmarks and market realities, not optimistic assumptions
5. **Professional**: Executive-ready language suitable for board presentations

## BUSINESS IDEA
${idea_clean}

## LOCATION (PRIMARY MARKET)
${location_clean}

## DETECTED INDUSTRY: ${detectedIndustry.name}
${userFinancialContext}${documentContext}

## ANALYSIS REQUIREMENTS

${hasDocuments ? `
### DOCUMENT-BASED ANALYSIS (CRITICAL!)
The user has uploaded real business documents. Your analysis MUST:
- Extract and use specific financial figures from the documents
- Reference actual metrics, dates, and performance data
- Identify patterns, trends, and anomalies in the provided data
- Base projections on historical performance shown in documents
- Flag any concerns or opportunities found in the documents
` : ''}

### Industry-Specific Benchmarks for ${detectedIndustry.name}:
- Monthly Revenue Range: $${Math.round(detectedIndustry.average_check_max * detectedIndustry.orders_per_client * 100)} - $${Math.round(detectedIndustry.average_check_max * detectedIndustry.orders_per_client * 500)}
- Average Transaction Value: $${detectedIndustry.average_check_min} - $${detectedIndustry.average_check_max}
- Customer Acquisition Cost: $${detectedIndustry.cac_min} - $${detectedIndustry.cac_max}
- Typical Startup Investment: $${Math.round((detectedIndustry.salaries_fixed + detectedIndustry.rent_fixed) * 10)} - $${Math.round((detectedIndustry.salaries_fixed + detectedIndustry.rent_fixed) * 25)}
- Net Margin Range: ${detectedIndustry.net_margin_min}% - ${detectedIndustry.net_margin_max}%
- Client Lifetime: ${detectedIndustry.client_lifetime_months} months

### Financial Formulas (MUST USE!):
- LTV = Average_Check × ${detectedIndustry.orders_per_client}_orders_per_month × ${detectedIndustry.client_lifetime_months}_months_lifetime
- Example: $${detectedIndustry.average_check_max} × ${detectedIndustry.orders_per_client} × ${detectedIndustry.client_lifetime_months} = $${detectedIndustry.average_check_max * detectedIndustry.orders_per_client * detectedIndustry.client_lifetime_months}

## RESPONSE FORMAT (ALL IN ENGLISH!)

financial_json:
{
  "mrr": number (monthly revenue in USD),
  "average_check": number (in USD),
  "orders_monthly": number,
  "startup_investment": number (in USD),
  "cac": number (in USD),
  "ltv": number (calculate using formula!),
  "equipment": number (in USD)
}

business_json:
{
  "executive_summary": "brief summary",
  "product_description": "description",
  "target_audience": "audience in ${location.trim()}",
  "competitive_advantages": "advantages",
  "operations": "operations plan",
  "launch_steps": ["step1", "step2", "step3"],
  "risks": [{"name": "risk name", "description": "description", "mitigation": "how to mitigate"}]
}

marketing_json:
{
  "positioning": "market positioning",
  "pricing_strategy": "pricing strategy",
  "channels": [{"name": "channel name", "budget": number, "expected_roi": number}],
  "cac": number,
  "ltv": number,
  "first_3_months_plan": "first 3 months marketing plan"
}

market_json:
{
  "tam": "Total Addressable Market",
  "sam": "Serviceable Available Market",
  "som": "Serviceable Obtainable Market",
  "trends": ["trend1", "trend2"],
  "competitors": [{"name": "competitor", "strengths": "strengths", "weaknesses": "weaknesses"}],
  "competitive_landscape": "analysis",
  "market_gaps": "opportunities",
  "barriers_to_entry": "barriers",
  "growth_opportunities": "growth potential"
}

Call submit_analysis with all sections in English.`;

    // ========== AI REQUEST WITH RETRY LOGIC ==========
    const MAX_RETRIES = 3;
    const INITIAL_DELAY_MS = 1000;
    
    let response: Response | null = null;
    let lastError: string | null = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`AI request attempt ${attempt}/${MAX_RETRIES}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
        
        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-5-mini",
            messages: [{ role: "user", content: prompt }],
            tools: [analysisToolSchema],
            tool_choice: { type: "function", function: { name: "submit_analysis" } },
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log(`AI request succeeded on attempt ${attempt}`);
          break;
        }
        
        const errorText = await response.text();
        lastError = `HTTP ${response.status}: ${errorText}`;
        console.error(`AI error on attempt ${attempt}: ${lastError}`);
        
        // Don't retry on rate limit or auth errors
        if (response.status === 429 || response.status === 401 || response.status === 403) {
          break;
        }
        
        // Exponential backoff for retryable errors
        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (fetchError) {
        lastError = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';
        console.error(`Fetch error on attempt ${attempt}: ${lastError}`);
        
        if (lastError.includes('abort')) {
          lastError = 'Request timed out after 60 seconds';
        }
        
        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (!response || !response.ok) {
      console.error(`All ${MAX_RETRIES} AI attempts failed. Last error: ${lastError}`);
      
      if (response?.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "AI service is busy. Please try again in a minute.", 
            code: "RATE_LIMIT",
            details: "Too many concurrent requests to the AI service"
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response?.status === 401 || response?.status === 403) {
        return new Response(
          JSON.stringify({ 
            error: "AI service authentication failed", 
            code: "AUTH_ERROR",
            details: "Please contact support"
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: "Analysis temporarily unavailable. Please try again shortly.", 
          code: "AI_ERROR",
          details: lastError || "Failed to connect to AI service after multiple attempts"
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    console.log("AI Response received");

    if (aiResponse.error) {
      console.error("AI error:", JSON.stringify(aiResponse.error));
      return new Response(
        JSON.stringify({ error: "AI error. Please try again.", code: "AI_API_ERROR" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response");
      return new Response(
        JSON.stringify({ error: "AI did not return analysis. Please try again.", code: "NO_TOOL_CALL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let rawResult;
    try {
      rawResult = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Parse error:", e);
      return new Response(
        JSON.stringify({ error: "Parse error", code: "PARSE_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = transformResponse(rawResult, location.trim(), detectedIndustry, locationMultipliers, subIndustry, mergedFinancialInputs);
    const calc = result._calc as StrictFinancialResult;
    delete result._calc;
    
    // ========== QUANTIS 2.0 ENGINE INTEGRATION ==========
    // Run the bulletproof validation and recommendation engine
    const quantisInput: QuantisEngineInput = {
      businessIdea: idea_clean,
      location: location_clean,
      financialInputs: mergedFinancialInputs ? {
        startupInvestment: mergedFinancialInputs.startup_investment,
        monthlyRevenue: mergedFinancialInputs.monthly_revenue,
        averagePrice: mergedFinancialInputs.average_price,
        expectedCustomers: mergedFinancialInputs.expected_customers,
        monthlyCosts: mergedFinancialInputs.monthly_costs,
        cac: mergedFinancialInputs.cac,
        churnRate: mergedFinancialInputs.churn_rate,
      } : undefined,
      expenses: undefined, // Will be populated from documents if available
      selectedIndustry: selected_industry,
      documents: documents,
      benchmarks: detectedIndustry,
      locationMultipliers,
      subIndustry,
    };
    
    // Process through Quantis 2.0 engine
    const quantisOutput = processQuantisAnalysis(quantisInput);
    console.log(`Quantis 2.0: success=${quantisOutput.success}, health=${quantisOutput.validation.healthScores?.overallHealthScore || 'N/A'}, recommendations=${quantisOutput.recommendations.summary.totalRecommendations}`);
    
    // Generate actionable insights (legacy system - enhanced by Quantis 2.0)
    const actionableInsights = generateActionableInsights(calc, detectedIndustry);
    
    // ========== MERGE QUANTIS 2.0 WARNINGS WITH LEGACY WARNINGS ==========
    const warnings: Array<{
      field: string;
      value: number | string;
      expected: string;
      severity: 'warning' | 'error';
      message: string;
    }> = [];
    
    // Add Quantis 2.0 validation warnings
    for (const w of quantisOutput.validation.warnings) {
      warnings.push({
        field: w.code,
        value: w.message,
        expected: w.fix || 'See recommendations',
        severity: w.severity === 'critical' || w.severity === 'error' ? 'error' : 'warning',
        message: w.message
      });
    }
    
    // Legacy warning additions (only if not already covered by Quantis)
    if (!calc.isProfitable && !warnings.some(w => w.field === 'UNPROFITABLE_NO_PAYBACK')) {
      warnings.push({
        field: 'profitability',
        value: calc.netProfit,
        expected: '> 0',
        severity: 'error',
        message: `❌ LOSS of $${Math.abs(calc.netProfit).toLocaleString()}/mo at revenue $${calc.mrr.toLocaleString()}. Break-even: $${calc.breakEvenRevenue.toLocaleString()}/mo. For $45k profit: $${calc.revenueFor45kProfit.toLocaleString()}/mo.`
      });
    }
    
    if (calc.ltvCacRatio < 3 && !warnings.some(w => w.field === 'LTV_CAC_BELOW_MINIMUM')) {
      warnings.push({
        field: 'ltv_cac_ratio',
        value: calc.ltvCacRatio,
        expected: '3-6x',
        severity: 'warning',
        message: `LTV:CAC ${calc.ltvCacRatio}x is below healthy threshold of 3x — marketing is too expensive`
      });
    }
    
    if (calc.paybackMonths > 36 && calc.paybackMonths < 999 && !warnings.some(w => w.field === 'PAYBACK_TOO_LONG')) {
      warnings.push({
        field: 'payback',
        value: calc.paybackMonths,
        expected: '12-24 months',
        severity: 'warning',
        message: `Payback period of ${calc.paybackMonths} months — long investment recovery time`
      });
    }
    
    // ========== PROFESSIONAL CONFIDENCE SCORING SYSTEM ==========
    // Based on: Input Completeness (40%), Data Quality (30%), Validation (20%), Industry Relevance (10%)
    
    const confidenceBreakdown = {
      input_completeness: 0,
      data_quality: 0,
      validation_score: 0,
      industry_relevance: 0,
      details: [] as string[]
    };
    
    // 1. INPUT COMPLETENESS (40% weight)
    // How much actual data vs assumptions - now includes user-provided financial_inputs
    const requiredFields = ['mrr', 'startup_investment', 'cac', 'ltv'];
    const optionalFields = ['average_check', 'orders_monthly', 'equipment'];
    
    const fa = safeParseJSON(rawResult.financial_json, {});
    let providedRequired = 0;
    let providedOptional = 0;
    
    // Count user-provided financial inputs (these are HIGH VALUE for confidence)
    const userProvidedCount = financial_inputs ? Object.values(financial_inputs).filter(v => v !== undefined && v !== null && v > 0).length : 0;
    const userProvidedFields: string[] = [];
    
    if (financial_inputs?.startup_investment) {
      providedRequired++;
      userProvidedFields.push('investment');
    }
    if (financial_inputs?.monthly_revenue) {
      providedRequired++;
      userProvidedFields.push('revenue');
    }
    if (financial_inputs?.cac) {
      providedRequired++;
      userProvidedFields.push('CAC');
    }
    if (financial_inputs?.average_price) {
      providedOptional++;
      userProvidedFields.push('pricing');
    }
    if (financial_inputs?.expected_customers) {
      providedOptional++;
      userProvidedFields.push('customers');
    }
    if (financial_inputs?.monthly_costs) {
      providedOptional++;
      userProvidedFields.push('costs');
    }
    if (financial_inputs?.churn_rate) {
      providedOptional++;
      userProvidedFields.push('churn');
    }
    
    // Also count AI-estimated fields that look non-default
    if (!financial_inputs?.monthly_revenue && fa.mrr && fa.mrr !== 50000) providedRequired++;
    if (!financial_inputs?.startup_investment && fa.startup_investment && fa.startup_investment !== 100000) providedRequired++;
    if (!financial_inputs?.cac && fa.cac && fa.cac !== detectedIndustry.cac_typical) providedRequired++;
    if (fa.ltv && fa.ltv !== 500) providedRequired++;
    if (!financial_inputs?.average_price && fa.average_check) providedOptional++;
    if (fa.orders_monthly) providedOptional++;
    if (fa.equipment) providedOptional++;
    
    // Input completeness: required fields (70%) + optional (30%)
    const requiredScore = (providedRequired / requiredFields.length) * 0.70;
    const optionalScore = (providedOptional / optionalFields.length) * 0.30;
    confidenceBreakdown.input_completeness = Math.round((requiredScore + optionalScore) * 100);
    
    // BONUS for user-provided data (up to +15%)
    if (userProvidedCount > 0) {
      const userDataBonus = Math.min(15, userProvidedCount * 3);
      confidenceBreakdown.input_completeness = Math.min(100, confidenceBreakdown.input_completeness + userDataBonus);
      confidenceBreakdown.details.push(`User provided ${userProvidedCount} financial inputs (${userProvidedFields.join(', ')})`);
    }
    
    // BONUS for document-extracted data (up to +15%)
    const documentDataCount = Object.keys(documentDerivedInputs).length;
    let documentConfidenceBoost = 0;
    if (documentDataCount > 0) {
      const documentBonus = Math.min(15, documentDataCount * 3);
      documentConfidenceBoost = documentBonus;
      confidenceBreakdown.input_completeness = Math.min(100, confidenceBreakdown.input_completeness + documentBonus);
      confidenceBreakdown.details.push(`Extracted ${documentDataCount} metrics from uploaded documents`);
    }
    
    // Extra bonus for high-value document types
    const revenueStatementCount = documentExtractedFinancials.filter(ef => ef.document_type === 'revenue_statement').length;
    if (revenueStatementCount > 0) {
      confidenceBreakdown.input_completeness = Math.min(100, confidenceBreakdown.input_completeness + 10);
      confidenceBreakdown.details.push(`Revenue statements provide verified financial data (+10%)`);
    }
    
    // Minimum input quality penalty - just 2 inputs (idea + location) = 25% max
    const ideaLength = idea_clean.length;
    const locationLength = location_clean.length;
    if (ideaLength < 30 && userProvidedCount === 0) {
      confidenceBreakdown.input_completeness = Math.min(confidenceBreakdown.input_completeness, 35);
      confidenceBreakdown.details.push('Business idea description is brief - provide more detail for accurate analysis');
    }
    if (ideaLength < 50 && providedRequired === 0 && userProvidedCount === 0) {
      confidenceBreakdown.input_completeness = Math.min(confidenceBreakdown.input_completeness, 25);
    }
    
    // 2. DATA QUALITY (30% weight)
    // How reliable are our sources
    let dataQualityScore = 0;
    
    // User-provided data quality (40%) - BOOSTED when user provides financial_inputs
    const userDataQuality = userProvidedCount > 0 ? Math.min(40, userProvidedCount * 8) : Math.min(providedRequired * 10, 30);
    dataQualityScore += userDataQuality;
    
    // Document-extracted data quality (25%) - real business documents
    if (documentDataCount > 0) {
      const avgDocConfidence = documentExtractedFinancials.reduce((sum, ef) => sum + ef.confidence, 0) / documentExtractedFinancials.length;
      const docDataQuality = Math.min(25, Math.round(avgDocConfidence * 0.25));
      dataQualityScore += docDataQuality;
      confidenceBreakdown.details.push(`Document extraction confidence: ${Math.round(avgDocConfidence)}%`);
    }
    
    // Industry benchmark quality (35%) - we always have this
    dataQualityScore += 35;
    
    // Real-time/external data (0%) - not implemented yet
    if (userProvidedCount === 0 && documentDataCount === 0) {
      confidenceBreakdown.details.push('Analysis uses industry benchmarks (no real-time market data)');
    }
    
    // Calculation certainty (10%) - our formulas are validated
    dataQualityScore += 10;
    
    confidenceBreakdown.data_quality = Math.min(100, dataQualityScore);
    
    // Calculation certainty (10%) - our formulas are validated
    dataQualityScore += 10;
    
    confidenceBreakdown.data_quality = Math.min(100, dataQualityScore);
    
    // 3. VALIDATION PASS RATE (20% weight)
    let validationScore = 100;
    
    // Corrections penalty (each correction = -15 points)
    validationScore -= calc.corrections.length * 15;
    
    // Warnings penalty (each warning = -10 points)
    validationScore -= warnings.length * 10;
    
    // Profitability check
    if (!calc.isProfitable) {
      validationScore -= 20;
      confidenceBreakdown.details.push('Business model shows unprofitability at current estimates');
    }
    
    // Unrealistic metrics
    if (calc.ltvCacRatio > 10 || calc.ltvCacRatio < 1.5) {
      validationScore -= 15;
    }
    if (calc.paybackMonths > 48 && calc.paybackMonths < 999) {
      validationScore -= 10;
    }
    if (calc.paybackMonths === 999) {
      validationScore -= 25;
    }
    
    confidenceBreakdown.validation_score = Math.max(0, validationScore);
    
    // 4. INDUSTRY RELEVANCE (10% weight)
    let relevanceScore = 0;
    
    // Check if we matched a specific industry
    if (detectedIndustry.id !== 'general') {
      relevanceScore += 60;
    } else {
      confidenceBreakdown.details.push('Using general benchmarks - provide industry-specific keywords for better accuracy');
    }
    
    // BONUS for database-sourced benchmarks (+15%)
    if (benchmarkSource === 'database') {
      relevanceScore += 15;
      confidenceBreakdown.details.push(`Using verified database benchmarks (${benchmarkDataSource || 'Kerry dataset'})`);
      if (benchmarkSampleSize && benchmarkSampleSize > 50) {
        relevanceScore += 5; // Extra bonus for large sample size
        confidenceBreakdown.details.push(`Based on ${benchmarkSampleSize} company sample`);
      }
    } else if (benchmarkSource === 'hardcoded') {
      confidenceBreakdown.details.push('Using default hardcoded benchmarks - upload Kerry dataset for improved accuracy');
    }
    
    // BONUS for region-matched benchmarks (+10%)
    if (benchmarkMatchedRegion) {
      relevanceScore += 10;
      confidenceBreakdown.details.push(`Regional benchmark match: ${benchmarkMatchedRegion}`);
    }
    
    // BONUS for user-selected industry (+10%)
    if (industryWasManuallySelected) {
      relevanceScore += 25; // Extra confidence for manual selection
      confidenceBreakdown.details.push(`Industry manually selected: ${detectedIndustry.name}`);
    }
    
    // Check location data quality
    if (locationMultiplier !== 1.0) {
      relevanceScore += 25; // Known location with cost adjustments
    } else {
      confidenceBreakdown.details.push('Using default location costs - specify major city for accurate estimates');
    }
    
    // Check if AI provided good qualitative data (access via result object)
    if (Array.isArray(result.business_plan?.launch_steps) && result.business_plan.launch_steps.length >= 3) relevanceScore += 5;
    if (Array.isArray(result.marketing_plan?.channels) && result.marketing_plan.channels.length >= 2) relevanceScore += 5;
    if (Array.isArray(result.market_analysis?.competition?.main_competitors) && result.market_analysis.competition.main_competitors.length >= 2) relevanceScore += 5;
    
    confidenceBreakdown.industry_relevance = Math.min(100, relevanceScore);
    
    // CALCULATE WEIGHTED CONFIDENCE SCORE
    const weightedConfidence = 
      (confidenceBreakdown.input_completeness * 0.40) +
      (confidenceBreakdown.data_quality * 0.30) +
      (confidenceBreakdown.validation_score * 0.20) +
      (confidenceBreakdown.industry_relevance * 0.10);
    
    let reliabilityScore = Math.round(weightedConfidence);
    reliabilityScore = Math.max(15, Math.min(95, reliabilityScore)); // Cap between 15-95%
    
    // Generate improvement suggestions
    const improvementSuggestions: string[] = [];
    
    if (ideaLength < 50) {
      improvementSuggestions.push('Provide a more detailed business description (target market, pricing, unique value)');
    }
    if (userProvidedCount < 3) {
      improvementSuggestions.push('Expand "Advanced Financial Details" to add investment, revenue, and cost estimates');
    }
    if (detectedIndustry.id === 'general' && !industryWasManuallySelected) {
      improvementSuggestions.push('Select your industry from the dropdown for more accurate benchmarks');
    }
    if (locationMultiplier === 1.0) {
      improvementSuggestions.push('Specify a major city for location-adjusted cost estimates');
    }
    if (calc.corrections.length > 0 && userProvidedCount === 0 && documentDataCount === 0) {
      improvementSuggestions.push('Provide your own financial data or upload documents to avoid auto-corrections');
    }
    if (documents && documents.length === 0) {
      improvementSuggestions.push('Upload business documents (invoices, revenue statements) for more accurate analysis');
    }
    
    result.confidence_score = reliabilityScore;
    
    console.log(`Done. Profit: $${calc.netProfit}. Industry: ${calc.industryDetected}. Corrections: ${calc.corrections.length}. Reliability: ${reliabilityScore}%`);

    // ========== RECORD USAGE ==========
    // Record anonymous usage for rate limiting
    if (isAnonymous) {
      try {
        const deviceId = req.headers.get('X-Device-Id') || 'unknown-device';
        const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
          || req.headers.get('cf-connecting-ip') 
          || req.headers.get('x-real-ip')
          || 'unknown-ip';
        
        // Create hashes for privacy-preserving storage
        const encoder = new TextEncoder();
        
        const ipHashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(clientIp + 'quantis-salt'));
        const ipHash = Array.from(new Uint8Array(ipHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
        
        const ideaHashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(idea_clean.toLowerCase()));
        const ideaHash = Array.from(new Uint8Array(ideaHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
        
        const locationHashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(location_clean.toLowerCase()));
        const locationHash = Array.from(new Uint8Array(locationHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
        
        // Hash fingerprint if provided
        const fingerprint = req.headers.get('X-Fingerprint') || '';
        let fingerprintHash: string | null = null;
        if (fingerprint && fingerprint.length > 10) {
          const fpHashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(fingerprint + 'quantis-fp-salt'));
          fingerprintHash = Array.from(new Uint8Array(fpHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
        }
        
        // Record the anonymous usage with fingerprint
        await supabaseService.rpc('record_anonymous_usage', {
          p_device_id: deviceId,
          p_ip_hash: ipHash,
          p_idea_hash: ideaHash,
          p_location_hash: locationHash,
          p_fingerprint_hash: fingerprintHash,
        });
        console.log(`Anonymous usage recorded for device ${deviceId.substring(0, 8)}...${fingerprintHash ? ', fingerprint tracked' : ''}`);
      } catch (e) {
        console.error('Failed to record anonymous usage:', e);
      }
    }
    
    // Increment usage for authenticated free tier users
    if (userId && userPlan === 'free') {
      try {
        const monthYear = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        await supabaseService.rpc('increment_usage', { p_user_id: userId, p_month_year: monthYear });
        console.log(`Usage incremented for user ${userId}`);
      } catch (e) {
        console.error('Failed to increment usage:', e);
      }
    }
    // ========== END USAGE RECORDING ==========

    // Build documents_used array for frontend
    const documentsUsed = documentExtractedFinancials.map(ef => ({
      source_document: ef.source_document,
      document_type: ef.document_type || 'general',
      confidence: ef.confidence || 0,
      metrics_extracted: [
        ef.revenue?.monthly ? 'revenue' : null,
        ef.revenue?.total ? 'total_revenue' : null,
        ef.costs?.monthly ? 'costs' : null,
        ef.investment?.total ? 'investment' : null,
        ef.metrics?.roi ? 'roi' : null,
        ef.metrics?.mrr ? 'mrr' : null,
        ef.metrics?.customer_count ? 'customers' : null,
        ef.metrics?.cac ? 'cac' : null,
        ef.metrics?.ltv ? 'ltv' : null,
        ef.metrics?.net_profit ? 'net_profit' : null,
      ].filter(Boolean) as string[]
    }));

    // Calculate document analysis summary
    const documentAnalysisSummary = documentExtractedFinancials.length > 0 ? {
      totalDocuments: documentExtractedFinancials.length,
      confidenceBoost: documentConfidenceBoost,
      dataPointsUsed: documentsUsed.reduce((acc, d) => acc + d.metrics_extracted.length, 0),
      primaryDataSource: documentExtractedFinancials[0]?.source_document || 'N/A'
    } : undefined;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...result,
          actionable_insights: actionableInsights,
          documents_used: documentsUsed.length > 0 ? documentsUsed : undefined,
          document_analysis_summary: documentAnalysisSummary,
          
          // ========== QUANTIS 2.0 ENHANCED VALIDATION ==========
          validation: {
            is_realistic: quantisOutput.validation.isRealistic,
            is_profitable: quantisOutput.validation.isProfitable,
            was_auto_corrected: quantisOutput.validation.wasAutoCorrected,
            reliability_score: quantisOutput.validation.reliabilityScore,
            corrections: quantisOutput.validation.corrections,
            warnings,
            calculation_audit: quantisOutput.validation.calculationAudit,
            break_even_revenue: quantisOutput.validation.breakEvenRevenue,
            revenue_for_45k_profit: quantisOutput.validation.revenueFor45kProfit,
            industry_detected: quantisOutput.validation.industryDetected,
            confidence_breakdown: quantisOutput.validation.confidenceBreakdown,
            improvement_suggestions: quantisOutput.validation.improvementSuggestions,
            summary: quantisOutput.validation.summary,
            // Health scores (Quantis 2.0)
            health_scores: quantisOutput.validation.healthScores,
          },
          
          // ========== QUANTIS 2.0 RECOMMENDATIONS ==========
          recommendations: {
            summary: quantisOutput.recommendations.summary,
            priorities: {
              immediate: quantisOutput.recommendations.priorities.immediate,
              short_term: quantisOutput.recommendations.priorities.shortTerm,
              long_term: quantisOutput.recommendations.priorities.longTerm,
            },
            action_plan: quantisOutput.recommendations.actionPlan,
            generated_at: quantisOutput.recommendations.generatedAt,
            version: quantisOutput.recommendations.version,
          },
          
          // ========== QUANTIS 2.0 METRICS ==========
          quantis_metrics: {
            mrr: quantisOutput.metrics.mrr,
            arr: quantisOutput.metrics.arr,
            net_profit: quantisOutput.metrics.netProfit,
            net_margin_percent: quantisOutput.metrics.netMarginPercent,
            gross_profit: quantisOutput.metrics.grossProfit,
            gross_margin_percent: quantisOutput.metrics.grossMarginPercent,
            total_expenses: quantisOutput.metrics.totalExpenses,
            payback_months: quantisOutput.metrics.paybackMonths,
            payback_display: quantisOutput.metrics.paybackDisplay,
            roi_year_1_percent: quantisOutput.metrics.roiYear1Percent,
            ltv_cac_ratio: quantisOutput.metrics.ltvCacRatio,
            cac: quantisOutput.metrics.cac,
            ltv: quantisOutput.metrics.ltv,
          },
          
          // Engine version info
          engine_version: quantisOutput.version,
          data_sources: [
            benchmarkSource === 'database' 
              ? `Kerry Industry Dataset (${benchmarkDataSource || 'verified benchmarks'})` 
              : 'IBISWorld Industry Reports (2024)',
            'U.S. Bureau of Labor Statistics',
            'Small Business Administration Cost Data',
            'Industry Standard Financial Formulas (GAAP)',
            `${calc.industryDetected} Sector Benchmarks`,
            locationMultiplier !== 1.0 ? `${location_clean} Cost of Living Index` : 'National Average Cost Data',
            benchmarkMatchedRegion ? `Regional data: ${benchmarkMatchedRegion}` : null,
            benchmarkSampleSize ? `Sample size: ${benchmarkSampleSize} companies` : null,
            ...(documentExtractedFinancials.length > 0 ? documentExtractedFinancials.map(ef => `User Document: ${ef.source_document}`) : [])
          ].filter(Boolean),
          limitations: [
            benchmarkSource === 'hardcoded' ? 'Using default benchmarks (upload Kerry dataset for enhanced accuracy)' : null,
            'Analysis based on industry benchmarks and AI estimates',
            ideaLength < 50 ? 'Limited business description reduces accuracy' : null,
            detectedIndustry.id === 'general' ? 'No industry-specific benchmarks applied' : null,
            locationMultiplier === 1.0 ? 'Location-specific data not available' : null,
            'Actual results depend on execution and market conditions',
            'Competitive landscape may vary from estimates',
            calc.corrections.length > 0 ? `${calc.corrections.length} values auto-corrected for realism` : null
          ].filter(Boolean),
          metadata: {
            idea: idea_clean,
            location: location_clean,
            industry_detected: calc.industryDetected,
            industry_id: detectedIndustry.id,
            location_cost_multiplier: locationMultiplier,
            generated_at: new Date().toISOString(),
            model: "openai/gpt-5-mini",
            version: "9.0-database-benchmarks",
            benchmark_source: benchmarkSource,
            benchmark_confidence: benchmarkConfidence,
            benchmark_data_source: benchmarkDataSource,
            benchmark_sample_size: benchmarkSampleSize,
            benchmark_region: benchmarkMatchedRegion,
          },
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error("Unhandled error:", errorMessage);
    console.error("Stack:", errorStack);
    
    // Provide user-friendly error messages
    let userMessage = "Something went wrong. Please try again.";
    let errorCode = "INTERNAL_ERROR";
    
    if (errorMessage.includes('timeout') || errorMessage.includes('abort')) {
      userMessage = "Request took too long. Please try with a shorter description.";
      errorCode = "TIMEOUT_ERROR";
    } else if (errorMessage.includes('JSON')) {
      userMessage = "Error processing response. Please try again.";
      errorCode = "PARSE_ERROR";
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      userMessage = "Network error. Please check your connection and try again.";
      errorCode = "NETWORK_ERROR";
    }
    
    return new Response(
      JSON.stringify({ 
        error: userMessage, 
        code: errorCode,
        details: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
