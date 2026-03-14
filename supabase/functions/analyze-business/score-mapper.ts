/**
 * SCORE Schema Mapper — Bidirectional mapping between
 * SCORE (Service Corps of Retired Executives) standard spreadsheet format
 * and Quantis internal analysis model.
 *
 * SCORE is the canonical SME financial planning format used by:
 * - SBA advisors, lenders, accelerators
 * - Banks for loan applications
 * - SBDC centers nationwide
 */

// ========== SCORE FIELD DEFINITIONS ==========

/** 
 * The 30 canonical SCORE fields we track for compliance.
 * Each maps to a specific Quantis internal field.
 */
export const SCORE_FIELDS = [
  // Revenue Projections
  { scoreField: 'monthly_revenue', tab: 'Revenue Projections', quantisPath: 'financial_analysis.mrr', label: 'Monthly Revenue' },
  { scoreField: 'annual_revenue', tab: 'Revenue Projections', quantisPath: 'financial_analysis.arr', label: 'Annual Revenue' },
  { scoreField: 'units_sold', tab: 'Revenue Projections', quantisPath: 'financial_analysis.inputs.units_sold_monthly', label: 'Units Sold / Month' },
  { scoreField: 'price_per_unit', tab: 'Revenue Projections', quantisPath: 'financial_analysis.inputs.price_per_unit', label: 'Price per Unit' },
  { scoreField: 'revenue_growth_rate', tab: 'Revenue Projections', quantisPath: 'metadata.growth_rate', label: 'Revenue Growth Rate (%)' },

  // Startup Costs
  { scoreField: 'total_startup_costs', tab: 'Startup Costs', quantisPath: 'financial_analysis.startup_investment.total', label: 'Total Startup Costs' },
  { scoreField: 'rent_deposit', tab: 'Startup Costs', quantisPath: 'financial_analysis.startup_investment.breakdown.rent_deposit', label: 'Rent & Deposit' },
  { scoreField: 'equipment', tab: 'Startup Costs', quantisPath: 'financial_analysis.startup_investment.breakdown.equipment', label: 'Equipment' },
  { scoreField: 'initial_inventory', tab: 'Startup Costs', quantisPath: 'financial_analysis.startup_investment.breakdown.inventory', label: 'Initial Inventory' },
  { scoreField: 'legal_fees', tab: 'Startup Costs', quantisPath: 'financial_analysis.startup_investment.breakdown.legal', label: 'Legal & Licensing' },
  { scoreField: 'initial_marketing', tab: 'Startup Costs', quantisPath: 'financial_analysis.startup_investment.breakdown.marketing_initial', label: 'Initial Marketing' },
  { scoreField: 'working_capital', tab: 'Startup Costs', quantisPath: 'financial_analysis.startup_investment.breakdown.working_capital', label: 'Working Capital Reserve' },

  // Operating Expenses
  { scoreField: 'monthly_rent', tab: 'Operating Expenses', quantisPath: 'financial_analysis.monthly_expenses.breakdown.rent', label: 'Monthly Rent' },
  { scoreField: 'utilities', tab: 'Operating Expenses', quantisPath: 'financial_analysis.monthly_expenses.breakdown.utilities', label: 'Utilities' },
  { scoreField: 'salaries', tab: 'Operating Expenses', quantisPath: 'financial_analysis.monthly_expenses.breakdown.salaries', label: 'Salaries & Wages' },
  // COGS label varies by industry — try multiple paths
  { scoreField: 'inventory_replenishment', tab: 'Operating Expenses', quantisPath: 'financial_analysis.monthly_expenses.breakdown.cost_of_goods_sold', label: 'Cost of Goods / Services' },
  { scoreField: 'inventory_replenishment_alt1', tab: 'Operating Expenses', quantisPath: 'financial_analysis.monthly_expenses.breakdown.inventory_replenishment', label: 'Inventory / COGS' },
  { scoreField: 'inventory_replenishment_alt2', tab: 'Operating Expenses', quantisPath: 'financial_analysis.monthly_expenses.breakdown.infrastructure_and_hosting', label: 'Infrastructure & Hosting' },
  { scoreField: 'inventory_replenishment_alt3', tab: 'Operating Expenses', quantisPath: 'financial_analysis.monthly_expenses.breakdown.content_and_platform', label: 'Content & Platform' },
  { scoreField: 'inventory_replenishment_alt4', tab: 'Operating Expenses', quantisPath: 'financial_analysis.monthly_expenses.breakdown.service_delivery', label: 'Service Delivery' },
  { scoreField: 'marketing_monthly', tab: 'Operating Expenses', quantisPath: 'financial_analysis.monthly_expenses.breakdown.marketing', label: 'Marketing Budget' },
  { scoreField: 'other_expenses', tab: 'Operating Expenses', quantisPath: 'financial_analysis.monthly_expenses.breakdown.other', label: 'Other Operating Costs' },
  { scoreField: 'total_monthly_expenses', tab: 'Operating Expenses', quantisPath: 'financial_analysis.monthly_expenses.total', label: 'Total Monthly Expenses' },

  // Cash Flow
  { scoreField: 'net_profit', tab: 'Cash Flow', quantisPath: 'financial_analysis.scenarios.base.net_profit', label: 'Monthly Net Profit' },
  { scoreField: 'gross_margin', tab: 'Cash Flow', quantisPath: 'financial_analysis.scenarios.base.gross_margin', label: 'Gross Margin (%)' },
  { scoreField: 'net_margin', tab: 'Cash Flow', quantisPath: 'financial_analysis.scenarios.base.net_margin', label: 'Net Margin (%)' },
  { scoreField: 'breakeven_months', tab: 'Cash Flow', quantisPath: 'financial_analysis.breakeven.breakeven_months', label: 'Break-Even (months)' },
  { scoreField: 'payback_period', tab: 'Cash Flow', quantisPath: 'financial_analysis.returns.payback_period_months', label: 'Payback Period (months)' },

  // Balance Sheet (Approximations)
  { scoreField: 'total_assets', tab: 'Balance Sheet', quantisPath: null, label: 'Total Assets' },
  { scoreField: 'total_liabilities', tab: 'Balance Sheet', quantisPath: null, label: 'Total Liabilities' },

  // Loan Information
  { scoreField: 'debt_schedule', tab: 'Loan Information', quantisPath: null, label: 'Debt Schedule' },
  { scoreField: 'owner_draw', tab: 'Loan Information', quantisPath: null, label: 'Owner Draw / Salary' },
  { scoreField: 'depreciation', tab: 'Loan Information', quantisPath: null, label: 'Depreciation Schedule' },

  // KPIs
  { scoreField: 'roi_year_1', tab: 'KPIs', quantisPath: 'financial_analysis.returns.roi_year_1', label: 'ROI Year 1 (%)' },
] as const;

export type SCOREFieldName = typeof SCORE_FIELDS[number]['scoreField'];

// ========== TYPES ==========

export interface SCORECompliance {
  score: number;
  filledFields: string[];
  missingFields: string[];
  inconsistencies: Array<{ field: string; issue: string }>;
}

export interface SCOREExportRow {
  tab: string;
  field: string;
  label: string;
  value: string | number | null;
}

export interface SCOREImportResult {
  mappedData: Record<string, number | string>;
  unmappedFields: string[];
  inconsistencies: Array<{ field: string; issue: string }>;
  complianceScore: number;
}

// ========== HELPER: Deep get ==========

function deepGet(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// ========== MAP TO SCORE (EXPORT) ==========

export function mapToSCORE(analysisResult: any): SCOREExportRow[] {
  const rows: SCOREExportRow[] = [];

  for (const field of SCORE_FIELDS) {
    let value: any = null;
    if (field.quantisPath) {
      value = deepGet(analysisResult, field.quantisPath);
    }
    rows.push({
      tab: field.tab,
      field: field.scoreField,
      label: field.label,
      value: value ?? null,
    });
  }

  return rows;
}

// ========== COMPUTE COMPLIANCE ==========

export function computeSCORECompliance(analysisResult: any): SCORECompliance {
  const filled: string[] = [];
  const missing: string[] = [];
  const inconsistencies: Array<{ field: string; issue: string }> = [];

  for (const field of SCORE_FIELDS) {
    if (!field.quantisPath) {
      // Fields without Quantis mapping are always "missing"
      missing.push(field.label);
      continue;
    }
    const value = deepGet(analysisResult, field.quantisPath);
    if (value !== undefined && value !== null && value !== 0) {
      filled.push(field.label);

      // Sanity checks
      if (field.scoreField === 'gross_margin' && (value < 0 || value > 100)) {
        inconsistencies.push({ field: field.label, issue: `Value ${value}% is outside expected 0-100% range` });
      }
      if (field.scoreField === 'net_margin' && value > 80) {
        inconsistencies.push({ field: field.label, issue: `${value}% net margin is unusually high — verify assumptions` });
      }
    } else {
      missing.push(field.label);
    }
  }

  const totalFields = SCORE_FIELDS.length;
  const score = Math.round((filled.length / totalFields) * 100);

  // Check internal consistency
  const monthlyRev = deepGet(analysisResult, 'financial_analysis.mrr');
  const annualRev = deepGet(analysisResult, 'financial_analysis.arr');
  if (monthlyRev && annualRev && Math.abs(annualRev - monthlyRev * 12) > monthlyRev) {
    inconsistencies.push({ field: 'Revenue', issue: 'Annual revenue doesn\'t match monthly × 12' });
  }

  const expBreakdown = deepGet(analysisResult, 'financial_analysis.monthly_expenses.breakdown');
  const expTotal = deepGet(analysisResult, 'financial_analysis.monthly_expenses.total');
  if (expBreakdown && expTotal) {
    const sum = Object.values(expBreakdown).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
    if (Math.abs(sum - expTotal) > expTotal * 0.1) {
      inconsistencies.push({ field: 'Expenses', issue: `Breakdown sum ($${Math.round(sum)}) differs from total ($${Math.round(expTotal)}) by >10%` });
    }
  }

  return { score, filledFields: filled, missingFields: missing, inconsistencies };
}

// ========== MAP FROM SCORE (IMPORT) ==========

export function mapFromSCORE(csvRows: Record<string, string>[]): SCOREImportResult {
  const mappedData: Record<string, number | string> = {};
  const unmappedFields: string[] = [];
  const inconsistencies: Array<{ field: string; issue: string }> = [];

  // Build lookup from SCORE field names
  const fieldLookup = new Map(SCORE_FIELDS.map(f => [f.scoreField.toLowerCase(), f]));
  const labelLookup = new Map(SCORE_FIELDS.map(f => [f.label.toLowerCase(), f]));

  for (const row of csvRows) {
    const fieldName = (row.field || row.Field || row.name || row.Name || '').toLowerCase().trim();
    const value = row.value || row.Value || row.amount || row.Amount || '';

    const match = fieldLookup.get(fieldName) || labelLookup.get(fieldName);
    if (match && match.quantisPath) {
      const numVal = parseFloat(String(value).replace(/[$,%]/g, ''));
      if (!isNaN(numVal)) {
        mappedData[match.quantisPath] = numVal;
      } else if (value) {
        mappedData[match.quantisPath] = value;
      }
    } else if (fieldName) {
      unmappedFields.push(fieldName);
    }
  }

  const totalMappable = SCORE_FIELDS.filter(f => f.quantisPath).length;
  const mappedCount = Object.keys(mappedData).length;
  const complianceScore = Math.round((mappedCount / totalMappable) * 100);

  return { mappedData, unmappedFields, inconsistencies, complianceScore };
}

// ========== CSV GENERATOR ==========

export function generateSCORECsv(rows: SCOREExportRow[]): string {
  const header = 'Tab,Field,Label,Value';
  const lines = rows.map(r => {
    const val = r.value === null ? '' : String(r.value);
    return `"${r.tab}","${r.field}","${r.label}","${val}"`;
  });
  return [header, ...lines].join('\n');
}
