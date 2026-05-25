import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isEnabled } from '@/lib/flags';
import { getJob } from '@/services/serviceJob';
import { QuoteResultView } from './_components/QuoteResultView';

export default function QuoteResult() {
  if (!isEnabled('service_job')) return <Navigate to="/app" replace />;
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading, refetch } = useQuery({
    queryKey: ['service-job', id],
    queryFn: () => getJob(id!),
    enabled: !!id,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4">
        <Link to="/quote">
          <Button variant="ghost" size="sm" className="min-h-[40px]"><ChevronLeft className="mr-1 h-4 w-4" /> All quotes</Button>
        </Link>
      </div>
      {isLoading || !job ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <>
          <header className="mb-6">
            <h1 className="text-2xl font-bold">{job.client_name || 'Quote'}</h1>
            <p className="text-sm text-muted-foreground">
              {job.trade_id} · {job.site_address || job.site_zip || 'No address'}
            </p>
          </header>
          <QuoteResultView job={job} onRefresh={refetch} />
        </>
      )}
    </div>
  );
}
