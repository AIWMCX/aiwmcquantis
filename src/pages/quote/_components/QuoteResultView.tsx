import { useMemo, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Download, Copy, Edit, Send, Loader2 } from 'lucide-react';
import { PriceBandCard } from './PriceBandCard';
import { RiskFlagCard } from './RiskFlagCard';
import { ServiceQuoteReport } from '@/components/pdf/ServiceQuoteReport';
import {
  createJob,
  getOutcome,
  logPdfGenerated,
  updateJob,
} from '@/services/serviceJob';
import { useQuery } from '@tanstack/react-query';
import type { ServiceJob } from '@/lib/service-job/types';

interface Props {
  job: ServiceJob;
  onRefresh?: () => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export function QuoteResultView({ job, onRefresh }: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const q = job.quote_result;

  const { data: outcome } = useQuery({
    queryKey: ['service-job-outcome', job.id],
    queryFn: () => getOutcome(job.id),
    enabled: !!job.id,
  });

  const breakdown = useMemo(() => {
    if (!q) return [];
    // Synthesize a simple breakdown from baseline_cost + balanced price.
    const cost = q.baseline_cost;
    const price = q.price_bands.balanced.price;
    const profit = Math.max(0, price - cost);
    // Heuristic split based on profile (good enough for visual table).
    const labor = cost * 0.6;
    const materials = cost * 0.3;
    const overhead = cost * 0.1;
    return [
      { label: 'Labor', value: labor, pct: labor / price },
      { label: 'Materials', value: materials, pct: materials / price },
      { label: 'Overhead', value: overhead, pct: overhead / price },
      { label: 'Profit', value: profit, pct: profit / price },
    ];
  }, [q]);

  if (!q) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No quote calculated yet. Open the wizard and finish step 4 to compute.
        </CardContent>
      </Card>
    );
  }

  const mcLossPct = q.monte_carlo.loss_probability * 100;
  const mcBelowPct = q.monte_carlo.prob_margin_below_target * 100;

  const handlePdf = async () => {
    try {
      setBusy('pdf');
      const t0 = performance.now();
      const blob = await pdf(<ServiceQuoteReport job={job} />).toBlob();
      const durationMs = Math.round(performance.now() - t0);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quote-${(job.client_name || job.id).replace(/\W+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      logPdfGenerated(job.id, durationMs);
      toast.success('PDF downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF');
    } finally {
      setBusy(null);
    }
  };

  const handleMarkSent = async () => {
    try {
      setBusy('sent');
      await updateJob(job.id, { status: 'sent' });
      toast.success('Marked as sent');
      onRefresh?.();
    } catch (e) {
      toast.error('Could not update status');
    } finally {
      setBusy(null);
    }
  };

  const handleDuplicate = async () => {
    try {
      setBusy('dup');
      const dup = await createJob({
        trade_id: job.trade_id,
        client_name: job.client_name ? `${job.client_name} (copy)` : null,
        site_address: job.site_address,
        site_zip: job.site_zip,
        building_type: job.building_type,
        year_built: job.year_built ?? null,
        scope_items: job.scope_items,
        modifiers: job.modifiers,
        pricing_profile: job.pricing_profile,
      });
      toast.success('Duplicated');
      navigate(`/quote/${dup.id}`);
    } catch (e) {
      toast.error('Could not duplicate');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Price bands */}
      <div className="grid gap-3 md:grid-cols-3">
        <PriceBandCard variant="aggressive" band={q.price_bands.aggressive} probMarginBelowTargetPct={mcBelowPct} />
        <PriceBandCard variant="balanced" band={q.price_bands.balanced} probLossPct={mcLossPct} probMarginBelowTargetPct={mcBelowPct} />
        <PriceBandCard variant="defensive" band={q.price_bands.defensive} probLossPct={mcLossPct} />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handlePdf} disabled={busy === 'pdf'} className="min-h-[44px]">
          {busy === 'pdf' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Send as PDF
        </Button>
        <Button variant="outline" onClick={() => navigate(`/quote/${job.id}`)} className="min-h-[44px]">
          <Edit className="mr-2 h-4 w-4" /> Adjust
        </Button>
        <Button variant="outline" onClick={handleMarkSent} disabled={busy === 'sent' || job.status === 'sent'} className="min-h-[44px]">
          <Send className="mr-2 h-4 w-4" /> Mark as Sent
        </Button>
        <Button variant="outline" onClick={handleDuplicate} disabled={busy === 'dup'} className="min-h-[44px]">
          <Copy className="mr-2 h-4 w-4" /> Duplicate
        </Button>
      </div>

      {/* Cost breakdown */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Cost breakdown (at balanced price)
          </h3>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {breakdown.map((row, i) => (
              <div
                key={row.label}
                className={
                  i === 0 ? 'bg-primary'
                  : i === 1 ? 'bg-primary/70'
                  : i === 2 ? 'bg-primary/40'
                  : 'bg-emerald-500'
                }
                style={{ width: `${row.pct * 100}%` }}
                title={`${row.label}: ${fmt(row.value)}`}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {breakdown.map((row) => (
              <div key={row.label}>
                <p className="text-xs text-muted-foreground">{row.label}</p>
                <p className="font-mono font-medium tabular-nums">{fmt(row.value)}</p>
                <p className="text-[10px] text-muted-foreground">{(row.pct * 100).toFixed(0)}%</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk pre-mortem */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Pre-mortem — what could go wrong
        </h3>
        {q.risks.length === 0 ? (
          <Card><CardContent className="p-4 text-sm text-muted-foreground">No major risks flagged.</CardContent></Card>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {q.risks.slice(0, 5).map((r) => (
              <RiskFlagCard key={r.code} risk={r} />
            ))}
          </div>
        )}
      </div>

      {/* Actual vs estimated (only if outcome exists) */}
      {outcome && outcome.actual_total_cost != null && (
        <Card>
          <CardContent className="space-y-2 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Actual vs estimated
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Est. cost</p>
                <p className="font-mono font-medium">{fmt(q.baseline_cost)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Actual cost</p>
                <p className="font-mono font-medium">{fmt(outcome.actual_total_cost)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="font-mono font-medium">{fmt(outcome.actual_revenue ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Variance</p>
                <p className="font-mono font-medium">
                  {(((outcome.actual_total_cost - q.baseline_cost) / q.baseline_cost) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Beta feedback link — zero-cost signal channel */}
      <div className="pt-2 text-center text-xs text-muted-foreground">
        <a
          href={`mailto:feedback@aiwmcquantis.com?subject=${encodeURIComponent(
            `Quote Engine Feedback — ${job.id}`,
          )}&body=${encodeURIComponent(
            `Job ID: ${job.id}\nTrade: ${job.trade_id}\n\nWhat worked / what felt wrong:\n`,
          )}`}
          className="underline-offset-2 hover:underline"
        >
          Send beta feedback on this quote →
        </a>
      </div>
    </div>
  );
}
    </div>
  );
}
