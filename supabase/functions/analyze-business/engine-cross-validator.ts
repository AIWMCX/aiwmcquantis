/**
 * ENGINE CROSS-VALIDATOR
 * 
 * Compares outputs from calculateStrictFinancials (index.ts) and 
 * processQuantisAnalysis (quantis-engine.ts) to detect divergences.
 * 
 * This is the "dual-engine verified" badge data source.
 */

interface MetricPair {
  metric: string;
  pathA: number;
  pathB: number;
  deltaPercent: number;
  severity: 'none' | 'minor' | 'major' | 'critical';
}

export interface CrossValidationResult {
  agreementScore: number;        // 0-100
  divergences: MetricPair[];
  criticalDivergences: number;
  recommendation: 'strict' | 'quantis' | 'merged';
  auditSummary: string;
  isDualEngineVerified: boolean;  // true if agreement > 95%
}

interface StrictMetrics {
  mrr: number;
  netProfit: number;
  netMarginPercent: number;
  grossProfit: number;
  grossMarginPercent: number;
  totalExpenses: number;
  cac: number;
  ltv: number;
  ltvCacRatio: number;
  paybackMonths: number;
  roiYear1Percent: number;
  breakEvenRevenue: number;
  npv3Years?: number;
}

interface QuantisMetrics {
  mrr: number;
  netProfit: number;
  netMarginPercent: number;
  grossProfit: number;
  grossMarginPercent: number;
  totalExpenses: number;
  cac: number;
  ltv: number;
  ltvCacRatio: number;
  paybackMonths: number;
  roiYear1Percent: number;
}

function classifySeverity(deltaPercent: number): MetricPair['severity'] {
  const abs = Math.abs(deltaPercent);
  if (abs <= 1) return 'none';
  if (abs <= 5) return 'minor';
  if (abs <= 15) return 'major';
  return 'critical';
}

function comparePair(metric: string, a: number, b: number): MetricPair {
  // Handle cases where both are zero or very small
  if (a === 0 && b === 0) return { metric, pathA: a, pathB: b, deltaPercent: 0, severity: 'none' };
  
  // Handle payback 999 (unprofitable) cases
  if (metric === 'paybackMonths' && (a === 999 || b === 999)) {
    return { metric, pathA: a, pathB: b, deltaPercent: a === b ? 0 : 100, severity: a === b ? 'none' : 'critical' };
  }
  
  const base = Math.max(Math.abs(a), Math.abs(b), 1); // avoid div-by-zero
  const delta = ((a - b) / base) * 100;
  return { metric, pathA: a, pathB: b, deltaPercent: Math.round(delta * 10) / 10, severity: classifySeverity(delta) };
}

/**
 * Cross-validate two engine outputs
 */
export function crossValidateEngines(
  strict: StrictMetrics,
  quantis: QuantisMetrics
): CrossValidationResult {
  const pairs: MetricPair[] = [
    comparePair('mrr', strict.mrr, quantis.mrr),
    comparePair('netProfit', strict.netProfit, quantis.netProfit),
    comparePair('netMarginPercent', strict.netMarginPercent, quantis.netMarginPercent),
    comparePair('grossProfit', strict.grossProfit, quantis.grossProfit),
    comparePair('totalExpenses', strict.totalExpenses, quantis.totalExpenses),
    comparePair('cac', strict.cac, quantis.cac),
    comparePair('ltv', strict.ltv, quantis.ltv),
    comparePair('ltvCacRatio', strict.ltvCacRatio, quantis.ltvCacRatio),
    comparePair('paybackMonths', strict.paybackMonths, quantis.paybackMonths),
    comparePair('roiYear1Percent', strict.roiYear1Percent, quantis.roiYear1Percent),
  ];

  const divergences = pairs.filter(p => p.severity !== 'none');
  const criticalDivergences = pairs.filter(p => p.severity === 'critical').length;
  const majorDivergences = pairs.filter(p => p.severity === 'major').length;

  // Agreement score: start at 100, deduct per severity
  let score = 100;
  for (const p of pairs) {
    if (p.severity === 'minor') score -= 2;
    else if (p.severity === 'major') score -= 8;
    else if (p.severity === 'critical') score -= 15;
  }
  score = Math.max(0, Math.min(100, score));

  // Recommendation
  let recommendation: CrossValidationResult['recommendation'] = 'strict';
  if (score < 80) {
    recommendation = 'quantis'; // Quantis has more validation layers
  } else if (score < 95) {
    recommendation = 'merged';
  }

  const isDualEngineVerified = score >= 95;

  // Build audit summary
  const auditLines: string[] = [
    `Cross-validation score: ${score}/100`,
    `Divergences: ${divergences.length} (${criticalDivergences} critical, ${majorDivergences} major)`,
    `Recommendation: use ${recommendation} engine output`,
    isDualEngineVerified ? '✅ DUAL-ENGINE VERIFIED' : '⚠️ Engine outputs diverge — review flagged metrics',
  ];

  if (divergences.length > 0) {
    auditLines.push('Divergent metrics:');
    for (const d of divergences) {
      auditLines.push(`  - ${d.metric}: strict=${d.pathA}, quantis=${d.pathB} (Δ${d.deltaPercent}%, ${d.severity})`);
    }
  }

  return {
    agreementScore: score,
    divergences,
    criticalDivergences,
    recommendation,
    auditSummary: auditLines.join('\n'),
    isDualEngineVerified,
  };
}
