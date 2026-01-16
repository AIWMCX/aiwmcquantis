/**
 * Kerry Dataset Transformer
 * Transforms Kerry scenario-based dataset to industry benchmark records
 * The Kerry dataset contains business scenarios with embedded industry_benchmarks
 */

// Kerry dataset record structure (scenario-based)
export interface KerryScenario {
  scenario_id: string;
  category: string;
  subcategory: string;
  business_type: string;
  business_context: {
    type: string;
    mrr?: number;
    growth_rate?: number;
    churn_rate?: number;
    customers?: number;
    team_size?: number;
    monthly_revenue?: number;
    avg_order_value?: number;
    customer_count?: number;
    employee_count?: number;
    [key: string]: unknown;
  };
  industry_benchmarks: {
    healthy_growth_rate?: string;
    acceptable_churn?: string;
    target_ltv_cac_ratio?: string;
    gross_margin_target?: string;
    healthy_margin?: string;
    good_conversion_rate?: string;
    cart_abandonment?: string;
    repeat_customer_rate?: string;
    [key: string]: string | undefined;
  };
  tags: string[];
  difficulty_level: string;
  urgency: string;
  generated_at: string;
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
  additional_metrics?: Record<string, unknown>;
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
  businessTypes: string[];
}

// Parse range strings like "15-20% MoM" or "3:1 minimum"
function parseRangeString(value: string | undefined): { min?: number; max?: number; value?: number } {
  if (!value) return {};
  
  // Try "X-Y%" or "X-Y"
  const rangeMatch = value.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    return { min: parseFloat(rangeMatch[1]), max: parseFloat(rangeMatch[2]) };
  }
  
  // Try "X:1" ratio format
  const ratioMatch = value.match(/(\d+(?:\.\d+)?)\s*:\s*1/);
  if (ratioMatch) {
    return { min: parseFloat(ratioMatch[1]), value: parseFloat(ratioMatch[1]) };
  }
  
  // Try single number
  const singleMatch = value.match(/(\d+(?:\.\d+)?)/);
  if (singleMatch) {
    return { value: parseFloat(singleMatch[1]) };
  }
  
  return {};
}

// Format business type to readable name
function formatBusinessTypeName(businessType: string): string {
  return businessType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Generate industry ID from business type
function generateIndustryId(businessType: string): string {
  return businessType.toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

// Aggregate scenarios by business type
interface AggregatedData {
  businessType: string;
  scenarios: KerryScenario[];
  growthRates: number[];
  churnRates: number[];
  margins: { min: number; max: number }[];
  ltvCacRatios: number[];
  conversionRates: { min: number; max: number }[];
  cartAbandonment: { min: number; max: number }[];
  repeatCustomerRates: { min: number; max: number }[];
  tags: Set<string>;
}

// Transform aggregated data to a single benchmark record
function aggregateToBenchmark(data: AggregatedData): BenchmarkRecord {
  const benchmarks = data.scenarios[0]?.industry_benchmarks || {};
  
  // Parse growth rate
  const growthRange = parseRangeString(benchmarks.healthy_growth_rate);
  
  // Parse churn/margin based on business type
  let grossMarginMin: number | undefined;
  let grossMarginMax: number | undefined;
  let grossMarginAvg: number | undefined;
  
  if (benchmarks.gross_margin_target) {
    const marginRange = parseRangeString(benchmarks.gross_margin_target);
    grossMarginMin = marginRange.min;
    grossMarginMax = marginRange.max;
    if (marginRange.min !== undefined && marginRange.max !== undefined) {
      grossMarginAvg = (marginRange.min + marginRange.max) / 2;
    }
  } else if (benchmarks.healthy_margin) {
    const marginRange = parseRangeString(benchmarks.healthy_margin);
    grossMarginMin = marginRange.min;
    grossMarginMax = marginRange.max;
    if (marginRange.min !== undefined && marginRange.max !== undefined) {
      grossMarginAvg = (marginRange.min + marginRange.max) / 2;
    }
  }
  
  // Parse LTV/CAC ratio
  const ltvCacRatio = parseRangeString(benchmarks.target_ltv_cac_ratio);
  
  // Calculate average metrics from scenario business_context
  const validGrowthRates = data.scenarios
    .map(s => s.business_context?.growth_rate)
    .filter((g): g is number => typeof g === 'number');
  
  const validChurnRates = data.scenarios
    .map(s => s.business_context?.churn_rate)
    .filter((c): c is number => typeof c === 'number');
  
  // Calculate net margin as growth - churn for SaaS-like businesses
  let netMarginAvg: number | undefined;
  if (validGrowthRates.length > 0 && validChurnRates.length > 0) {
    const avgGrowth = validGrowthRates.reduce((a, b) => a + b, 0) / validGrowthRates.length;
    const avgChurn = validChurnRates.reduce((a, b) => a + b, 0) / validChurnRates.length;
    netMarginAvg = avgGrowth - avgChurn;
  }
  
  // Collect all unique tags
  const allTags = Array.from(data.tags);
  
  // Build additional metrics for non-standard benchmarks
  const additionalMetrics: Record<string, unknown> = {};
  
  if (benchmarks.acceptable_churn) {
    const churnRange = parseRangeString(benchmarks.acceptable_churn);
    additionalMetrics.acceptable_churn_min = churnRange.min;
    additionalMetrics.acceptable_churn_max = churnRange.max;
  }
  
  if (benchmarks.good_conversion_rate) {
    const convRange = parseRangeString(benchmarks.good_conversion_rate);
    additionalMetrics.conversion_rate_min = convRange.min;
    additionalMetrics.conversion_rate_max = convRange.max;
  }
  
  if (benchmarks.cart_abandonment) {
    const cartRange = parseRangeString(benchmarks.cart_abandonment);
    additionalMetrics.cart_abandonment_min = cartRange.min;
    additionalMetrics.cart_abandonment_max = cartRange.max;
  }
  
  if (benchmarks.repeat_customer_rate) {
    const repeatRange = parseRangeString(benchmarks.repeat_customer_rate);
    additionalMetrics.repeat_customer_rate_min = repeatRange.min;
    additionalMetrics.repeat_customer_rate_max = repeatRange.max;
  }
  
  return {
    industry_id: generateIndustryId(data.businessType),
    industry_name: formatBusinessTypeName(data.businessType),
    region: 'global',
    gross_margin_min: grossMarginMin,
    gross_margin_max: grossMarginMax,
    gross_margin_avg: grossMarginAvg,
    net_margin_avg: netMarginAvg,
    ltv_cac_ratio_min: ltvCacRatio.min,
    ltv_cac_ratio_max: ltvCacRatio.max,
    growth_rate_percent: growthRange.max || growthRange.min,
    keywords: allTags.slice(0, 20), // Limit keywords
    sample_size: data.scenarios.length,
    confidence_score: Math.min(95, 60 + Math.floor(data.scenarios.length / 10)),
    source: 'kerry_dataset',
    additional_metrics: Object.keys(additionalMetrics).length > 0 ? additionalMetrics : undefined,
  };
}

// Transform entire Kerry dataset by aggregating by business_type
export function transformKerryDataset(data: unknown): TransformationSummary {
  const errors: { index: number; errors: string[] }[] = [];
  let warningCount = 0;
  
  // Parse input
  let scenarios: KerryScenario[] = [];
  
  if (Array.isArray(data)) {
    scenarios = data as KerryScenario[];
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.data)) scenarios = obj.data;
    else if (Array.isArray(obj.records)) scenarios = obj.records;
    else if (Array.isArray(obj.scenarios)) scenarios = obj.scenarios;
  }
  
  // Group by business_type
  const groupedData = new Map<string, AggregatedData>();
  
  scenarios.forEach((scenario, index) => {
    if (!scenario.business_type) {
      errors.push({ index, errors: ['Missing business_type'] });
      return;
    }
    
    if (!scenario.industry_benchmarks) {
      warningCount++;
      return; // Skip scenarios without benchmarks
    }
    
    const key = scenario.business_type;
    
    if (!groupedData.has(key)) {
      groupedData.set(key, {
        businessType: key,
        scenarios: [],
        growthRates: [],
        churnRates: [],
        margins: [],
        ltvCacRatios: [],
        conversionRates: [],
        cartAbandonment: [],
        repeatCustomerRates: [],
        tags: new Set(),
      });
    }
    
    const group = groupedData.get(key)!;
    group.scenarios.push(scenario);
    
    // Collect business context metrics
    if (scenario.business_context?.growth_rate) {
      group.growthRates.push(scenario.business_context.growth_rate);
    }
    if (scenario.business_context?.churn_rate) {
      group.churnRates.push(scenario.business_context.churn_rate);
    }
    
    // Collect tags
    if (scenario.tags) {
      scenario.tags.forEach(tag => group.tags.add(tag));
    }
  });
  
  // Convert aggregated groups to benchmark records
  const records: BenchmarkRecord[] = [];
  const businessTypes: string[] = [];
  
  groupedData.forEach((data) => {
    businessTypes.push(data.businessType);
    records.push(aggregateToBenchmark(data));
  });
  
  return {
    total: scenarios.length,
    successful: records.length,
    failed: errors.length,
    warnings: warningCount,
    records,
    errors,
    businessTypes,
  };
}

// For backward compatibility - transform a single record
export function transformKerryRecord(
  record: KerryScenario,
  index: number
): TransformationResult {
  const result = transformKerryDataset([record]);
  
  if (result.records.length > 0) {
    return {
      success: true,
      record: result.records[0],
      errors: [],
      warnings: [],
      originalIndex: index,
    };
  }
  
  return {
    success: false,
    errors: result.errors[0]?.errors || ['Failed to transform record'],
    warnings: [],
    originalIndex: index,
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
