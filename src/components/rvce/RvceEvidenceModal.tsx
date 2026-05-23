/**
 * RvceEvidenceModal — Phase 1B
 *
 * Per-variable evidence drawer: shows ALL fan-out observations
 * (up to RVCE_OBS_CAP[tier] = 20 / 40 / 100) with source, snippet,
 * value, and confidence. Mounted from RvceValidationSection via
 * "View all N observations" button.
 */
import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export interface RvceObservation {
  source: string;
  snippet: string;
  metric_estimate: number;
  units: string;
  confidence: number;
  url?: string;
}

interface Props {
  metric: string;
  observations: RvceObservation[];
  median?: number | null;
  p25?: number | null;
  p75?: number | null;
  tierCap: number;
  trigger?: React.ReactNode;
}

export default function RvceEvidenceModal({
  metric,
  observations,
  median,
  p25,
  p75,
  tierCap,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return observations;
    return observations.filter(
      (o) =>
        o.source?.toLowerCase().includes(t) ||
        o.snippet?.toLowerCase().includes(t) ||
        String(o.metric_estimate).includes(t),
    );
  }, [observations, q]);

  const label = metric.replace(/_/g, ' ');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            View all {observations.length} observations
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="capitalize">{label} — fan-out evidence</DialogTitle>
          <DialogDescription>
            {observations.length}/{tierCap} observations gathered.{' '}
            {median != null && (
              <>
                Median <span className="font-mono">{median}</span> · IQR{' '}
                <span className="font-mono">
                  {p25 ?? '–'} … {p75 ?? '–'}
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Filter by source or snippet…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mb-3"
        />

        <div className="overflow-y-auto flex-1 -mx-1 px-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background border-b">
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-2 w-10">#</th>
                <th className="py-2 pr-2">Source</th>
                <th className="py-2 pr-2 text-right">Value</th>
                <th className="py-2 pr-2 text-right">Conf.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, i) => (
                <tr key={i} className="border-b last:border-0 align-top">
                  <td className="py-2 pr-2 text-muted-foreground">{i + 1}</td>
                  <td className="py-2 pr-2">
                    <div className="font-medium">
                      {o.url ? (
                        <a
                          href={o.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2 hover:text-primary"
                        >
                          {o.source || '(unnamed)'}
                        </a>
                      ) : (
                        o.source || '(unnamed)'
                      )}
                    </div>
                    {o.snippet && (
                      <div className="text-muted-foreground text-xs mt-1 leading-snug">
                        {o.snippet}
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-right font-mono whitespace-nowrap">
                    {o.metric_estimate} {o.units}
                  </td>
                  <td className="py-2 pr-2 text-right">
                    <Badge variant={o.confidence > 0.7 ? 'default' : 'secondary'}>
                      {(o.confidence * 100).toFixed(0)}%
                    </Badge>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    No observations match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
