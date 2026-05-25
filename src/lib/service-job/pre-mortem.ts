/**
 * Service Job Quoting — pre-mortem risk surfacing.
 * Pure function. Inputs are explicit; no DB / no I/O.
 *
 * Generates up to 5 RiskFlags ranked by descending impact severity.
 * Severities: high > medium > low. Ties broken by category priority.
 */

import type {
  RiskFlag,
  ScopeItem,
  ServiceJobAssembly,
  ServiceJobInput,
  RiskSeverity,
} from './types';

const SEVERITY_RANK: Record<RiskSeverity, number> = { high: 3, medium: 2, low: 1 };

// Trades where a permit is typically required when scope > trivial.
const PERMIT_REQUIRED_TRADES = new Set(['electrical', 'plumbing', 'hvac']);

// Keywords in assembly code/name that suggest a permit is typically needed.
const PERMIT_TRIGGER_KEYWORDS = [
  'panel',
  'service-upgrade',
  'service_upgrade',
  'ev-charger',
  'ev_charger',
  'main-line',
  'water-heater',
  'gas',
  'rewire',
  'subpanel',
];

export interface PreMortemContext {
  input: ServiceJobInput;
  assemblies: ServiceJobAssembly[];
  /** Per-scope-item cost-variance contribution, in the same currency. */
  varianceByScopeIndex: number[];
}

function findAssembly(
  assemblies: ServiceJobAssembly[],
  id: string,
): ServiceJobAssembly | undefined {
  return assemblies.find((a) => a.id === id);
}

function fmtRange(lo: number, hi: number): string {
  const round = (v: number) => Math.round(v / 50) * 50;
  return `+$${round(lo)}–$${round(hi)}`;
}

export function generatePreMortemRisks(ctx: PreMortemContext): RiskFlag[] {
  const { input, assemblies, varianceByScopeIndex } = ctx;
  const flags: RiskFlag[] = [];

  // 1) Top variance contributor.
  if (varianceByScopeIndex.length > 0) {
    let maxIdx = 0;
    let maxVar = -Infinity;
    let total = 0;
    for (let i = 0; i < varianceByScopeIndex.length; i++) {
      total += varianceByScopeIndex[i];
      if (varianceByScopeIndex[i] > maxVar) {
        maxVar = varianceByScopeIndex[i];
        maxIdx = i;
      }
    }
    if (maxVar > 0 && total > 0) {
      const share = maxVar / total;
      const item = input.scope_items[maxIdx];
      const asm = item ? findAssembly(assemblies, item.assembly_id) : undefined;
      const name = asm?.name ?? `Item ${maxIdx + 1}`;
      const severity: RiskSeverity = share >= 0.6 ? 'high' : share >= 0.35 ? 'medium' : 'low';
      flags.push({
        code: 'TOP_VARIANCE',
        category: 'variance',
        severity,
        message: `${name} drives ${Math.round(share * 100)}% of cost uncertainty — tighten its scope before quoting.`,
        impact_estimate: fmtRange(maxVar * 0.5, maxVar * 1.5),
      });
    }
  }

  // 2) Building age (< 1985): legacy wiring / galvanized plumbing surprises.
  if (typeof input.year_built === 'number' && input.year_built > 0 && input.year_built < 1985) {
    const decadeOld = new Date().getFullYear() - input.year_built;
    flags.push({
      code: 'BUILDING_AGE',
      category: 'building_age',
      severity: input.year_built < 1960 ? 'high' : 'medium',
      message: `Built ${decadeOld}+ years ago — expect legacy ${
        input.trade_id === 'plumbing' ? 'galvanized plumbing' : 'wiring/materials'
      } adding rework risk.`,
      impact_estimate: '+$200–$800',
    });
  }

  // 3) High difficulty factor on any item.
  const hardItems = input.scope_items
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.difficulty_factor > 1.5);
  if (hardItems.length > 0) {
    const worst = hardItems.reduce((a, b) =>
      b.s.difficulty_factor > a.s.difficulty_factor ? b : a,
    );
    const asm = findAssembly(assemblies, worst.s.assembly_id);
    flags.push({
      code: 'HIGH_DIFFICULTY',
      category: 'difficulty',
      severity: worst.s.difficulty_factor >= 2.0 ? 'high' : 'medium',
      message: `${asm?.name ?? 'Scope item'} is flagged at ${worst.s.difficulty_factor.toFixed(2)}× difficulty — verify access before committing.`,
      impact_estimate: fmtRange(150, 600),
    });
  }

  // 4) Emergency / after-hours / weekend modifier present.
  const m = input.modifiers;
  const ctxLabels: string[] = [];
  if (m.emergency) ctxLabels.push('emergency');
  if (m.after_hours) ctxLabels.push('after-hours');
  if (m.weekend) ctxLabels.push('weekend');
  if (ctxLabels.length > 0) {
    flags.push({
      code: 'AFTER_HOURS',
      category: 'after_hours',
      severity: m.emergency ? 'high' : 'medium',
      message: `Labor is priced at ${ctxLabels.join(' + ')} rates — confirm client accepts the premium.`,
      impact_estimate: '+25%–87% labor',
    });
  }

  // 5) Missing scope: permit likely required but none allocated.
  const permitAllocated = !!m.permit_required || (m.permit_fee ?? 0) > 0;
  if (!permitAllocated && PERMIT_REQUIRED_TRADES.has(String(input.trade_id))) {
    const triggersPermit = input.scope_items.some((s) => {
      const asm = findAssembly(assemblies, s.assembly_id);
      if (!asm) return false;
      const hay = `${asm.code} ${asm.name}`.toLowerCase();
      return PERMIT_TRIGGER_KEYWORDS.some((k) => hay.includes(k));
    });
    if (triggersPermit) {
      flags.push({
        code: 'MISSING_PERMIT',
        category: 'missing_scope',
        severity: 'high',
        message: 'Scope likely requires a permit but none is included — add permit fee + inspection time.',
        impact_estimate: '+$150–$500',
      });
    }
  }

  // Rank by severity desc, keep top 5.
  flags.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  return flags.slice(0, 5);
}
