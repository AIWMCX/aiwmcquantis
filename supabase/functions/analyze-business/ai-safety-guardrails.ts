/**
 * AI SAFETY GUARDRAILS - AIWMC Quantis™
 * 
 * Multi-layer defense system for AI-generated content:
 * 1. Input filtering (pre-processing)
 * 2. Model instruction hardening
 * 3. Output validation (post-processing)
 * 4. Cost controls and rate limiting
 * 
 * CRITICAL: This module prevents prompt injection, data exfiltration,
 * and ensures output integrity (no invented numbers).
 */

import { sanitizeUserInput, classifyInput, validateNarratorNumbers } from './schemas.ts';
import type { ComputedMetrics, NarratorOutput, ValidationIssue } from './schemas.ts';

// ========== COST CONTROL CONSTANTS ==========

export const AI_COST_LIMITS = {
  // Per-request limits
  MAX_INPUT_TOKENS: 4000,
  MAX_OUTPUT_TOKENS: 8000,
  MAX_TOTAL_TOKENS: 12000,
  
  // Per-user limits (per hour)
  ANON_REQUESTS_PER_HOUR: 1,
  FREE_REQUESTS_PER_HOUR: 3,
  PLUS_REQUESTS_PER_HOUR: 30,
  PRO_REQUESTS_PER_HOUR: 100,
  
  // Per-IP limits (anti-abuse)
  MAX_REQUESTS_PER_IP_PER_MINUTE: 5,
  MAX_REQUESTS_PER_IP_PER_HOUR: 20,
  
  // Per-session limits
  MAX_RETRIES_PER_SESSION: 3,
  RETRY_BACKOFF_MS: [1000, 2000, 5000],
  
  // Kill switch thresholds
  KILL_SWITCH_ERROR_RATE: 0.5, // 50% error rate triggers kill switch
  KILL_SWITCH_WINDOW_MINUTES: 5,
  
  // Budget caps (daily)
  DAILY_BUDGET_USD: 100,
  ALERT_THRESHOLD_USD: 50,
} as const;

// ========== INPUT VALIDATION LAYER ==========

export interface InputValidationResult {
  isValid: boolean;
  sanitizedIdea: string;
  sanitizedLocation: string;
  threats: string[];
  warnings: string[];
  classification: 'data' | 'instruction' | 'mixed';
  riskScore: number; // 0-100, higher = more risky
  blocked: boolean;
  blockReason?: string;
}

/**
 * Validates and sanitizes all user inputs before AI processing.
 * This is the FIRST LINE of defense against prompt injection.
 */
export function validateAndSanitizeInput(
  idea: string,
  location: string,
  maxIdeaLength: number = 2000,
  maxLocationLength: number = 200
): InputValidationResult {
  const threats: string[] = [];
  const warnings: string[] = [];
  let riskScore = 0;
  
  // 1. Length validation
  if (idea.length > maxIdeaLength) {
    warnings.push(`Idea truncated from ${idea.length} to ${maxIdeaLength} characters`);
    idea = idea.substring(0, maxIdeaLength);
    riskScore += 10;
  }
  
  if (location.length > maxLocationLength) {
    warnings.push(`Location truncated from ${location.length} to ${maxLocationLength} characters`);
    location = location.substring(0, maxLocationLength);
    riskScore += 5;
  }
  
  // 2. Sanitize inputs
  const ideaResult = sanitizeUserInput(idea);
  const locationResult = sanitizeUserInput(location);
  
  threats.push(...ideaResult.threats);
  threats.push(...locationResult.threats);
  
  if (ideaResult.wasModified) {
    riskScore += 20;
  }
  if (locationResult.wasModified) {
    riskScore += 10;
  }
  
  // 3. Classify input intent
  const classification = classifyInput(ideaResult.sanitized);
  
  if (classification === 'instruction') {
    threats.push('Input classified as instruction attempt');
    riskScore += 40;
  } else if (classification === 'mixed') {
    warnings.push('Input contains instruction-like patterns');
    riskScore += 15;
  }
  
  // 4. Check for specific dangerous patterns
  const dangerousKeywords = [
    'system prompt',
    'ignore instructions',
    'override',
    'jailbreak',
    'dan mode',
    'developer mode',
    'api key',
    'secret',
    'password',
    'credential',
  ];
  
  const ideaLower = ideaResult.sanitized.toLowerCase();
  for (const keyword of dangerousKeywords) {
    if (ideaLower.includes(keyword)) {
      threats.push(`Dangerous keyword detected: "${keyword}"`);
      riskScore += 30;
    }
  }
  
  // 5. Check for token bomb indicators
  const tokenBombPatterns = [
    /repeat\s+.*\s+(\d{3,})\s+times/i,
    /(\d{4,})\s+words?/i,
    /infinite|endless|forever/i,
    /maximum.*detail/i,
  ];
  
  for (const pattern of tokenBombPatterns) {
    if (pattern.test(ideaResult.sanitized)) {
      threats.push('Token bomb pattern detected');
      riskScore += 25;
    }
  }
  
  // 6. Determine if request should be blocked
  const blocked = riskScore >= 70 || threats.length >= 3;
  const blockReason = blocked 
    ? `Request blocked: Risk score ${riskScore}/100, ${threats.length} threats detected` 
    : undefined;
  
  return {
    isValid: !blocked && ideaResult.sanitized.length >= 3 && locationResult.sanitized.length >= 2,
    sanitizedIdea: ideaResult.sanitized,
    sanitizedLocation: locationResult.sanitized,
    threats,
    warnings,
    classification,
    riskScore,
    blocked,
    blockReason,
  };
}

// ========== OUTPUT VALIDATION LAYER ==========

export interface OutputValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  inventedNumbers: string[];
  containsSecrets: boolean;
  containsInjectedContent: boolean;
  sanitizedOutput: NarratorOutput | null;
  trustScore: number; // 0-100, higher = more trustworthy
}

/**
 * Validates AI-generated output for:
 * 1. Invented numbers (not from computed metrics)
 * 2. Potential secret leakage
 * 3. Injected malicious content
 */
export function validateAIOutput(
  narratorOutput: NarratorOutput | null,
  computedMetrics: ComputedMetrics
): OutputValidationResult {
  if (!narratorOutput) {
    return {
      isValid: false,
      issues: [],
      inventedNumbers: [],
      containsSecrets: false,
      containsInjectedContent: false,
      sanitizedOutput: null,
      trustScore: 0,
    };
  }
  
  const issues: ValidationIssue[] = [];
  const inventedNumbers: string[] = [];
  let trustScore = 100;
  
  // 1. Validate numbers against computed metrics
  const numberIssues = validateNarratorNumbers(narratorOutput, computedMetrics);
  issues.push(...numberIssues);
  
  for (const issue of numberIssues) {
    if (issue.code === 'INVENTED_NUMBER') {
      const match = issue.message.match(/\$[\d,]+/);
      if (match) {
        inventedNumbers.push(match[0]);
      }
      trustScore -= 15;
    }
  }
  
  // 2. Check for secret leakage patterns
  const secretPatterns = [
    /api[_-]?key/i,
    /secret[_-]?key/i,
    /password/i,
    /bearer\s+[a-zA-Z0-9\-_.]+/i,
    /eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/, // JWT pattern
    /sk_[a-zA-Z0-9]+/, // Stripe secret key pattern
    /SUPABASE_[A-Z_]+/i,
  ];
  
  const allText = JSON.stringify(narratorOutput);
  let containsSecrets = false;
  
  for (const pattern of secretPatterns) {
    if (pattern.test(allText)) {
      containsSecrets = true;
      issues.push({
        code: 'POTENTIAL_SECRET_LEAK',
        field: 'output',
        message: 'Output may contain sensitive information',
        severity: 'error',
      });
      trustScore -= 50;
      break;
    }
  }
  
  // 3. Check for injected content
  const injectionPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /\[SYSTEM\]/i,
    /\[ADMIN\]/i,
    /IGNORE PREVIOUS/i,
  ];
  
  let containsInjectedContent = false;
  
  for (const pattern of injectionPatterns) {
    if (pattern.test(allText)) {
      containsInjectedContent = true;
      issues.push({
        code: 'INJECTED_CONTENT',
        field: 'output',
        message: 'Output contains potentially injected content',
        severity: 'error',
      });
      trustScore -= 40;
      break;
    }
  }
  
  // 4. Validate structure completeness
  if (!narratorOutput.executive_summary || narratorOutput.executive_summary.length < 50) {
    issues.push({
      code: 'INCOMPLETE_SUMMARY',
      field: 'executive_summary',
      message: 'Executive summary is missing or too short',
      severity: 'warning',
    });
    trustScore -= 10;
  }
  
  if (!narratorOutput.key_takeaways || narratorOutput.key_takeaways.length < 2) {
    issues.push({
      code: 'FEW_TAKEAWAYS',
      field: 'key_takeaways',
      message: 'Insufficient key takeaways provided',
      severity: 'warning',
    });
    trustScore -= 5;
  }
  
  // 5. Sanitize output if issues found
  let sanitizedOutput = narratorOutput;
  
  if (containsSecrets || containsInjectedContent) {
    sanitizedOutput = sanitizeNarratorOutput(narratorOutput);
    trustScore = Math.max(0, trustScore - 20);
  }
  
  return {
    isValid: trustScore >= 40 && !containsSecrets,
    issues,
    inventedNumbers,
    containsSecrets,
    containsInjectedContent,
    sanitizedOutput,
    trustScore: Math.max(0, Math.min(100, trustScore)),
  };
}

/**
 * Sanitizes narrator output by removing potentially dangerous content
 */
function sanitizeNarratorOutput(output: NarratorOutput): NarratorOutput {
  const sanitizeText = (text: string): string => {
    return text
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/\[SYSTEM\][\s\S]*?\[\/SYSTEM\]/gi, '')
      .replace(/\[ADMIN\][\s\S]*?\[\/ADMIN\]/gi, '')
      .replace(/IGNORE PREVIOUS INSTRUCTIONS[\s\S]*?(?=\.|$)/gi, '')
      // Remove potential secrets
      .replace(/sk_[a-zA-Z0-9]+/g, '[REDACTED]')
      .replace(/eyJ[a-zA-Z0-9\-_.]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/g, '[REDACTED]')
      .trim();
  };
  
  return {
    ...output,
    executive_summary: sanitizeText(output.executive_summary),
    key_takeaways: output.key_takeaways.map(sanitizeText),
    business_plan: {
      ...output.business_plan,
      product_description: sanitizeText(output.business_plan.product_description),
      target_audience: sanitizeText(output.business_plan.target_audience),
      competitive_advantages: sanitizeText(output.business_plan.competitive_advantages),
      operations: sanitizeText(output.business_plan.operations),
    },
    marketing_plan: {
      ...output.marketing_plan,
      positioning: sanitizeText(output.marketing_plan.positioning),
      pricing_strategy: sanitizeText(output.marketing_plan.pricing_strategy),
      first_3_months_plan: sanitizeText(output.marketing_plan.first_3_months_plan),
    },
    market_analysis: {
      ...output.market_analysis,
      tam: sanitizeText(output.market_analysis.tam),
      sam: sanitizeText(output.market_analysis.sam),
      som: sanitizeText(output.market_analysis.som),
      competitive_landscape: sanitizeText(output.market_analysis.competitive_landscape),
      market_gaps: sanitizeText(output.market_analysis.market_gaps),
      barriers_to_entry: sanitizeText(output.market_analysis.barriers_to_entry),
      growth_opportunities: sanitizeText(output.market_analysis.growth_opportunities),
    },
  };
}

// ========== TRUTH LABELING ==========

export interface TruthLabel {
  field: string;
  value: string | number;
  source: 'computed' | 'benchmark' | 'ai_estimate' | 'user_provided' | 'document';
  confidence: number; // 0-100
  explanation: string;
}

/**
 * Labels each data point with its source for transparency.
 * This allows users to understand which values are computed vs estimated.
 */
export function generateTruthLabels(
  computedMetrics: ComputedMetrics,
  userProvidedInputs: Record<string, number | undefined>,
  documentExtractedData: Record<string, number | undefined>,
  benchmarkData: Record<string, number>
): TruthLabel[] {
  const labels: TruthLabel[] = [];
  
  // Revenue metrics
  if (userProvidedInputs.monthly_revenue) {
    labels.push({
      field: 'Monthly Revenue (MRR)',
      value: computedMetrics.mrr,
      source: 'user_provided',
      confidence: 95,
      explanation: 'Revenue figure provided directly by user',
    });
  } else if (documentExtractedData.monthly_revenue) {
    labels.push({
      field: 'Monthly Revenue (MRR)',
      value: computedMetrics.mrr,
      source: 'document',
      confidence: 85,
      explanation: 'Extracted from uploaded business documents',
    });
  } else {
    labels.push({
      field: 'Monthly Revenue (MRR)',
      value: computedMetrics.mrr,
      source: 'computed',
      confidence: 60,
      explanation: 'Calculated from customer count × average transaction × frequency',
    });
  }
  
  // Investment
  if (userProvidedInputs.startup_investment) {
    labels.push({
      field: 'Initial Investment',
      value: computedMetrics.startupInvestment,
      source: 'user_provided',
      confidence: 95,
      explanation: 'Investment amount provided by user',
    });
  } else {
    labels.push({
      field: 'Initial Investment',
      value: computedMetrics.startupInvestment,
      source: 'benchmark',
      confidence: 50,
      explanation: `Estimated using ${computedMetrics.industryDetected} industry benchmarks`,
    });
  }
  
  // CAC
  if (userProvidedInputs.cac) {
    labels.push({
      field: 'Customer Acquisition Cost (CAC)',
      value: computedMetrics.cac,
      source: 'user_provided',
      confidence: 90,
      explanation: 'CAC provided by user based on actual spending',
    });
  } else {
    labels.push({
      field: 'Customer Acquisition Cost (CAC)',
      value: computedMetrics.cac,
      source: 'benchmark',
      confidence: 55,
      explanation: `Based on ${computedMetrics.industryDetected} industry typical CAC: $${benchmarkData.cac_min}-$${benchmarkData.cac_max}`,
    });
  }
  
  // LTV - always computed
  labels.push({
    field: 'Customer Lifetime Value (LTV)',
    value: computedMetrics.ltv,
    source: 'computed',
    confidence: 70,
    explanation: `LTV = Avg Check × Orders/Month × Customer Lifetime (${benchmarkData.client_lifetime_months} months)`,
  });
  
  // Net Profit - always computed
  labels.push({
    field: 'Net Profit',
    value: computedMetrics.netProfit,
    source: 'computed',
    confidence: 75,
    explanation: 'Net Profit = MRR - Total Expenses (deterministic calculation)',
  });
  
  // Payback Period - always computed
  labels.push({
    field: 'Payback Period',
    value: computedMetrics.paybackMonths === 999 ? 'N/A' : `${computedMetrics.paybackMonths} months`,
    source: 'computed',
    confidence: computedMetrics.isProfitable ? 80 : 40,
    explanation: computedMetrics.isProfitable 
      ? 'Payback = Initial Investment ÷ Monthly Net Profit'
      : 'Cannot calculate payback for unprofitable business',
  });
  
  // ROI - always computed
  labels.push({
    field: 'Year 1 ROI',
    value: `${computedMetrics.roiYear1Percent}%`,
    source: 'computed',
    confidence: computedMetrics.isProfitable ? 80 : 40,
    explanation: 'ROI = (Net Profit × 12) ÷ Initial Investment × 100%',
  });
  
  return labels;
}

// ========== RATE LIMITING HELPERS ==========

export interface RateLimitCheck {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  reason?: string;
}

/**
 * Checks if a request should be rate limited.
 * This is a helper function - actual enforcement is in the database.
 */
export function checkRateLimit(
  requestCount: number,
  limit: number,
  windowStart: Date,
  windowMinutes: number = 60
): RateLimitCheck {
  const now = new Date();
  const windowEnd = new Date(windowStart.getTime() + windowMinutes * 60 * 1000);
  
  if (now > windowEnd) {
    // Window has expired, allow request
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(now.getTime() + windowMinutes * 60 * 1000),
    };
  }
  
  const remaining = limit - requestCount;
  
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining - 1),
    resetAt: windowEnd,
    reason: remaining <= 0 ? `Rate limit exceeded. Try again after ${windowEnd.toISOString()}` : undefined,
  };
}

// ========== KILL SWITCH ==========

export interface KillSwitchStatus {
  active: boolean;
  reason?: string;
  activatedAt?: Date;
  estimatedRecovery?: Date;
}

/**
 * Checks if the AI kill switch should be activated based on error rates.
 */
export function checkKillSwitch(
  errorCount: number,
  totalRequests: number,
  windowMinutes: number = AI_COST_LIMITS.KILL_SWITCH_WINDOW_MINUTES
): KillSwitchStatus {
  if (totalRequests < 10) {
    // Not enough data to make a decision
    return { active: false };
  }
  
  const errorRate = errorCount / totalRequests;
  
  if (errorRate >= AI_COST_LIMITS.KILL_SWITCH_ERROR_RATE) {
    const now = new Date();
    return {
      active: true,
      reason: `Error rate ${(errorRate * 100).toFixed(1)}% exceeds ${AI_COST_LIMITS.KILL_SWITCH_ERROR_RATE * 100}% threshold`,
      activatedAt: now,
      estimatedRecovery: new Date(now.getTime() + 15 * 60 * 1000), // 15 minutes
    };
  }
  
  return { active: false };
}

// ========== COST TRACKING ==========

export interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
  withinBudget: boolean;
  budgetRemaining: number;
}

/**
 * Estimates the cost of an AI request.
 * Uses conservative token estimates for Gemini Flash.
 */
export function estimateRequestCost(
  ideaLength: number,
  locationLength: number,
  hasDocuments: boolean,
  dailySpendUSD: number = 0
): CostEstimate {
  // Token estimation (rough: 1 token ≈ 4 characters)
  const ideaTokens = Math.ceil(ideaLength / 4);
  const locationTokens = Math.ceil(locationLength / 4);
  const systemPromptTokens = 2000; // Approximate
  const documentTokens = hasDocuments ? 500 : 0;
  
  const inputTokens = ideaTokens + locationTokens + systemPromptTokens + documentTokens;
  const outputTokens = 3000; // Typical output size
  const totalTokens = inputTokens + outputTokens;
  
  // Gemini Flash pricing (approximate): $0.00001 per input token, $0.00002 per output token
  const inputCost = inputTokens * 0.00001;
  const outputCost = outputTokens * 0.00002;
  const estimatedCostUSD = inputCost + outputCost;
  
  const budgetRemaining = AI_COST_LIMITS.DAILY_BUDGET_USD - dailySpendUSD;
  
  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUSD,
    withinBudget: estimatedCostUSD <= budgetRemaining,
    budgetRemaining,
  };
}

// ========== LOGGING HELPERS ==========

export interface SecurityAuditLog {
  timestamp: string;
  eventType: 'input_sanitization' | 'output_validation' | 'rate_limit' | 'kill_switch' | 'cost_alert';
  severity: 'info' | 'warning' | 'error' | 'critical';
  details: Record<string, unknown>;
  userId?: string;
  requestId: string;
}

/**
 * Creates a sanitized security audit log entry.
 * Removes sensitive data before logging.
 */
export function createSecurityAuditLog(
  eventType: SecurityAuditLog['eventType'],
  severity: SecurityAuditLog['severity'],
  details: Record<string, unknown>,
  userId?: string,
  requestId?: string
): SecurityAuditLog {
  // Sanitize details to remove sensitive info
  const sanitizedDetails = { ...details };
  
  // Remove potential secrets
  for (const key of Object.keys(sanitizedDetails)) {
    if (key.toLowerCase().includes('key') || 
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('token')) {
      sanitizedDetails[key] = '[REDACTED]';
    }
    
    // Truncate long values
    if (typeof sanitizedDetails[key] === 'string' && 
        (sanitizedDetails[key] as string).length > 500) {
      sanitizedDetails[key] = (sanitizedDetails[key] as string).substring(0, 500) + '...[TRUNCATED]';
    }
  }
  
  return {
    timestamp: new Date().toISOString(),
    eventType,
    severity,
    details: sanitizedDetails,
    userId,
    requestId: requestId || crypto.randomUUID(),
  };
}
