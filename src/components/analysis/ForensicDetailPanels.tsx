import { useState } from 'react';
import { ChevronDown, ChevronUp, Network, Activity, Gauge, ShieldAlert, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BusinessAnalysisResult } from '@/types/analysis';

interface PanelProps {
  title: string;
  icon: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Panel({ title, icon, count, defaultOpen = false, children }: PanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border bg-card/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[var(--q-accent-primary)]">{icon}</span>
          <span className="font-semibold text-sm">{title}</span>
          {typeof count === 'number' && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {count}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && <div className="px-4 pb-4 pt-1 text-sm">{children}</div>}
    </div>
  );
}

function fmtNum(n: number | undefined | null): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toFixed(2);
}

interface Props {
  result: BusinessAnalysisResult;
}

/**
 * Forensic Detail Panels — surfaces the 5 engine outputs that were
 * previously computed but hidden from the UI:
 *  1. Assumption Graph (nodes/edges/critical path)
 *  2. Sensitivity Analysis (±10% perturbation impact)
 *  3. Quantis Metrics (12 canonical variables)
 *  4. Sanity Flags (anti-BS rules)
 *  5. Model Confidence factors (recommendation meta)
 */
export function ForensicDetailPanels({ result }: Props) {
  const ag = result.assumption_graph;
  const flags = result.sanity_flags ?? [];
  const mc = result.model_confidence;
  const fa: any = result.financial_analysis ?? {};

  // Quantis 12 canonical variables (best-effort extract)
  const ue = fa.unit_economics ?? {};
  const base = fa.scenarios?.base ?? {};
  const exp = fa.monthly_expenses ?? {};
  const quantisVars: Array<{ key: string; label: string; value: number | undefined }> = [
    { key: 'revenue_monthly', label: 'Revenue / mo', value: fa.mrr ?? fa.monthly_revenue?.realistic },
    { key: 'gross_margin', label: 'Gross Margin %', value: base.gross_margin ?? ue.gross_margin },
    { key: 'net_margin', label: 'Net Margin %', value: base.net_margin ?? ue.net_margin },
    { key: 'cac', label: 'CAC', value: ue.cac },
    { key: 'ltv', label: 'LTV', value: ue.ltv },
    { key: 'ltv_cac', label: 'LTV : CAC', value: ue.ltv_cac_ratio ?? ue.ltv_to_cac },
    { key: 'churn', label: 'Churn / mo %', value: ue.churn_rate ?? ue.monthly_churn },
    { key: 'payback', label: 'Payback (mo)', value: ue.payback_period ?? ue.payback_months },
    { key: 'rent', label: 'Rent / mo', value: exp.breakdown?.rent },
    { key: 'payroll', label: 'Payroll / mo', value: exp.breakdown?.salaries },
    { key: 'marketing', label: 'Marketing / mo', value: exp.breakdown?.marketing },
    { key: 'break_even', label: 'Break-even (mo)', value: fa.break_even_month ?? fa.break_even?.month },
  ];

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Forensic Detail (Engine Outputs)</h3>
        <span className="text-[10px] font-mono text-muted-foreground">
          AIWMC Quantis · Layers 1–7
        </span>
      </header>

      {/* 1. Assumption Graph */}
      {ag && (
        <Panel
          title="Assumption Graph & Critical Path"
          icon={<Network className="w-4 h-4" />}
          count={ag.nodes?.length}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">Fragility score:</span>
              <span
                className={cn(
                  'font-mono font-semibold',
                  ag.fragility_score >= 70
                    ? 'text-red-500'
                    : ag.fragility_score >= 40
                      ? 'text-amber-500'
                      : 'text-emerald-500'
                )}
              >
                {Math.round(ag.fragility_score)}/100
              </span>
              <span className="text-muted-foreground">
                · {ag.nodes?.length ?? 0} nodes · {ag.edges?.length ?? 0} edges
              </span>
            </div>
            {ag.criticalPath && ag.criticalPath.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                      <th className="px-2 py-1.5">Assumption</th>
                      <th className="px-2 py-1.5">Sensitivity</th>
                      <th className="px-2 py-1.5">Current</th>
                      <th className="px-2 py-1.5">Breaks at</th>
                      <th className="px-2 py-1.5">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ag.criticalPath.map((cp, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-b-0">
                        <td className="px-2 py-1.5">{cp.assumption}</td>
                        <td className="px-2 py-1.5 font-mono">{fmtNum(cp.sensitivity)}</td>
                        <td className="px-2 py-1.5 font-mono">{fmtNum(cp.currentValue)}</td>
                        <td className="px-2 py-1.5 font-mono text-amber-500">
                          {fmtNum(cp.breakingThreshold)}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">{cp.recommendation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* 2. Sensitivity (derived from criticalPath) */}
      {ag?.criticalPath && ag.criticalPath.length > 0 && (
        <Panel
          title="Sensitivity Analysis (±10% perturbation)"
          icon={<Activity className="w-4 h-4" />}
          count={ag.criticalPath.length}
        >
          <div className="space-y-2">
            {ag.criticalPath
              .slice()
              .sort((a, b) => Math.abs(b.sensitivity) - Math.abs(a.sensitivity))
              .map((cp, i) => {
                const max = Math.max(...ag.criticalPath.map((p) => Math.abs(p.sensitivity))) || 1;
                const pct = (Math.abs(cp.sensitivity) / max) * 100;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>{cp.assumption}</span>
                      <span className="font-mono text-muted-foreground">
                        {cp.direction === 'negative' ? '−' : '+'}
                        {fmtNum(cp.sensitivity)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full',
                          cp.direction === 'negative' ? 'bg-red-500' : 'bg-emerald-500'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </Panel>
      )}

      {/* 3. Quantis Metrics (12 canonical vars) */}
      <Panel
        title="Quantis Metrics (12 canonical variables)"
        icon={<Gauge className="w-4 h-4" />}
        count={quantisVars.filter((v) => typeof v.value === 'number').length}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {quantisVars.map((v) => (
            <div
              key={v.key}
              className="rounded border border-border/60 px-2.5 py-2 bg-background/40"
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {v.label}
              </div>
              <div className="font-mono text-sm">{fmtNum(v.value)}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* 4. Sanity Flags */}
      {flags.length > 0 && (
        <Panel
          title="Sanity Flags (Anti-BS rules)"
          icon={<ShieldAlert className="w-4 h-4" />}
          count={flags.length}
          defaultOpen
        >
          <div className="space-y-2">
            {flags.map((f, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-md border px-3 py-2 text-xs',
                  f.severity === 'high' || f.severity === 'critical'
                    ? 'border-red-500/40 bg-red-500/10'
                    : f.severity === 'medium' || f.severity === 'warn'
                      ? 'border-amber-500/40 bg-amber-500/10'
                      : 'border-border bg-muted/30'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">{f.rule_id}</span>
                  <span className="text-[10px] uppercase font-semibold">{f.severity}</span>
                </div>
                <div className="mt-1 text-foreground">{f.explanation}</div>
                {f.suggested_correction && (
                  <div className="mt-1 text-muted-foreground">→ {f.suggested_correction}</div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* 5. Model Confidence factors */}
      {mc && (
        <Panel
          title="Model Confidence & Recommendation"
          icon={<Sparkles className="w-4 h-4" />}
          count={mc.factors?.length}
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span>
                Confidence:{' '}
                <span className="font-mono font-semibold">{Math.round(mc.confidence * 100)}%</span>
              </span>
              <span>
                Assumption risk:{' '}
                <span className="font-mono font-semibold">
                  {Math.round(mc.assumption_risk * 100)}%
                </span>
              </span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded font-semibold uppercase text-[10px]',
                  mc.recommendation_level === 'safe'
                    ? 'bg-emerald-500/15 text-emerald-500'
                    : mc.recommendation_level === 'caution'
                      ? 'bg-amber-500/15 text-amber-500'
                      : 'bg-red-500/15 text-red-500'
                )}
              >
                {mc.recommendation_level.replace('_', ' ')}
              </span>
              {typeof mc.similar_cases_count === 'number' && (
                <span className="text-muted-foreground">
                  {mc.similar_cases_count} similar cases
                </span>
              )}
            </div>
            {mc.factors && mc.factors.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                      <th className="px-2 py-1.5">Factor</th>
                      <th className="px-2 py-1.5">Score</th>
                      <th className="px-2 py-1.5">Weight</th>
                      <th className="px-2 py-1.5">Rationale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mc.factors.map((f, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-b-0">
                        <td className="px-2 py-1.5">{f.factor}</td>
                        <td className="px-2 py-1.5 font-mono">{fmtNum(f.score)}</td>
                        <td className="px-2 py-1.5 font-mono">{fmtNum(f.weight)}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{f.explanation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Panel>
      )}
    </section>
  );
}
