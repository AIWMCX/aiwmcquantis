import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useDocumentDownload } from './useDocumentDownload';
import type { ExportFormat, DocumentExport } from '@/types/document';
import { toast } from 'sonner';

export function useDocumentExport() {
  const { user } = useAuth();
  const { downloadPDF, downloadHTML } = useDocumentDownload();
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<DocumentExport | null>(null);

  const exportDocument = useCallback(async (
    documentId: string,
    format: ExportFormat,
    previewHTML?: string
  ): Promise<DocumentExport | null> => {
    if (!user) {
      toast.error('Please sign in to export documents');
      return null;
    }

    setIsExporting(true);

    try {
      // For PDF and HTML, use client-side download (produces real formatted output)
      if ((format === 'pdf' || format === 'html') && previewHTML) {
        if (format === 'pdf') {
          downloadPDF(previewHTML);
        } else {
          downloadHTML(previewHTML);
        }
        toast.success(`${format.toUpperCase()} exported successfully!`);
        setIsExporting(false);
        return null;
      }

      // For markdown, use the edge function (which works correctly)
      const idempotencyKey = `${documentId}-${format}-${Date.now()}`;

      const { data: exportRecord, error: insertError } = await supabase
        .from('document_exports')
        .insert({
          document_id: documentId,
          user_id: user.id,
          format,
          status: 'pending',
          idempotency_key: idempotencyKey,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to start export: ${insertError.message}`);
      }

      setExportStatus(exportRecord as DocumentExport);

      const { data, error } = await supabase.functions.invoke('export-document', {
        body: {
          document_id: documentId,
          export_id: exportRecord.id,
          format,
        },
      });

      if (error) {
        throw new Error(`Export failed: ${error.message}`);
      }

      if (data?.download_url) {
        const link = document.createElement('a');
        link.href = data.download_url;
        link.download = `document.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`${format.toUpperCase()} exported successfully!`);
      }

      const { data: updatedExport } = await supabase
        .from('document_exports')
        .select()
        .eq('id', exportRecord.id)
        .single();

      setExportStatus(updatedExport as DocumentExport);
      return updatedExport as DocumentExport;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      toast.error(message);
      return null;
    } finally {
      setIsExporting(false);
    }
  }, [user, downloadPDF, downloadHTML]);

  return {
    exportDocument,
    isExporting,
    exportStatus,
  };
}
