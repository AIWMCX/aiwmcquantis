/**
 * CapacityCheckCard — wraps the existing useCapacityCheck() hook
 * (invoice-capacity-check edge function) in a compact PLUS-tier card. Captures
 * the 9 inputs needed by the spec, fires the check, and renders the
 * recommendation + cash-flow bridge + capacity assessment.
 *
 * The hook surfaces 402 TierGateBlock toasts automatically, so we only need
 * to render the success / loading state.
 */
import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCapacityCheck } from '@/hooks/useSpecTier';
import type { CapacityCheckInput } from '@/services/specTierApi';

const DEFAULTS: CapacityCheckInput = {
  current_monthly_revenue_usd: 25000,
  current_monthly_costs_usd: 18000,
  current_team_capacity_pct: 70,
  new_client_monthly_revenue_usd: 8000,
  new_client_setup_cost_usd: 2500,
  new_client_capacity_required_pct: 20,
  new_client_payment_terms_days: 45,
  current_cash_reserve_usd: 30000,
};

const FIELDS: Array<{ key: keyof CapacityCheckInput; label: string; suffix: string }> = [
  { key: 'current_monthly_revenue_usd', label: 'Current monthly revenue', suffix: 'USD' },
  { key: 'current_monthly_costs_usd', label: 'Current monthly costs', suffix: 'USD' },
  { key: 'current_team_capacity_pct', label: 'Team capacity used', suffix: '%' },
  { key: 'new_client_monthly_revenue_usd', label: 'New client monthly revenue', suffix: 'USD' },
  { key: 'new_client_setup_cost_usd', label: 'Setup / onboarding cost', suffix: 'USD' },
  { key: 'new_client_capacity_required_pct', label: 'Capacity needed', suffix: '%' },
  { key: 'new_client_payment_terms_days', label: 'Payment terms', suffix: 'days' },
  { key: 'current_cash_reserve_usd', label: 'Current cash reserve', suffix: 'USD' },
];

const RECO_STYLES: Record<string, { Icon: React.ElementType; chip: string }> = {
  ACCEPT: { Icon: CheckCircle2, chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  ACCEPT_WITH_CONDITIONS: {
    Icon: AlertTriangle,
    chip: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  DECLINE: { Icon: XCircle, chip: 'bg-destructive/15 text-destructive border-destructive/30' },
};

interface Props {
  /** Optional parent analysis id to correlate with the PLUS analysis. */
  parentAnalysisId?: string;
}

export function CapacityCheckCard({ parentAnalysisId }: Props) {
  const [inputs, setInputs] = React.useState<CapacityCheckInput>(DEFAULTS);
  const mutation = useCapacityCheck();
  const result = mutation.data;

  const update = (key: keyof CapacityCheckInput, raw: string) => {
    const num = Number(raw);
    setInputs((prev) => ({ ...prev, [key]: Number.isFinite(num) ? num : 0 }));
  };

  const submit = () => {
    mutation.mutate({ ...inputs, parent_analysis_id: parentAnalysisId });
  };

  const reco = result?.recommendation;
  const recoStyle = reco ? RECO_STYLES[reco] : undefined;

  return (
    <section className="q-card p-4 sm:p-5 flex flex-col gap-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Capacity Check</h3>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
          PLUS · Invoice
        </span>
      </header>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Evaluate whether you can take on a new client without breaking cash flow or quality.
      </p>

      {/* Inputs grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <Label htmlFor={`cc-${f.key}`} className="text-[11px] text-muted-foreground">
              {f.label} <span className="text-muted-foreground/60">({f.suffix})</span>
            </Label>
            <Input
              id={`cc-${f.key}`}
              type="number"
              inputMode="numeric"
              value={inputs[f.key]}
              onChange={(e) => update(f.key, e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        ))}
      </div>

      <Button
        type="button"
        onClick={submit}
        disabled={mutation.isPending}
        className="w-full sm:w-auto sm:self-end"
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking…
          </>
        ) : (
          'Run capacity check'
        )}
      </Button>

      {/* Result */}
      {result && reco && recoStyle && (
        <div className="rounded-lg border border-border/60 bg-background/60 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <recoStyle.Icon className="w-4 h-4" />
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${recoStyle.chip}`}
            >
              {reco.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-sm text-foreground">{result.recommendation_rationale}</p>

          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-muted-foreground">Cash gap</dt>
              <dd className="font-mono text-foreground">
                ${Math.round(result.cash_flow_bridge.gap_during_payment_terms_usd).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Post-acceptance capacity</dt>
              <dd className="font-mono text-foreground">
                {Math.round(result.capacity_assessment.post_acceptance_capacity_pct)}%
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Net margin</dt>
              <dd className="font-mono text-foreground">
                {result.engagement_economics.net_margin_pct.toFixed(1)}%
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Payback</dt>
              <dd className="font-mono text-foreground">
                {result.engagement_economics.payback_period_months.toFixed(1)} mo
              </dd>
            </div>
          </dl>

          {result.conditions.length > 0 && (
            <div className="pt-2 border-t border-border/40">
              <h4 className="text-xs font-semibold text-foreground mb-1.5">Conditions</h4>
              <ul className="space-y-1">
                {result.conditions.map((c, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-[9px] font-mono uppercase text-amber-400 mt-0.5">
                      {c.urgency.replace(/_/g, ' ')}
                    </span>
                    <span>{c.condition}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
