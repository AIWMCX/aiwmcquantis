import { Sparkles, TrendingUp, AlertTriangle, Lock, RotateCcw, Receipt } from 'lucide-react';
import { TIERS } from '@/config/tiers';
import type { FreeTierAnalysisSummary } from '@/types/analysis';
import { detectQuoteGenTrade } from '@/lib/quotegen-eligibility';

interface FreeTierResultCardProps {
  summary: FreeTierAnalysisSummary;
  onReset: () => void;
}

/**
 * Lightweight results card for the free/anonymous depth. The backend
 * deliberately never sends financial_analysis/business_plan/etc. for this
 * tier (compute-leakage prevention), so this renders only the fields that
 * are actually present — score, verdict, top 3 risks — instead of routing
 * into AccuracyTransparentResults, which assumes the full paid-tier shape.
 */
export function FreeTierResultCard({ summary, onReset }: FreeTierResultCardProps) {
  const { input_completeness, verdict, top_risks, base_revenue, currency, industry_detected, idea, upgrade_cta } = summary;
  const quoteTrade = detectQuoteGenTrade(idea, industry_detected);

  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ background: 'var(--q-bg-surface)', borderColor: 'var(--q-border-subtle)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.06em] px-2.5 py-[3px] rounded-full"
          style={{
            background: 'var(--q-status-ai-bg)',
            border: '1px solid var(--q-status-ai-border)',
            color: 'var(--q-status-ai)',
          }}
        >
          <Sparkles className="w-3 h-3" /> FREE ANALYSIS
        </span>
        {industry_detected && (
          <span className="text-[12px]" style={{ color: 'var(--q-text-tertiary)' }}>
            {industry_detected}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-6">
        {input_completeness !== null && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--q-text-disabled)' }}>
              Input Completeness
            </div>
            <div className="text-[40px] font-bold leading-none" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--q-text-primary)' }}>
              {Math.round(input_completeness)}
              <span className="text-[18px] font-medium" style={{ color: 'var(--q-text-tertiary)' }}>%</span>
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--q-text-tertiary)' }}>
              How much of your own data we used — not a viability score
            </div>
          </div>
        )}
        {verdict && (
          <div className="flex-1 min-w-[200px]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1" style={{ color: 'var(--q-text-disabled)' }}>
              Verdict
            </div>
            <p className="text-[15px] font-medium" style={{ color: 'var(--q-text-primary)' }}>{verdict}</p>
          </div>
        )}
        {base_revenue !== null && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] flex items-center gap-1" style={{ color: 'var(--q-text-disabled)' }}>
              <TrendingUp className="w-3 h-3" /> Est. Monthly Revenue
            </div>
            <div className="text-[20px] font-bold" style={{ color: 'var(--q-text-primary)' }}>
              {currency === 'USD' ? '$' : `${currency} `}
              {Math.round(base_revenue).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {top_risks.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2 flex items-center gap-1" style={{ color: 'var(--q-text-disabled)' }}>
            <AlertTriangle className="w-3 h-3" /> Top Risks
          </div>
          <ul className="space-y-1.5">
            {top_risks.map((risk, i) => (
              <li key={i} className="text-[13px] flex items-start gap-2" style={{ color: 'var(--q-text-secondary)' }}>
                <span style={{ color: 'var(--q-accent-primary)' }}>•</span>
                <span>{typeof risk === 'string' ? risk : JSON.stringify(risk)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {upgrade_cta && (
        <div
          className="rounded-lg p-4 space-y-2"
          style={{ background: 'var(--q-accent-glow)', border: '1px solid var(--q-border-subtle)' }}
        >
          <p className="text-[13px] font-semibold" style={{ color: 'var(--q-text-primary)' }}>
            {upgrade_cta.message}
          </p>
          <ul className="space-y-1">
            {upgrade_cta.features_locked.map((f) => (
              <li key={f} className="text-[12px] flex items-center gap-1.5" style={{ color: 'var(--q-text-tertiary)' }}>
                <Lock className="w-3 h-3 flex-shrink-0" /> {f}
              </li>
            ))}
          </ul>
          <a
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-lg mt-1"
            style={{ background: 'var(--q-accent-primary)', color: 'var(--q-bg-surface)' }}
          >
            Upgrade to Plus (${upgrade_cta.plus_price_monthly ?? TIERS.plus.priceMonthly}/mo, {upgrade_cta.plus_trial_days ?? 14}-day trial) →
          </a>
        </div>
      )}

      {quoteTrade && (
        <a
          href={quoteTrade === 'handyman' ? '/quote/new' : `/quote/new?trade=${quoteTrade}`}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-lg"
          style={{ border: '1px solid var(--q-border-subtle)', color: 'var(--q-text-primary)' }}
        >
          <Receipt className="w-3.5 h-3.5" style={{ color: 'var(--q-accent-primary)' }} />
          Get a job quote for this business →
        </a>
      )}

      <button
        type="button"
        onClick={onReset}
        className="flex items-center gap-1.5 text-[13px] font-medium"
        style={{ color: 'var(--q-text-tertiary)' }}
      >
        <RotateCcw className="w-3.5 h-3.5" /> Run another analysis
      </button>
    </div>
  );
}
