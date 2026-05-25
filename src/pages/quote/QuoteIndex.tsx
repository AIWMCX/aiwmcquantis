import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Loader2 } from 'lucide-react';
import { isEnabled } from '@/lib/flags';
import { listJobs } from '@/services/serviceJob';
import { QuoteListItem } from './_components/QuoteListItem';

export default function QuoteIndex() {
  if (!isEnabled('service_job')) return <Navigate to="/app" replace />;

  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ['service-jobs'],
    queryFn: () => listJobs(),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Service Quotes</h1>
          <p className="text-sm text-muted-foreground">Field-ready quotes with risk-adjusted pricing.</p>
        </div>
        <Link to="/quote/new">
          <Button className="min-h-[44px]">
            <Plus className="mr-2 h-4 w-4" /> New Quote
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <Card><CardContent className="p-6 text-sm text-destructive">Could not load quotes.</CardContent></Card>
      ) : !jobs || jobs.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <p className="text-lg font-medium">No quotes yet</p>
            <p className="text-sm text-muted-foreground">Start your first 4-step quote in under 2 minutes.</p>
            <Link to="/quote/new"><Button className="min-h-[44px]"><Plus className="mr-2 h-4 w-4" /> Start a quote</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {jobs.map((j) => <li key={j.id}><QuoteListItem job={j} /></li>)}
        </ul>
      )}
    </div>
  );
}
