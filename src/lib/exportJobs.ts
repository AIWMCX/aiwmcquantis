import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export type ExportJobKind = 'pdf_report' | 'doc_studio' | 'invoice' | 'other';
export type ExportJobStatus = 'processing' | 'succeeded' | 'failed';

export interface ExportJobStartInput {
  analysisId: string | null;
  filename: string;
  kind: ExportJobKind;
}

/**
 * Best-effort telemetry — a failure here MUST NEVER interrupt the user's
 * download. On any error we log and return null; callers proceed as if
 * nothing happened.
 */
export async function logExportStart(input: ExportJobStartInput): Promise<string | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from('export_jobs')
      .insert({
        user_id: userId,
        analysis_id: input.analysisId,
        filename: input.filename,
        kind: input.kind,
        status: 'processing',
      })
      .select('id')
      .single();

    if (error) {
      logger.warn('exportJobs.logExportStart failed', error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (err) {
    logger.warn('exportJobs.logExportStart threw', err);
    return null;
  }
}

export async function logExportComplete(
  jobId: string | null,
  status: Exclude<ExportJobStatus, 'processing'>,
  errorMessage?: string,
): Promise<void> {
  if (!jobId) return;
  try {
    const { error } = await supabase
      .from('export_jobs')
      .update({
        status,
        error_message: errorMessage ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
    if (error) logger.warn('exportJobs.logExportComplete failed', error.message);
  } catch (err) {
    logger.warn('exportJobs.logExportComplete threw', err);
  }
}
