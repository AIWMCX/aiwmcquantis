import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { ExportFormat, DocumentExport } from '@/types/document';
import { toast } from 'sonner';

export function useDocumentExport() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<DocumentExport | null>(null);

  const exportDocument = useCallback(async (
    documentId: string,
    format: ExportFormat
  ): Promise<DocumentExport | null> => {
    if (!user) {
      toast.error('Please sign in to export documents');
      return null;
    }

    setIsExporting(true);
    const idempotencyKey = `${documentId}-${format}-${Date.now()}`;

    try {
      // Create export record
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

      // Call export edge function
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
        // Download the file
        const link = document.createElement('a');
        link.href = data.download_url;
        link.download = `document.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`${format.toUpperCase()} exported successfully!`);
      }

      // Refresh export status
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
  }, [user]);

  return {
    exportDocument,
    isExporting,
    exportStatus,
  };
}
