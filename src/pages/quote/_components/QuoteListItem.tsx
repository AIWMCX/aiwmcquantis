import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import type { ServiceJob } from '@/lib/service-job/types';

function fmt(n: number | undefined | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export function QuoteListItem({ job }: { job: ServiceJob }) {
  const price = job.quote_result?.price_bands.balanced.price;
  const to = job.quote_result ? `/quote/${job.id}/result` : `/quote/${job.id}`;
  return (
    <Link to={to} className="block">
      <Card className="transition hover:border-primary/50">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{job.client_name || 'Untitled quote'}</p>
              <Badge variant="secondary" className="capitalize">{job.status}</Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {job.trade_id} · {new Date(job.created_at).toLocaleDateString()} ·{' '}
              {job.scope_items?.length ?? 0} item{(job.scope_items?.length ?? 0) === 1 ? '' : 's'}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-lg font-semibold tabular-nums">{fmt(price)}</p>
            <p className="text-[10px] uppercase text-muted-foreground">Balanced</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}
