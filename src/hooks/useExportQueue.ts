import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ExportStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed';

interface ExportJob {
  id: string;
  status: ExportStatus;
  file_url: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

interface UseExportQueueReturn {
  queueExport: (analysisId: string) => Promise<string | null>;
  status: ExportStatus;
  progress: number;
  fileUrl: string | null;
  error: string | null;
  reset: () => void;
  isPolling: boolean;
}

const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_ATTEMPTS = 45; // 90 seconds max

export function useExportQueue(): UseExportQueueReturn {
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptsRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
    pollAttemptsRef.current = 0;
  }, []);

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('export_jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();

      if (fetchError) {
        console.error('Poll error:', fetchError);
        return;
      }

      if (!data) {
        console.warn('Job not found:', jobId);
        return;
      }

      const job = data as ExportJob;

      // Update progress based on status
      if (job.status === 'pending') {
        setProgress(25);
      } else if (job.status === 'processing') {
        // Simulate progress during processing
        setProgress(prev => Math.min(prev + 10, 85));
      }

      if (job.status === 'completed') {
        setStatus('completed');
        setProgress(100);
        setFileUrl(job.file_url);
        stopPolling();
        
        // Auto-download the file
        if (job.file_url) {
          const link = document.createElement('a');
          link.href = job.file_url;
          link.download = `analysis-report-${new Date().toISOString().split('T')[0]}.pdf`;
          link.click();
        }
      } else if (job.status === 'failed') {
        setStatus('failed');
        setError(job.error_message || 'Export failed');
        stopPolling();
      }

      // Check max attempts
      pollAttemptsRef.current++;
      if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
        setStatus('failed');
        setError('Export timed out. Please try again.');
        stopPolling();
      }
    } catch (err) {
      console.error('Poll exception:', err);
    }
  }, [stopPolling]);

  const queueExport = useCallback(async (analysisId: string): Promise<string | null> => {
    // Reset state
    setStatus('pending');
    setProgress(10);
    setFileUrl(null);
    setError(null);
    pollAttemptsRef.current = 0;

    try {
      // Generate idempotency key
      const idempotencyKey = `${analysisId}-${Date.now()}`;

      // Call the queue-export edge function
      const { data, error: invokeError } = await supabase.functions.invoke('queue-export', {
        body: {
          analysis_id: analysisId,
          idempotency_key: idempotencyKey,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to queue export');
      }

      if (!data?.job_id) {
        throw new Error('No job ID returned');
      }

      const jobId = data.job_id;
      setProgress(20);

      // Start polling
      setIsPolling(true);
      pollIntervalRef.current = setInterval(() => {
        pollJobStatus(jobId);
      }, POLL_INTERVAL);

      // Initial poll
      await pollJobStatus(jobId);

      return jobId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setStatus('failed');
      setError(message);
      toast.error('Export failed', { description: message });
      return null;
    }
  }, [pollJobStatus]);

  const reset = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setProgress(0);
    setFileUrl(null);
    setError(null);
  }, [stopPolling]);

  return {
    queueExport,
    status,
    progress,
    fileUrl,
    error,
    reset,
    isPolling,
  };
}
