/**
 * REPORT STORE SERVICE
 *
 * CRUD operations for the report_outputs table.
 * Stores full QuantisReport JSON for regeneration without re-running the engine.
 *
 * @module ReportStore
 * @version 1.0.0
 */

import { supabase } from '@/integrations/supabase/client';
import type { QuantisReport } from '@/types/report-schema';

export interface ReportOutputRecord {
  id: string;
  analysis_id: string | null;
  user_id: string | null;
  report_json: QuantisReport;
  pdf_url: string | null;
  version: string;
  created_at: string;
}

/**
 * Save a QuantisReport to the report_outputs table.
 * Returns the inserted row id.
 */
export async function saveReportOutput(
  analysisId: string | null,
  userId: string,
  report: QuantisReport,
  pdfUrl?: string
): Promise<string> {
  const { data, error } = await supabase
    .from('report_outputs')
    .insert({
      analysis_id: analysisId,
      user_id: userId,
      report_json: report as unknown as Record<string, unknown>,
      pdf_url: pdfUrl ?? null,
      version: report.version,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to save report output: ${error.message}`);
  }

  return data.id;
}

/**
 * Fetch a single report output by id.
 */
export async function getReportOutput(
  reportId: string
): Promise<QuantisReport | null> {
  const { data, error } = await supabase
    .from('report_outputs')
    .select('report_json')
    .eq('id', reportId)
    .single();

  if (error || !data) return null;

  return data.report_json as unknown as QuantisReport;
}

/**
 * List all report outputs for a given user, newest first.
 */
export async function getReportsForUser(
  userId: string
): Promise<ReportOutputRecord[]> {
  const { data, error } = await supabase
    .from('report_outputs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch reports: ${error.message}`);
  }

  return (data ?? []).map(row => ({
    ...row,
    report_json: row.report_json as unknown as QuantisReport,
  }));
}
