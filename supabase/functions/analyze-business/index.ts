import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { maybeHealthResponse } from '../_shared/health.ts';
import { traced } from '../_shared/otel.ts';
import {
  calculateStrictFinancials,
  type StrictFinancialResult,
} from './financial-calculator.ts';
import { emitAnalysisSnapshot, ENGINE_VERSION as SCENARIO_BASE_INPUT_ENGINE_VERSION, FORMULA_REGISTRY_VERSION as SCENARIO_BASE_INPUT_FORMULA_VERSION } from '../_shared/analysis-snapshot.ts';
import { emitAnalysisComplete } from '../_shared/analysis-complete-event.ts';
import { lockNumericPayload } from '../_shared/locked-numeric-payload.ts';
import { shapeFinancialAnalysis } from './financial-analysis-shape.ts';
import { deriveInvestmentVerdict, computeInputCompletenessPct } from './investment-verdict.ts';
import { isTradesBusiness, scoreIndustriesByKeywords, TRADE_TERMS, TRADES_INDUSTRY_ID } from './industry-classifier-core.ts';
import { detectRevenueShapeMismatch, type ModelApplicabilityWarning } from '../_shared/revenue-shape-detector.ts';
import { detectArchetype } from '../_shared/business-archetypes.ts';
import { classifyAssumptionOrigins, type AssumptionOriginMap } from '../_shared/assumption-origin.ts';
import { MONTE_CARLO_ITERATIONS_DISPLAY, BENCHMARK_COUNT, BENCHMARK_SOURCES_DISPLAY } from '../_shared/canonical-facts.ts';
import { monthlyRevenueFromDocument } from './document-revenue.ts';
import { buildQualityDimensions } from '../_shared/quality-dimensions.ts';

const FUNCTION_NAME = 'analyze-business';
const FUNCTION_VERSION = '1.1.0';
// Embedded benchmarks are now seeded via database migration - no import needed


// ========== BENCHMARK ENGINE V2 (97,500-row dataset) ==========
import {
  getBenchmarkSummary,
  buildQueryFromInput, 
  detectSectorFromIdea,
  computePercentile,
  type BenchmarkSummaryForCase,
  type BenchmarkQuery 
} from "./benchmark-engine-v2.ts";
import {
  buildBenchmarkRecords,
  summarizeMatches,
  type BenchmarkRecord,
} from "./benchmark-records.ts";
import { containsWord, markSectorFallback, NO_PEER_BENCHMARK_CONFIDENCE_CAP } from "./benchmark-keywords.ts";

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
  enforceNarrativeIntegrity,
  scrubNarrativeField,
  dollarAmountsIn,
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
import { runReconciliationCheck, type ReconciliationResult } from "./reconciliation-check.ts";
import { defaultFinancialReconciler } from "../_shared/r3-validator.ts";
import { computeModelConfidence, type ModelConfidenceResult } from "./prediction-engine.ts";
import { hasFiniteNumber } from "../_shared/financial-inputs.ts";

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

export interface IndustryBenchmarks {
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

// INDUSTRY_COGS_LABELS / INDUSTRY_INVESTMENT_CATEGORIES moved to
// financial-analysis-shape.ts (Phase D, 2026-08-01) — they were only used by
// the financial_analysis reshaping logic extracted into that file.

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
    // 'services' and 'professional' removed 2026-08-30: both are generic
    // English words present in most business descriptions regardless of
    // industry (e.g. "targeting busy professionals", "a pet-sitting
    // service") -- via detectIndustryFromDatabase/detectIndustry's
    // substring-includes scoring (score += keyword.length), either word
    // alone was enough to misclassify a dog-walking/pet-sitting business as
    // "Consulting / Professional Services" in production (live-reproduced
    // 2026-08-30 via the homepage free-analysis flow). No 'agency'/'advisor'
    // etc. removed -- those are still consulting-specific enough not to
    // false-positive on ordinary business copy.
    keywords: ['consulting', 'consultant', 'agency', 'advisor', 'coach', 'coaching', 'training', 'b2b', 'enterprise']
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
    // 2026-11-03: trades had no entry, so an HVAC company was "General
    // Business". Chosen by rule (isTradesBusiness) before keyword scoring.
    // The numbers below are deliberately General Business's, unchanged: the
    // trade economics (COGS, margins, CAC, lifetime, price range) come from
    // the V2 peer overlay (Construction / Specialty or General Contractor
    // rows), which every trade term now reaches (benchmark-keywords.ts). No
    // in-repo source gives trade fixed costs or order frequency, and the two
    // sources that exist disagree on CAC ($220 in src/lib/industry-priors.ts
    // vs $2,794 p50 in the V2 seed), so trade-specific defaults are a
    // separate founder decision, not guessed here.
    id: 'trades',
    name: 'Trades / Contractor',
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
    keywords: [...TRADE_TERMS],
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
    // (getCachedBenchmarks has its own internal error handling and
    // stale-cache fallback -- deliberately not touched here.)
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
      // Propagate rather than swallow: the caller's own try/catch already
      // falls back to [] for downstream logic (dbBenchmarks stays at its
      // initial [] value), so behavior is unchanged -- but the traced()
      // span wrapping this call can now correctly record ERROR instead of
      // a false OK. Logged here too so the message survives even if the
      // caller only logs err.message.
      log.error('Failed to fetch benchmarks from database:', error.message);
      throw new Error(`Failed to fetch benchmarks from database: ${error.message}`);
    }

    if (data && data.length > 0) {
      log.info(`Fetched ${data.length} benchmark records from database (cache miss)`);
    }
    return data || [];
  } catch (err) {
    log.error('Database benchmark fetch error:', err);
    throw err;
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
    // Whole words only (plural allowed): includes() let "technician" match a
    // "tech" keyword and pushed a hiring decision into SaaS (2026-10-25).
    if (containsWord(ideaLower, kw)) {
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
  
  // ===== PHASE 0: deterministic rules (trades) =====
  // Before the database keywords, which map 'contractor' to Freelance
  // Services and have no trade rows (see industry-classifier-core.ts).
  if (isTradesBusiness(businessIdea)) {
    const trades = INDUSTRY_BENCHMARKS.find(i => i.id === TRADES_INDUSTRY_ID)!;
    log.info(`Industry by rule: ${trades.name}`);
    return {
      benchmark: { ...trades },
      source: 'hardcoded',
      confidence: 75,
      matchedIndustryId: trades.id,
      matchedRegion: null,
      sampleSize: null,
      dataSource: 'default_benchmarks',
    };
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
  const { match: bestMatch, score: bestScore } = scoreIndustriesByKeywords(ideaLower, INDUSTRY_BENCHMARKS);

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
  const { match: bestMatch } = scoreIndustriesByKeywords(ideaLower, INDUSTRY_BENCHMARKS);
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
// Extracted to financial-calculator.ts (Handbook §19 Wave 4b) so golden-case
// tests can import the real engine directly under Vitest.

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
  const investmentAmount = userInputs?.startup_investment ?? Math.round((benchmarks.salaries_fixed + benchmarks.rent_fixed) * 12);
  const monthlyRevenue = userInputs?.monthly_revenue ?? Math.round(benchmarks.average_check_max * benchmarks.orders_per_client * 80);
  const cacValue = userInputs?.cac ?? benchmarks.cac_typical;
  const avgCheck = userInputs?.average_price ?? (benchmarks.average_check_min + benchmarks.average_check_max) / 2;
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
  userInputs?: OptionalFinancialInputs,
  ideaText?: string,
) {
  const fa = safeParseJSON(raw.financial_json, {});
  const bp = safeParseJSON(raw.business_json, {});
  const mp = safeParseJSON(raw.marketing_json, {});
  const ma = safeParseJSON(raw.market_json, {});

  // R3 plausibility check (2026-08-02, P0-25 review): defaultFinancialReconciler
  // existed, tested, correct, and unused since it was written -- this is the
  // first real call site. `||` chains below treat NaN as absent (falls through
  // to the next fallback) but NOT Infinity (`Infinity || 100000` === Infinity)
  // -- a malformed AI numeric field could silently become "$Infinity startup
  // investment" downstream with zero protection before this. Logged for real
  // visibility into how often the narrator actually produces this (currently
  // unmeasured), and Number.isFinite guards below close the actual gap.
  const financialPlausibilityIssue = defaultFinancialReconciler<Record<string, unknown>>({
    finiteFields: ['mrr', 'startup_investment', 'cac', 'ltv', 'average_check'],
  })(fa as Record<string, unknown>);
  if (financialPlausibilityIssue) {
    log.warn(`AI-estimated financial_json failed R3 plausibility check: ${financialPlausibilityIssue}`);
  }
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
  //
  // finite() guards (2026-08-02): `||` treats NaN as absent and falls through
  // correctly, but Infinity is truthy -- `Infinity || 100000` === Infinity.
  // An AI-generated non-finite value would otherwise flow straight through
  // as a real "$Infinity startup investment" with no protection. See the R3
  // plausibility check above, which logs how often this actually happens.
  const finite = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  const rawMrr = userInputs?.monthly_revenue ?? finite(fa.mrr) ?? 50000;
  const rawInvestment = userInputs?.startup_investment ?? finite(fa.startup_investment) ?? 100000;
  // A blank CAC uses the industry benchmark, as the form promises ("leave it
  // blank — we'll use the typical value"). It used to take the AI's own
  // estimate first (fa.cac / mp.cac): found 2026-10-29 on a live run, the AI
  // guessed ~$4,400 per client for a 12-client bookkeeping firm, which made
  // acquisition spend exceed revenue (contribution margin -5.1%, break-even
  // "not achievable") and made the same inputs give different numbers on
  // every run. The engine's inputs must not depend on narrated text.
  const rawCac = userInputs?.cac ?? benchmarks.cac_typical;
  const rawLtv = finite(fa.ltv) || finite(mp.ltv) || 500;
  const rawAvgCheck = userInputs?.average_price ?? finite(fa.average_check) ?? (benchmarks.average_check_min + benchmarks.average_check_max) / 2;
  
  // User-provided operational data
  const userProvidedCosts = userInputs?.monthly_costs;
  const userProvidedChurnRate = userInputs?.churn_rate;
  const userProvidedCustomers = userInputs?.expected_customers;
  
  // Log input source for debugging
  log.info('Financial input sources', {
    mrr: userInputs?.monthly_revenue !== undefined ? 'user' : 'estimated',
    investment: userInputs?.startup_investment !== undefined ? 'user' : 'estimated',
    cac: userInputs?.cac !== undefined ? 'user' : 'estimated',
  });
  
  // Validation: warn if AI values significantly differ from user inputs
  if (userInputs?.monthly_revenue !== undefined && userInputs.monthly_revenue !== 0 && Number.isFinite(fa.mrr)) {
    const diff = Math.abs(fa.mrr - userInputs.monthly_revenue) / userInputs.monthly_revenue;
    if (diff > 0.2) {
      log.warn('AI-estimated revenue differs materially from user input', { differencePercent: Math.round(diff * 100) });
    }
  }
  if (userInputs?.startup_investment !== undefined && userInputs.startup_investment !== 0 && Number.isFinite(fa.startup_investment)) {
    const diff = Math.abs(fa.startup_investment - userInputs.startup_investment) / userInputs.startup_investment;
    if (diff > 0.2) {
      log.warn('AI-estimated investment differs materially from user input', { differencePercent: Math.round(diff * 100) });
    }
  }
  
  // Living Assumption Register (Multiplier System #1): must be classified
  // right here, before the userInputs?.x || fa.x || benchmark chain above is
  // forgotten — see assumption-origin.ts's header comment.
  const assumptionOrigins = classifyAssumptionOrigins({
    userInputs,
    fa,
    mp,
    benchmarks,
    locationMultipliers,
    subIndustry,
  });

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
  
  // financial_analysis reshaping extracted to financial-analysis-shape.ts
  // (Phase D, 2026-08-01) so run-scenario can reuse the exact same shape —
  // see that file's header comment. No behavior change versus the inline
  // version this replaced.
  const { financialAnalysis, scenarioContradictions } = shapeFinancialAnalysis(calc, benchmarks, log);

  // Accuracy session 2026-08-04 (Confidence semantics, Priority 1): capture
  // wasModified once here so it's available below for the internal
  // _narrativeWasModified field. Previously this call's `.wasModified`
  // result was computed and immediately discarded -- see
  // quality-dimensions.ts's header comment for why that mattered.
  // Q6 (2026-11-03): the check also needs CAC payback, which lives in the
  // shaped unit economics rather than on calc.
  const narrativeCalc = {
    ...calc,
    cacPaybackMonths: (financialAnalysis as { unit_economics?: { cac_payback_months?: number } })?.unit_economics?.cac_payback_months,
  };
  const narrativeIntegrityResult = enforceNarrativeIntegrity(
    bp.executive_summary || "Business analysis in progress. Please provide more details for comprehensive summary.",
    narrativeCalc,
    benchmarks.name,
    location,
    log,
    ideaText,
  );
  // Q6: the other prose fields are checked sentence by sentence; only the
  // sentences that contradict the engine are removed.
  const narrativeUserAnchors = dollarAmountsIn(ideaText);
  const scrubbedFields = {
    product_description: scrubNarrativeField('product_description', bp.product_description, narrativeCalc, narrativeUserAnchors),
    target_audience: scrubNarrativeField('target_audience', bp.target_audience, narrativeCalc, narrativeUserAnchors),
    competitive_advantages: scrubNarrativeField('competitive_advantages', bp.competitive_advantages, narrativeCalc, narrativeUserAnchors),
    operations: scrubNarrativeField('operations', bp.operations, narrativeCalc, narrativeUserAnchors),
  };
  const narrativeFieldsScrubbed = Object.values(scrubbedFields).flatMap((r) => r.removed);
  if (narrativeFieldsScrubbed.length > 0) {
    log.warn(`Narrative integrity check: removed ${narrativeFieldsScrubbed.length} sentence(s) that did not reconcile (${narrativeFieldsScrubbed.join('; ')})`);
  }

  // FREE-NULL-VERDICT, root-cause corrected 2026-08-16 (supersedes the
  // 2026-08-16 raw.investment_verdict fix earlier the same day, which was
  // real but insufficient AND architecturally wrong -- it sourced the
  // verdict from the AI narrator, when the deterministic engine must own
  // it; see investment-verdict.ts's header for the full chain).
  // `calc` (calculateStrictFinancials, line ~1743) is the SAME canonical
  // financial state both the AI-narrator path and the deterministic-
  // fallback path already flow through by this point -- one derivation
  // here covers every response path with no per-path duplication.
  const investmentVerdict = deriveInvestmentVerdict(calc, userInputs);

  return {
    verdict: investmentVerdict.verdict,
    verdict_basis: investmentVerdict.basis,
    verdict_reasons: investmentVerdict.reasons,
    financial_analysis: financialAnalysis,
    business_plan: {
      executive_summary: narrativeIntegrityResult.executiveSummary,
      product_description: scrubbedFields.product_description.text || "Product/service details being analyzed.",
      target_audience: scrubbedFields.target_audience.text || `Target customers in ${location} market.`,
      competitive_advantages: scrubbedFields.competitive_advantages.text || "Differentiation analysis in progress.",
      operations: scrubbedFields.operations.text || "Operational model being developed.",
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
    // FIXED 2026-07-29 (production incident): serve()'s post-call code at
    // ~report_integrity previously tried to read `scenarioContradictions`
    // directly -- a local variable scoped to THIS function, transformResponse,
    // not to serve()'s handler (they are two separate functions; serve()
    // only calls transformResponse() and receives its return value). That
    // was a ReferenceError on every single real request, caught by the
    // outermost catch and silently degrading every live analysis to the
    // fallback response (confirmed via git blame: pre-existing, not
    // introduced by this session's reconciliation-engine work, which
    // independently hit the exact same mistake and is what surfaced this
    // during live-invocation verification). Attaching the real result here,
    // computed with the correctly-scoped local variable, so serve() can
    // read `result.report_integrity` / `result.report_integrity_issues`
    // instead of reaching into a scope it never had access to.
    // Scenario-monotonicity contradictions (optimistic revenue up, profit
    // down) do NOT escalate report_integrity to BLOCK on their own (decided
    // 2026-08-03, after root-causing and fixing the dominant cause in
    // financial-analysis-shape.ts's scenario cost-reconciliation). The
    // remaining legitimate trigger for this check is a marketing-heavy
    // business where scaled acquisition spend genuinely outpaces modeled
    // revenue growth -- checkScenarioMonotonicity's own docstring calls this
    // a real possibility, not a defect. It still surfaces here via
    // report_integrity_issues for transparency (rendered as the "Contradictions
    // detected" notice), but only the CRITICAL_RECONCILIATION_RULES escalation
    // further below (accounting-identity failures, R-001..R-005) may set BLOCK.
    report_integrity: 'PASS',
    report_integrity_issues: scenarioContradictions,
    _calc: calc,
    // Internal only -- consumed and deleted alongside _calc in serve(),
    // then folded into validation.quality_dimensions.narrative_reconciliation.
    _narrativeWasModified: narrativeIntegrityResult.wasModified,
    _narrativeIntegrityReason: narrativeIntegrityResult.reason ?? null,
    _narrativeFieldsScrubbed: narrativeFieldsScrubbed,
    // Phase D (2026-08-01): the exact raw bundle fed into
    // calculateStrictFinancials, frozen so a later scenario re-run never has
    // to re-derive industry/location/sub-industry detection (which drifts as
    // the benchmark dataset changes over time — see migration
    // 20260801030858_scenario_base_input_and_quota_rpc.sql). Unlike `_calc`,
    // this is NOT stripped before the response is sent — the client persists
    // it verbatim via analysisDb.ts's saveAnalysis() into
    // analyses.scenario_base_input. Free-tier's truncated wirePayload (built
    // from a fresh object literal, not a spread of `result`) naturally omits
    // it, which is correct: only saved (Plus/Pro) analyses need it.
    _scenarioBaseInput: {
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
      userProvidedCustomers,
      engineVersion: SCENARIO_BASE_INPUT_ENGINE_VERSION,
      formulaRegistryVersion: SCENARIO_BASE_INPUT_FORMULA_VERSION,
      datasetVersion: String(BENCHMARK_COUNT),
      assumptionOrigins,
    },
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

  // AI-run correlation fix (P0 instrumentation defect, confirmed 0/130 NULL
  // in ai_calls.analysis_id across every prior sample this analysis session
  // was audited): this function never inserts into `analyses` itself -- the
  // row is saved afterward by the caller -- so there is no analysis id yet
  // at the point the AI call happens. aiCall() below already accepts an
  // `analysisId` option (see _shared/llm-call.ts), but this call site never
  // passed one, which is the entire cause of the NULL column. Generating a
  // durable run id HERE, before the first provider call, and returning it in
  // the response payload as `analysis_run_id` lets the caller persist the
  // same id on the saved `analyses` row for a real join -- not depending on
  // an id that doesn't exist until after AI execution, per the standing
  // instruction on this fix.
  const analysisRunId = crypto.randomUUID();


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
    let freeUsageBeforeRun: number | null = null;
    
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

    // ========== TRUSTED WORKER AUTHENTICATION ==========
    // analyze-pro-worker invokes this function via a service-role Supabase
    // client with no explicit headers override. Confirmed live 2026-08-01
    // via a controlled diagnostic (three instrumented deploys): the Supabase
    // JS client does NOT send the service-role secret as `Authorization:
    // Bearer <key>` for this call — it sends it in the `apikey` header
    // instead, and `Authorization` is absent entirely. The normal
    // getUser()-based flow below can never identify who a worker callback's
    // job belongs to, so every Pro-depth worker callback silently fell
    // through to userPlan='free', triggering the free-tier wirePayload
    // truncation and discarding the entire Pro analysis — confirmed via
    // analysis_jobs.result containing only the free-tier {_tier, score,
    // verdict, top_risks, ...} shape for a real Pro subscriber's jobs, for
    // as long as the async Pro-job queue has existed.
    //
    // Only requests carrying the literal service-role secret — never
    // exposed to any client — are trusted to assert a _worker_user_id, so
    // this cannot be spoofed by an external caller claiming to be a worker.
    // The Authorization-header check is kept as a defense-in-depth
    // alternate path in case a future Supabase client version sends it
    // there instead; it is a no-op today.
    let workerAuthedUserId: string | null = null;
    const apikeyHeader = req.headers.get("apikey");
    if (authHeader === `Bearer ${supabaseServiceKey}` || apikeyHeader === supabaseServiceKey) {
      try {
        const peekBody = await req.clone().json();
        if (peekBody?._worker_run === true && typeof peekBody?._worker_user_id === 'string') {
          workerAuthedUserId = peekBody._worker_user_id;
        }
      } catch {
        // Body isn't JSON (or already consumed) — fall through to normal auth.
      }
    }

    if (workerAuthedUserId) {
      userId = workerAuthedUserId;
      isAnonymous = false;
      log.info('Worker-authenticated analysis request');

      const { data: subscription } = await supabaseService
        .from('subscriptions')
        .select('plan_id, status')
        .eq('user_id', userId)
        .maybeSingle();

      if (subscription && ['active', 'trialing'].includes(subscription.status)) {
        userPlan = subscription.plan_id;
      }
      log.info(`Worker-resolved user plan: ${userPlan}`);
      // Deliberately skip the free-tier monthly-usage gate below — this is
      // a server-to-server recompute of an already-approved Pro request,
      // not a new interactive submission subject to the abuse-prevention
      // quota that gate exists for.
    } else if (authHeader) {
      // Authenticated user - check their subscription
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

      if (!userError && user) {
        userId = user.id;
        isAnonymous = false;
        log.info('Authenticated user accepted');

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
          freeUsageBeforeRun = currentUsage;
          
          if (currentUsage >= FREE_TIER_LIMIT) {
            log.info('Free tier usage limit reached', { currentUsage, limit: FREE_TIER_LIMIT });
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
                message: `You have used all ${FREE_TIER_LIMIT} complimentary Decision Runs this month. Your saved reports stay available; free runs renew next month, or Plus provides unlimited runs.`,
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
      
      log.info('Anonymous analysis request');
      
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
          
          log.info('Anonymous rate limit exceeded', { reason });
          
          return new Response(
            JSON.stringify({ 
              error: rateLimitResult.message || "Free analysis limit reached. Sign in for more.", 
              code: "ANONYMOUS_LIMIT_EXCEEDED",
              details: {
                reason,
                retry_after_seconds: retryAfterSeconds,
                reset_at: rateLimitResult.reset_at,
                suggestion: `Sign in to save this Decision Run and receive ${FREE_TIER_LIMIT} complete runs per month`
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
          log.info('Authenticated rate limit exceeded', { current: rateLimitResult.current_count, limit: rateLimitResult.limit });
          
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
        log.error('Request schema validation failed', {
          fields: Object.keys(parsed.error.flatten().fieldErrors),
        });
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

    // ========== TIER-BASED DEPTH COERCION ==========
    // Free and anonymous users receive the same Full-depth decision analysis
    // as Plus for their complimentary runs. Only Pro depth remains paid-only.
    // NOTE: 'deep' is a legacy alias for 'pro' from older clients — normalize it.
    const rawDepth = (analysis_depth || 'full').toString().toLowerCase();
    const requestedDepth = rawDepth === 'deep' ? 'pro' : rawDepth;
    let depthLevel: 'quick' | 'full' | 'pro';
    if (userPlan === 'pro') {
      depthLevel = (requestedDepth === 'pro' ? 'pro' : requestedDepth === 'full' ? 'full' : 'quick');
    } else if (userPlan === 'plus') {
      depthLevel = (requestedDepth === 'pro' || requestedDepth === 'full') ? 'full' : 'quick';
    } else {
      depthLevel = requestedDepth === 'quick' ? 'quick' : 'full';
      if (requestedDepth === 'pro') {
        log.info(`[tier-gate] Coerced Pro depth → Full for complimentary Decision Run (${userId ?? 'anon'})`);
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

    log.info('Processing analysis request', { hasIdea: idea_clean.length > 0, hasLocation: location_clean.length > 0 });

    // Domain 5/12 audit (Q41/Q45/Q119/Q165/Q179): classify the business's
    // operating archetype from the canonical registry (informational --
    // does not change which formulas run) and, if that archetype has
    // 'poor' engine fit, surface an honest degraded banner in the
    // frontend instead of a polished false-confidence report. WARN, not
    // BLOCK -- the engine still runs, but the response carries the
    // classification (and, when applicable, a warning) the frontend
    // surfaces prominently. False positives are cheap here (a banner),
    // false negatives are the audit's exact original complaint.
    const detectedArchetype = detectArchetype(idea_clean);
    const modelApplicabilityWarning: ModelApplicabilityWarning | null =
      detectRevenueShapeMismatch(idea_clean);
    if (detectedArchetype) {
      log.info(
        `Business archetype detected: id=${detectedArchetype.id} engineFit=${detectedArchetype.engineFit}`,
      );
    }
    if (modelApplicabilityWarning) {
      log.info(
        `Revenue shape mismatch detected: shape=${modelApplicabilityWarning.detected_shape} phrase="${modelApplicabilityWarning.matched_phrase}"`,
      );
    }

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
    const documentInputNotes: string[] = [];

    if (documentExtractedFinancials.length > 0) {
      for (const docFin of documentExtractedFinancials) {
        // Revenue
        if (documentDerivedInputs.monthly_revenue === undefined) {
          // D6: only convert figures whose period the document states (see document-revenue.ts).
          const rev = monthlyRevenueFromDocument(docFin);
          if (rev.monthly !== null) {
            documentDerivedInputs.monthly_revenue = rev.monthly;
            log.info('Document financial field extracted', { field: 'monthly_revenue', source: rev.basis });
          } else if (rev.note) {
            documentInputNotes.push(`${docFin.source_document}: ${rev.note}`);
          }
        }
        
        // Costs
        if (documentDerivedInputs.monthly_costs === undefined && hasFiniteNumber(docFin.costs?.monthly)) {
          documentDerivedInputs.monthly_costs = docFin.costs.monthly;
          log.info('Document financial field extracted', { field: 'monthly_costs' });
        }
        
        // Investment
        if (documentDerivedInputs.startup_investment === undefined && hasFiniteNumber(docFin.investment?.total)) {
          documentDerivedInputs.startup_investment = docFin.investment.total;
          log.info('Document financial field extracted', { field: 'startup_investment' });
        }
        
        // CAC
        if (documentDerivedInputs.cac === undefined && hasFiniteNumber(docFin.metrics?.cac)) {
          documentDerivedInputs.cac = docFin.metrics.cac;
          log.info('Document financial field extracted', { field: 'cac' });
        }
        
        // Customers
        if (documentDerivedInputs.expected_customers === undefined && hasFiniteNumber(docFin.metrics?.customer_count)) {
          documentDerivedInputs.expected_customers = docFin.metrics.customer_count;
          log.info('Document financial field extracted', { field: 'expected_customers' });
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
      log.info('Financial input merge completed', {
        documentFields: Object.keys(documentDerivedInputs),
        userFields: Object.keys(financial_inputs ?? {}),
      });
    }

    // LOVABLE_API_KEY absence no longer blocks — the deterministic engine runs
    // without any AI provider. The AI retry loop handles missing keys gracefully.
    const _hasAiProvider = !!Deno.env.get("LOVABLE_API_KEY");

    // ========== DATABASE-DRIVEN INDUSTRY DETECTION ==========
    // Fetch benchmarks from database first, then fall back to hardcoded
    let dbBenchmarks: DatabaseBenchmarkRecord[] = [];
    try {
      dbBenchmarks = await traced(
        'db.fetch_benchmarks',
        { request_id: requestId, 'db.system': 'postgresql' },
        () => fetchDatabaseBenchmarks(supabaseService),
      );
    } catch (err) {
      log.error('Failed to fetch database benchmarks, using hardcoded:', err);
    }

    // Detect industry using database-first approach
    const benchmarkResult = await traced(
      'industry.detect_from_database',
      { request_id: requestId, 'industry.manually_selected': !!(selected_industry && selected_industry !== 'auto') },
      () => detectIndustryFromDatabase(idea_clean, location_clean, dbBenchmarks, selected_industry),
    );
    
    const detectedIndustry = benchmarkResult.benchmark;
    const industryWasManuallySelected = selected_industry && selected_industry !== 'auto';
    const benchmarkSource = benchmarkResult.source;
    const benchmarkConfidence = benchmarkResult.confidence;
    const benchmarkDataSource = benchmarkResult.dataSource;
    const benchmarkSampleSize = benchmarkResult.sampleSize;
    const benchmarkMatchedRegion = benchmarkResult.matchedRegion;
    
    // ========== BENCHMARK ENGINE V2 (97,500-row dataset) ==========
    let v2BenchmarkSummary: BenchmarkSummaryForCase | null = null;
    try {
      const v2Query = buildQueryFromInput(idea_clean, location_clean);
      v2BenchmarkSummary = await getBenchmarkSummary(supabaseService, v2Query);
      // No sector keyword matched: the query used a consulting placeholder. Never
      // report that row as a match, and never overlay it on the detected industry.
      if (!detectSectorFromIdea(idea_clean).matched) {
        v2BenchmarkSummary = markSectorFallback(v2BenchmarkSummary);
      }
      log.info(`V2 Benchmarks: ${v2BenchmarkSummary.sector_label} | ${v2BenchmarkSummary.geo_label} | match: ${v2BenchmarkSummary.overall_match_quality}`);
    } catch (err) {
      log.error('V2 benchmark fetch failed, continuing with legacy:', err);
    }

    // ========== V2 BENCHMARK → LEGACY OVERLAY ==========
    // When the V2 97,500-row benchmark dataset returns data, overlay its percentile-based values onto
    // the legacy detectedIndustry object so the DFE and Quantis engine use the most
    // accurate peer-group data for all deterministic calculations.
    if (v2BenchmarkSummary && v2BenchmarkSummary.overall_match_quality !== 'none' && v2BenchmarkSummary.overall_match_quality !== 'sector_fallback') {
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
    
    log.info('Analysis classification completed', {
      industry: detectedIndustry.id,
      benchmarkSource,
      industryWasManuallySelected,
      benchmarkConfidence,
      locationMatched: locationMultipliers.matched,
      region: locationMultipliers.region,
    });
    if (subIndustry.confidence > 50) {
      log.info(`Sub-industry: ${subIndustry.subIndustryName} (${subIndustry.businessModel}, ${subIndustry.targetScale}) | CAC=${subIndustry.modifiers.cac_multiplier}x, LTV=${subIndustry.modifiers.ltv_multiplier}x`);
    }

    // Build user financial context for AI prompt
    const userFinancialContext = financial_inputs ? `
## USER-PROVIDED FINANCIAL DATA (IMPORTANT - USE THESE VALUES IN YOUR ANALYSIS!)
${hasFiniteNumber(financial_inputs.monthly_revenue) ? `- Monthly Revenue: $${financial_inputs.monthly_revenue.toLocaleString()} (USE THIS EXACT VALUE)` : ''}
${hasFiniteNumber(financial_inputs.startup_investment) ? `- Initial Investment: $${financial_inputs.startup_investment.toLocaleString()} (USE THIS EXACT VALUE)` : ''}
${hasFiniteNumber(financial_inputs.monthly_costs) ? `- Monthly Operating Costs: $${financial_inputs.monthly_costs.toLocaleString()} (USE THIS EXACT VALUE)` : ''}
${hasFiniteNumber(financial_inputs.average_price) ? `- Average Price/Transaction: $${financial_inputs.average_price}` : ''}
${hasFiniteNumber(financial_inputs.expected_customers) ? `- Expected Monthly Customers: ${financial_inputs.expected_customers}` : ''}
${hasFiniteNumber(financial_inputs.cac) ? `- Customer Acquisition Cost: $${financial_inputs.cac}` : ''}
${hasFiniteNumber(financial_inputs.churn_rate) ? `- Monthly Churn Rate: ${financial_inputs.churn_rate}%` : ''}

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
## V2 BENCHMARK DATA (${BENCHMARK_COUNT}-row dataset — ${v2BenchmarkSummary.sector_label} | ${v2BenchmarkSummary.geo_label} | match: ${v2BenchmarkSummary.overall_match_quality})
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
            // Deliberately not passing analysisRunId as the aiCall "analysisId"
            // option here. ai_calls.analysis_id has a
            // foreign key to public.analyses(id), and analysisRunId is
            // generated before this function (or its caller) has created any
            // row in analyses -- passing it as analysisId makes every insert
            // violate the FK and fail outright (losing the whole telemetry
            // row, not just this field). No caller currently reuses
            // analysisRunId as the analyses row's actual id (confirmed: not
            // referenced anywhere in src/ outside this fix's own test), so
            // there's no way to satisfy the FK yet. Keep the run id
            // correlatable via metadata (no FK) instead; wiring it through to
            // a real analyses.id is a separate, cross-cutting change.
            userId: userId,
            metadata: { attempt, industry: detectedIndustry.name, analysis_run_id: analysisRunId },
            // Explicit alias when Dahl is the active provider: a live
            // multi-model probe (2026-08-24) proved 'general' (MiniMax-M2.7)
            // times out completely on this exact large structured-JSON
            // request shape, while 'fast_reasoning' (DeepSeek-V4-Flash via
            // Dahl -- the same model family already proven reliable via the
            // direct DeepSeek API) returned valid JSON in ~20s. Ignored
            // entirely on the legacy DeepSeek/Anthropic path.
            dahlAlias: 'fast_reasoning',
          },
        );

        if (aiResult.ok) {
          response = { ok: true, data: aiResult.data };
          log.info(`AI request succeeded on attempt ${attempt}`);
          break;
        }

        lastStatus = aiResult.status;
        log.error('AI request failed', { attempt, status: aiResult.status, errorCode: aiResult.error });

        // Don't retry on rate limit / credits / config
        if (aiResult.status === 429 || aiResult.status === 402 || aiResult.error === 'CONFIG') {
          break;
        }

        if (attempt < MAX_RETRIES) {
          log.info(`Retrying in ${RETRY_DELAY_MS}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
      } catch (fetchError) {
        log.error('AI request transport failed', {
          attempt,
          errorType: fetchError instanceof Error ? fetchError.name : 'UnknownError',
        });
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
      log.info('All AI attempts failed; using deterministic fallback', { attempts: MAX_RETRIES, lastStatus });
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
    const result = transformResponse(rawResult, location.trim(), detectedIndustry, locationMultipliers, subIndustry, mergedFinancialInputs, idea_clean);
    const calc = result._calc as StrictFinancialResult;
    delete (result as Record<string, unknown>)._calc;
    const narrativeWasModified = Boolean((result as Record<string, unknown>)._narrativeWasModified);
    delete (result as Record<string, unknown>)._narrativeWasModified;
    const narrativeIntegrityReason = ((result as Record<string, unknown>)._narrativeIntegrityReason as string | null) ?? null;
    delete (result as Record<string, unknown>)._narrativeIntegrityReason;
    const narrativeFieldsScrubbed = ((result as Record<string, unknown>)._narrativeFieldsScrubbed as string[] | undefined) ?? [];
    delete (result as Record<string, unknown>)._narrativeFieldsScrubbed;

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
          !calc.isProfitable ? 999 : QMath.roundTo(QMath.cacPaybackMonths(calc.cac, calc.averageCheck, (100 - detectedIndustry.cogs_percent) / 100, detectedIndustry.orders_per_client), 1);
      }
      // Contract widening, additive only (2026-09-11): payback_period_months
      // stays exactly as-is -- 20+ downstream call sites depend on its
      // existing integer/999 contract, and replacing it is a larger,
      // separately-scoped change. But a raw 999 is genuinely ambiguous to
      // any consumer that doesn't know this codebase's special-casing (the
      // public API, PDF/CSV export, any future integration): it means either
      // "unprofitable" or "profitable but exceeds the 60-month simulation
      // window," and those are opposite conclusions about the same business.
      // calc.paybackResult already computes the correct typed state (VALUE /
      // NOT_APPLICABLE / etc, per payback-contract.ts) and was already being
      // written to the internal analysis_snapshots table -- it just never
      // reached the response a customer or API caller actually receives.
      // Exposing it as sibling fields lets any consumer resolve the
      // ambiguity without guessing from the bare number.
      if (result.financial_analysis) {
        result.financial_analysis.payback_period_months = calc.paybackMonths;
        result.financial_analysis.payback_status = calc.paybackResult?.status ?? null;
        result.financial_analysis.payback_reason_code = calc.paybackResult?.reasonCode ?? null;
      }
      if (result.financial_analysis?.returns) {
        result.financial_analysis.returns.payback_period_months = calc.paybackMonths;
        result.financial_analysis.returns.payback_status = calc.paybackResult?.status ?? null;
        result.financial_analysis.returns.payback_reason_code = calc.paybackResult?.reasonCode ?? null;
      }
      if (corrections.length > 0) {
        log.info(`Narrative sanitizer applied ${corrections.length} correction(s): ${corrections.join(" | ")}`);
        (result as Record<string, unknown>)._sanitizer_corrections = corrections;
      }
    } catch (sanitizeErr) {
      log.warn(`Narrative sanitizer failed (non-fatal): ${String(sanitizeErr)}`);
    }

    // ========== IMMUTABLE ANALYSIS SNAPSHOT (Handbook §19 item 9) ==========
    // Domain 7 audit: this was fire-and-forget (no `await`) — never fails the
    // response, but that's also true of an unawaited promise that the Deno
    // Edge Function runtime kills mid-flight when the handler returns and the
    // isolate tears down. Unlike a long-running Node server, there was no
    // guarantee this write ever actually completed. Now awaited so the write
    // finishes before the response is sent; the catch below keeps the exact
    // same non-fatal behavior on a genuine write failure — this only closes
    // the "response returned before the write even started" race.
    // See migration 20260711180000_analysis_snapshots.sql for why analysis_id
    // is nullable and correlationId is the anchor at write time
    // (analyze-business never inserts into public.analyses itself — that
    // happens later, client-side).
    const analysisCorrelationId = crypto.randomUUID();
    (result as Record<string, unknown>).analysis_correlation_id = analysisCorrelationId;
    // Attach the revenue-shape mismatch warning (may be null) to the response
    // so the frontend can render the honest degraded banner alongside the
    // (still-computed) report. See _shared/revenue-shape-detector.ts.
    if (modelApplicabilityWarning) {
      (result as Record<string, unknown>).model_applicability_warning = modelApplicabilityWarning;
    }
    // Informational archetype tag (may be null if unclassified) -- does not
    // change which formulas ran. Lets future analytics see the full
    // distribution of detected archetypes, not just the 'poor'-fit ones
    // that trigger a warning above.
    if (detectedArchetype) {
      (result as Record<string, unknown>).detected_archetype = detectedArchetype.id;
    }
    if (calc.paybackResult) {
      try {
        const numericOutput = await lockNumericPayload(
          {
            mrr: calc.mrr, totalExpenses: calc.totalExpenses, netProfit: calc.netProfit,
            netMarginPercent: calc.netMarginPercent, grossProfit: calc.grossProfit, grossMarginPercent: calc.grossMarginPercent,
            cac: calc.cac, ltv: calc.ltv, ltvCacRatio: calc.ltvCacRatio, paybackMonths: calc.paybackMonths,
            // npv3Years is typed optional in financial-calculator.ts but is
            // actually always assigned a concrete number by the one
            // unconditional return path there -- `?? NaN` rather than a
            // fabricated `?? 0` so lockNumericPayload's existing
            // non-finite-value guard throws (caught below, non-fatal) if
            // that invariant is ever violated, instead of silently
            // persisting a fake zero NPV.
            roiYear1Percent: calc.roiYear1Percent, npv3Years: calc.npv3Years ?? NaN,
            breakEvenRevenue: calc.breakEvenRevenue, revenueFor45kProfit: calc.revenueFor45kProfit,
          },
          SCENARIO_BASE_INPUT_ENGINE_VERSION,
          SCENARIO_BASE_INPUT_FORMULA_VERSION,
        );
        await emitAnalysisSnapshot({
          correlationId: analysisCorrelationId,
          userId,
          normalizedInput: { idea: idea_clean, location: location.trim(), financialInputs: mergedFinancialInputs ?? null },
          numericOutput,
          investmentPayback: calc.paybackResult,
          validationStatus: calc.corrections.length > 0 ? 'WARN' : 'PASS',
          validationIssues: calc.corrections,
        });
      } catch (snapshotErr) {
        log.warn(`Analysis snapshot emit failed (non-fatal): ${String(snapshotErr)}`);
      }
    }

    // ========== ANALYSIS-COMPLETE CANONICAL EVENT (Astra 6 pack, immediate
    // sequence item #1, 2026-09-15) ==========
    // Root cause found this session: _shared/analysis-complete-event.ts's
    // emitAnalysisComplete() was fully built (migration 20260619180000) but
    // never actually called from anywhere in the codebase -- confirmed via
    // repo-wide grep. analysis_complete_events sat at 0 rows despite 185 real
    // analyses because the emitter existed but was never wired to a call
    // site. Every dashboard query this table's own docblock claims to back
    // (ok-rate, cost/analysis, p50 latency, RVCE coverage) has been reading
    // from a table nothing ever wrote to.
    //
    // Wired here, at the exact same point as the already-proven
    // emitAnalysisSnapshot call above, for the success path only. Fire-and-
    // forget by design (see the emitter's own docblock) -- an event-log
    // failure must never affect the customer's actual analysis response.
    // Deliberately scoped to success only in this pass: wiring the failure/
    // error-response branches too is a real, separate follow-up, not
    // silently skipped -- this file's error paths are numerous and each
    // needs its own correct `reason` value, which is worth doing carefully
    // rather than guessing across an unfamiliar 3600+ line handler in the
    // same change.
    try {
      await emitAnalysisComplete({
        analysis_id: analysisCorrelationId,
        user_id: userId,
        tier: (['free', 'plus', 'pro'] as const).includes(userPlan as 'free' | 'plus' | 'pro') ? (userPlan as 'free' | 'plus' | 'pro') : 'free',
        ok: true,
        degraded: calc.corrections.length > 0,
      });
    } catch (completeEventErr) {
      log.warn(`analysis_complete event emit failed (non-fatal): ${String(completeEventErr)}`);
    }

    // ========== QUANTIS 2.0 ENGINE INTEGRATION ==========
    // ── WS2: Wrapped — quantisOutput failure degrades but never kills ──
    let quantisOutput: QuantisEngineOutput | null = null;
    try {
      const quantisInput: QuantisEngineInput = {
        businessIdea: idea_clean,
        location: location_clean,
        financialInputs: mergedFinancialInputs ? {
          // Root cause (2026-08-02, dual-engine ROI divergence investigation):
          // this used to read mergedFinancialInputs.startup_investment directly
          // -- the raw user field, which quantis-engine.ts then defaults to $0
          // via `|| 0` when absent. financial-calculator.ts's own rawInvestment
          // (index.ts:1679) instead falls back through a 3-tier chain (user
          // input -> AI-extracted estimate -> $100,000 default) before ever
          // reaching calculateStrictFinancials. Whenever a user omitted startup
          // investment, the two engines silently computed Year-1 ROI against
          // two completely different investment bases ($0 vs $100k), which is
          // what kept every live analysis's dual-engine agreement score capped
          // at 85/100 even after the earlier profitability-gate fix. Both
          // engines now receive the exact same already-resolved figure.
          startupInvestment: calc.startupInvestment,
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

    let providedRequired = 0;
    let providedOptional = 0;
    
    // Count user-provided financial inputs (these are HIGH VALUE for confidence)
    const userProvidedCount = financial_inputs ? Object.values(financial_inputs).filter(hasFiniteNumber).length : 0;
    const userProvidedFields: string[] = [];
    
    if (hasFiniteNumber(financial_inputs?.startup_investment)) {
      providedRequired++;
      userProvidedFields.push('investment');
    }
    if (hasFiniteNumber(financial_inputs?.monthly_revenue)) {
      providedRequired++;
      userProvidedFields.push('revenue');
    }
    if (hasFiniteNumber(financial_inputs?.cac)) {
      providedRequired++;
      userProvidedFields.push('CAC');
    }
    if (hasFiniteNumber(financial_inputs?.average_price)) {
      providedOptional++;
      userProvidedFields.push('pricing');
    }
    if (hasFiniteNumber(financial_inputs?.expected_customers)) {
      providedOptional++;
      userProvidedFields.push('customers');
    }
    if (hasFiniteNumber(financial_inputs?.monthly_costs)) {
      providedOptional++;
      userProvidedFields.push('costs');
    }
    if (hasFiniteNumber(financial_inputs?.churn_rate)) {
      providedOptional++;
      userProvidedFields.push('churn');
    }
    
    // REMOVED 2026-08-17 (paid-tier input_completeness fabrication, follow-up
    // to the free-tier score:90 fix): this block used to credit
    // providedRequired/providedOptional whenever the AI's own generated
    // financial_json (`fa`) merely differed from a handful of arbitrary
    // literal sentinels (mrr!==50000, startup_investment!==100000,
    // cac!==industry_typical, ltv!==500) -- true for nearly every AI
    // response regardless of whether the user supplied anything real. Live
    // proof on the free-tier wire payload (fixed first, in
    // investment-verdict.ts's computeInputCompletenessPct): a request with
    // zero financial_inputs scored input_completeness:100. This formula
    // feeds confidenceBreakdown.input_completeness, which flows into
    // qualityDimensions.input_completeness (PR #27's architecture) and is
    // shown prominently, color-coded, on the PAID-tier PDF cover
    // (ReportCoverPage.tsx, labeled "Input Completeness") and in
    // result.confidence_score's legacy blend -- so this was the same
    // fabricated-completeness defect on the paid product surface, not just
    // free. Removed entirely rather than patched: every other genuine
    // completeness signal (real financial_inputs above, document-extracted
    // data below, idea-description-length checks below) is unaffected and
    // was never part of this defect.

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
    for (const note of documentInputNotes) confidenceBreakdown.details.push(note);
    
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
    
    // Handbook §19 Wave 3 (item 7) — result.confidence_score is the single
    // canonical field read by 20+ frontend/PDF/DB consumers, but the
    // expandable breakdown UI (ConfidenceIndicator) reads from
    // quantisOutput.validation.confidence_breakdown, computed by a fully
    // independent formula (quantis-engine.ts). The two could disagree —
    // the headline badge and the breakdown shown beneath it could show
    // inconsistent numbers for the same report. Prefer the Quantis 2.0
    // score here so the canonical field always matches what the breakdown
    // actually justifies; fall back to the local calc only when the
    // Quantis 2.0 engine did not run.
    result.confidence_score = quantisOutput ? quantisOutput.validation.reliabilityScore : reliabilityScore;

    // Handbook §19 P0-6/P0-7 (2026-07-12 CTO-verdict audit): "A report with
    // a BLOCK contradiction may not display a green confidence score
    // without an equally prominent integrity failure." report_integrity is
    // a status distinct from confidence_score (input-coverage grading) —
    // one can never visually conceal the other. When a contradiction is
    // detected, confidence_score is also capped so the headline number
    // itself can't imply false precision on a report with a known internal
    // disagreement.
    // FIXED 2026-07-29 (production incident): this read `scenarioContradictions`
    // directly, a variable scoped to transformResponse(), not to this handler --
    // a ReferenceError on every single real request, caught by the outermost
    // catch and silently degrading every live analysis to the fallback response.
    // transformResponse() now attaches report_integrity/report_integrity_issues
    // to its own return value using its correctly-scoped local variable; read
    // that here instead of reaching into a scope this function never had.
    const reportIntegrityIssues = (result as Record<string, unknown>).report_integrity_issues as Array<{ code: string; message: string }> | undefined;
    if (reportIntegrityIssues && reportIntegrityIssues.length > 0) {
      result.confidence_score = Math.min(result.confidence_score, 50);
    }

    // "Investor Grade" (QSL-3, 85+) needs a benchmark matched to this business.
    // Live 2026-10-25: two runs on the consulting placeholder showed
    // "Investor Grade · 90%" beside "Estimated · No direct benchmark".
    const v2Quality = v2BenchmarkSummary?.overall_match_quality;
    if (!v2Quality || v2Quality === 'none' || v2Quality === 'sector_fallback') {
      result.confidence_score = Math.min(result.confidence_score, NO_PEER_BENCHMARK_CONFIDENCE_CAP);
    }

    log.info('Analysis calculation completed', {
      industry: calc.industryDetected,
      correctionCount: calc.corrections.length,
      reliabilityScore,
    });

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
      primaryDataSource: documentExtractedFinancials[0]?.source_document || 'N/A',
      notes: documentInputNotes,
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
      const churnRate = hasFiniteNumber(mergedFinancialInputs?.churn_rate) ? mergedFinancialInputs.churn_rate / 100 : (1 / detectedIndustry.client_lifetime_months);
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
        churnRate: hasFiniteNumber(mergedFinancialInputs?.churn_rate) ? mergedFinancialInputs.churn_rate / 100 : (1 / detectedIndustry.client_lifetime_months),
        mrr: calc.mrr,
        clientsActive: calc.clientsActive,
      }, detectedIndustry.id);
      if (sanityFlags.length > 0) {
        log.info(`Anti-BS: ${sanityFlags.length} flags (${sanityFlags.filter(f => f.severity === 'critical').length} critical)`);
      }
    } catch (abErr) {
      log.error('Anti-BS check failed:', abErr);
    }

    // ========== RECONCILIATION CHECK ==========
    let reconciliationResult: ReconciliationResult | null = null;
    try {
      // Same CAC payback as unit_economics.cac_payback_months: QMath with the
      // benchmark margin and orders per month -- null when unprofitable or
      // contribution is non-positive, per the metadata block's coherence note.
      const gmFracForPayback = calc.grossMarginPercent / 100;
      const nmFracForPayback = calc.netMarginPercent / 100;
      const contribPerOrderForPayback = calc.averageCheck * gmFracForPayback;
      const cacPaybackForReconciliation =
        nmFracForPayback < 0 || contribPerOrderForPayback <= 0
          ? null
          : QMath.roundTo(QMath.cacPaybackMonths(calc.cac, calc.averageCheck, (100 - detectedIndustry.cogs_percent) / 100, detectedIndustry.orders_per_client), 1);

      reconciliationResult = runReconciliationCheck({
        mrr: calc.mrr,
        grossProfit: calc.grossProfit,
        netProfit: calc.netProfit,
        totalExpenses: calc.totalExpenses,
        grossMarginPercent: calc.grossMarginPercent,
        clientsActive: calc.clientsActive,
        ltv: calc.ltv,
        cacPaybackMonths: cacPaybackForReconciliation,
        ltvCacRatio: calc.ltvCacRatio,
        expenses: calc.expenses,
        expenseSource: calc.expenseSource,
        scenarioCoherent: !((result as Record<string, unknown>).report_integrity_issues as unknown[] | undefined)?.length,
      });
      if (!reconciliationResult.all_passed) {
        log.info(`Reconciliation: ${reconciliationResult.failed_count} check(s) failed of ${reconciliationResult.checks.length}`);
      }

      // Escalate to the same report_integrity gate the scenario-coherence
      // check (P0-6/P0-7) already uses, rather than inventing a second,
      // parallel blocking mechanism. Only R-001..R-005 (sum integrity +
      // sign consistency) escalate -- a failure there means a real formula
      // regression (e.g. gross profit no longer equals revenue minus COGS).
      // R-006..R-011 (benchmark boundaries, active-clients sign, scenario
      // coherence) stay informational-only: a business legitimately sitting
      // outside a typical LTV/CAC range is unusual, not wrong, and forcing
      // it into the same hard-flag bucket would just teach users to ignore
      // the flag. Decided 2026-08-02 per the P0-25 reconciliation-engine
      // review.
      const CRITICAL_RECONCILIATION_RULES = new Set(['R-001', 'R-002', 'R-003', 'R-004', 'R-005']);
      const criticalFailures = reconciliationResult.checks.filter(
        (c) => !c.pass && !c.skipped && CRITICAL_RECONCILIATION_RULES.has(c.rule),
      );
      if (criticalFailures.length > 0) {
        (result as Record<string, unknown>).report_integrity = 'BLOCK';
        const existingIssues = ((result as Record<string, unknown>).report_integrity_issues as Array<{ code: string; message: string }> | undefined) ?? [];
        (result as Record<string, unknown>).report_integrity_issues = [
          ...existingIssues,
          ...criticalFailures.map((c) => ({ code: `RECONCILIATION_${c.rule}`, message: c.note ?? c.label })),
        ];
        log.info(`Reconciliation: ${criticalFailures.length} critical check(s) escalated report_integrity to BLOCK (${criticalFailures.map((c) => c.rule).join(', ')})`);
      }

      // GTM-audit item #1 (2026-08-25): checkFinancialInvariants()
      // (payback-contract.ts) runs per-scenario inside
      // shapeFinancialAnalysis() and, on a violation, appends
      // GROSS_PROFIT_EXCEEDS_REVENUE / OPERATING_PROFIT_EXCEEDS_GROSS_PROFIT
      // into the same report_integrity_issues array scenario monotonicity
      // uses. Unlike monotonicity (informational-only, per the comment
      // above -- a real business CAN legitimately see profit move opposite
      // revenue), these two are unconditional mathematical impossibilities
      // with no legitimate exception, so they escalate to BLOCK exactly
      // like R-001..R-005 -- this is the runtime gate that makes the
      // CashMatch AI incident's contradiction (operating profit exceeding
      // gross profit in all three scenarios) structurally impossible to
      // ship again, rather than merely fixed for the one reported case.
      const FINANCIAL_INVARIANT_CODES = new Set([
        'GROSS_PROFIT_EXCEEDS_REVENUE',
        'OPERATING_PROFIT_EXCEEDS_GROSS_PROFIT',
      ]);
      const invariantFailures = (
        ((result as Record<string, unknown>).report_integrity_issues as Array<{ code: string; message: string }> | undefined) ?? []
      ).filter((issue) => FINANCIAL_INVARIANT_CODES.has(issue.code));
      if (invariantFailures.length > 0) {
        (result as Record<string, unknown>).report_integrity = 'BLOCK';
        log.error(`Financial invariant violation: ${invariantFailures.length} scenario(s) escalated report_integrity to BLOCK (${invariantFailures.map((f) => f.code).join(', ')})`);
      }
    } catch (rcErr) {
      log.error('Reconciliation check failed:', rcErr);
    }

    // Accuracy session 2026-08-04 (Confidence semantics, Priority 1,
    // round-2 review): the blended reliabilityScore computed above is what
    // the report cover used to show labeled only "Confidence Score" -- a
    // 40/30/20/10 blend that is not a measure of forecast accuracy and is
    // not even purely input coverage. qualityDimensions decomposes it into
    // separately-labeled, honestly derived dimensions using signals
    // already computed above, read here AFTER the critical-reconciliation
    // BLOCK escalation so formula/scenario_reconciliation reflect the
    // final reconciliationResult state, not a stale pre-escalation
    // snapshot. See _shared/quality-dimensions.ts for the full rationale,
    // including the round-2 fix deriving formula_reconciliation from
    // R-001..R-005 and scenario_reconciliation from R-011 specifically
    // (rather than the broader report_integrity field).
    const assumptionOriginClasses = (
      result as { _scenarioBaseInput?: { assumptionOrigins?: Record<string, { origin: string }> } }
    )._scenarioBaseInput?.assumptionOrigins
      ? Object.values(
          (result as { _scenarioBaseInput: { assumptionOrigins: Record<string, { origin: string }> } })
            ._scenarioBaseInput.assumptionOrigins,
        ).map((a) => a.origin as import('../_shared/quality-dimensions.ts').AssumptionOriginClass)
      : undefined;
    const qualityDimensions = buildQualityDimensions({
      inputCompleteness: confidenceBreakdown.input_completeness,
      industryRelevance: confidenceBreakdown.industry_relevance,
      benchmarkSource,
      reportIntegrity: (result as Record<string, unknown>).report_integrity as 'PASS' | 'BLOCK' | undefined,
      reportIntegrityIssues: (result as Record<string, unknown>).report_integrity_issues as
        | Array<{ code: string; message: string }>
        | undefined,
      reconciliationChecks: reconciliationResult ? reconciliationResult.checks : null,
      assumptionOriginClasses,
      narrativeWasModified,
    });

    // ========== ASSUMPTION GRAPH ==========
    let assumptionGraph: AssumptionGraphResult | undefined;
    try {
      const churnRate = hasFiniteNumber(mergedFinancialInputs?.churn_rate) ? mergedFinancialInputs.churn_rate / 100 : (1 / detectedIndustry.client_lifetime_months);
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
        benchmarkConfidence || 75,
        (result as { _scenarioBaseInput?: { assumptionOrigins?: AssumptionOriginMap } })._scenarioBaseInput?.assumptionOrigins,
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
        hasFinancialInputs: [financial_inputs?.startup_investment, financial_inputs?.monthly_revenue, financial_inputs?.average_price].some(hasFiniteNumber),
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
      // AI-run correlation fix: the same id already passed as `analysisId`
      // to every aiCall() in this run (see declaration near the top of the
      // handler). The caller should persist this on the `analyses` row it
      // saves, so ai_calls.analysis_id can finally be joined back to a real
      // analysis instead of being NULL for every row.
      analysis_run_id: analysisRunId,
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
        // Accuracy session 2026-08-04 (Confidence semantics, Priority 1):
        // computed from result.report_integrity/_issues, benchmarkSource,
        // and confidenceBreakdown -- all deterministic-path signals, so this
        // is populated identically regardless of whether the Quantis 2.0
        // enhanced validation path succeeded (see the fallback branch below).
        quality_dimensions: qualityDimensions,
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
        quality_dimensions: qualityDimensions,
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
      // Truth audit 2026-10-23: this list used to name sources the engine never
      // ingests (BLS, SBA, "GAAP" formulas, and "IBISWorld Industry Reports
      // (2024)" whenever built-in defaults were used) and called modeled
      // data points "Verified sample: N companies". Only name what is real;
      // canonical-facts.ts is the single source of truth.
      data_sources: [
        benchmarkSource === 'database'
          ? `Quantis modeled benchmark grid (informed by ${BENCHMARK_SOURCES_DISPLAY})`
          : 'Quantis built-in industry defaults (modeled; no third-party report)',
        'Quantis deterministic financial formulas (see methodology)',
        `${calc.industryDetected} sector benchmark values (modeled)`,
        locationMultiplier !== 1.0 ? `Quantis location cost multiplier for ${location_clean} (modeled)` : 'No location adjustment applied',
        benchmarkMatchedRegion ? `Regional benchmark data: ${benchmarkMatchedRegion}` : null,
        benchmarkSampleSize ? `Benchmark cell size: ${benchmarkSampleSize} modeled data points` : null,
        ...(documentExtractedFinancials.length > 0 ? documentExtractedFinancials.map(ef => `Uploaded Document: ${ef.source_document}`) : [])
      ].filter(Boolean),
      limitations: [
        detectedIndustry.id === 'general' && benchmarkSource === 'hardcoded' 
          ? 'General industry benchmarks applied. Selecting your specific industry will improve accuracy.' 
          : null,
        ideaLength < 30 ? 'Brief business description — add more detail for improved accuracy' : null,
        locationMultiplier === 1.0 ? 'National average costs applied — specify a major city for location-adjusted estimates' : null,
        'Actual results depend on execution, market timing, and competitive dynamics',
        // P0-01/02: corrections are flags now, not silent overwrites (financial-calculator.ts) --
        // wording must not claim values were changed when they weren't.
        calc.corrections.length > 0 ? `${calc.corrections.length} input value(s) fall outside typical industry ranges — flagged for your review, not altered` : null,
      ].filter(Boolean),
      reconciliation_status: reconciliationResult ?? undefined,

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
                ? QMath.roundTo(QMath.cacPaybackMonths(calc.cac, calc.averageCheck, (100 - detectedIndustry.cogs_percent) / 100, detectedIndustry.orders_per_client), 1)
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
        // Why the AI summary was replaced (null when it was kept). Diagnostic only.
        narrative_integrity: { replaced: narrativeWasModified, reason: narrativeIntegrityReason },
        // Sentences removed from the other prose fields (Q6). Diagnostic only.
        narrative_fields_scrubbed: narrativeFieldsScrubbed,
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
        benchmark_v2_datapoints: BENCHMARK_COUNT,
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

    // ========== HYBRID VALIDATOR ==========
    // A complimentary Decision Run must prove the real product, including the
    // same deterministic checks and warning review used by a paid Full run.
    let validatorResult: ValidatorResult | null = null;
    const shouldRunHybridValidator = true;
    if (shouldRunHybridValidator) {
      try {
        validatorResult = await validateAnalysis({
          idea: idea_clean,
          location: location_clean,
          industry_detected: calc.industryDetected || 'unknown',
          // "score" dead-accessor audit (2026-08-17, same session as the
          // top_risks fix above): result.score was NEVER set at the top
          // level for any tier -- not a regression from the free-tier score
          // deprecation, this accessor was always reading nothing. Left
          // explicitly null rather than fixed to point somewhere: the old
          // "score" concept itself was retired (docs/accuracy -- no single
          // defensible semantic survived reconstruction), so there is no
          // correct value to wire in here. R5 (verdict/score coherence) in
          // hybrid-validator.ts is now permanently dormant by design, not by
          // accident -- do not resurrect it with a substitute numeric signal.
          score: null,
          verdict: (result as any)?.verdict ?? null,
          ltv: quantisOutput?.metrics?.ltv ?? null,
          cac: quantisOutput?.metrics?.cac ?? null,
          ltv_cac_ratio: quantisOutput?.metrics?.ltvCacRatio ?? null,
          // gross_margin/net_margin/monthly_profit/payback_months dead-accessor
          // fix (2026-08-17): same class of bug as top_risks and score above.
          // (result as any)?.gross_margin/.net_margin/.monthly_profit/
          // .payback_months were never set at the top level of transformResponse()'s
          // return object -- the real values live on `calc`, the same canonical
          // financial state already used for deriveInvestmentVerdict() above in
          // this file. The (quantisOutput?.metrics as any)?.grossMargin/.netMargin
          // fallbacks were ALSO wrong -- quantis-engine.ts's real property names are
          // grossMarginPercent/netMarginPercent (confirmed in quantis-engine.ts),
          // not the bare grossMargin/netMargin this code was reading -- so both the
          // primary and fallback accessors resolved to undefined. This means every
          // deterministic check in hybrid-validator.ts gated on these four fields
          // (gross_margin_ceiling_violated, gross_margin_industry_mismatch,
          // net_margin > gross_margin, payback > 60 months) has been silently
          // skipped for every paid-tier analysis, and the LLM second-pass review
          // prompt has been getting literal "null" for all four in its input
          // summary. Fixed to read calc directly.
          gross_margin: calc.grossMarginPercent,
          net_margin: calc.netMarginPercent,
          monthly_revenue: quantisOutput?.metrics?.mrr ?? null,
          monthly_profit: calc.netProfit,
          // Uses the typed payback contract (payback-contract.ts), never the
          // raw paybackMonths/999 sentinel -- same discipline as this
          // session's payback-999-display-leak fix and deriveInvestmentVerdict().
          // A business whose payback was never reached has no real numeric
          // months value; feeding 999 here would make hybrid-validator.ts's
          // "payback > 60 months" check report a fabricated exact figure
          // ("Payback of 999 months exceeds 5 years") instead of the true
          // semantic (payback not meaningfully computed).
          payback_months: calc.paybackResult?.status === 'VALUE' ? Number(calc.paybackResult.months) : null,
          // Same dead-accessor bug as wirePayload's top_risks (see the
          // FREE-tier fix above this block) -- result.risks/top_risks are
          // never set at the top level; the real array is
          // result.business_plan.risks. Fixed here too so the paid-tier
          // validator's cross-check isn't silently checking against an
          // always-empty risks list.
          top_risks: (Array.isArray((result as any)?.business_plan?.risks)
            ? (result as any).business_plan.risks
                .map((r: unknown) => (r && typeof r === 'object' && 'risk' in r ? String((r as { risk: unknown }).risk) : null))
                .filter((s: string | null): s is string => !!s)
            : []
          ).slice(0, 3),
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

    // ========== DECISION RUN ACCESS ENVELOPE ==========
    // Quota is the acquisition boundary. Complimentary users receive the
    // complete Full result; metadata lets the client keep that specific
    // report unlocked even after the fifth monthly run has been consumed.
    if (userPlan === 'free') {
      (fullPayload as any).metadata.access = {
        decision_bundle: 'complimentary',
        includes: ['full_analysis', 'pre_mortem', 'scenario_model'],
        monthly_limit: FREE_TIER_LIMIT,
        remaining_after_run: freeUsageBeforeRun === null
          ? null
          : Math.max(0, FREE_TIER_LIMIT - freeUsageBeforeRun - 1),
      };
      (fullPayload as any)._tier = 'free';
      (fullPayload as any)._watermark = 'Generated with a complimentary AIWMC Quantis Decision Run.';
    }

    // Retained only as an explicit rollback path while the acquisition launch
    // is measured. It must stay false for the shipped Decision Run product.
    const shouldReturnLegacySlimPayload = false;
    const wirePayload = shouldReturnLegacySlimPayload ? (() => {
      // "Top Risks" MISLABEL (P1, found during the score:90 Gate-2 field
      // audit, closed 2026-08-17): this used to try (result as any)?.risks,
      // then (result as any)?.top_risks -- but transformResponse()'s return
      // object never sets either key at the top level; the real risk array
      // lives at result.business_plan.risks (built ~index.ts:1828, an
      // AI-narrated or sensible-default array of {risk, probability, impact,
      // mitigation} objects, identically for every response path since
      // that's inside transformResponse() itself). Both dead accessors always
      // fell through to quantisOutput.validation.improvementSuggestions --
      // generic data-completeness nagging ("Add revenue estimate or customer
      // count for accurate analysis") -- which is why every live free-tier
      // response showed the same one-line suggestion under a "Top Risks"
      // heading instead of an actual risk assessment. Fixed to read the real
      // risk array first; the suggestions list remains the fallback only for
      // the rare case business_plan.risks is genuinely empty.
      const realRisks = Array.isArray((result as any)?.business_plan?.risks)
        ? (result as any).business_plan.risks
            .map((r: unknown) => (r && typeof r === 'object' && 'risk' in r ? String((r as { risk: unknown }).risk) : null))
            .filter((s: string | null): s is string => !!s)
        : [];
      const allRisks = realRisks.length > 0
        ? realRisks
        : (quantisOutput?.validation?.improvementSuggestions || []);
      const top3 = Array.isArray(allRisks) ? allRisks.slice(0, 3) : [];
      const verdict = (result as any)?.verdict ?? null;
      const baseRevenue = quantisOutput?.metrics?.mrr ?? null;

      return {
        // "score:90" TRUST DEFECT (P1, closed 2026-08-17, linked to PR #27's
        // confidence-semantics work): this used to read
        // quantisOutput.validation.reliabilityScore, a 0-100 blend of
        // dataQualityScore and businessViabilityScore (bulletproof-validator.ts
        // ~588-608). Reconstructed live: for a bare idea+location request with
        // zero real financial input, dataConsistency/expenseReconciliation/
        // profitabilityScore/unitEconomicsScore/riskProfileScore all default to
        // their PLACEHOLDER 100 ("nothing to check" mistaken for "verified
        // healthy") because nothing was supplied to check -- only
        // schemaCompleteness genuinely drops for real missingness. Two live
        // production requests with zero user-supplied financials both
        // returned "score":90 next to a top_risks entry telling the user to
        // add revenue data -- a visible, self-contradicting number. No
        // defensible single meaning survives that reconstruction (it isn't
        // input completeness, isn't forecast accuracy, isn't validated
        // viability), so it is deprecated rather than relabeled under the
        // same ambiguous name.
        //
        // ROUND 2 (same day): the first replacement, qualityDimensions.
        // input_completeness (PR #27's architecture), turned out to have the
        // identical disease it was meant to cure. index.ts's own
        // confidenceBreakdown.input_completeness (~line 3367-3374, "Also
        // count AI-estimated fields that look non-default") credits
        // completeness whenever the AI's generated numbers merely differ
        // from a handful of arbitrary literal sentinels (mrr!==50000,
        // startup_investment!==100000, cac!==industry_typical, ltv!==500) --
        // true for nearly every AI response regardless of real user input.
        // Live proof: the same zero-financial-input request that used to
        // show "score":90 came back "input_completeness":100 with this
        // module's first fix deployed -- worse, not better. Replaced again
        // with computeInputCompletenessPct(), which counts ONLY the fields
        // mergedFinancialInputs actually contains -- the exact same
        // PROVENANCE_FIELDS list already driving verdict_basis below, zero
        // AI/benchmark credit. Not a second confidence framework: it's the
        // one this module already built for the verdict fix, reused.
        score: null,
        score_status: 'DEPRECATED' as const,
        input_completeness: computeInputCompletenessPct(mergedFinancialInputs),
        verdict,
        top_risks: top3,
        base_revenue: baseRevenue,
        currency: (result as any)?.currency ?? 'USD',
        industry_detected: calc.industryDetected,
        location: location_clean,
        idea: idea_clean,
        _tier: 'free',
        _watermark: 'Generated with a complimentary AIWMC Quantis Decision Run.',
        _upgrade_cta: {
          message: 'Continue with unlimited Decision Runs',
          features_locked: [
            'Invoice & capacity check',
            'Full Document Studio workflow',
            'Unlimited clean PDF exports',
            'Additional saved scenario sets',
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

    if (shouldReturnLegacySlimPayload) {
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

    return new Response(
      JSON.stringify({ success: true, data: wirePayload }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorType = error instanceof Error ? error.name : 'UnknownError';
    log.error('[outermost-catch] Unhandled analysis failure', { errorType });

    // ── WS3: ZERO-FAIL outermost catch ──
    // If GOLDEN exists, the deterministic engine already produced a valid result.
    // Return it with degradation flags — never a bare 500.
    if (GOLDEN) {
      log.info('[outermost-catch] Returning GOLDEN checkpoint (degraded)');
      const goldenPayload = {
        ...GOLDEN,
        _degraded: true,
        _degraded_reason: GOLDEN_reason || 'outermost_catch',
        _error_context: 'analysis_degraded',
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
        _error_context: 'analysis_degraded',
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
