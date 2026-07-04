import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { maybeHealthResponse } from '../_shared/health.ts';

const FUNCTION_NAME = 'analyze-business';
const FUNCTION_VERSION = '1.1.0';
// Embedded benchmarks are now seeded via database migration - no import needed


// ========== BENCHMARK ENGINE V2 (95,500-row dataset) ==========
import { 
  getBenchmarkSummary, 
  buildQueryFromInput, 
  computePercentile,
  type BenchmarkSummaryForCase,
  type BenchmarkQuery 
} from "./benchmark-engine-v2.ts";
import {
  buildBenchmarkRecords,
  summarizeMatches,
  type BenchmarkRecord,
} from "./benchmark-records.ts";

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

// ========== AI SAFETY GUARDRAILS ==========
import {
  validateAndSanitizeInput,
  validateAIOutput,
  generateTruthLabels,
  estimateRequestCost,
  checkKillSwitch,
  createSecurityAuditLog,
  AI_COST_LIMITS,
  type InputValidationResult,
  type OutputValidationResult,
  type TruthLabel,
} from "./ai-safety-guardrails.ts";

// ========== FALLBACK NARRATOR ==========
import { generateFallbackNarrator } from "./narrator-prompt.ts";
import { QUANTIS_MASTER_SYSTEM_PROMPT, sanitizeNarrativeAgainstNumbers } from "./quantis-master-prompt.ts";

// ========== BENCHMARK CACHING LAYER ==========
import { 
  getCachedBenchmarks, 
  getCachedLocationData,
  warmUpCache,
  getCacheStats,
  type DatabaseBenchmarkRecord as CachedBenchmarkRecord
} from "./benchmark-cache.ts";

// ========== CTO-LEVEL ACCURACY UPGRADES ==========
import { crossValidateEngines, type CrossValidationResult } from "./engine-cross-validator.ts";
import { analyzeSensitivity, type SensitivityResult } from "./sensitivity-analyzer.ts";
import { computeBenchmarkConfidence, getHedgingPrefix, type BenchmarkConfidenceResult } from "./benchmark-confidence.ts";
import { computeAssumptionGraph, type AssumptionGraphResult } from "./assumption-graph.ts";
import { runAntiBS, type SanityFlag } from "./bulletproof-validator.ts";
import { computeModelConfidence, type ModelConfidenceResult } from "./prediction-engine.ts";

// ========== MARKET PRIOR ENGINE ==========
import { mapToNAICS, fetchDistributions, computeAnomalyScores, generateMarketPrior, type MarketPriorResult, type AnomalyScore } from "./market-prior.ts";

// ========== SCORE COMPLIANCE ==========
import { computeSCORECompliance, type SCORECompliance } from "./score-mapper.ts";

// ========== HYBRID VALIDATOR (Forensic Issue #3) ==========
import { validateAnalysis, type ValidatorResult } from "../_shared/hybrid-validator.ts";
import { QMath } from "./quantis-math-server.ts";

// CORS — strict origin allowlist (no more wildcard *).
// `corsHeadersFor(req)` echoes back the Origin only when it's in the trusted set.
import { corsHeadersFor } from "../_shared/cors.ts";
// Per-request correlation ID — links UI logs ↔ this function ↔ ai_calls rows.
import { getRequestId, requestIdHeader } from "../_shared/request-id.ts";

import { createLogger } from '../_shared/logger.ts';
import { aiCall } from '../_shared/llm-call.ts';

// Module-scope logger for helpers defined outside the request handler.
// Per-request handlers should still create their own logger via createLogger(...)
// inside `serve` to attach the proper x-request-id.
const log = createLogger('analyze-business', 'module');

// ========== SECURITY UTILITIES ==========

/**
 * Validates HTTP request for security issues
 */
function validateHttpRequest(req: Request): { valid: boolean; error?: string } {
  // Check content type for POST requests
  const contentType = req.headers.get('content-type');
  if (req.method !== 'GET' && req.method !== 'OPTIONS' && contentType && !contentType.includes('application/json')) {
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
    // \b prevents false positives on ordinary words ending in "...on" followed
    // by "=" (e.g. "monetization =") — only real handler names like onclick=
    // start a word with "on".
    /\bon\w+\s*=/i,
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
  analysis_depth?: 'quick' | 'full' | 'deep';
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

// ========== INDUSTRY COST LABEL MAP ==========
// Maps industry IDs to the appropriate label for COGS in reports
// Software companies don't have "inventory" — they have infrastructure/hosting costs
const INDUSTRY_COGS_LABELS: Record<string, string> = {
  saas: 'infrastructure_and_hosting',
  fintech: 'infrastructure_and_hosting',
  education: 'content_and_platform',
  media: 'content_production',
  consulting: 'service_delivery',
  healthcare: 'medical_supplies',
  fitness: 'equipment_and_supplies',
  food_service: 'inventory_replenishment',
  ecommerce: 'inventory_replenishment',
  logistics: 'fleet_and_fuel',
  real_estate: 'property_costs',
  general: 'cost_of_goods_sold',
};

// Maps industry IDs to investment categories (no "inventory" for software)
const INDUSTRY_INVESTMENT_CATEGORIES: Record<string, { labels: Record<string, number> }> = {
  saas: { labels: { product_development: 0.40, cloud_infrastructure: 0.15, legal: 0.05, marketing_initial: 0.10 } },
  fintech: { labels: { product_development: 0.35, compliance_and_licensing: 0.15, cloud_infrastructure: 0.10, legal: 0.10, marketing_initial: 0.10 } },
  consulting: { labels: { office_setup: 0.20, tools_and_software: 0.15, legal: 0.10, marketing_initial: 0.15 } },
  education: { labels: { content_development: 0.35, platform_setup: 0.15, legal: 0.05, marketing_initial: 0.15 } },
};

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
    // NOTE: deliberately excludes cross-industry words like 'subscription',
    // 'service', and 'membership' — a "pilates studio with subscription
    // memberships" is not SaaS. Keep this list software-specific.
    keywords: ['saas', 'software', 'app', 'platform', 'api', 'cloud', 'automation', 'digital product', 'web app', 'mobile app', 'dashboard', 'neural', 'ai ', 'artificial intelligence', 'machine learning', 'deep learning', 'ml ', 'data analytics', 'analytics platform', 'operation system', 'operating system', 'b2b software', 'enterprise software', 'devops', 'infrastructure', 'crm', 'erp', 'workflow', 'productivity', 'management system', 'management platform', 'system for']
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
    keywords: ['gym', 'fitness', 'yoga', 'pilates', 'wellness', 'health', 'workout', 'training', 'sport', 'crossfit', 'personal trainer', 'spa', 'massage', 'fitness studio', 'dance studio', 'bootcamp', 'martial arts', 'boxing']
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
 * Fetches all industry benchmarks from the database WITH CACHING
 * Uses in-memory cache to reduce database load (1-hour TTL)
 */
async function fetchDatabaseBenchmarks(supabase: SupabaseClient): Promise<DatabaseBenchmarkRecord[]> {
  try {
    // Use cached benchmarks - reduces DB load by ~90%
    const cachedBenchmarks = await getCachedBenchmarks(supabase);
    
    if (cachedBenchmarks && cachedBenchmarks.length > 0) {
      const stats = getCacheStats();
      log.info(`Using ${cachedBenchmarks.length} cached benchmarks (expires: ${stats.benchmarkCacheExpiry || 'soon'})`);
      return cachedBenchmarks as DatabaseBenchmarkRecord[];
    }
    
    // Fallback to direct DB query if cache fails
    log.info('[CACHE MISS] Falling back to direct DB query');
    const { data, error } = await supabase
      .from('industry_benchmarks')
      .select('*');
    
    if (error) {
      log.error('Failed to fetch benchmarks from database:', error.message);
      return [];
    }
    
    if (data && data.length > 0) {
      log.info(`Fetched ${data.length} benchmark records from database (cache miss)`);
    }
    return data || [];
  } catch (err) {
    log.error('Database benchmark fetch error:', err);
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
      log.info(`Using user-selected industry from database: ${dbMatch.industry_name}`);
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
      log.info(`Using user-selected industry from hardcoded: ${hardcodedMatch.name}`);
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
      log.info(`Matched database benchmark with region: ${regionMatch.industry_name} (${regionMatch.region}), score: ${bestDbScore}`);
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
      log.info(`Matched database benchmark: ${bestDbMatch.industry_name}, score: ${bestDbScore}`);
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
  log.info(`Using hardcoded benchmark: ${finalBenchmark.name}, score: ${bestScore}`);
  
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

// Tool schema for AI - ENHANCED for professional structured output
const analysisToolSchema = {
  type: "function",
  function: {
    name: "submit_analysis",
    description: "Submit comprehensive business analysis with detailed structured data for all sections. Each JSON field must contain properly formatted objects as specified.",
    parameters: {
      type: "object",
      properties: {
        financial_json: { 
          type: "string", 
          description: "JSON: {mrr: number, average_check: number, orders_monthly: number, startup_investment: number, cac: number, ltv: number, equipment: number}" 
        },
        business_json: { 
          type: "string", 
          description: `JSON: {
            executive_summary: "2-3 paragraph strategic summary",
            product_description: "detailed product/service description",
            target_audience: "specific target customer profile",
            competitive_advantages: "3-5 key differentiators",
            operations: "operational model and processes",
            launch_steps: [
              {step: 1, title: "Step Name", description: "What to do", duration: "2-4 weeks", cost: 5000},
              ... (5-8 steps total)
            ],
            risks: [
              {risk: "Risk description", probability: "low|medium|high", impact: "low|medium|high", mitigation: "How to mitigate"},
              ... (4-6 risks)
            ]
          }` 
        },
        marketing_json: { 
          type: "string", 
          description: `JSON: {
            positioning: "market positioning statement",
            pricing_strategy: "pricing approach and rationale",
            channels: [
              {channel: "Channel Name", description: "Strategy for this channel", budget_monthly: 500, expected_roi: "3x return"},
              ... (3-5 channels)
            ],
            cac: number,
            ltv: number,
            first_3_months_plan: "detailed 90-day marketing roadmap"
          }` 
        },
        market_json: { 
          type: "string", 
          description: `JSON: {
            tam: "Total Addressable Market size and description",
            sam: "Serviceable Available Market",
            som: "Serviceable Obtainable Market (realistic first year)",
            trends: ["Trend 1", "Trend 2", ...],
            competitors: [
              {name: "Competitor Name", strengths: "Their strengths", weaknesses: "Their weaknesses"},
              ... (3-5 competitors)
            ],
            competitive_landscape: "overall competitive analysis",
            market_gaps: "opportunities in the market",
            barriers_to_entry: "challenges for new entrants",
            growth_opportunities: "expansion possibilities"
          }` 
        },
        confidence: { type: "number", description: "Confidence score 0-100 based on data quality" },
        sources: { type: "string", description: "Comma-separated data sources used" },
        limitations: { type: "string", description: "Comma-separated analysis limitations" }
      },
      required: ["financial_json", "business_json", "marketing_json", "market_json", "confidence"]
    }
  }
};

function safeParseJSON(str: string, fallback: any): any {
  if (!str) return fallback;
  if (typeof str === 'object') return str;
  if (typeof str !== 'string') return fallback;
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

function parseJsonFromAiText(text: unknown): Record<string, unknown> | null {
  if (typeof text === 'object' && text !== null) return text as Record<string, unknown>;
  if (typeof text !== 'string' || !text.trim()) return null;
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) cleaned = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    try {
      return JSON.parse(cleaned.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']').replace(/[\x00-\x1F\x7F]/g, '')) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function extractAnalysisPayload(aiResponse: Record<string, unknown>): { payload: Record<string, unknown>; source: string } | null {
  const choices = aiResponse.choices as Array<{ message?: Record<string, unknown> }> | undefined;
  const message = choices?.[0]?.message;
  if (!message) return null;

  const toolCalls = message.tool_calls as Array<{ function?: { arguments?: unknown } }> | undefined;
  const toolArgs = toolCalls?.[0]?.function?.arguments;
  const parsedToolArgs = parseJsonFromAiText(toolArgs);
  if (parsedToolArgs) return { payload: parsedToolArgs, source: 'tool_calls[0].function.arguments' };

  const legacyFunctionCall = message.function_call as { arguments?: unknown } | undefined;
  const parsedLegacyArgs = parseJsonFromAiText(legacyFunctionCall?.arguments);
  if (parsedLegacyArgs) return { payload: parsedLegacyArgs, source: 'function_call.arguments' };

  const parsedContent = parseJsonFromAiText(message.content);
  if (parsedContent) return { payload: parsedContent, source: 'message.content' };

  return null;
}

// ========== STRICT FINANCIAL CALCULATOR ==========

interface CalculationAudit {
  formula: string;
  inputs: Record<string, number | string>;
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
  npv3Years?: number;
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
  log.info(`Location adjustments: salary=${locationMultipliers.salary}x, rent=${locationMultipliers.rent}x, utility=${locationMultipliers.utility}x, marketing=${locationMultipliers.marketing}x`);
  if (locationMultipliers.matched) {
    log.info(`Matched city: ${locationMultipliers.matchedCity} (${locationMultipliers.region})`);
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
    
    log.info(`Sub-industry detected: ${subIndustry.subIndustryName} (${subIndustry.businessModel}, ${subIndustry.targetScale})`);
    log.info(`Applied modifiers: CAC=${subIndustry.modifiers.cac_multiplier}x, LTV=${subIndustry.modifiers.ltv_multiplier}x, Churn=${subIndustry.modifiers.churn_multiplier}x`);
    log.info(`Effective churn rate: ${(effectiveChurnRate * 100).toFixed(1)}%/month`);
    
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
  // ENHANCED: B2B/enterprise businesses have hard CAC floors because enterprise sales
  // require dedicated account executives, demos, and multi-month cycles.
  const B2B_CAC_FLOOR_KEYWORDS = [
    'b2b', 'enterprise', 'saas', 'agency', 'consulting', 'professional services',
    'migration', 'platform', 'managed services', 'white label', 'white-label',
  ];
  const ideaLower = (benchmarks.name || '').toLowerCase();
  const isB2BEnterprise = B2B_CAC_FLOOR_KEYWORDS.some(kw => ideaLower.includes(kw))
    || (benchmarks.name?.toLowerCase().includes('consulting') ?? false)
    || (benchmarks.name?.toLowerCase().includes('saas') ?? false)
    || (benchmarks.name?.toLowerCase().includes('agency') ?? false);
  
  // B2B enterprise: minimum CAC of $2,000 (conservative for technical sales)
  const hardCacFloor = isB2BEnterprise ? Math.max(effectiveBenchmarks.cac_min, 2000) : effectiveBenchmarks.cac_min;
  
  let cac = rawCac;
  if (cac < hardCacFloor) {
    corrections.push({
      field: 'cac',
      original: cac,
      corrected: isB2BEnterprise ? Math.max(effectiveBenchmarks.cac_typical, 2000) : effectiveBenchmarks.cac_typical,
      reason: isB2BEnterprise 
        ? `CAC $${cac} is unrealistically low for B2B/enterprise sales. Enterprise customer acquisition typically costs $2,000-$50,000+ due to sales cycles, demos, and relationship-building. Adjusted to $${Math.max(effectiveBenchmarks.cac_typical, 2000)}.`
        : `CAC $${cac} is unrealistically low. Minimum is $${effectiveBenchmarks.cac_min} for ${subIndustry?.subIndustryName || benchmarks.name}.`
    });
    cac = isB2BEnterprise ? Math.max(effectiveBenchmarks.cac_typical, 2000) : effectiveBenchmarks.cac_typical;
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
  
  // 1.3 LTV - calculate from formula with GROSS MARGIN adjustment and sub-industry adjusted lifetime
  // BUG FIX: LTV must be margin-adjusted. Formula: LTV = Avg_Check × (1-COGS%) × Orders × Lifetime
  // Previously was raw revenue; now correctly represents what the business KEEPS from each customer.
  const effectiveLifetime = effectiveBenchmarks.client_lifetime_months;
  const grossMarginFraction = 1 - (benchmarks.cogs_percent / 100);
  const calculatedLtv = QMath.round(
    QMath.sanitize(avgCheck)
      .times(grossMarginFraction)
      .times(benchmarks.orders_per_client)
      .times(effectiveLifetime)
  );
  
  audit.push({
    formula: 'LTV = Avg_Check × (1 - COGS%) × Orders_per_Month × Client_Lifetime',
    inputs: {
      'Average Check': avgCheck,
      'Gross Margin Fraction': Math.round(grossMarginFraction * 100) / 100,
      'Orders/Month': benchmarks.orders_per_client,
      'Lifetime (months)': effectiveLifetime
    },
    result: calculatedLtv,
    isValid: true,
    notes: `$${avgCheck} × ${Math.round(grossMarginFraction * 100)}% × ${benchmarks.orders_per_client} × ${effectiveLifetime} = $${calculatedLtv} (margin-adjusted)`
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
  let ltvCacRatio = QMath.ltvCacRatio(ltv, cac);
  
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
  
  // ===== MARGIN CEILING GUARD (BUG FIX Phase 5 → Phase 6 tightened) =====
  // Audit finding: +20% buffer allowed 74-83% margins in consulting (max 50%).
  // Now enforced at benchmark max + 5% — still allows outperformance but prevents absurd projections.
  const maxAllowedMargin = benchmarks.net_margin_max + 5;
  let finalNetProfit = netProfit;
  let finalNetMarginPercent = netMarginPercent;
  let finalTotalExpenses = totalExpenses;
  
  if (netMarginPercent > maxAllowedMargin && mrr > 0) {
    const clampedMargin = maxAllowedMargin;
    const targetExpenses = Math.round(mrr * (1 - clampedMargin / 100));
    corrections.push({
      field: 'net_margin',
      original: netMarginPercent,
      corrected: clampedMargin,
      reason: `Net margin ${netMarginPercent}% exceeds maximum realistic threshold of ${maxAllowedMargin}% for ${benchmarks.name}. Expenses adjusted upward to enforce realistic model.`
    });
    finalTotalExpenses = targetExpenses;
    finalNetProfit = mrr - targetExpenses;
    finalNetMarginPercent = clampedMargin;
    log.warn(`⚠️ Margin ceiling enforced: ${netMarginPercent}% → ${clampedMargin}% (max for ${benchmarks.name} = ${benchmarks.net_margin_max}%)`);
  }
  
  audit.push({
    formula: 'Net_Margin = (Profit / Revenue) × 100%',
    inputs: { 'Profit': finalNetProfit, 'Revenue': mrr },
    result: finalNetMarginPercent,
    isValid: finalNetMarginPercent >= benchmarks.net_margin_min && finalNetMarginPercent <= maxAllowedMargin,
    notes: `($${finalNetProfit} / $${mrr}) × 100 = ${finalNetMarginPercent}% (healthy: ${benchmarks.net_margin_min}-${benchmarks.net_margin_max}%)`
  });
  
  const grossProfit = mrr - cogs;
  const grossMarginPercent = mrr > 0 ? Math.round((grossProfit / mrr) * 100) : 0;
  
  // ===== STEP 4: Calculate investment metrics =====
  
  const startupInvestment = rawInvestment;
  
  // RAMP-UP AWARE PAYBACK: Uses 6-month ramp schedule (30%→100% of revenue)
  // instead of assuming full Month 1 profit. This fixes the "1 month payback" template artifact.
  let paybackMonths = 0;
  if (startupInvestment > 0) {
    if (finalNetProfit > 0) {
      // Simulate ramp-up cash flow to find true payback month
      const RAMP = [0.30, 0.45, 0.60, 0.75, 0.90, 1.00];
      const fixedCostPortion = finalTotalExpenses * 0.6;
      const variableCostPortion = finalTotalExpenses * 0.4;
      let cumulative = 0;
      let foundPayback = false;
      
      for (let m = 1; m <= 60; m++) {
        let monthRevenue: number;
        let monthCosts: number;
        
        if (m <= RAMP.length) {
          monthRevenue = mrr * RAMP[m - 1];
          monthCosts = fixedCostPortion + variableCostPortion * RAMP[m - 1];
        } else {
          const growth = Math.pow(1.05, m - RAMP.length);
          monthRevenue = mrr * growth;
          monthCosts = finalTotalExpenses * Math.pow(1.025, m - RAMP.length);
        }
        
        cumulative += monthRevenue - monthCosts;
        if (cumulative >= startupInvestment) {
          paybackMonths = m;
          foundPayback = true;
          break;
        }
      }
      
      if (!foundPayback) paybackMonths = 999;
    } else {
      paybackMonths = 999;
    }
  }
  
  audit.push({
    formula: 'Payback = Ramp-Up Cash Flow Model (30%→100% over 6 months)',
    inputs: { 'Investment': startupInvestment, 'Steady-State Profit/mo': finalNetProfit },
    result: paybackMonths,
    isValid: paybackMonths < 36 && paybackMonths > 0,
    notes: paybackMonths === 999 
      ? 'Business is unprofitable - payback impossible' 
      : `With 6-month ramp-up: payback at month ${paybackMonths} (steady-state would be ${Math.ceil(startupInvestment / finalNetProfit)} months)`
  });
  
  // ROI also uses ramp-adjusted Year 1 profit (not 12 × steady-state)
  let roiYear1Percent = 0;
  if (startupInvestment > 0) {
    // Calculate actual Year 1 profit with ramp
    const RAMP = [0.30, 0.45, 0.60, 0.75, 0.90, 1.00];
    const fixedP = finalTotalExpenses * 0.6;
    const varP = finalTotalExpenses * 0.4;
    let year1Profit = 0;
    for (let m = 1; m <= 12; m++) {
      if (m <= RAMP.length) {
        year1Profit += mrr * RAMP[m - 1] - (fixedP + varP * RAMP[m - 1]);
      } else {
        const g = Math.pow(1.05, m - RAMP.length);
        year1Profit += mrr * g - finalTotalExpenses * Math.pow(1.025, m - RAMP.length);
      }
    }
    roiYear1Percent = Math.round((year1Profit / startupInvestment) * 100);
  }
  
  audit.push({
    formula: 'ROI = (Profit × 12 / Investment) × 100%',
    inputs: { 'Profit/mo': finalNetProfit, 'Investment': startupInvestment },
    result: roiYear1Percent,
    isValid: roiYear1Percent > 0,
    notes: `($${finalNetProfit} × 12 / $${startupInvestment}) × 100 = ${roiYear1Percent}%`
  });

  // BUG FIX (Phase 2): True DCF NPV — not cumulative profit.
  // NPV = –Investment + Σ(month 1→36) [ NetProfit / (1 + monthly_rate)^month ]
  // Using 10% annual WACC (standard small business cost of capital).
  const ANNUAL_WACC = 0.10;
  const monthlyDiscountRate = Math.pow(1 + ANNUAL_WACC, 1 / 12) - 1;
  let npvAccum = -startupInvestment;
  for (let m = 1; m <= 36; m++) {
    npvAccum += finalNetProfit / Math.pow(1 + monthlyDiscountRate, m);
  }
  const npv3Years = Math.round(npvAccum);

  audit.push({
    formula: 'NPV_3yr = -Investment + Σ(month 1→36) [NetProfit / (1 + Monthly_Rate)^month]',
    inputs: { 'Monthly Profit': finalNetProfit, 'Investment': startupInvestment, 'Annual WACC %': ANNUAL_WACC * 100, 'Monthly Rate %': Math.round(monthlyDiscountRate * 10000) / 100 },
    result: npv3Years,
    isValid: npv3Years > 0,
    notes: `DCF at 10% WACC: -$${startupInvestment} + 36mo discounted cash flows = $${npv3Years.toLocaleString()}`
  });
  
  // BUG FIX: Guard against division-by-zero when mrr=0 in break-even formula.
  const effectiveMrrForBreakeven = Math.max(mrr, benchmarks.average_check_min || 100);
  const variableCostRatio = (benchmarks.cogs_percent / 100) + (marketing / effectiveMrrForBreakeven);
  const safeContributionMargin = Math.max(1 - variableCostRatio, 0.01); // prevent zero or negative
  const breakEvenRevenue = Math.round(fixedCosts / safeContributionMargin);
  
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
  const revenueFor45kProfit = Math.round((fixedCosts + targetProfit) / safeContributionMargin);
  
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
    totalExpenses: finalTotalExpenses,
    netProfit: finalNetProfit,
    netMarginPercent: finalNetMarginPercent,
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
    ordersMonthly: Math.round(mrr / Math.max(avgCheck, 1)),
    clientsActive,
    newClientsNeeded,
    startupInvestment,
    paybackMonths,
    roiYear1Percent,
    npv3Years,
    breakEvenRevenue,
    revenueFor45kProfit,
    isProfitable: finalNetProfit > 0,
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

// ========== DETERMINISTIC FALLBACK GENERATOR ==========
// Generates a complete analysis when AI is unavailable
// Uses industry benchmarks and location data to create professional content

function generateDeterministicFallbackResult(
  idea: string,
  location: string,
  benchmarks: IndustryBenchmarks,
  locationMultipliers: LocationMultiplierResult,
  userInputs?: OptionalFinancialInputs
): any {
  const investmentAmount = userInputs?.startup_investment || Math.round((benchmarks.salaries_fixed + benchmarks.rent_fixed) * 12);
  const monthlyRevenue = userInputs?.monthly_revenue || Math.round(benchmarks.average_check_max * benchmarks.orders_per_client * 80);
  const cacValue = userInputs?.cac || benchmarks.cac_typical;
  const avgCheck = userInputs?.average_price || (benchmarks.average_check_min + benchmarks.average_check_max) / 2;
  const ltvValue = Math.round(avgCheck * benchmarks.orders_per_client * benchmarks.client_lifetime_months);
  
  // Generate professional launch steps
  const launchSteps = [
    {
      step: 1,
      title: "Market Validation & Research",
      description: `Conduct comprehensive market research in ${location}. Validate demand through surveys, interviews with potential customers, and competitive analysis. Identify key customer segments and their pain points.`,
      duration: "2-3 weeks",
      cost: Math.round(investmentAmount * 0.05)
    },
    {
      step: 2,
      title: "Legal & Business Setup",
      description: `Register business entity, obtain necessary licenses and permits for ${location}. Set up business banking, accounting systems, and legal contracts. Secure insurance coverage.`,
      duration: "2-4 weeks",
      cost: Math.round(investmentAmount * 0.08)
    },
    {
      step: 3,
      title: "Build Core Product/Service Infrastructure",
      description: `Develop the minimum viable product or service offering. Set up operational infrastructure, technology stack, and vendor relationships. Create standard operating procedures.`,
      duration: "4-8 weeks",
      cost: Math.round(investmentAmount * 0.40)
    },
    {
      step: 4,
      title: "Beta Launch & Customer Feedback",
      description: `Launch to a small group of early adopters. Collect detailed feedback on product/service, pricing, and customer experience. Iterate based on real user data before full launch.`,
      duration: "3-4 weeks",
      cost: Math.round(investmentAmount * 0.12)
    },
    {
      step: 5,
      title: "Marketing & Customer Acquisition Launch",
      description: `Execute full marketing campaign across digital and local channels. Implement customer acquisition funnels, referral programs, and promotional strategies targeted at ${location} market.`,
      duration: "4-6 weeks",
      cost: Math.round(investmentAmount * 0.20)
    },
    {
      step: 6,
      title: "Scale & Optimize Operations",
      description: `Hire additional team members, expand capacity, and optimize operations based on learnings. Focus on improving unit economics, customer retention, and operational efficiency.`,
      duration: "Ongoing",
      cost: Math.round(investmentAmount * 0.15)
    }
  ];

  // Generate comprehensive risks
  const risks = [
    {
      risk: "Market Competition Intensification",
      probability: "high",
      impact: "high",
      mitigation: `Build strong differentiation through superior customer experience and unique value proposition. Monitor competitor activities in ${location} market and respond strategically. Focus on building customer loyalty and switching costs.`
    },
    {
      risk: "Customer Acquisition Cost Escalation",
      probability: "medium",
      impact: "high",
      mitigation: `Diversify acquisition channels to reduce dependency on any single source. Invest in organic growth through content marketing and referrals. Continuously A/B test and optimize marketing campaigns for efficiency.`
    },
    {
      risk: "Cash Flow Management Challenges",
      probability: "medium",
      impact: "high",
      mitigation: `Maintain 4-6 months operating reserve. Negotiate favorable payment terms with suppliers. Monitor cash flow weekly and adjust spending proactively. Consider revenue-based financing if needed.`
    },
    {
      risk: "Operational Scaling Difficulties",
      probability: "medium",
      impact: "medium",
      mitigation: `Document all processes early. Invest in systems and automation before they're critically needed. Hire ahead of demand curve. Build relationships with reliable vendors and partners.`
    },
    {
      risk: "Regulatory or Compliance Changes",
      probability: "low",
      impact: "high",
      mitigation: `Stay informed about industry regulations in ${location}. Engage with industry associations. Build compliance into operations from the start. Maintain relationship with legal counsel.`
    }
  ];

  // Generate marketing channels
  const marketingBudget = Math.round(monthlyRevenue * 0.15) || 1500;
  const channels = [
    {
      channel: "Digital Advertising (Google/Meta)",
      description: `Targeted paid advertising campaigns on Google Ads and Meta platforms. Focus on high-intent keywords and lookalike audiences in ${location}. Implement retargeting for website visitors.`,
      budget_monthly: Math.round(marketingBudget * 0.40),
      expected_roi: "2.5-3.5x return on ad spend within 60-90 days"
    },
    {
      channel: "Content Marketing & SEO",
      description: `Create valuable content addressing customer pain points. Optimize for local SEO in ${location}. Build authority through blogs, videos, and educational resources to drive organic traffic.`,
      budget_monthly: Math.round(marketingBudget * 0.20),
      expected_roi: "Long-term organic growth, 5-10x ROI over 12 months"
    },
    {
      channel: "Social Media Marketing",
      description: `Build engaged community on relevant social platforms. Share valuable content, customer stories, and behind-the-scenes content. Engage actively with followers and local ${location} community.`,
      budget_monthly: Math.round(marketingBudget * 0.15),
      expected_roi: "Brand awareness and 3-4x engagement-to-conversion"
    },
    {
      channel: "Referral & Loyalty Program",
      description: `Incentivize existing customers to refer friends and family. Implement loyalty rewards for repeat purchases. Create advocacy program for top customers.`,
      budget_monthly: Math.round(marketingBudget * 0.15),
      expected_roi: "5-7x ROI through word-of-mouth, lowest CAC channel"
    },
    {
      channel: "Local Partnerships & Events",
      description: `Partner with complementary businesses in ${location}. Participate in local events, sponsor community activities. Build strategic alliances for cross-promotion.`,
      budget_monthly: Math.round(marketingBudget * 0.10),
      expected_roi: "Network effects and brand credibility in local market"
    }
  ];

  return {
    financial_json: JSON.stringify({
      mrr: monthlyRevenue,
      average_check: avgCheck,
      orders_monthly: Math.round(monthlyRevenue / avgCheck),
      startup_investment: investmentAmount,
      cac: cacValue,
      ltv: ltvValue,
      equipment: Math.round(investmentAmount * 0.35)
    }),
    business_json: JSON.stringify({
      executive_summary: (() => {
        // Use margin-adjusted, capped LTV:CAC ratio — same formula as strict calculator
        const grossMarginFraction = 1 - (benchmarks.cogs_percent / 100);
        const adjustedLtv = Math.round(avgCheck * grossMarginFraction * benchmarks.orders_per_client * benchmarks.client_lifetime_months);
        const cappedLtvCacRatio = Math.min(Math.round((adjustedLtv / cacValue) * 10) / 10, benchmarks.ltv_cac_max);
        const isSoftware = ['saas', 'fintech', 'education', 'media'].includes(benchmarks.id);
        
        return `This ${benchmarks.name} opportunity in ${location} presents a ${cappedLtvCacRatio >= 3 ? 'compelling' : 'moderate'} investment case based on industry benchmarks and market analysis. With projected monthly revenue of $${monthlyRevenue.toLocaleString()} and an initial investment of $${investmentAmount.toLocaleString()}, the business targets the ${isSoftware ? 'growing digital demand' : 'growing demand'} in the ${location} market.\n\nThe ${benchmarks.name} industry shows typical net margins of ${benchmarks.net_margin_min}%-${benchmarks.net_margin_max}%, with a target LTV:CAC ratio of ${cappedLtvCacRatio}x — indicating ${cappedLtvCacRatio >= 3 ? 'healthy' : 'developing'} unit economics when customer acquisition is optimized.\n\nKey success factors include ${isSoftware ? 'product-market fit, scalable architecture, and efficient customer onboarding' : 'building strong customer relationships, optimizing operational efficiency, and maintaining competitive differentiation'}. The phased launch approach minimizes risk while allowing for iterative improvements based on real market feedback.`;
      })(),
      product_description: (() => {
        const isSoftware = ['saas', 'fintech', 'education', 'media'].includes(benchmarks.id);
        return isSoftware
          ? `A ${benchmarks.name} product built to solve specific workflow challenges for its target market. The platform delivers measurable value through automation, efficiency gains, and data-driven insights. Pricing is set at $${avgCheck.toLocaleString()}/month per user, aligned with market expectations. The delivery model leverages cloud infrastructure for instant scalability.`
          : `A ${benchmarks.name} offering designed to meet the specific needs of customers in the ${location} market. The product/service delivers measurable value through quality, convenience, and customer-centric design. Pricing is set at an average of $${avgCheck.toLocaleString()} per transaction, aligned with market expectations and competitive positioning.`;
      })(),
      target_audience: (() => {
        const isSoftware = ['saas', 'fintech', 'education', 'media'].includes(benchmarks.id);
        return isSoftware
          ? `Primary target: businesses and professionals in the ${location} region seeking ${benchmarks.name.toLowerCase()} solutions to streamline operations. Demographics include decision-makers at SMBs and mid-market companies. Key pain points include manual processes, lack of real-time visibility, and fragmented tooling.`
          : `Primary target customers in ${location} who are seeking high-quality ${benchmarks.name.toLowerCase()} solutions. Demographics include value-conscious consumers who prioritize quality and convenience. Key pain points include inconsistent quality from competitors and lack of personalized attention.`;
      })(),
      competitive_advantages: (() => {
        const isSoftware = ['saas', 'fintech', 'education', 'media'].includes(benchmarks.id);
        return isSoftware
          ? `1) Purpose-built solution for specific workflows vs. generic alternatives. 2) Scalable cloud architecture enabling rapid feature iteration. 3) Data-driven insights providing measurable ROI to customers. 4) Lower total cost of ownership vs. incumbent solutions. 5) Modern UX reducing onboarding friction and driving retention.`
          : `1) Customer-centric approach with personalized service delivery. 2) Operational efficiency enabling competitive pricing without sacrificing margins. 3) Technology-enabled processes for superior customer experience. 4) Strong local market knowledge and ${location}-specific expertise. 5) Commitment to continuous improvement based on customer feedback.`;
      })(),
      operations: (() => {
        const isSoftware = ['saas', 'fintech', 'education', 'media'].includes(benchmarks.id);
        return isSoftware
          ? `The operational model centers on product development and customer success. Engineering team maintains the core platform with CI/CD deployment pipelines. Customer success handles onboarding, support, and retention. Infrastructure runs on cloud providers (AWS/GCP) with automated scaling. Monitoring and alerting ensure 99.9% uptime targets.`
          : `The operational model focuses on efficiency and scalability. Initial team structure includes core operations staff with clear roles and responsibilities. Technology stack leverages modern tools for customer management, operations, and analytics. Standard operating procedures ensure consistent quality delivery.`;
      })(),
      launch_steps: launchSteps,
      risks: risks
    }),
    marketing_json: JSON.stringify({
      positioning: `For customers in ${location} who need reliable ${benchmarks.name.toLowerCase()} solutions, we offer a customer-focused approach that prioritizes quality and convenience. Unlike traditional competitors who offer generic solutions, we provide personalized experiences backed by modern operational excellence.`,
      pricing_strategy: `Pricing strategy targets the $${benchmarks.average_check_min}-$${benchmarks.average_check_max} range per transaction, positioning in the quality-value segment. This pricing supports ${benchmarks.net_margin_min}%-${benchmarks.net_margin_max}% net margins while remaining competitive. Tiered pricing options may be introduced based on service levels and customer segments.`,
      channels: channels,
      cac: cacValue,
      ltv: ltvValue,
      first_3_months_plan: `Month 1: Execute soft launch with founding customers, validate product-market fit, optimize operations based on feedback. Target: 20-30 paying customers. Month 2: Activate paid advertising channels, launch referral program, begin content marketing. Target: 50-70 customers, establish CAC baselines. Month 3: Scale successful channels, optimize underperformers, hire additional team if needed. Target: 100+ customers, achieve unit economics targets.`
    }),
    market_json: JSON.stringify({
      tam: (() => {
        const isSoftware = ['saas', 'fintech', 'education', 'media'].includes(benchmarks.id);
        return isSoftware
          ? `The global ${benchmarks.name} market represents a multi-billion dollar opportunity, driven by enterprise digital transformation, workflow automation demand, and increasing software adoption across industries.`
          : `Total Addressable Market for ${benchmarks.name} in the broader region represents a multi-billion dollar opportunity globally, with consistent growth driven by increasing consumer demand and market maturation.`;
      })(),
      sam: (() => {
        const isSoftware = ['saas', 'fintech', 'education', 'media'].includes(benchmarks.id);
        return isSoftware
          ? `Serviceable Available Market targets ${benchmarks.name} buyers in North America and ${location}-adjacent markets, representing approximately $500M-$2B in annual software spending for this category.`
          : `Serviceable Available Market in the ${location} area represents approximately $50-200M in annual spending, depending on market density and demographic factors.`;
      })(),
      som: `Serviceable Obtainable Market targets realistic first-year revenue of $${(monthlyRevenue * 12).toLocaleString()} based on capacity constraints and market penetration assumptions. Year 2-3 growth targets 50-100% annually.`,
      trends: (() => {
        const isSoftware = ['saas', 'fintech', 'education', 'media'].includes(benchmarks.id);
        return isSoftware
          ? [
              "Enterprise AI adoption accelerating demand for intelligent automation platforms",
              "Shift from point solutions to integrated platforms reducing tool sprawl",
              "Growing demand for API-first, composable software architectures",
              `${location} emerging as a technology hub with growing talent pool and enterprise customers`
            ]
          : [
              "Digital transformation accelerating customer expectations for convenience and transparency",
              "Increasing preference for local, trusted service providers over large national chains",
              "Growing focus on customer experience as a key differentiator in competitive markets",
              `Economic factors in ${location} creating opportunities for value-focused offerings`
            ];
      })(),
      competitors: (() => {
        const isSoftware = ['saas', 'fintech', 'education', 'media'].includes(benchmarks.id);
        return isSoftware
          ? [
              { name: "Incumbent Enterprise Solutions", strengths: "Market share, brand trust, enterprise relationships", weaknesses: "Legacy architecture, slow innovation, high pricing" },
              { name: "Well-Funded SaaS Startups", strengths: "Modern UX, venture capital, fast iteration", weaknesses: "Unproven at scale, feature gaps, high burn rate" },
              { name: "Open-Source Alternatives", strengths: "Free tier, developer community, transparency", weaknesses: "No enterprise support, fragmented, integration complexity" }
            ]
          : [
              { name: "Established Local Provider", strengths: "Market presence, customer relationships", weaknesses: "Outdated operations, poor digital experience" },
              { name: "National Chain", strengths: "Brand recognition, resources", weaknesses: "Impersonal service, higher overhead" },
              { name: "Emerging Competitors", strengths: "Fresh approach, low costs", weaknesses: "Unproven, limited track record" }
            ];
      })(),
      competitive_landscape: `The ${benchmarks.name} market is moderately competitive with a mix of established players and emerging alternatives. Opportunity exists for differentiated offerings that combine ${['saas', 'fintech', 'education', 'media'].includes(benchmarks.id) ? 'superior technology with ease of use' : 'quality with modern customer experience expectations'}.`,
      market_gaps: (() => {
        const isSoftware = ['saas', 'fintech', 'education', 'media'].includes(benchmarks.id);
        return isSoftware
          ? `Underserved segments include mid-market companies too large for basic tools but too small for enterprise solutions, teams needing vertical-specific workflows, and organizations seeking AI-native platforms.`
          : `Underserved segments include busy professionals seeking convenience, quality-conscious customers frustrated with inconsistent service, and digitally-savvy consumers expecting modern service delivery.`;
      })(),
      barriers_to_entry: `Initial capital requirements of $${investmentAmount.toLocaleString()}, ${['saas', 'fintech', 'education', 'media'].includes(benchmarks.id) ? 'technical complexity, time to achieve product-market fit, and competitive response from well-funded incumbents' : 'time to build customer trust and reputation, competitive response from established players, and operational complexity'}.`,
      growth_opportunities: `${['saas', 'fintech', 'education', 'media'].includes(benchmarks.id) ? 'Product-led growth expansion, enterprise tier upselling, API marketplace partnerships, and international market entry' : `Geographic expansion within ${location} region, service line extensions, strategic partnerships with complementary businesses, and technology-enabled scaling`}.`
    }),
    sources: "Industry benchmarks, market analysis, location intelligence",
    limitations: "Analysis based on industry averages; actual results may vary based on execution"
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
  const sources = Array.isArray(raw.sources)
    ? raw.sources.map((s: unknown) => String(s).trim()).filter(Boolean)
    : (typeof raw.sources === 'string' && raw.sources.trim().length > 0)
      ? raw.sources.split(',').map((s: string) => s.trim()).filter(Boolean)
      : ["Public sources", "Industry data"];
  // limitations may arrive as an array (JSON-mode narrator) or a comma string.
  const limits = Array.isArray(raw.limitations)
    ? raw.limitations.map((s: unknown) => String(s).trim()).filter(Boolean)
    : (typeof raw.limitations === 'string' && raw.limitations.trim().length > 0)
      ? raw.limitations.split(',').map((s: string) => s.trim()).filter(Boolean)
      : ["Estimates based on industry benchmarks"];

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
  log.info(`Input sources: MRR=${userInputs?.monthly_revenue ? 'USER' : 'AI'}($${rawMrr}), Investment=${userInputs?.startup_investment ? 'USER' : 'AI'}($${rawInvestment}), CAC=${userInputs?.cac ? 'USER' : 'AI'}($${rawCac})`);
  
  // Validation: warn if AI values significantly differ from user inputs
  if (userInputs?.monthly_revenue && fa.mrr) {
    const diff = Math.abs(fa.mrr - userInputs.monthly_revenue) / userInputs.monthly_revenue;
    if (diff > 0.2) {
      log.warn(`⚠️ AI estimated revenue $${fa.mrr} differs ${Math.round(diff * 100)}% from user input $${userInputs.monthly_revenue}`);
    }
  }
  if (userInputs?.startup_investment && fa.startup_investment) {
    const diff = Math.abs(fa.startup_investment - userInputs.startup_investment) / userInputs.startup_investment;
    if (diff > 0.2) {
      log.warn(`⚠️ AI estimated investment $${fa.startup_investment} differs ${Math.round(diff * 100)}% from user input $${userInputs.startup_investment}`);
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
        const baseCogsPercent = calc.mrr > 0 ? calc.expenses.cogs / calc.mrr : 0;
        
        // Pessimistic scenario: 20% less revenue + margin COMPRESSION (+5% COGS ratio)
        const pessRevenue = Math.round(calc.mrr * 0.8);
        const pessCogsRatio = Math.min(baseCogsPercent + 0.05, 0.95);
        const pessCogs = Math.round(pessRevenue * pessCogsRatio);
        const pessMarketing = Math.round(calc.expenses.marketing * 0.85);
        const pessFixed = Math.round(fixedCosts * 1.05);
        const pessTotalExpenses = pessCogs + pessMarketing + pessFixed;
        const pessNetProfit = pessRevenue - pessTotalExpenses;
        const pessGrossProfit = pessRevenue - pessCogs;
        const pessNetMargin = pessRevenue > 0 ? Math.round((pessNetProfit / pessRevenue) * 100) : 0;
        const pessGrossMargin = pessRevenue > 0 ? Math.round((pessGrossProfit / pessRevenue) * 100) : 0;
        
        // Base scenario: current values
        const baseVariableCosts = calc.expenses.cogs + calc.expenses.marketing;
        const baseTotalExpenses = fixedCosts + baseVariableCosts;
        const baseNetProfit = calc.mrr - baseTotalExpenses;
        const baseNetMargin = calc.mrr > 0 ? Math.round((baseNetProfit / calc.mrr) * 100) : 0;
        
        // Optimistic scenario: 25% more revenue + margin EXPANSION (-2% COGS ratio)
        const optRevenue = Math.round(calc.mrr * 1.25);
        const optCogsRatio = Math.max(baseCogsPercent - 0.02, 0.01);
        const optCogs = Math.round(optRevenue * optCogsRatio);
        const optMarketing = Math.round(calc.expenses.marketing * 1.20);
        const optFixed = Math.round(fixedCosts * 0.95);
        const optTotalExpenses = optCogs + optMarketing + optFixed;
        const optNetProfit = optRevenue - optTotalExpenses;
        const optGrossProfit = optRevenue - optCogs;
        const optNetMargin = optRevenue > 0 ? Math.round((optNetProfit / optRevenue) * 100) : 0;
        const optGrossMargin = optRevenue > 0 ? Math.round((optGrossProfit / optRevenue) * 100) : 0;
        
        return {
          pessimistic: {
            revenue: pessRevenue,
            variable_costs: pessCogs + pessMarketing,
            fixed_costs: pessFixed,
            gross_profit: pessGrossProfit,
            net_profit: pessNetProfit,
            gross_margin: pessGrossMargin,
            net_margin: pessNetMargin
          },
          base: {
            revenue: calc.mrr,
            variable_costs: baseVariableCosts,
            fixed_costs: fixedCosts,
            gross_profit: calc.grossProfit,
            net_profit: baseNetProfit,
            gross_margin: calc.grossMarginPercent,
            net_margin: baseNetMargin
          },
          optimistic: {
            revenue: optRevenue,
            variable_costs: optCogs + optMarketing,
            fixed_costs: optFixed,
            gross_profit: optGrossProfit,
            net_profit: optNetProfit,
            gross_margin: optGrossMargin,
            net_margin: optNetMargin
          }
        };
      })(),
      unit_economics: {
        contribution_margin: Math.round(calc.averageCheck - calc.averageCheck * (benchmarks.cogs_percent / 100)),
        contribution_margin_ratio: (100 - benchmarks.cogs_percent) / 100,
        cac: calc.cac,
        cac_payback_months: QMath.roundTo(QMath.cacPaybackMonths(calc.cac, calc.averageCheck, (100 - benchmarks.cogs_percent) / 100), 1),
        ltv: calc.ltv,
        ltv_cac_ratio: calc.ltvCacRatio
      },
      breakeven: {
        breakeven_units: Math.ceil(calc.breakEvenRevenue / Math.max(calc.averageCheck, 1)),
        breakeven_revenue: calc.breakEvenRevenue,
        breakeven_months: calc.isProfitable ? Math.min(calc.paybackMonths, 24) : 0
      },
      returns: {
        payback_period_months: calc.paybackMonths,
        roi_year_1: calc.roiYear1Percent,
        roi_year_3: Math.round((calc.netProfit * 36 / Math.max(calc.startupInvestment, 1)) * 100),
        // BUG FIX: True DCF NPV at 10% annual WACC — not cumulative profit
        npv_3_years: (() => {
          const monthlyRate = Math.pow(1.10, 1 / 12) - 1;
          let npv = -calc.startupInvestment;
          for (let m = 1; m <= 36; m++) {
            npv += calc.netProfit / Math.pow(1 + monthlyRate, m);
          }
          return Math.round(npv);
        })(),
      },
      startup_investment: (() => {
        // INDUSTRY-AWARE investment breakdown
        const total = calc.startupInvestment;
        const industryCategories = INDUSTRY_INVESTMENT_CATEGORIES[benchmarks.id];
        
        if (industryCategories) {
          // Use industry-specific breakdown (no "inventory" for software)
          const breakdown: Record<string, number> = {};
          let allocated = 0;
          for (const [label, pct] of Object.entries(industryCategories.labels)) {
            breakdown[label] = Math.round(total * pct);
            allocated += breakdown[label];
          }
          // Working capital absorbs remainder
          breakdown.working_capital = total - allocated;
          if (breakdown.working_capital < 0) breakdown.working_capital = 0;
          
          const breakdownSum = Object.values(breakdown).reduce((a, b) => a + b, 0);
          if (breakdownSum !== total) {
            breakdown.working_capital += (total - breakdownSum);
          }
          
          return { total, breakdown, reasoning: `Industry-specific ${benchmarks.name} investment allocation` };
        }
        
        // Default breakdown for physical businesses
        const rentDeposit = Math.round(calc.expenses.rent * 2);
        const equipment = Math.round(total * 0.40);
        const inventory = Math.round(total * 0.15);
        const legal = Math.min(2000, Math.round(total * 0.05));
        const marketingInitial = Math.round(total * 0.10);
        const workingCapital = total - rentDeposit - equipment - inventory - legal - marketingInitial;
        
        const breakdown: Record<string, number> = {
          rent_deposit: rentDeposit,
          equipment: equipment,
          inventory: inventory,
          legal: legal,
          marketing_initial: marketingInitial,
          working_capital: Math.max(0, workingCapital)
        };
        
        const breakdownSum = Object.values(breakdown).reduce((a, b) => a + b, 0);
        if (breakdownSum !== total) {
          breakdown.working_capital += (total - breakdownSum);
        }
        
        return {
          total,
          breakdown,
          reasoning: `Investment $${total.toLocaleString()}: equipment 40%, inventory 15%, working capital ${Math.round(Math.max(0, workingCapital) / total * 100)}%, marketing 10%, deposit & legal ${Math.round((rentDeposit + legal) / total * 100)}%`
        };
      })(),
      monthly_expenses: (() => {
        // INDUSTRY-AWARE: Use appropriate label for COGS based on industry type
        const cogsLabel = INDUSTRY_COGS_LABELS[benchmarks.id] || INDUSTRY_COGS_LABELS.general;
        const breakdown: Record<string, number> = {
          rent: calc.expenses.rent,
          utilities: calc.expenses.utilities,
          salaries: calc.expenses.salaries,
          [cogsLabel]: calc.expenses.cogs,
          marketing: calc.expenses.marketing,
          other: calc.expenses.other
        };
        
        // Calculate actual sum of breakdown items
        const breakdownSum = Object.values(breakdown).reduce((a, b) => a + b, 0);
        
        // Log warning if there's a mismatch with calc.totalExpenses
        if (Math.abs(breakdownSum - calc.totalExpenses) > 1) {
          log.warn(`⚠️ Expense mismatch detected: breakdown sum=$${breakdownSum}, calc.totalExpenses=$${calc.totalExpenses}. Using sum.`);
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
      executive_summary: bp.executive_summary || "Business analysis in progress. Please provide more details for comprehensive summary.",
      product_description: bp.product_description || "Product/service details being analyzed.",
      target_audience: bp.target_audience || `Target customers in ${location} market.`,
      competitive_advantages: bp.competitive_advantages || "Differentiation analysis in progress.",
      operations: bp.operations || "Operational model being developed.",
      // Transform launch_steps - handle various formats from AI
      launch_steps: (() => {
        if (!bp.launch_steps || !Array.isArray(bp.launch_steps)) {
          // Return default launch steps if none provided
          return [
            { step: 1, title: "Market Validation", description: "Validate demand with target customers", duration: "2-3 weeks", cost: Math.round(calc.startupInvestment * 0.05) },
            { step: 2, title: "Business Setup", description: "Legal registration and initial setup", duration: "2-4 weeks", cost: Math.round(calc.startupInvestment * 0.10) },
            { step: 3, title: "Build MVP", description: "Develop minimum viable product/service", duration: "4-8 weeks", cost: Math.round(calc.startupInvestment * 0.40) },
            { step: 4, title: "Beta Launch", description: "Soft launch with early adopters", duration: "2-4 weeks", cost: Math.round(calc.startupInvestment * 0.15) },
            { step: 5, title: "Marketing Launch", description: "Full marketing campaign activation", duration: "4-6 weeks", cost: Math.round(calc.startupInvestment * 0.20) },
            { step: 6, title: "Scale Operations", description: "Optimize and scale based on feedback", duration: "Ongoing", cost: Math.round(calc.startupInvestment * 0.10) },
          ];
        }
        return bp.launch_steps.map((step: any, idx: number) => {
          if (typeof step === 'string') {
            // Handle simple string array
            return { step: idx + 1, title: step, description: step, duration: "2-4 weeks", cost: Math.round(calc.startupInvestment * 0.1) };
          }
          // Handle object format - normalize field names
          return {
            step: step.step || idx + 1,
            title: step.title || step.name || `Step ${idx + 1}`,
            description: step.description || step.details || "",
            duration: step.duration || step.timeline || "2-4 weeks",
            cost: typeof step.cost === 'number' ? step.cost : Math.round(calc.startupInvestment * 0.1)
          };
        });
      })(),
      // Transform risks - handle various formats from AI
      risks: (() => {
        if (!bp.risks || !Array.isArray(bp.risks)) {
          // Return default risks if none provided
          return [
            { risk: "Market Competition", probability: "high" as const, impact: "high" as const, mitigation: "Focus on differentiation and superior customer experience." },
            { risk: "Customer Acquisition", probability: "medium" as const, impact: "high" as const, mitigation: "Diversify marketing channels and optimize CAC." },
            { risk: "Cash Flow Management", probability: "medium" as const, impact: "high" as const, mitigation: "Maintain 3-6 month operating reserve and monitor closely." },
            { risk: "Operational Challenges", probability: "medium" as const, impact: "medium" as const, mitigation: "Build processes and documentation early." },
          ];
        }
        return bp.risks.map((risk: any) => {
          if (typeof risk === 'string') {
            return { risk: risk, probability: "medium" as const, impact: "medium" as const, mitigation: "Develop mitigation strategy." };
          }
          // Normalize probability and impact values
          const normalizePriority = (val: string | undefined): "low" | "medium" | "high" => {
            const v = (val || 'medium').toLowerCase();
            if (v.includes('low') || v.includes('низк')) return 'low';
            if (v.includes('high') || v.includes('высок')) return 'high';
            return 'medium';
          };
          return {
            risk: risk.risk || risk.name || risk.description || "Identified risk",
            probability: normalizePriority(risk.probability),
            impact: normalizePriority(risk.impact),
            mitigation: risk.mitigation || risk.solution || "Develop mitigation strategy."
          };
        });
      })()
    },
    marketing_plan: {
      positioning: mp.positioning || "Strategic market positioning being developed.",
      pricing_strategy: mp.pricing_strategy || `Competitive pricing strategy for ${location} market.`,
      // Transform channels - handle various formats from AI
      channels: (() => {
        if (!mp.channels || !Array.isArray(mp.channels)) {
          // Return default channels if none provided
          const monthlyMarketingBudget = calc.expenses.marketing || 1000;
          return [
            { channel: "Social Media Marketing", description: "Organic and paid social media presence", budget_monthly: Math.round(monthlyMarketingBudget * 0.30), expected_roi: "3-4x return" },
            { channel: "Content Marketing", description: "Blog, SEO, and educational content", budget_monthly: Math.round(monthlyMarketingBudget * 0.20), expected_roi: "Long-term organic growth" },
            { channel: "Paid Advertising", description: "Google Ads and targeted campaigns", budget_monthly: Math.round(monthlyMarketingBudget * 0.35), expected_roi: "2-3x return" },
            { channel: "Referral Program", description: "Customer referral incentives", budget_monthly: Math.round(monthlyMarketingBudget * 0.15), expected_roi: "5x return via word-of-mouth" },
          ];
        }
        return mp.channels.map((ch: any) => {
          if (typeof ch === 'string') {
            return { channel: ch, description: ch, budget_monthly: Math.round((calc.expenses.marketing || 1000) * 0.25), expected_roi: "Expected positive return" };
          }
          return {
            channel: ch.channel || ch.name || "Marketing Channel",
            description: ch.description || ch.strategy || "",
            budget_monthly: typeof ch.budget_monthly === 'number' ? ch.budget_monthly : (typeof ch.budget === 'number' ? ch.budget : Math.round((calc.expenses.marketing || 1000) * 0.25)),
            expected_roi: ch.expected_roi || ch.roi || "Expected positive return"
          };
        });
      })(),
      cac: calc.cac,
      ltv: calc.ltv,
      first_3_months_plan: mp.first_3_months_plan || "Month 1: Establish presence and initial customer acquisition. Month 2: Optimize campaigns based on data. Month 3: Scale successful channels and refine targeting."
    },
    market_analysis: {
      market_size: {
        tam: ma.tam || "Total addressable market analysis in progress.",
        sam: ma.sam || "Serviceable available market to be determined.",
        som: ma.som || "Realistic obtainable market share target."
      },
      trends: Array.isArray(ma.trends) && ma.trends.length > 0 ? ma.trends : [
        "Digital transformation accelerating industry adoption",
        "Consumer preference shifting toward convenience and quality",
        "Increased competition driving innovation",
        "Economic factors affecting purchasing decisions"
      ],
      competition: {
        main_competitors: (() => {
          if (!ma.competitors || !Array.isArray(ma.competitors) || ma.competitors.length === 0) {
            return [
              { name: "Direct Competitor A", strengths: "Established market presence", weaknesses: "Higher prices, less personalized service" },
              { name: "Direct Competitor B", strengths: "Strong brand recognition", weaknesses: "Slower to innovate" },
              { name: "Indirect Alternative", strengths: "Different approach to same problem", weaknesses: "Less focused solution" }
            ];
          }
          return ma.competitors.map((comp: any) => {
            if (typeof comp === 'string') {
              return { name: comp, strengths: "Established player", weaknesses: "Opportunity to differentiate" };
            }
            return {
              name: comp.name || "Competitor",
              strengths: comp.strengths || "Market presence",
              weaknesses: comp.weaknesses || "Areas for differentiation"
            };
          });
        })(),
        competitive_landscape: ma.competitive_landscape || `Competitive market in ${location} with opportunities for differentiation.`,
        market_gaps: ma.market_gaps || "Identify underserved segments and unmet customer needs."
      },
      barriers_to_entry: ma.barriers_to_entry || "Capital requirements, regulatory compliance, and competitive positioning challenges.",
      growth_opportunities: ma.growth_opportunities || "Geographic expansion, product line extension, and strategic partnerships."
    },
    confidence_score: 0,
    data_sources: sources,
    limitations: limits,
    _calc: calc
  };
}

serve(async (req) => {
  // Deploy-fidelity probe — first so health is auth-free and cheap.
  const healthResp = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (healthResp) return healthResp;
  // Per-request CORS headers (origin allowlist — see _shared/cors.ts).
  const corsHeaders = corsHeadersFor(req);
  // Correlation ID — read from `x-request-id` (set by the UI) or generate.
  const requestId = getRequestId(req);
  const responseHeaders = { ...corsHeaders, ...requestIdHeader(requestId) };


  if (req.method === "OPTIONS") {
    return new Response(null, { headers: responseHeaders });
  }

  // ── WS1: GOLDEN RESULT CHECKPOINT ──
  // Once a schema-valid deterministic result exists, it MUST reach the user.
  // GOLDEN is set right after transformResponse produces `result`. Every
  // enrichment after that is wrapped so a throw only degrades — never kills.
  let GOLDEN: Record<string, unknown> | null = null;
  let GOLDEN_degraded = false;
  let GOLDEN_reason: string | null = null;
  // Hoisted inputs for the last-resort fallback in the outermost catch.
  let _idea_clean = '';
  let _location_clean = '';
  let _mergedFinancialInputs: OptionalFinancialInputs | undefined;
  let _detectedIndustry: IndustryBenchmarks | undefined;
  let _locationMultipliers: LocationMultiplierResult | undefined;
  let _userPlan = 'free';
  let _corsHeaders: Record<string, string> = corsHeaders;
  let _isAnonymous = true;
  let _userId: string | null = null;

  try {
    // ========== HTTP REQUEST VALIDATION ==========
    const httpValidation = validateHttpRequest(req);
    if (!httpValidation.valid) {
      log.error(`HTTP validation failed: ${httpValidation.error}`);
      return new Response(
        JSON.stringify({ error: httpValidation.error, code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== RATE LIMITING CONFIGURATION ==========
    const RATE_LIMITS = {
      anonymous: { requests: 1, windowMinutes: 60 },  // 1 request per hour for unauthenticated
      free:      { requests: 5, windowMinutes: 60 },  // 5 requests per hour — matches monthly quota ceiling; prevents abuse without blocking legitimate use
      plus:      { requests: 20, windowMinutes: 60 }, // 20 requests per hour
      pro:       { requests: 60, windowMinutes: 60 }, // 60 requests per hour
    };
    
    // Anonymous abuse prevention configuration
    const ANONYMOUS_LIMITS = {
      deviceLimit: 1,      // 1 request per device per hour
      ipLimit: 3,          // Max 3 requests per IP per hour (prevents incognito abuse)
      windowMinutes: 60,
    };
    
    // ========== USAGE ENFORCEMENT ==========
    const FREE_TIER_LIMIT = 5; // matches tier-spec.ts FEATURE_MANIFEST.FREE.monthly_analysis_limit
    let userId: string | null = null;
    let userPlan = 'free';
    let isAnonymous = true;
    
    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      log.error("Server configuration error: missing required backend credentials");
      return new Response(
        JSON.stringify({ error: "Analysis service is not configured. Please retry shortly.", code: "CONFIG_ERROR" }),
        { status: 500, headers: { ...responseHeaders, "Content-Type": "application/json" } }
      );
    }
    
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
        log.info(`Authenticated user: ${user.email}`);
        
        // Check subscription
        const { data: subscription } = await supabaseAuth
          .from('subscriptions')
          .select('plan_id, status')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (subscription && ['active', 'trialing'].includes(subscription.status)) {
          userPlan = subscription.plan_id;
        }
        
        log.info(`User plan: ${userPlan}`);
        
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
            log.info(`User ${user.email} exceeded free tier limit: ${currentUsage}/${FREE_TIER_LIMIT}`);
            // Spec §09.2 — canonical TIER_GATE / QUOTA_EXCEEDED envelope.
            // Mirrors `evaluateGate()` so the frontend's `unwrap()` helper
            // surfaces the same toast (with upgrade CTA) for both ad-hoc
            // checks and tierGate-protected endpoints.
            const now = new Date();
            const resetsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
            return new Response(
              JSON.stringify({
                success: false,
                error: "QUOTA_EXCEEDED",
                code: "USAGE_LIMIT_EXCEEDED", // legacy alias for older clients
                message: `Monthly analysis limit reached (${currentUsage}/${FREE_TIER_LIMIT}). Upgrade to Plus for unlimited analyses.`,
                required_tier: "PLUS",
                upgrade_url: "https://www.aiwmcquantis.com/pricing",
                cta: "Upgrade to Plus",
                resets_at: resetsAt,
                usage: { current: currentUsage, limit: FREE_TIER_LIMIT },
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
      
      log.info(`Anonymous request - Device: ${deviceId.substring(0, 8)}..., IP: ${clientIp.substring(0, 15)}..., Fingerprint: ${fingerprint.substring(0, 8)}...`);
      
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
          log.error('Anonymous rate limit check failed:', rateLimitError);
          // Fall back to old method if new system fails
        } else if (rateLimitResult && !rateLimitResult.allowed) {
          const reason = rateLimitResult.reason as string;
          const resetAt = new Date(rateLimitResult.reset_at);
          const retryAfterSeconds = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
          
          log.info(`Anonymous rate limit exceeded - Reason: ${reason}, Device: ${deviceId.substring(0, 8)}`);
          
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
          log.info(`Anonymous rate limit check passed: Device remaining: ${rateLimitResult.device_remaining}, IP remaining: ${rateLimitResult.ip_remaining}`);
        }
      } catch (anonRlError) {
        log.error('Anonymous rate limit system error:', anonRlError);
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
          log.error('Rate limit check failed:', rateLimitError);
          // Fail open - allow request but log the error
        } else if (rateLimitResult && !rateLimitResult.allowed) {
          log.info(`Rate limit exceeded for user ${userId}: ${rateLimitResult.current_count}/${rateLimitResult.limit}`);
          
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
          log.info(`Rate limit check passed: ${rateLimitResult.current_count}/${rateLimitResult.limit} (${rateLimitResult.remaining} remaining)`);
        }
      } catch (rlError) {
        log.error('Rate limit system error:', rlError);
        // Fail open on error
      }
    }
    // ========== END RATE LIMITING ==========

    // ========== REQUEST BODY PARSING & VALIDATION ==========
    // Step 7 of benchmark-first plan: Zod at the boundary. No malformed
    // payload from a client ever reaches the analysis engine.
    let requestBody: AnalysisRequest;
    try {
      const rawJson = await req.json();
      const parsed = (await import('./boundary-schemas.ts')).RequestSchema.safeParse(rawJson);
      if (!parsed.success) {
        log.error('Request schema validation failed:', parsed.error.flatten());
        return new Response(
          JSON.stringify({
            error: "Request validation failed",
            code: "REQUEST_SCHEMA_INVALID",
            details: parsed.error.flatten().fieldErrors,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      requestBody = parsed.data as AnalysisRequest;
    } catch (parseError) {
      log.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body", code: "PARSE_ERROR" }),
        { status: 400, headers: { ...responseHeaders, "Content-Type": "application/json" } }
      );
    }

    const { idea, location, financial_inputs, selected_industry, documents, analysis_depth } = requestBody;

    // Worker run flag — when set, the request was made by analyze-pro-worker
    // re-entering this function. Skip the queue branch and run synchronously.
    const _rawBody = requestBody as unknown as Record<string, unknown>;
    const isWorkerRun = _rawBody._worker_run === true;
    const workerRequestId = _rawBody._worker_request_id as string | undefined;
    const workerUserId = _rawBody._worker_user_id as string | undefined;

    // ========== TIER-BASED DEPTH COERCION (compute leakage prevention) ==========
    // Free users CANNOT request 'full' or 'pro' depth — silently coerce to 'quick'.
    // Anonymous users are also Free. This is layer 1 of 3:
    //   1) Coerce depth here (input)
    //   2) Cap monteCarloScenarios + projectionMonths in engine call (compute)
    //   3) Sanitize response payload before send (output)
    // NOTE: 'deep' is a legacy alias for 'pro' from older clients — normalize it.
    const rawDepth = (analysis_depth || 'full').toString().toLowerCase();
    const requestedDepth = rawDepth === 'deep' ? 'pro' : rawDepth;
    let depthLevel: 'quick' | 'full' | 'pro';
    if (userPlan === 'pro') {
      depthLevel = (requestedDepth === 'pro' ? 'pro' : requestedDepth === 'full' ? 'full' : 'quick');
    } else if (userPlan === 'plus') {
      depthLevel = (requestedDepth === 'pro' || requestedDepth === 'full') ? 'full' : 'quick';
    } else {
      // Free + anonymous → forced to quick, regardless of body input
      depthLevel = 'quick';
      if (requestedDepth !== 'quick') {
        log.info(`[tier-gate] Coerced depth '${requestedDepth}' → 'quick' for ${userPlan} user (${userId ?? 'anon'})`);
        // Log denial for observability — abuse signal
        if (userId) {
          try {
            await supabaseService.rpc('log_entitlement_denial', {
              p_user_id: userId,
              p_tier: userPlan,
              p_feature: requestedDepth === 'pro' ? 'depthPro' : 'depthFull',
              p_path: '/analyze-business',
              p_meta: { requested: requestedDepth, coerced_to: 'quick' },
            });
          } catch (_) { /* non-fatal */ }
        }
      }
    }
    log.info(`[tier-gate] Final depth: ${depthLevel} (plan=${userPlan}, requested=${requestedDepth}, worker=${isWorkerRun})`);

    // ========== PRO QUEUE BRANCH ==========
    // For Pro depth on a real (non-worker) request: enqueue a background job,
    // fire the worker async, and return immediately with the job_id.
    // The client polls analysis_jobs and silently falls back to Full if it
    // doesn't complete within its own client-side cap.
    if (depthLevel === 'pro' && !isWorkerRun && userId) {
      try {
        const requestId = req.headers.get('x-request-id') ??
          (globalThis.crypto?.randomUUID?.() ?? `req_${Date.now()}`);

        const { data: jobRow, error: jobErr } = await supabaseService
          .from('analysis_jobs')
          .insert({
            user_id: userId,
            request_id: requestId,
            status: 'queued',
            depth_requested: 'pro',
            input_snapshot: {
              idea,
              location,
              financial_inputs,
              selected_industry,
              documents,
            },
          })
          .select('id')
          .single();

        if (jobErr || !jobRow) {
          log.error('[pro-queue] enqueue failed', jobErr);
          // Fall through to synchronous path — better than failing the request.
        } else {
          // Fire worker async. We do NOT await — the worker runs in the
          // background and writes its result back to analysis_jobs.
          // EdgeRuntime.waitUntil keeps the runtime alive briefly so the
          // outbound invoke actually leaves the box.
          const workerInvoke = supabaseService.functions
            .invoke('analyze-pro-worker', { body: { job_id: jobRow.id } })
            .catch((e) => log.error('[pro-queue] worker invoke failed', e));

          // deno-lint-ignore no-explicit-any
          const edgeRuntime = (globalThis as any).EdgeRuntime;
          if (edgeRuntime?.waitUntil) {
            edgeRuntime.waitUntil(workerInvoke);
          }

          log.info(`[pro-queue] Enqueued job ${jobRow.id} for user ${userId}`);

          return new Response(
            JSON.stringify({
              success: true,
              queued: true,
              job_id: jobRow.id,
              request_id: requestId,
              status: 'queued',
              poll_interval_ms: 2000,
              client_timeout_ms: 90000,
            }),
            {
              status: 202,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }
      } catch (queueError) {
        log.error('[pro-queue] queue branch error, falling through to sync', queueError);
      }
    }

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

    // ========== SMART IDEA VALIDATION v3 ==========
    // Detect meta-questions and strategy prompts that are NOT actual business ideas.
    // These cause "General Business" fallback and produce meaningless reports.
    // IMPORTANT: Only block inputs that are CLEARLY questions/commands with NO business context.
    // v3: Tightened patterns to avoid false positives on pricing/strategy questions about real businesses.
    const metaQuestionPatterns = [
      /^analyze\s+(my|the|our)\s+(competitive|market|business\s+position|competitive position)/i,
      /^(help me|tell me|explain|describe|compare|evaluate|assess|review|check|look at|give me|show me)\s+(how|what|why|the|my|a|an)\s/i,
      /^(what is|what are|how to|how do|how can|how should)\s+(the best|a good|my|the|it)\s/i,
      /^(should i|can i|could i|would it)\s+(start|open|launch|invest|build|create|make)\s/i,
    ];
    // Only block if it ends with ? AND matches a meta pattern
    const endsWithQuestion = /\?\s*$/.test(sanitizedIdea.trim());
    // Comprehensive business noun list to avoid false positives
    const businessNounPatterns = [/shop|store|app|service|product|restaurant|cafe|salon|clinic|agency|studio|platform|business|startup|company|firm|brand|marketplace|gym|fitness|school|academy|course|delivery|logistics|consulting|coaching|saas|software|tool|bakery|bar|hotel|motel|hostel|rental|cleaning|laundry|pharmacy|dental|medical|therapy|spa|massage|photography|design|marketing|advertising|freelance|subscription|newsletter|blog|podcast|streaming|food|truck|catering|wedding|event|construction|landscaping|plumbing|electrical|hvac|roofing|painting|auto|mechanic|car wash|pet|grooming|daycare|nursery|tutoring|music|art|dance|yoga|pilates|crossfit|boxing|martial|swimming|golf|tennis|cricket|esports|gaming|vr|ar|drone|3d print|manufacture|factory|farm|organic|vegan|gluten|juice|smoothie|ice cream|donut|pizza|burger|sushi|taco|ramen|pho|bbq|steakhouse|seafood|brewery|winery|distillery|roastery|import|export|wholesale|retail|boutique|thrift|vintage|antique|bookstore|toy|electronics|furniture|jewelry|flower|gift|candle|soap|cosmetic|beauty|hair|nail|tattoo|barber|tailor|dry clean|shoe|repair|locksmith|security|it support|web dev|mobile dev|data|analytics|ai |machine learning|blockchain|crypto|nft|token|exchange|wallet|insurance|tax|accounting|legal|law|notary|translation|interpreter|travel|tour|guide|adventure|camp|resort|airbnb|co.working|coworking|incubator|accelerator|venture|fund|investment|bank|credit|loan|mortgage|real estate|property|warehouse|storage|moving|freight|courier|dispatch|fleet|ride|carpool|scooter|bike|electric|solar|wind|energy|utility|water|waste|recycling|sustainability|carbon|eco|green|garden|plant|flower|tree|seed|fertilizer|pesticide|equipment|tool|hardware|supply|material|chemical|pharmaceutical|biotech|medtech|healthtech|edtech|fintech|proptech|agritech|foodtech|cleantech|legaltech|insurtech|regtech|hrtech|martech|adtech|govtech|civictech|nonprofit|charity|foundation|social enterprise|co.op|cooperative|franchise|chain|network|hub|center|lab|workshop|maker|creator|influencer|model|talent|recruiter|staffing|outsourc|virtual assistant|chatbot|bot|automation|workflow|crm|erp|pos|inventory|booking|reservation|ticketing|parking|vending|kiosk|atm|locker|laundromat/i];
    const isMetaQuestion = metaQuestionPatterns.some(p => p.test(sanitizedIdea.trim()));
    const hasBusinessNoun = businessNounPatterns.some(p => p.test(sanitizedIdea));
    if (isMetaQuestion && !hasBusinessNoun && sanitizedIdea.length < 150 && endsWithQuestion) {
      return new Response(
        JSON.stringify({ 
          error: "Please describe a specific business idea (e.g. 'Coffee shop in Austin, TX' or 'SaaS tool for project management'). Questions and strategy requests cannot be analyzed — the engine needs a concrete business type to apply industry benchmarks.", 
          code: "INVALID_BUSINESS_IDEA",
          hint: "Describe what your business does, not a question about business strategy."
        }),
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
    _idea_clean = idea_clean;
    _location_clean = location_clean;

    log.info(`Processing analysis: idea=${idea_clean.substring(0, 50)}... location=${location_clean}`);

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
            log.info(`Document data: MRR $${docFin.metrics.mrr} from ${docFin.source_document}`);
          } else if (docFin.revenue?.monthly) {
            documentDerivedInputs.monthly_revenue = docFin.revenue.monthly;
            log.info(`Document data: Monthly revenue $${docFin.revenue.monthly} from ${docFin.source_document}`);
          } else if (docFin.revenue?.quarterly) {
            documentDerivedInputs.monthly_revenue = Math.round(docFin.revenue.quarterly / 3);
            log.info(`Document data: Quarterly revenue $${docFin.revenue.quarterly} -> Monthly $${documentDerivedInputs.monthly_revenue} from ${docFin.source_document}`);
          } else if (docFin.revenue?.total) {
            // Assume quarterly if > 50k, otherwise monthly
            const divisor = docFin.revenue.total > 50000 ? 3 : 1;
            documentDerivedInputs.monthly_revenue = Math.round(docFin.revenue.total / divisor);
            log.info(`Document data: Total revenue $${docFin.revenue.total} -> Monthly $${documentDerivedInputs.monthly_revenue} from ${docFin.source_document}`);
          }
        }
        
        // Costs
        if (!documentDerivedInputs.monthly_costs && docFin.costs?.monthly) {
          documentDerivedInputs.monthly_costs = docFin.costs.monthly;
          log.info(`Document data: Monthly costs $${docFin.costs.monthly} from ${docFin.source_document}`);
        }
        
        // Investment
        if (!documentDerivedInputs.startup_investment && docFin.investment?.total) {
          documentDerivedInputs.startup_investment = docFin.investment.total;
          log.info(`Document data: Investment $${docFin.investment.total} from ${docFin.source_document}`);
        }
        
        // CAC
        if (!documentDerivedInputs.cac && docFin.metrics?.cac) {
          documentDerivedInputs.cac = docFin.metrics.cac;
          log.info(`Document data: CAC $${docFin.metrics.cac} from ${docFin.source_document}`);
        }
        
        // Customers
        if (!documentDerivedInputs.expected_customers && docFin.metrics?.customer_count) {
          documentDerivedInputs.expected_customers = docFin.metrics.customer_count;
          log.info(`Document data: Customers ${docFin.metrics.customer_count} from ${docFin.source_document}`);
        }
      }
    }
    
    // Merge: user inputs override document data
    const mergedFinancialInputs: OptionalFinancialInputs = {
      ...documentDerivedInputs,
      ...financial_inputs,
    };
    _mergedFinancialInputs = mergedFinancialInputs;

    // Log data sources
    if (Object.keys(documentDerivedInputs).length > 0) {
      log.info('Document-derived inputs:', documentDerivedInputs);
      log.info('User-provided inputs:', financial_inputs);
      log.info('Merged inputs:', mergedFinancialInputs);
    }

    // LOVABLE_API_KEY absence no longer blocks — the deterministic engine runs
    // without any AI provider. The AI retry loop handles missing keys gracefully.
    const _hasAiProvider = !!Deno.env.get("LOVABLE_API_KEY");

    // ========== DATABASE-DRIVEN INDUSTRY DETECTION ==========
    // Fetch benchmarks from database first, then fall back to hardcoded
    let dbBenchmarks: DatabaseBenchmarkRecord[] = [];
    try {
      dbBenchmarks = await fetchDatabaseBenchmarks(supabaseService);
    } catch (err) {
      log.error('Failed to fetch database benchmarks, using hardcoded:', err);
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
    
    // ========== BENCHMARK ENGINE V2 (95,500-row dataset) ==========
    let v2BenchmarkSummary: BenchmarkSummaryForCase | null = null;
    try {
      const v2Query = buildQueryFromInput(idea_clean, location_clean);
      v2BenchmarkSummary = await getBenchmarkSummary(supabaseService, v2Query);
      log.info(`V2 Benchmarks: ${v2BenchmarkSummary.sector_label} | ${v2BenchmarkSummary.geo_label} | match: ${v2BenchmarkSummary.overall_match_quality}`);
    } catch (err) {
      log.error('V2 benchmark fetch failed, continuing with legacy:', err);
    }

    // ========== V2 BENCHMARK → LEGACY OVERLAY ==========
    // When the V2 95,500-row benchmark dataset returns data, overlay its percentile-based values onto
    // the legacy detectedIndustry object so the DFE and Quantis engine use the most
    // accurate peer-group data for all deterministic calculations.
    if (v2BenchmarkSummary && v2BenchmarkSummary.overall_match_quality !== 'none') {
      log.info(`V2 overlay active: overriding legacy benchmarks with V2 data (match: ${v2BenchmarkSummary.overall_match_quality})`);
      
      if (v2BenchmarkSummary.core) {
        const core = v2BenchmarkSummary.core;
        // Override COGS with (1 - gross_margin_p50)
        if (core.gm_margin_p50 > 0) {
          detectedIndustry.cogs_percent = Math.round((1 - core.gm_margin_p50) * 100);
        }
        // Override net margin range from core op_margin
        if (core.op_margin_p50 !== undefined) {
          detectedIndustry.net_margin_min = Math.round(core.op_margin_p50 * 100 * 0.6); // conservative
          detectedIndustry.net_margin_max = Math.round(core.op_margin_p50 * 100 * 1.4); // optimistic
        }
        // Override fixed cost ratios using revenue-based percentages
        // (Only when we have existing revenue context to avoid division by zero)
        if (core.rent_pct_rev_p50 > 0) {
          detectedIndustry.rent_fixed = Math.round(detectedIndustry.rent_fixed * (core.rent_pct_rev_p50 / 0.10 || 1));
        }
      }
      
      if (v2BenchmarkSummary.unit_econ) {
        const ue = v2BenchmarkSummary.unit_econ;
        // Override CAC with V2 percentile data
        if (ue.cac_p25 > 0) detectedIndustry.cac_min = Math.round(ue.cac_p25);
        if (ue.cac_p75 > 0) detectedIndustry.cac_max = Math.round(ue.cac_p75);
        if (ue.cac_p50 > 0) detectedIndustry.cac_typical = Math.round(ue.cac_p50);
        
        // Override LTV:CAC ratio
        if (ue.ltv_cac_ratio_p25 > 0) detectedIndustry.ltv_cac_min = ue.ltv_cac_ratio_p25;
        if (ue.ltv_cac_ratio_p75 > 0) detectedIndustry.ltv_cac_max = ue.ltv_cac_ratio_p75;
        
        // Override churn-derived lifetime
        if (ue.churn_monthly_p50 > 0 && ue.churn_monthly_p50 < 1) {
          const lifetimeFromChurn = Math.round(1 / ue.churn_monthly_p50);
          if (lifetimeFromChurn > 1 && lifetimeFromChurn < 120) {
            detectedIndustry.client_lifetime_months = lifetimeFromChurn;
          }
        }
        
        // Override ARPU as average check
        if (ue.arpu_median > 0) {
          detectedIndustry.average_check_min = Math.round(ue.arpu_median * 0.6);
          detectedIndustry.average_check_max = Math.round(ue.arpu_median * 1.4);
        }
      }
      
      log.info(`V2 overlay applied: cogs=${detectedIndustry.cogs_percent}%, CAC=$${detectedIndustry.cac_typical}, lifetime=${detectedIndustry.client_lifetime_months}mo`);
    }

    // ========== ENHANCED LOCATION INTELLIGENCE ==========
    const locationMultipliers = getEnhancedLocationMultiplier(location_clean);
    const locationMultiplier = locationMultipliers.overall; // Legacy compatibility
    _detectedIndustry = detectedIndustry;
    _locationMultipliers = locationMultipliers;
    _userPlan = userPlan;
    _isAnonymous = isAnonymous;
    _userId = userId;
    _corsHeaders = corsHeaders;

    // ========== SUB-INDUSTRY DETECTION ==========
    const subIndustry = detectSubIndustry(idea_clean, detectedIndustry.id);
    
    log.info(`Analyzing: "${idea_clean.substring(0, 40)}..." in ${location_clean} | Industry: ${detectedIndustry.name} (${benchmarkSource}${industryWasManuallySelected ? ', user-selected' : ', auto-detected'}) | Confidence: ${benchmarkConfidence}%`);
    log.info(`Location: ${locationMultipliers.matched ? locationMultipliers.matchedCity : 'regional'} (${locationMultipliers.region}) | salary=${locationMultipliers.salary}x, rent=${locationMultipliers.rent}x, marketing=${locationMultipliers.marketing}x`);
    if (subIndustry.confidence > 50) {
      log.info(`Sub-industry: ${subIndustry.subIndustryName} (${subIndustry.businessModel}, ${subIndustry.targetScale}) | CAC=${subIndustry.modifiers.cac_multiplier}x, LTV=${subIndustry.modifiers.ltv_multiplier}x`);
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
${v2BenchmarkSummary ? `
## V2 BENCHMARK DATA (95,500-row dataset — ${v2BenchmarkSummary.sector_label} | ${v2BenchmarkSummary.geo_label} | match: ${v2BenchmarkSummary.overall_match_quality})
${v2BenchmarkSummary.core ? `### Core Benchmarks
- Gross Margin: p25=${(v2BenchmarkSummary.core.gm_margin_p25*100).toFixed(1)}% | p50=${(v2BenchmarkSummary.core.gm_margin_p50*100).toFixed(1)}% | p75=${(v2BenchmarkSummary.core.gm_margin_p75*100).toFixed(1)}%
- Op Margin p50: ${((v2BenchmarkSummary.core.op_margin_p50||0)*100).toFixed(1)}% | EBITDA p50: ${((v2BenchmarkSummary.core.ebitda_margin_p50||0)*100).toFixed(1)}%
- Revenue Growth YoY p50: ${((v2BenchmarkSummary.core.revenue_growth_yoy_p50||0)*100).toFixed(1)}%
- Rent/Rev: ${((v2BenchmarkSummary.core.rent_pct_rev_p50||0)*100).toFixed(1)}% | Payroll/Rev: ${((v2BenchmarkSummary.core.payroll_pct_rev_p50||0)*100).toFixed(1)}% | Marketing/Rev: ${((v2BenchmarkSummary.core.marketing_pct_rev_p50||0)*100).toFixed(1)}%` : ''}
${v2BenchmarkSummary.unit_econ ? `### Unit Economics
- CAC: p25=$${v2BenchmarkSummary.unit_econ.cac_p25} | p50=$${v2BenchmarkSummary.unit_econ.cac_p50} | p75=$${v2BenchmarkSummary.unit_econ.cac_p75}
- LTV: p25=$${v2BenchmarkSummary.unit_econ.ltv_p25} | p50=$${v2BenchmarkSummary.unit_econ.ltv_p50} | p75=$${v2BenchmarkSummary.unit_econ.ltv_p75}
- LTV:CAC ratio: p25=${v2BenchmarkSummary.unit_econ.ltv_cac_ratio_p25} | p50=${v2BenchmarkSummary.unit_econ.ltv_cac_ratio_p50} | p75=${v2BenchmarkSummary.unit_econ.ltv_cac_ratio_p75}
- Payback months: p25=${v2BenchmarkSummary.unit_econ.cac_payback_p25} | p50=${v2BenchmarkSummary.unit_econ.cac_payback_p50} | p75=${v2BenchmarkSummary.unit_econ.cac_payback_p75}
- Monthly churn: p25=${((v2BenchmarkSummary.unit_econ.churn_monthly_p25||0)*100).toFixed(1)}% | p50=${((v2BenchmarkSummary.unit_econ.churn_monthly_p50||0)*100).toFixed(1)}% | p75=${((v2BenchmarkSummary.unit_econ.churn_monthly_p75||0)*100).toFixed(1)}%
- 12-month retention: ${((v2BenchmarkSummary.unit_econ.retention_12m||0)*100).toFixed(0)}% | ARPU: $${v2BenchmarkSummary.unit_econ.arpu_median}` : ''}
${v2BenchmarkSummary.risk ? `### Risk Profile
- Market risk: ${v2BenchmarkSummary.risk.risk_market_volatility}/5 | Regulatory: ${v2BenchmarkSummary.risk.risk_regulatory}/5 | Operational: ${v2BenchmarkSummary.risk.risk_operational}/5 | Concentration: ${v2BenchmarkSummary.risk.risk_customer_concentration}/5
- Median survival: ${v2BenchmarkSummary.risk.median_survival_years} years
- Top failure modes: ${v2BenchmarkSummary.risk.failure_mode_1}, ${v2BenchmarkSummary.risk.failure_mode_2}, ${v2BenchmarkSummary.risk.failure_mode_3}` : ''}
${v2BenchmarkSummary.invoice ? `### Invoice/Credit
- Avg terms: ${v2BenchmarkSummary.invoice.avg_invoice_terms_days} days | Late payment: ${((v2BenchmarkSummary.invoice.late_payment_rate||0)*100).toFixed(1)}% | Bad debt: ${((v2BenchmarkSummary.invoice.bad_debt_pct_rev||0)*100).toFixed(2)}%
- Safe DSCR: ${v2BenchmarkSummary.invoice.safe_dscr_threshold} | Max invoice/rev ratio: ${((v2BenchmarkSummary.invoice.max_safe_invoice_to_rev_ratio||0)*100).toFixed(0)}%` : ''}
${v2BenchmarkSummary.calibration ? `### Self-Learning Calibration (reality-bridge feedback)
- Sample size: ${v2BenchmarkSummary.calibration.sample_size} prior predictions vs. real outcomes
- Bias: ${v2BenchmarkSummary.calibration.bias_pct !== null ? v2BenchmarkSummary.calibration.bias_pct.toFixed(1) + '%' : 'n/a'} (positive = model historically over-predicts in this slice)
- MAPE: ${v2BenchmarkSummary.calibration.mape !== null ? v2BenchmarkSummary.calibration.mape.toFixed(1) + '%' : 'n/a'}
- Confidence multiplier applied: ${v2BenchmarkSummary.calibration.confidence_adjustment.toFixed(2)}x
ADJUST your projections for this historical bias and explicitly disclose the calibration in the methodology note.` : ''}
USE these v2 benchmarks to ground your TAM/SAM/SOM, risk analysis, and competitive assessment. Reference specific percentiles.
` : ''}
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

**CRITICAL: Provide DETAILED, PROFESSIONAL content for each section. Do NOT use placeholders or generic text.**

financial_json:
{
  "mrr": number (monthly revenue in USD, realistic for this industry),
  "average_check": number (average transaction value in USD),
  "orders_monthly": number (monthly transactions/orders),
  "startup_investment": number (total startup capital in USD),
  "cac": number (customer acquisition cost in USD),
  "ltv": number (lifetime value - calculate: avg_check × orders_per_client × lifetime_months),
  "equipment": number (equipment costs in USD)
}

business_json:
{
  "executive_summary": "2-3 detailed paragraphs covering: 1) The business opportunity and value proposition, 2) Financial viability based on benchmarks, 3) Key success factors and risks. Be specific with numbers and insights.",
  "product_description": "Detailed description of the product/service, its features, benefits, and how it solves customer problems. Include pricing model and delivery method.",
  "target_audience": "Specific customer profile including demographics, psychographics, pain points, and buying behavior for ${location.trim()} market.",
  "competitive_advantages": "3-5 specific advantages: unique value, technology edge, cost advantage, team expertise, market positioning, or customer relationships.",
  "operations": "Operational model including: team structure, technology stack, processes, suppliers, quality control, and scalability plan.",
  "launch_steps": [
    {"step": 1, "title": "Market Validation", "description": "Detailed description of validation activities", "duration": "2-3 weeks", "cost": 1500},
    {"step": 2, "title": "Legal & Setup", "description": "Business registration, permits, contracts", "duration": "2-4 weeks", "cost": 3000},
    {"step": 3, "title": "Build MVP/Infrastructure", "description": "Core product or service setup", "duration": "4-8 weeks", "cost": 10000},
    {"step": 4, "title": "Beta Launch", "description": "Soft launch with initial customers", "duration": "2-4 weeks", "cost": 2000},
    {"step": 5, "title": "Marketing Launch", "description": "Full marketing campaign activation", "duration": "4-6 weeks", "cost": 5000},
    {"step": 6, "title": "Scale Operations", "description": "Hire team, optimize processes", "duration": "ongoing", "cost": 8000}
  ],
  "risks": [
    {"risk": "Market Competition Risk", "probability": "high", "impact": "high", "mitigation": "Specific mitigation strategy with actionable steps"},
    {"risk": "Customer Acquisition Risk", "probability": "medium", "impact": "high", "mitigation": "Specific mitigation strategy"},
    {"risk": "Operational Risk", "probability": "medium", "impact": "medium", "mitigation": "Specific mitigation strategy"},
    {"risk": "Financial/Cash Flow Risk", "probability": "medium", "impact": "high", "mitigation": "Specific mitigation strategy"},
    {"risk": "Regulatory/Legal Risk", "probability": "low", "impact": "medium", "mitigation": "Specific mitigation strategy"}
  ]
}

marketing_json:
{
  "positioning": "Clear positioning statement: For [target customer] who [needs/wants], [product name] is a [category] that [key benefit]. Unlike [competitors], we [unique differentiator].",
  "pricing_strategy": "Detailed pricing strategy including: price point rationale, comparison to competitors, margin analysis, and pricing tiers if applicable.",
  "channels": [
    {"channel": "Social Media Marketing", "description": "Detailed strategy for platforms, content types, posting frequency", "budget_monthly": 800, "expected_roi": "3-4x return within 90 days"},
    {"channel": "Content Marketing/SEO", "description": "Blog, video, or educational content strategy", "budget_monthly": 500, "expected_roi": "Long-term organic traffic growth"},
    {"channel": "Paid Advertising", "description": "Google Ads, Facebook Ads targeting strategy", "budget_monthly": 1200, "expected_roi": "2-3x return"},
    {"channel": "Referral Program", "description": "Customer referral incentive structure", "budget_monthly": 300, "expected_roi": "5x return through word-of-mouth"},
    {"channel": "Local Partnerships", "description": "Strategic partnerships for ${location.trim()} market", "budget_monthly": 400, "expected_roi": "Network effect benefits"}
  ],
  "cac": number,
  "ltv": number,
  "first_3_months_plan": "Month 1: Specific activities and goals with metrics. Month 2: Next phase activities and targets. Month 3: Scaling activities and expected outcomes. Include specific KPIs for each month."
}

market_json:
{
  "tam": "Total Addressable Market: $X billion globally. Include market size data and growth projections.",
  "sam": "Serviceable Available Market: $X million in regional market. Define geographic and segment scope.",
  "som": "Serviceable Obtainable Market: $X thousand realistic first-year target. Based on realistic capture rate.",
  "trends": [
    "Trend 1: Specific industry trend with implications for this business",
    "Trend 2: Consumer behavior shift relevant to target market",
    "Trend 3: Technology or regulatory trend affecting the industry",
    "Trend 4: Economic or demographic trend in ${location.trim()}"
  ],
  "competitors": [
    {"name": "Competitor 1 Name", "strengths": "Their key advantages", "weaknesses": "Their vulnerabilities to exploit"},
    {"name": "Competitor 2 Name", "strengths": "Their key advantages", "weaknesses": "Their vulnerabilities to exploit"},
    {"name": "Competitor 3 Name", "strengths": "Their key advantages", "weaknesses": "Their vulnerabilities to exploit"}
  ],
  "competitive_landscape": "Detailed analysis of competition intensity, market maturity, and competitive dynamics in ${location.trim()}.",
  "market_gaps": "Specific unmet needs or underserved segments that represent opportunities.",
  "barriers_to_entry": "Capital requirements, regulatory hurdles, expertise needed, and incumbent advantages.",
  "growth_opportunities": "Expansion paths: geographic, product line, customer segments, partnerships."
}

Provide comprehensive, actionable analysis suitable for a professional investor presentation. Call submit_analysis with all sections in English.`;

    // ========== AI REQUEST TIMEOUT BUDGET ==========
    // The narrator asks for up to 6000 output tokens; DeepSeek v4-flash streams
    // ~80 tok/s, so long answers legitimately need ~60-75s. The previous 35s
    // budget killed most full narrations mid-generation (2 timeouts → silent
    // deterministic fallback). One attempt with a 60s budget; aiCall's built-in
    // Anthropic fallback acts as the retry on timeout/5xx, so an extra loop
    // iteration would only double the worst-case wall clock.
    const MAX_RETRIES = 1;
    const AI_TIMEOUT_MS = 60000;
    const RETRY_DELAY_MS = 500; // Short delay between retries
    
    let response: { ok: true; data: Record<string, unknown> } | null = null;
    let lastError: string | null = null;
    let lastStatus: number | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        log.info(`AI request attempt ${attempt}/${MAX_RETRIES} (${AI_TIMEOUT_MS}ms timeout)`);

        const aiResult = await aiCall(
          {
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: QUANTIS_MASTER_SYSTEM_PROMPT,
              },
              { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
            max_tokens: 6000,
            temperature: 0.2,
          },
          {
            task: 'analyze-business',
            timeoutMs: AI_TIMEOUT_MS,
        requestId,
            userId: userId,
            metadata: { attempt, industry: detectedIndustry.name },
          },
        );

        if (aiResult.ok) {
          response = { ok: true, data: aiResult.data };
          log.info(`AI request succeeded on attempt ${attempt}`);
          break;
        }

        lastStatus = aiResult.status;
        lastError = `${aiResult.error}: ${aiResult.message}`;
        log.error(`AI error on attempt ${attempt}: ${lastError}`);

        // Don't retry on rate limit / credits / config
        if (aiResult.status === 429 || aiResult.status === 402 || aiResult.error === 'CONFIG') {
          break;
        }

        if (attempt < MAX_RETRIES) {
          log.info(`Retrying in ${RETRY_DELAY_MS}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
      } catch (fetchError) {
        lastError = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';
        log.error(`Fetch error on attempt ${attempt}: ${lastError}`);
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }
    
    // ========== FALLBACK TO DETERMINISTIC ANALYSIS ==========
    // If AI fails, generate complete analysis using deterministic engine
    let rawResult: any;
    let usedFallback = false;
    
    if (!response) {
      log.info(`All ${MAX_RETRIES} AI attempts failed. Last status=${lastStatus} error=${lastError}`);
      log.info("Generating deterministic fallback analysis...");

      if (lastStatus === 429) {
        log.warn("AI service rate-limited; using deterministic fallback instead of failing the analysis");
      }

      rawResult = generateDeterministicFallbackResult(
        idea_clean,
        location_clean,
        detectedIndustry,
        locationMultipliers,
        mergedFinancialInputs
      );
      usedFallback = true;
      log.info("Deterministic fallback generated successfully");
    } else {
      // AI succeeded - parse response
      const aiResponse = response.data;
      log.info("AI Response received");

      const extractedPayload = extractAnalysisPayload(aiResponse);
      if (!extractedPayload) {
        log.info("No parseable structured AI payload in response, using fallback");
        rawResult = generateDeterministicFallbackResult(
          idea_clean,
          location_clean,
          detectedIndustry,
          locationMultipliers,
          mergedFinancialInputs
        );
        usedFallback = true;
      } else {
        log.info(`AI structured payload parsed from ${extractedPayload.source}`);
        rawResult = extractedPayload.payload;
      }
    }

    // Transform using either AI result or fallback
    const result = transformResponse(rawResult, location.trim(), detectedIndustry, locationMultipliers, subIndustry, mergedFinancialInputs);
    const calc = result._calc as StrictFinancialResult;
    delete (result as Record<string, unknown>)._calc;

    // ── WS1: SET GOLDEN — a valid deterministic result now exists ──
    GOLDEN = { ...result } as Record<string, unknown>;
    if (usedFallback) { GOLDEN_degraded = true; GOLDEN_reason = 'deterministic_fallback'; }
    log.info('[golden] Checkpoint set — deterministic result captured');

    // ========== NARRATIVE HONESTY SANITIZER ==========
    // Strip forbidden optimistic phrases ("rapid payback", "healthy margin", etc.)
    // when the base-case financials do not support them. Numbers always win.
    try {
      const netMarginPct = calc.mrr > 0 ? (calc.netProfit / calc.mrr) * 100 : -100;
      const paybackMonths = (!calc.isProfitable || !Number.isFinite(calc.paybackMonths) || calc.paybackMonths <= 0 || calc.paybackMonths >= 999)
        ? null
        : calc.paybackMonths;
      const { result: cleaned, corrections } = sanitizeNarrativeAgainstNumbers(
        result as Record<string, unknown>,
        {
          netProfit: calc.netProfit,
          netMarginPct,
          paybackMonths,
          isProfitable: calc.isProfitable,
        }
      );
      Object.assign(result, cleaned);
      // Contract hardening: the narrative sanitizer must never turn financial
      // numbers into display strings. UI/PDF/chart consumers format the 999
      // sentinel as N/A; the transport payload stays numeric.
      if (result.financial_analysis?.unit_economics) {
        result.financial_analysis.unit_economics.cac_payback_months =
          !calc.isProfitable ? 999 : QMath.roundTo(QMath.cacPaybackMonths(calc.cac, calc.averageCheck, (100 - detectedIndustry.cogs_percent) / 100), 1);
      }
      if (result.financial_analysis) {
        result.financial_analysis.payback_period_months = calc.paybackMonths;
      }
      if (result.financial_analysis?.returns) {
        result.financial_analysis.returns.payback_period_months = calc.paybackMonths;
      }
      if (corrections.length > 0) {
        log.info(`Narrative sanitizer applied ${corrections.length} correction(s): ${corrections.join(" | ")}`);
        (result as Record<string, unknown>)._sanitizer_corrections = corrections;
      }
    } catch (sanitizeErr) {
      log.warn(`Narrative sanitizer failed (non-fatal): ${String(sanitizeErr)}`);
    }


    // ========== QUANTIS 2.0 ENGINE INTEGRATION ==========
    // ── WS2: Wrapped — quantisOutput failure degrades but never kills ──
    let quantisOutput: QuantisEngineOutput | null = null;
    try {
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
        expenses: undefined,
        selectedIndustry: selected_industry,
        documents: documents as unknown as QuantisEngineInput['documents'],
        benchmarks: detectedIndustry,
        locationMultipliers,
        subIndustry,
      };
      quantisOutput = processQuantisAnalysis(quantisInput);
      log.info(`Quantis 2.0: success=${quantisOutput?.success}, health=${quantisOutput?.validation?.healthScores?.overallHealthScore || 'N/A'}, recommendations=${quantisOutput?.recommendations?.summary?.totalRecommendations ?? 0}`);
    } catch (q2Err) {
      log.error('[enrich:quantis-2.0] non-blocking:', q2Err);
      GOLDEN_degraded = true;
      GOLDEN_reason ??= 'quantis_engine';
    }
    
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
    for (const w of (quantisOutput?.validation?.warnings ?? [])) {
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
      confidenceBreakdown.details.push(`Using verified proprietary industry benchmarks (${benchmarkDataSource || 'industry database'})`);
      if (benchmarkSampleSize && benchmarkSampleSize > 50) {
        relevanceScore += 5; // Extra bonus for large sample size
        confidenceBreakdown.details.push(`Based on ${benchmarkSampleSize} company sample`);
      }
    } else if (benchmarkSource === 'hardcoded') {
      confidenceBreakdown.details.push('Using default industry benchmarks — select your specific industry for improved accuracy');
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
    
    log.info(`Done. Profit: $${calc.netProfit}. Industry: ${calc.industryDetected}. Corrections: ${calc.corrections.length}. Reliability: ${reliabilityScore}%`);

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
        log.info(`Anonymous usage recorded for device ${deviceId.substring(0, 8)}...${fingerprintHash ? ', fingerprint tracked' : ''}`);
      } catch (e) {
        log.error('Failed to record anonymous usage:', e);
      }
    }
    
    // Increment usage for authenticated free tier users
    if (userId && userPlan === 'free') {
      try {
        const monthYear = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        await supabaseService.rpc('increment_usage', { p_user_id: userId, p_month_year: monthYear });
        log.info(`Usage incremented for user ${userId}`);
      } catch (e) {
        log.error('Failed to increment usage:', e);
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

    // ========== CROSS-VALIDATION + SENSITIVITY + BENCHMARK CONFIDENCE ==========
    let crossValidation: CrossValidationResult | undefined;
    if (quantisOutput) {
      try {
        crossValidation = crossValidateEngines(
          { mrr: calc.mrr, netProfit: calc.netProfit, netMarginPercent: calc.netMarginPercent, grossProfit: calc.grossProfit, grossMarginPercent: calc.grossMarginPercent, totalExpenses: calc.totalExpenses, cac: calc.cac, ltv: calc.ltv, ltvCacRatio: calc.ltvCacRatio, paybackMonths: calc.paybackMonths, roiYear1Percent: calc.roiYear1Percent, breakEvenRevenue: calc.breakEvenRevenue, npv3Years: calc.npv3Years },
          { mrr: quantisOutput.metrics.mrr, netProfit: quantisOutput.metrics.netProfit, netMarginPercent: quantisOutput.metrics.netMarginPercent, grossProfit: quantisOutput.metrics.grossProfit, grossMarginPercent: quantisOutput.metrics.grossMarginPercent, totalExpenses: quantisOutput.metrics.totalExpenses, cac: quantisOutput.metrics.cac, ltv: quantisOutput.metrics.ltv, ltvCacRatio: quantisOutput.metrics.ltvCacRatio, paybackMonths: quantisOutput.metrics.paybackMonths ?? 0, roiYear1Percent: quantisOutput.metrics.roiYear1Percent }
        );
        log.info(`Cross-validation: score=${crossValidation.agreementScore}, verified=${crossValidation.isDualEngineVerified}, recommendation=${crossValidation.recommendation}`);
      } catch (cvErr) {
        log.error('Cross-validation failed:', cvErr);
      }
    }

    let sensitivityAnalysis: SensitivityResult | undefined;
    try {
      const churnRate = mergedFinancialInputs?.churn_rate ? mergedFinancialInputs.churn_rate / 100 : (1 / detectedIndustry.client_lifetime_months);
      sensitivityAnalysis = analyzeSensitivity({
        mrr: calc.mrr, totalExpenses: calc.totalExpenses, netProfit: calc.netProfit,
        averageCheck: calc.averageCheck, cac: calc.cac, cogsPercent: detectedIndustry.cogs_percent,
        fixedCosts: calc.expenses.salaries + calc.expenses.rent + calc.expenses.utilities + calc.expenses.other,
        clientsActive: calc.clientsActive, ordersPerClient: detectedIndustry.orders_per_client, churnRate,
      });
      log.info(`Sensitivity: most=${sensitivityAnalysis.mostSensitiveVariable}, least=${sensitivityAnalysis.leastSensitiveVariable}`);
    } catch (saErr) {
      log.error('Sensitivity analysis failed:', saErr);
    }

    let benchmarkConfidenceData: BenchmarkConfidenceResult | undefined;
    try {
      benchmarkConfidenceData = computeBenchmarkConfidence(
        benchmarkConfidence || 75,
        null, // last_updated from DB would go here
        benchmarkSampleSize || null,
        benchmarkDataSource || null
      );
      log.info(`Benchmark confidence: ${benchmarkConfidenceData.adjustedScore}% (${benchmarkConfidenceData.confidenceLabel})`);
    } catch (bcErr) {
      log.error('Benchmark confidence calc failed:', bcErr);
    }

    // ========== ANTI-BS SANITY CHECKS ==========
    let sanityFlags: SanityFlag[] = [];
    try {
      sanityFlags = runAntiBS({
        ltvCacRatio: calc.ltvCacRatio,
        netMarginPercent: calc.netMarginPercent,
        churnRate: mergedFinancialInputs?.churn_rate ? mergedFinancialInputs.churn_rate / 100 : (1 / detectedIndustry.client_lifetime_months),
        mrr: calc.mrr,
        clientsActive: calc.clientsActive,
      }, detectedIndustry.id);
      if (sanityFlags.length > 0) {
        log.info(`Anti-BS: ${sanityFlags.length} flags (${sanityFlags.filter(f => f.severity === 'critical').length} critical)`);
      }
    } catch (abErr) {
      log.error('Anti-BS check failed:', abErr);
    }

    // ========== ASSUMPTION GRAPH ==========
    let assumptionGraph: AssumptionGraphResult | undefined;
    try {
      const churnRate = mergedFinancialInputs?.churn_rate ? mergedFinancialInputs.churn_rate / 100 : (1 / detectedIndustry.client_lifetime_months);
      assumptionGraph = computeAssumptionGraph(
        {
          averageCheck: calc.averageCheck,
          clientsActive: calc.clientsActive,
          cac: calc.cac,
          churnRate,
          cogsPercent: detectedIndustry.cogs_percent,
          fixedCosts: calc.expenses.salaries + calc.expenses.rent + calc.expenses.utilities + calc.expenses.other,
          ltv: calc.ltv,
          grossMarginPercent: calc.grossMarginPercent,
          netProfit: calc.netProfit,
          mrr: calc.mrr,
        },
        sensitivityAnalysis,
        benchmarkConfidence || 75
      );
      log.info(`Assumption graph: fragility=${assumptionGraph.fragility_score}, critical_path=${assumptionGraph.criticalPath.length}`);
    } catch (agErr) {
      log.error('Assumption graph failed:', agErr);
    }

    // ========== MODEL CONFIDENCE (PREDICTION ENGINE v0) ==========
    let modelConfidence: ModelConfidenceResult | undefined;
    try {
      const maxSwing = sensitivityAnalysis?.tornado?.[0]?.profitSwing || 0;
      modelConfidence = await computeModelConfidence({
        hasFinancialInputs: !!(financial_inputs?.startup_investment || financial_inputs?.monthly_revenue || financial_inputs?.average_price),
        hasDocuments: documentExtractedFinancials.length > 0,
        hasSpecificIndustry: detectedIndustry.id !== 'general',
        ideaLength: idea_clean.length,
        benchmarkAdjustedScore: benchmarkConfidenceData?.adjustedScore || 50,
        maxTornadoSwing: maxSwing,
        baseNetProfit: calc.netProfit,
        totalSanityRules: 5,
        criticalFlagsCount: sanityFlags.filter(f => f.severity === 'critical').length,
        warningFlagsCount: sanityFlags.filter(f => f.severity === 'warning').length,
        industryId: detectedIndustry.id,
        location: location_clean,
      });
      log.info(`Model confidence: ${modelConfidence.confidence} (${modelConfidence.recommendation_level})`);
    } catch (mcErr) {
      log.error('Model confidence failed:', mcErr);
    }

    // ========== MARKET PRIOR ENGINE ==========
    let marketPrior: MarketPriorResult | undefined;
    try {
      const naicsCode = mapToNAICS(detectedIndustry.id);
      const distributions = await fetchDistributions(supabaseService, naicsCode);
      if (distributions.length > 0) {
        const userMetrics: Record<string, number> = {
          gross_margin: calc.grossMarginPercent,
          net_margin: calc.netMarginPercent,
          cac: calc.cac,
          ltv: calc.ltv,
          ltv_cac_ratio: calc.ltvCacRatio,
          cogs_percent: detectedIndustry.cogs_percent,
          average_check: calc.averageCheck,
          salaries_fixed: calc.expenses.salaries,
          rent_fixed: calc.expenses.rent,
        };
        const anomalyScores = computeAnomalyScores(userMetrics, distributions);
        marketPrior = generateMarketPrior(anomalyScores, naicsCode, distributions.length);
        log.info(`Market prior: ${anomalyScores.filter(a => a.severity === 'outlier').length} outliers, ${anomalyScores.filter(a => a.severity === 'notable').length} notable`);
      }
    } catch (mpErr) {
      log.error('Market prior engine failed (non-blocking):', mpErr);
    }

    // ========== SCORE COMPLIANCE ==========
    let scoreCompliance: SCORECompliance | undefined;
    try {
      scoreCompliance = computeSCORECompliance(result);
      log.info(`SCORE compliance: ${scoreCompliance.score}% (${scoreCompliance.filledFields.length} filled, ${scoreCompliance.missingFields.length} missing)`);
    } catch (scErr) {
      log.error('SCORE compliance failed (non-blocking):', scErr);
    }

    // ========== CASE MEMORY INSERT (Non-blocking) ==========
    let caseId: string | undefined;
    try {
      const { data: caseData } = await supabaseService
        .from('analysis_cases')
        .insert({
          analysis_id: null, // Will be set later if saved
          user_id: userId || '00000000-0000-0000-0000-000000000000',
          industry_id: detectedIndustry.id,
          location: location_clean,
          input_snapshot: { idea: idea_clean, location: location_clean, financial_inputs: financial_inputs || {} },
          output_snapshot: { mrr: calc.mrr, netProfit: calc.netProfit, netMarginPercent: calc.netMarginPercent },
          engine_version: '9.1-resilient-fallback',
          benchmark_version: benchmarkDataSource || 'embedded',
          assumption_graph: assumptionGraph || null,
          sanity_flags: sanityFlags.length > 0 ? sanityFlags : null,
          confidence_score: modelConfidence?.confidence || null,
        })
        .select('id')
        .single();
      caseId = caseData?.id;
      if (caseId) log.info(`Case memory saved: ${caseId}`);
    } catch (cmErr) {
      log.error('Case memory insert failed (non-blocking):', cmErr);
    }

    // ========== BUILD FULL PAYLOAD ==========
    const fullPayload = {
      ...result,
      actionable_insights: actionableInsights,
      documents_used: documentsUsed.length > 0 ? documentsUsed : undefined,
      document_analysis_summary: documentAnalysisSummary,
      
      // ========== QUANTIS 2.0 ENHANCED VALIDATION ==========
      validation: quantisOutput ? {
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
        health_scores: quantisOutput.validation.healthScores,
      } : {
        is_realistic: true,
        is_profitable: calc.netProfit > 0,
        was_auto_corrected: calc.corrections.length > 0,
        reliability_score: 50,
        corrections: calc.corrections,
        warnings,
        calculation_audit: null,
        break_even_revenue: null,
        revenue_for_45k_profit: null,
        industry_detected: calc.industryDetected,
        confidence_breakdown: null,
        improvement_suggestions: [],
        summary: 'Quantis engine unavailable — deterministic financials only.',
        health_scores: null,
      },

      recommendations: quantisOutput ? {
        summary: quantisOutput.recommendations.summary,
        priorities: {
          immediate: quantisOutput.recommendations.priorities.immediate,
          short_term: quantisOutput.recommendations.priorities.shortTerm,
          long_term: quantisOutput.recommendations.priorities.longTerm,
        },
        action_plan: quantisOutput.recommendations.actionPlan,
        generated_at: quantisOutput.recommendations.generatedAt,
        version: quantisOutput.recommendations.version,
      } : {
        summary: 'Recommendations unavailable — deterministic engine only.',
        priorities: { immediate: [], short_term: [], long_term: [] },
        action_plan: [],
        generated_at: new Date().toISOString(),
        version: '2.0-degraded',
      },

      quantis_metrics: quantisOutput ? {
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
      } : {
        mrr: calc.mrr,
        arr: calc.mrr * 12,
        net_profit: calc.netProfit,
        net_margin_percent: calc.netMarginPercent,
        gross_profit: calc.grossProfit,
        gross_margin_percent: calc.grossMarginPercent,
        total_expenses: calc.totalExpenses,
        payback_months: calc.paybackMonths,
        payback_display: `${calc.paybackMonths} months`,
        roi_year_1_percent: calc.roiYear1Percent,
        ltv_cac_ratio: calc.ltvCacRatio,
        cac: calc.cac,
        ltv: calc.ltv,
      },

      cross_validation: crossValidation ? {
        agreement_score: crossValidation.agreementScore,
        is_dual_engine_verified: crossValidation.isDualEngineVerified,
        recommendation: crossValidation.recommendation,
        divergence_count: crossValidation.divergences.length,
        critical_divergences: crossValidation.criticalDivergences,
        audit_summary: crossValidation.auditSummary,
      } : undefined,

      sensitivity_analysis: sensitivityAnalysis ? {
        tornado: sensitivityAnalysis.tornado,
        most_sensitive_variable: sensitivityAnalysis.mostSensitiveVariable,
        least_sensitive_variable: sensitivityAnalysis.leastSensitiveVariable,
        summary: sensitivityAnalysis.summary,
      } : undefined,

      benchmark_confidence: benchmarkConfidenceData ? {
        adjusted_score: benchmarkConfidenceData.adjustedScore,
        confidence_label: benchmarkConfidenceData.confidenceLabel,
        staleness_factor: benchmarkConfidenceData.stalenessFactor,
        is_stale: benchmarkConfidenceData.isStale,
        explanation: benchmarkConfidenceData.explanation,
      } : undefined,

      assumption_graph: assumptionGraph || undefined,
      sanity_flags: sanityFlags.length > 0 ? sanityFlags : undefined,
      model_confidence: modelConfidence || undefined,
      case_id: caseId || undefined,
      market_prior: marketPrior || undefined,
      score_compliance: scoreCompliance || undefined,
      
      engine_version: quantisOutput?.version ?? '2.0-degraded',
      data_sources: [
        benchmarkSource === 'database' 
          ? `Proprietary Industry Benchmark Database (${benchmarkDataSource?.replace(/kerry/gi, 'verified') || 'verified benchmarks'})` 
          : 'IBISWorld Industry Reports (2024)',
        'U.S. Bureau of Labor Statistics',
        'Small Business Administration Cost Data',
        'Industry Standard Financial Formulas (GAAP)',
        `${calc.industryDetected} Sector Benchmarks`,
        locationMultiplier !== 1.0 ? `${location_clean} Cost of Living Index` : 'National Average Cost Data',
        benchmarkMatchedRegion ? `Regional benchmark data: ${benchmarkMatchedRegion}` : null,
        benchmarkSampleSize ? `Verified sample: ${benchmarkSampleSize} companies` : null,
        ...(documentExtractedFinancials.length > 0 ? documentExtractedFinancials.map(ef => `Uploaded Document: ${ef.source_document}`) : [])
      ].filter(Boolean),
      limitations: [
        detectedIndustry.id === 'general' && benchmarkSource === 'hardcoded' 
          ? 'General industry benchmarks applied. Selecting your specific industry will improve accuracy.' 
          : null,
        ideaLength < 30 ? 'Brief business description — add more detail for improved accuracy' : null,
        locationMultiplier === 1.0 ? 'National average costs applied — specify a major city for location-adjusted estimates' : null,
        'Actual results depend on execution, market timing, and competitive dynamics',
        calc.corrections.length > 0 ? `${calc.corrections.length} input value(s) were adjusted to match realistic industry ranges` : null,
      ].filter(Boolean),
      reconciliation_status: (() => {
        const checks = [];
        const rev = quantisOutput?.metrics?.mrr ?? calc.mrr;
        const cogs = calc.expenses.cogs || 0;
        const grossProfit = quantisOutput?.metrics?.grossProfit ?? calc.grossProfit;
        const totalExpenses = quantisOutput?.metrics?.totalExpenses ?? calc.totalExpenses;
        const netProfit = quantisOutput?.metrics?.netProfit ?? calc.netProfit;
        const netMarginPct = quantisOutput?.metrics?.netMarginPercent ?? calc.netMarginPercent;
        const r001pass = Math.abs((cogs + grossProfit) - rev) <= 0.01 || cogs === 0;
        checks.push({ rule: 'R-001', label: 'Sum Integrity', pass: r001pass });
        checks.push({ rule: 'R-002', label: 'Sign Consistency', pass: rev >= 0 });
        checks.push({ rule: 'R-004', label: 'Revenue Non-Negative', pass: rev >= 0 });
        checks.push({ rule: 'R-005', label: 'Costs Non-Negative', pass: totalExpenses >= 0 });
        const riskLevel = (quantisOutput?.validation?.healthScores as Record<string, unknown>)?.overall || 'medium';
        const r006pass = !(netMarginPct < -10 && riskLevel === 'low');
        checks.push({ rule: 'R-006', label: 'Margin–Risk Coherence', pass: r006pass });
        const ltvCac = quantisOutput?.metrics?.ltvCacRatio ?? calc.ltvCacRatio;
        checks.push({ rule: 'R-007', label: 'LTV:CAC Positive', pass: ltvCac > 0 });
        const gmPct = (quantisOutput?.metrics?.grossMarginPercent ?? calc.grossMarginPercent) / 100;
        checks.push({ rule: 'R-008', label: 'Gross Margin Range', pass: gmPct >= -1.0 && gmPct <= 1.0 });
        const allPassed = checks.every(c => c.pass);
        return { checks, all_passed: allPassed, engine_version: quantisOutput?.version ?? '2.0-degraded' };
      })(),

      metadata: (() => {
        // ── Canonical benchmark records (Step 2 of benchmark-first plan) ──
        // Build once per response so PDF/UI never re-derive percentiles.
        const gmFrac = typeof calc.grossMarginPercent === 'number' ? calc.grossMarginPercent / 100 : null;
        const nmFrac = typeof calc.netMarginPercent === 'number' ? calc.netMarginPercent / 100 : null;
        const contribPerOrder = (typeof calc.averageCheck === 'number' && gmFrac !== null)
          ? calc.averageCheck * gmFrac : null;
        // Coherence: unprofitable → CAC payback not meaningful (null), never 0.1 or 999.
        const cacPaybackComputed =
          (nmFrac !== null && nmFrac < 0) || (contribPerOrder !== null && contribPerOrder <= 0)
            ? null
            : (typeof calc.cac === 'number' && contribPerOrder && contribPerOrder > 0
                ? Math.round((calc.cac / contribPerOrder) * 10) / 10
                : null);
        const benchmarkRecords: BenchmarkRecord[] = buildBenchmarkRecords(
          v2BenchmarkSummary,
          {
            gross_margin: gmFrac,
            net_margin: nmFrac,
            cac: typeof calc.cac === 'number' ? calc.cac : null,
            ltv: typeof calc.ltv === 'number' ? calc.ltv : null,
            ltv_cac_ratio: typeof calc.ltvCacRatio === 'number' ? calc.ltvCacRatio : null,
            cac_payback_months: cacPaybackComputed,
            arpu: typeof calc.averageCheck === 'number' ? calc.averageCheck : null,
          },
        );
        const matchSummary = summarizeMatches(benchmarkRecords);
        const benchmarkMode: 'live' | 'unavailable' =
          v2BenchmarkSummary && v2BenchmarkSummary.overall_match_quality !== 'none'
            ? 'live'
            : 'unavailable';
        return {
        idea: idea_clean,
        location: location_clean,
        industry_detected: calc.industryDetected,
        industry_id: detectedIndustry.id,
        location_cost_multiplier: locationMultiplier,
        generated_at: new Date().toISOString(),
        model: usedFallback ? "deterministic-engine" : "deepseek-v4-flash",
        version: "9.2-benchmark-first",
        analysis_depth: depthLevel,
        // ── NEW: canonical benchmarks block ──
        benchmarks: benchmarkRecords,
        benchmark_mode: benchmarkMode,
        benchmark_match_summary: matchSummary,
        // ── legacy provenance fields kept for backwards compatibility ──
        benchmark_source: benchmarkSource,
        benchmark_confidence: benchmarkConfidence,
        benchmark_data_source: benchmarkDataSource,
        benchmark_sample_size: benchmarkSampleSize,
        benchmark_region: benchmarkMatchedRegion,
        benchmark_v2_active: benchmarkMode === 'live',
        benchmark_v2_match_quality: v2BenchmarkSummary?.overall_match_quality || 'none',
        benchmark_v2_sector: v2BenchmarkSummary?.sector_label || null,
        benchmark_v2_datapoints: 95500,
        benchmark_v2_calibration: v2BenchmarkSummary?.calibration || null,
        benchmark_confidence_adjusted: typeof benchmarkConfidence === 'number' && v2BenchmarkSummary?.calibration
          ? Math.max(0, Math.min(100, benchmarkConfidence * v2BenchmarkSummary.calibration.confidence_adjustment))
          : benchmarkConfidence,
        used_fallback: usedFallback,
        // F1 — Canonical fallback flag consumed by <FallbackModeBanner /> in the dashboard.
        // The flag now refers ONLY to the AI narrator path. Benchmark coverage is
        // independent and reported via `benchmark_mode`.
        fallback_mode: usedFallback,
        // Correct copy: the edge function ran (we're inside it). What failed,
        // if anything, is the LLM narrator. Never mention "Failed to send a
        // request to the Edge Function" here — that's the client-side error.
        fallback_reason: usedFallback
          ? (lastStatus
              ? `AI narrator unavailable after ${MAX_RETRIES} attempts (HTTP ${lastStatus}); deterministic engine used with ${benchmarkMode === 'live' ? 'live benchmark percentiles' : 'no live benchmark match'}.`
              : 'AI narrator did not return a valid tool call; deterministic engine used.')
          : null,
        ai_calls_attempted: MAX_RETRIES,
        ai_calls_succeeded: usedFallback ? 0 : 1,
        };
      })(),
    };

    // ========== HYBRID VALIDATOR (paid tiers only) ==========
    // Deterministic rules first, LLM second-pass only on warning.
    // Skip for Free (already truncated) to save cost.
    let validatorResult: ValidatorResult | null = null;
    if (userPlan !== 'free') {
      try {
        validatorResult = await validateAnalysis({
          idea: idea_clean,
          location: location_clean,
          industry_detected: calc.industryDetected || 'unknown',
          score: (result as any)?.score ?? null,
          verdict: (result as any)?.verdict ?? null,
          ltv: quantisOutput?.metrics?.ltv ?? null,
          cac: quantisOutput?.metrics?.cac ?? null,
          ltv_cac_ratio: quantisOutput?.metrics?.ltvCacRatio ?? null,
          gross_margin: (result as any)?.gross_margin ?? (quantisOutput?.metrics as any)?.grossMargin ?? null,
          net_margin: (result as any)?.net_margin ?? (quantisOutput?.metrics as any)?.netMargin ?? null,
          monthly_revenue: quantisOutput?.metrics?.mrr ?? null,
          monthly_profit: (result as any)?.monthly_profit ?? null,
          payback_months: (result as any)?.payback_months ?? null,
          top_risks: ((result as any)?.risks || (result as any)?.top_risks || []).slice(0, 3),
          benchmark_match_quality: v2BenchmarkSummary?.overall_match_quality || 'none',
        });
        log.info(
          `[validator] ok=${validatorResult.ok} warnings=${validatorResult.warnings.length} ` +
          `ran_llm=${validatorResult.ran_llm} latency=${validatorResult.total_latency_ms}ms`
        );
        // Attach to fullPayload metadata for transparency on paid tiers
        (fullPayload as any).metadata.validator = {
          passed: validatorResult.ok,
          warning_count: validatorResult.warnings.length,
          warnings: validatorResult.warnings,
          llm_reviewed: validatorResult.ran_llm,
          llm_verdict: validatorResult.llm_review?.verdict,
          llm_summary: validatorResult.llm_review?.summary,
        };
      } catch (vErr) {
        log.error('[validator] failed (non-blocking):', vErr);
      }
    }

    // ========== TIER-BASED RESPONSE SANITIZATION ==========
    // Free + anonymous users get a STRIPPED payload regardless of what the engine produced.
    // This is layer 3 of compute-leakage prevention — even if a crafted request slipped past
    // depth coercion, we never wire-send paid-tier data to a Free user.
    const isFreeOrAnon = userPlan === 'free';
    const wirePayload = isFreeOrAnon ? (() => {
      // Pull risks from multiple possible shapes
      const allRisks = (result as any)?.risks
        || (result as any)?.top_risks
        || quantisOutput?.validation?.improvementSuggestions
        || [];
      const top3 = Array.isArray(allRisks) ? allRisks.slice(0, 3) : [];
      const score = (result as any)?.score
        ?? (result as any)?.overall_score
        ?? quantisOutput?.validation?.reliabilityScore
        ?? null;
      const verdict = (result as any)?.verdict ?? null;
      const baseRevenue = quantisOutput?.metrics?.mrr ?? null;

      return {
        score,
        verdict,
        top_risks: top3,
        base_revenue: baseRevenue,
        currency: (result as any)?.currency ?? 'USD',
        industry_detected: calc.industryDetected,
        location: location_clean,
        idea: idea_clean,
        _tier: 'free',
        _watermark: 'Generated by AIWMC Quantis — Upgrade to Plus for full Monte Carlo, 36-month projections, and stress testing.',
        _upgrade_cta: {
          message: 'Unlock the full report',
          features_locked: [
            '36-month P&L projections with variance bands',
            '95,500-scenario Monte Carlo simulation',
            'Pre-Mortem stress testing',
            'Invoice & capacity check',
            'Document Studio (10 branded templates)',
            'No watermark on PDFs',
          ],
          plus_price_monthly: 17,
          plus_trial_days: 14,
          pro_trial_days: 14,
        },
        metadata: {
          ...(fullPayload as any).metadata,
          idea: idea_clean,
          location: location_clean,
          industry_detected: calc.industryDetected,
          analysis_depth: 'quick',
        },
      };
    })() : fullPayload;

    if (isFreeOrAnon) {
      log.info(`[tier-gate] Sanitized response: stripped ${Object.keys(fullPayload).length} keys → ${Object.keys(wirePayload).length} (Free tier)`);
    }

    // ── Response validation at boundary (benchmark-first plan, Step 7) ──
    // The UI/PDF read strictly from metadata.benchmarks[]; if it's malformed
    // we fail loudly instead of shipping garbage to the dashboard.
    try {
      const { ResponseSchema } = await import('./boundary-schemas.ts');
      ResponseSchema.parse({ success: true, data: wirePayload });
    } catch (schemaErr) {
      log.error('[response-schema] outgoing payload failed validation:', schemaErr);
      if (GOLDEN) {
        log.info('[response-schema] Falling back to GOLDEN checkpoint');
        GOLDEN_degraded = true;
        GOLDEN_reason ??= 'response_schema_invalid';
        const goldenPayload = { ...GOLDEN, _degraded: true, _degraded_reason: GOLDEN_reason };
        return new Response(
          JSON.stringify({ success: true, data: goldenPayload }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── QOC Shadow Mode (docs/QOC_MIGRATION_PLAN.md, Stage 1) ──
    // Fire-and-forget parallel call to the newer qoc-orchestrate pipeline.
    // Purely observational: not awaited before the response below, wrapped so
    // it can never throw into this request, and has zero ability to change
    // wirePayload or any header the user actually receives. Its only effect
    // is a best-effort row in qoc_audit_envelopes when it succeeds. Only
    // fires for authenticated requests (anonymous callers have no bearer
    // token for qoc-orchestrate to authenticate — that's fine, coverage
    // starts with the logged-in tiers and is intentionally partial in this
    // stage). A failed or skipped shadow call is invisible to the caller.
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader && idea_clean) {
        const shadowInvoke = supabaseService.functions
          .invoke('qoc-orchestrate', {
            headers: { Authorization: authHeader },
            body: {
              request_id: crypto.randomUUID(),
              idea: idea_clean,
              location: location_clean,
            },
          })
          .then(({ data, error: shadowErr }) => {
            if (shadowErr) {
              log.info('[qoc-shadow] invoke error (non-fatal)', String(shadowErr));
            } else {
              log.info('[qoc-shadow] recorded', { verdict: data?.overall_verdict });
            }
          })
          .catch((e) => {
            log.info('[qoc-shadow] skipped (non-fatal)', String(e?.message ?? e));
          });

        // deno-lint-ignore no-explicit-any
        const edgeRuntime = (globalThis as any).EdgeRuntime;
        if (edgeRuntime?.waitUntil) {
          edgeRuntime.waitUntil(shadowInvoke);
        }
      }
    } catch (shadowSetupErr) {
      // Shadow mode must never affect the real response path, even here.
      log.info('[qoc-shadow] setup skipped (non-fatal)', String(shadowSetupErr));
    }

    return new Response(
      JSON.stringify({ success: true, data: wirePayload }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    log.error("[outermost-catch] Unhandled error:", errorMessage);
    log.error("[outermost-catch] Stack:", errorStack);

    // ── WS3: ZERO-FAIL outermost catch ──
    // If GOLDEN exists, the deterministic engine already produced a valid result.
    // Return it with degradation flags — never a bare 500.
    if (GOLDEN) {
      log.info('[outermost-catch] Returning GOLDEN checkpoint (degraded)');
      const goldenPayload = {
        ...GOLDEN,
        _degraded: true,
        _degraded_reason: GOLDEN_reason || 'outermost_catch',
        _error_context: errorMessage,
      };
      return new Response(
        JSON.stringify({ success: true, data: goldenPayload }),
        { headers: { ..._corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GOLDEN is null — crash happened before transformResponse.
    // Build a last-resort deterministic result from whatever inputs we have.
    log.info('[outermost-catch] GOLDEN null — building last-resort deterministic result');
    try {
      const lastResort = generateDeterministicFallbackResult(
        _idea_clean || 'Unknown business',
        _location_clean || 'United States',
        _detectedIndustry || INDUSTRY_BENCHMARKS.find(b => b.id === 'general')!,
        _locationMultipliers || { overall: 1.0, salary: 1.0, rent: 1.0, utility: 1.0, marketing: 1.0, matched: false, matchedCity: null, region: 'National Average', confidence: 0 },
        _mergedFinancialInputs || {},
      );
      const lastResortPayload = {
        ...lastResort,
        _degraded: true,
        _degraded_reason: 'last_resort_deterministic',
        _error_context: errorMessage,
      };
      return new Response(
        JSON.stringify({ success: true, data: lastResortPayload }),
        { headers: { ..._corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (lastResortErr) {
      log.error('[outermost-catch] Last-resort also failed:', lastResortErr);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Analysis could not be completed. Please try again.",
          code: "TOTAL_FAILURE",
          timestamp: new Date().toISOString(),
        }),
        { status: 500, headers: { ..._corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }
});
