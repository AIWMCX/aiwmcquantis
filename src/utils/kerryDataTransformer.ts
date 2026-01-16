/**
 * Kerry Dataset Transformer
 * Transforms Kerry dataset JSON records to the BenchmarkRecord format
 * expected by the manage-benchmarks edge function
 */

// Expected structure of Kerry dataset records (flexible to handle variations)
export interface KerryRecord {
  industry_id?: string;
  industryId?: string;
  industry_name?: string;
  industryName?: string;
  name?: string;
  region?: string;
  
  // Cost metrics - can be flat or nested
  cogs_percent?: number | { min?: number; max?: number; avg?: number };
  cogs_percent_min?: number;
  cogs_percent_max?: number;
  cogs_percent_avg?: number;
  cogsPercent?: number | { min?: number; max?: number; avg?: number };
  
  gross_margin?: number | { min?: number; max?: number; avg?: number };
  gross_margin_min?: number;
  gross_margin_max?: number;
  gross_margin_avg?: number;
  grossMargin?: number | { min?: number; max?: number; avg?: number };
  
  net_margin?: number | { min?: number; max?: number; avg?: number };
  net_margin_min?: number;
  net_margin_max?: number;
  net_margin_avg?: number;
  netMargin?: number | { min?: number; max?: number; avg?: number };
  
  // Customer acquisition metrics
  cac?: number | { min?: number; max?: number; typical?: number };
  cac_min?: number;
  cac_max?: number;
  cac_typical?: number;
  customerAcquisitionCost?: number | { min?: number; max?: number; typical?: number };
  
  ltv?: number | { min?: number; max?: number; typical?: number };
  ltv_min?: number;
  ltv_max?: number;
  ltv_typical?: number;
  lifetimeValue?: number | { min?: number; max?: number; typical?: number };
  
  ltv_cac_ratio?: number | { min?: number; max?: number };
  ltv_cac_ratio_min?: number;
  ltv_cac_ratio_max?: number;
  ltvCacRatio?: number | { min?: number; max?: number };
  
  // Transaction metrics
  average_check?: number | { min?: number; max?: number };
  average_check_min?: number;
  average_check_max?: number;
  averageCheck?: number | { min?: number; max?: number };
  avgOrderValue?: number | { min?: number; max?: number };
  
  orders_per_client?: number;
  ordersPerClient?: number;
  
  client_lifetime_months?: number;
  clientLifetimeMonths?: number;
  customerLifetimeMonths?: number;
  
  // Fixed costs - can be flat or nested
  fixed_costs?: {
    salaries?: number;
    rent?: number;
    utilities?: number;
    other?: number;
  };
  fixedCosts?: {
    salaries?: number;
    rent?: number;
    utilities?: number;
    other?: number;
  };
  salaries_fixed?: number;
  rent_fixed?: number;
  utilities_fixed?: number;
  other_fixed?: number;
  
  // Market data
  market_size_usd?: number;
  marketSizeUsd?: number;
  marketSize?: number;
  
  growth_rate_percent?: number;
  growthRatePercent?: number;
  growthRate?: number;
  
  competition_level?: string;
  competitionLevel?: string;
  
  // Metadata
  keywords?: string[];
  tags?: string[];
  
  sample_size?: number;
  sampleSize?: number;
  
  confidence_score?: number;
  confidenceScore?: number;
  confidence?: number;
  
  source?: string;
  
  // Allow additional fields
  [key: string]: unknown;
}

// Output format matching manage-benchmarks API expectations
export interface BenchmarkRecord {
  industry_id: string;
  industry_name: string;
  region: string;
  cogs_percent_min?: number;
  cogs_percent_max?: number;
  cogs_percent_avg?: number;
  gross_margin_min?: number;
  gross_margin_max?: number;
  gross_margin_avg?: number;
  net_margin_min?: number;
  net_margin_max?: number;
  net_margin_avg?: number;
  cac_min?: number;
  cac_max?: number;
  cac_typical?: number;
  ltv_min?: number;
  ltv_max?: number;
  ltv_typical?: number;
  ltv_cac_ratio_min?: number;
  ltv_cac_ratio_max?: number;
  average_check_min?: number;
  average_check_max?: number;
  orders_per_client?: number;
  client_lifetime_months?: number;
  salaries_fixed?: number;
  rent_fixed?: number;
  utilities_fixed?: number;
  other_fixed?: number;
  market_size_usd?: number;
  growth_rate_percent?: number;
  competition_level?: string;
  keywords: string[];
  sample_size?: number;
  confidence_score: number;
  source: string;
}

export interface TransformationResult {
  success: boolean;
  record?: BenchmarkRecord;
  errors: string[];
  warnings: string[];
  originalIndex: number;
}

export interface TransformationSummary {
  total: number;
  successful: number;
  failed: number;
  warnings: number;
  records: BenchmarkRecord[];
  errors: { index: number; errors: string[] }[];
}

// Helper to extract numeric value from flat or nested structure
function extractMetric(
  record: KerryRecord,
  baseKeys: string[],
  suffix: 'min' | 'max' | 'avg' | 'typical'
): number | undefined {
  // Try flat keys first (e.g., cogs_percent_min)
  for (const base of baseKeys) {
    const flatKey = `${base}_${suffix}`;
    if (typeof record[flatKey] === 'number') {
      return record[flatKey] as number;
    }
  }
  
  // Try nested object (e.g., cogs_percent.min)
  for (const base of baseKeys) {
    const value = record[base];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = (value as Record<string, unknown>)[suffix];
      if (typeof nested === 'number') {
        return nested;
      }
    }
  }
  
  // For 'avg' or 'typical', try single value
  if (suffix === 'avg' || suffix === 'typical') {
    for (const base of baseKeys) {
      if (typeof record[base] === 'number') {
        return record[base] as number;
      }
    }
  }
  
  return undefined;
}

// Generate keywords from industry name
function generateKeywords(industryName: string): string[] {
  const words = industryName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);
  
  // Add common variations
  const keywords = new Set(words);
  
  // Add bigrams for multi-word industries
  for (let i = 0; i < words.length - 1; i++) {
    keywords.add(`${words[i]} ${words[i + 1]}`);
  }
  
  return Array.from(keywords);
}

// Validate a numeric value is within reasonable bounds
function validateNumber(
  value: number | undefined,
  fieldName: string,
  min: number,
  max: number
): { valid: boolean; warning?: string } {
  if (value === undefined) return { valid: true };
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, warning: `${fieldName} is not a valid number` };
  }
  if (value < min || value > max) {
    return { valid: true, warning: `${fieldName} (${value}) is outside typical range [${min}, ${max}]` };
  }
  return { valid: true };
}

// Transform a single Kerry record to BenchmarkRecord
export function transformKerryRecord(
  record: KerryRecord,
  index: number
): TransformationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Extract industry ID (required)
  const industryId = record.industry_id || record.industryId || 
    (record.industry_name || record.industryName || record.name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  
  if (!industryId) {
    errors.push('Missing industry_id and unable to generate from name');
  }
  
  // Extract industry name (required)
  const industryName = record.industry_name || record.industryName || record.name || '';
  if (!industryName) {
    errors.push('Missing industry_name');
  }
  
  // Extract region (default to global)
  const region = record.region || 'global';
  
  // Extract cost metrics
  const cogsPercentMin = extractMetric(record, ['cogs_percent', 'cogsPercent'], 'min');
  const cogsPercentMax = extractMetric(record, ['cogs_percent', 'cogsPercent'], 'max');
  const cogsPercentAvg = extractMetric(record, ['cogs_percent', 'cogsPercent'], 'avg');
  
  const grossMarginMin = extractMetric(record, ['gross_margin', 'grossMargin'], 'min');
  const grossMarginMax = extractMetric(record, ['gross_margin', 'grossMargin'], 'max');
  const grossMarginAvg = extractMetric(record, ['gross_margin', 'grossMargin'], 'avg');
  
  const netMarginMin = extractMetric(record, ['net_margin', 'netMargin'], 'min');
  const netMarginMax = extractMetric(record, ['net_margin', 'netMargin'], 'max');
  const netMarginAvg = extractMetric(record, ['net_margin', 'netMargin'], 'avg');
  
  // Extract CAC metrics
  const cacMin = extractMetric(record, ['cac', 'customerAcquisitionCost'], 'min');
  const cacMax = extractMetric(record, ['cac', 'customerAcquisitionCost'], 'max');
  const cacTypical = extractMetric(record, ['cac', 'customerAcquisitionCost'], 'typical');
  
  // Extract LTV metrics
  const ltvMin = extractMetric(record, ['ltv', 'lifetimeValue'], 'min');
  const ltvMax = extractMetric(record, ['ltv', 'lifetimeValue'], 'max');
  const ltvTypical = extractMetric(record, ['ltv', 'lifetimeValue'], 'typical');
  
  // Extract LTV/CAC ratio
  const ltvCacRatioMin = extractMetric(record, ['ltv_cac_ratio', 'ltvCacRatio'], 'min');
  const ltvCacRatioMax = extractMetric(record, ['ltv_cac_ratio', 'ltvCacRatio'], 'max');
  
  // Extract transaction metrics
  const averageCheckMin = extractMetric(record, ['average_check', 'averageCheck', 'avgOrderValue'], 'min');
  const averageCheckMax = extractMetric(record, ['average_check', 'averageCheck', 'avgOrderValue'], 'max');
  
  const ordersPerClient = record.orders_per_client || record.ordersPerClient;
  const clientLifetimeMonths = record.client_lifetime_months || record.clientLifetimeMonths || record.customerLifetimeMonths;
  
  // Extract fixed costs
  const fixedCosts = record.fixed_costs || record.fixedCosts;
  const salariesFixed = record.salaries_fixed || fixedCosts?.salaries;
  const rentFixed = record.rent_fixed || fixedCosts?.rent;
  const utilitiesFixed = record.utilities_fixed || fixedCosts?.utilities;
  const otherFixed = record.other_fixed || fixedCosts?.other;
  
  // Extract market data
  const marketSizeUsd = record.market_size_usd || record.marketSizeUsd || record.marketSize;
  const growthRatePercent = record.growth_rate_percent || record.growthRatePercent || record.growthRate;
  const competitionLevel = record.competition_level || record.competitionLevel;
  
  // Extract metadata
  const keywords = record.keywords || record.tags || generateKeywords(industryName);
  const sampleSize = record.sample_size || record.sampleSize;
  const confidenceScore = record.confidence_score || record.confidenceScore || record.confidence || 80;
  const source = record.source || 'kerry_dataset';
  
  // Validate metrics
  const validations = [
    validateNumber(cogsPercentAvg, 'cogs_percent_avg', 0, 100),
    validateNumber(grossMarginAvg, 'gross_margin_avg', 0, 100),
    validateNumber(netMarginAvg, 'net_margin_avg', -100, 100),
    validateNumber(confidenceScore, 'confidence_score', 0, 100),
    validateNumber(growthRatePercent, 'growth_rate_percent', -100, 500),
  ];
  
  validations.forEach(v => {
    if (v.warning) warnings.push(v.warning);
  });
  
  if (errors.length > 0) {
    return {
      success: false,
      errors,
      warnings,
      originalIndex: index,
    };
  }
  
  const benchmarkRecord: BenchmarkRecord = {
    industry_id: industryId,
    industry_name: industryName,
    region,
    cogs_percent_min: cogsPercentMin,
    cogs_percent_max: cogsPercentMax,
    cogs_percent_avg: cogsPercentAvg,
    gross_margin_min: grossMarginMin,
    gross_margin_max: grossMarginMax,
    gross_margin_avg: grossMarginAvg,
    net_margin_min: netMarginMin,
    net_margin_max: netMarginMax,
    net_margin_avg: netMarginAvg,
    cac_min: cacMin,
    cac_max: cacMax,
    cac_typical: cacTypical,
    ltv_min: ltvMin,
    ltv_max: ltvMax,
    ltv_typical: ltvTypical,
    ltv_cac_ratio_min: ltvCacRatioMin,
    ltv_cac_ratio_max: ltvCacRatioMax,
    average_check_min: averageCheckMin,
    average_check_max: averageCheckMax,
    orders_per_client: ordersPerClient,
    client_lifetime_months: clientLifetimeMonths,
    salaries_fixed: salariesFixed,
    rent_fixed: rentFixed,
    utilities_fixed: utilitiesFixed,
    other_fixed: otherFixed,
    market_size_usd: marketSizeUsd,
    growth_rate_percent: growthRatePercent,
    competition_level: competitionLevel,
    keywords: Array.isArray(keywords) ? keywords : [keywords],
    sample_size: sampleSize,
    confidence_score: confidenceScore,
    source,
  };
  
  return {
    success: true,
    record: benchmarkRecord,
    errors,
    warnings,
    originalIndex: index,
  };
}

// Transform entire Kerry dataset
export function transformKerryDataset(data: unknown): TransformationSummary {
  const records: BenchmarkRecord[] = [];
  const errors: { index: number; errors: string[] }[] = [];
  let warningCount = 0;
  
  // Handle different input formats
  let inputRecords: KerryRecord[] = [];
  
  if (Array.isArray(data)) {
    inputRecords = data;
  } else if (data && typeof data === 'object') {
    // Check for common wrapper properties
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.data)) {
      inputRecords = obj.data;
    } else if (Array.isArray(obj.records)) {
      inputRecords = obj.records;
    } else if (Array.isArray(obj.industries)) {
      inputRecords = obj.industries;
    } else if (Array.isArray(obj.benchmarks)) {
      inputRecords = obj.benchmarks;
    } else {
      // Assume it's a single record
      inputRecords = [obj as KerryRecord];
    }
  }
  
  for (let i = 0; i < inputRecords.length; i++) {
    const result = transformKerryRecord(inputRecords[i], i);
    
    if (result.success && result.record) {
      records.push(result.record);
    } else {
      errors.push({ index: i, errors: result.errors });
    }
    
    if (result.warnings.length > 0) {
      warningCount++;
    }
  }
  
  return {
    total: inputRecords.length,
    successful: records.length,
    failed: errors.length,
    warnings: warningCount,
    records,
    errors,
  };
}

// Chunk array for batch processing
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
