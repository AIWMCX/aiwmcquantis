/**
 * MyDocuments — per-user download history.
 *
 * Reads public.export_jobs (RLS-scoped to auth.uid()) and shows each PDF /
 * Doc Studio export the user has generated, newest first. File re-download
 * lands in the follow-up commit that wires Supabase Storage; for now the
 * page confirms every download is recorded and surfaces failure reasons
 * instead of a bare red inline error.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageSEO } from '@/components/seo/PageSEO';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, FileText, CheckCircle2, XCircle, Clock, Download } from 'lucide-react';

interface ExportJobRow {
  id: string;
  analysis_id: string | null;
  status: 'processing' | 'succeeded' | 'failed';
  file_url: string | null;
  filename: string | null;
  kind: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

const KIND_LABEL: Record<string, string> = {
  pdf_report: 'Executive PDF',
  doc_studio: 'Doc Studio',
  invoice: 'Invoice',
  other: 'Document',
};

function StatusChip({ status }: { status: ExportJobRow['status'] }) {
  if (status === 'succeeded') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
        <CheckCircle2 className="w-3 h-3" /> Saved
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
        <XCircle className="w-3 h-3" /> Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
      <Clock className="w-3 h-3" /> Processing
    </span>
  );
}

export default function MyDocuments() {
  const [rows, setRows] = useState<ExportJobRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('export_jobs')
          .select('id, analysis_id, status, file_url, filename, kind, error_message, created_at, completed_at')
          .order('created_at', { ascending: false })
          .limit(100);
        if (cancelled) return;
        if (error) {
          logger.warn('MyDocuments load failed', error.message);
          setLoadError(error.message);
          setRows([]);
          return;
        }
        setRows((data ?? []) as ExportJobRow[]);
      } catch (err) {
        if (cancelled) return;
        logger.warn('MyDocuments load threw', err);
        setLoadError('Could not load your documents right now.');
        setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppLayout>
      <PageSEO
        title="My Documents | AIWMC Quantis"
        description="Every PDF, Doc Studio export, and invoice you've generated."
        canonical="/app/documents"
        noindex={true}
      />
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link to="/app">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            My Documents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every download you've generated is saved here.
          </p>
        </div>

        {rows === null && (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}

        {rows !== null && rows.length === 0 && !loadError && (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-foreground font-medium">No documents yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Run an analysis and export the PDF — it will appear here automatically.
            </p>
          </div>
        )}

        {loadError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500">
            {loadError}
          </div>
        )}

        {rows !== null && rows.length > 0 && (
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {rows.map((row) => (
              <div key={row.id} className="flex items-start gap-3 p-4">
                <FileText className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground truncate">
                      {row.filename ?? 'Untitled document'}
                    </span>
                    <StatusChip status={row.status} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>{KIND_LABEL[row.kind ?? 'other'] ?? row.kind ?? 'Document'}</span>
                    <span>{new Date(row.created_at).toLocaleString()}</span>
                  </div>
                  {row.status === 'failed' && row.error_message && (
                    <p className="text-xs text-red-500 mt-1 break-words">
                      Reason: {row.error_message}
                    </p>
                  )}
                </div>
                {row.file_url && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={row.file_url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-1" />
                      Open
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
