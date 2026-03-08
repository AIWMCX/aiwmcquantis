import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface DocJob {
  job_id: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  output_url: string | null;
  error_message: string | null;
  processing_ms: number | null;
}

export function useDocQueue() {
  const { user } = useAuth();
  const [activeJob, setActiveJob] = useState<DocJob | null>(null);

  // Subscribe to realtime updates for active job
  useEffect(() => {
    if (!activeJob || activeJob.status === 'complete' || activeJob.status === 'failed') return;

    const channel = supabase
      .channel(`doc-job-${activeJob.job_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'doc_generation_jobs',
          filter: `job_id=eq.${activeJob.job_id}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          setActiveJob({
            job_id: row.job_id as string,
            status: row.status as DocJob['status'],
            output_url: row.output_url as string | null,
            error_message: row.error_message as string | null,
            processing_ms: row.processing_ms as number | null,
          });

          if (row.status === 'complete') {
            toast.success('Document ready for download!');
          } else if (row.status === 'failed') {
            toast.error(`Generation failed: ${row.error_message || 'Unknown error'}`);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeJob?.job_id, activeJob?.status]);

  const queueDocument = useCallback(
    async (analysisId: string | null, templateId: string, inputData: Record<string, unknown>) => {
      if (!user) {
        toast.error('Sign in to generate documents');
        return null;
      }

      const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const { error } = await supabase.from('doc_generation_jobs').insert({
        job_id: jobId,
        user_id: user.id,
        analysis_id: analysisId,
        template_id: templateId,
        input_data: inputData,
        status: 'queued',
        priority: 5,
      });

      if (error) {
        toast.error(`Failed to queue: ${error.message}`);
        return null;
      }

      const job: DocJob = {
        job_id: jobId,
        status: 'queued',
        output_url: null,
        error_message: null,
        processing_ms: null,
      };

      setActiveJob(job);

      // Trigger the worker edge function (fire-and-forget)
      supabase.functions.invoke('process-doc-job', {
        body: { job_id: jobId },
      }).catch((err) => {
        console.warn('Worker trigger failed, job will be picked up by cron:', err);
      });

      return job;
    },
    [user],
  );

  const clearJob = useCallback(() => setActiveJob(null), []);

  return {
    activeJob,
    isProcessing: activeJob?.status === 'queued' || activeJob?.status === 'processing',
    queueDocument,
    clearJob,
  };
}
