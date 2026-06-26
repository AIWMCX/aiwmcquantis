import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocGenerationProgressProps {
  jobId: string;
  templateName: string;
  estimatedMs: number;
  onComplete: (fileUrl: string) => void;
  onError: (message: string) => void;
}

export function DocGenerationProgress({
  jobId,
  templateName,
  estimatedMs,
  onComplete,
  onError,
}: DocGenerationProgressProps) {
  const [status, setStatus] = useState<'generating' | 'complete' | 'failed'>('generating');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channelName = `doc_jobs:${jobId}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'doc_generation_jobs',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          if (newRow.status === 'complete') {
            setStatus('complete');
            onComplete(newRow.output_url ?? '');
          } else if (newRow.status === 'failed') {
            setStatus('failed');
            onError(newRow.error_message ?? 'Generation failed');
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [jobId, onComplete, onError]);

  const estimatedSeconds = Math.round(estimatedMs / 1000);

  return (
    <Card className="border-dashed">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center gap-3">
          {status === 'generating' && (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          )}
          {status === 'complete' && (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          )}
          {status === 'failed' && (
            <AlertCircle className="w-5 h-5 text-destructive" />
          )}
          <div>
            <p className="text-sm font-medium">
              {status === 'generating' && `${templateName} — Generating...`}
              {status === 'complete' && `${templateName} — Ready!`}
              {status === 'failed' && `${templateName} — Failed`}
            </p>
            {status === 'generating' && (
              <p className="text-xs text-muted-foreground">
                ~{estimatedSeconds} seconds • You'll be notified when ready
              </p>
            )}
          </div>
        </div>

        {status === 'generating' && (
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                'h-full rounded-full bg-primary',
                'animate-[progress-fill_ease-in-out_forwards]'
              )}
              style={{
                animation: `progress-fill ${estimatedMs}ms ease-in-out forwards`,
              }}
            />
            <style>{`
              @keyframes progress-fill {
                from { width: 0%; }
                to { width: 95%; }
              }
            `}</style>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
