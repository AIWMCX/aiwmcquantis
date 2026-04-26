import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
/**
 * Client-side document download hook.
 * Generates PDF via print dialog or downloads raw markdown/HTML.
 */
export function useDocumentDownload() {
  const [isDownloading, setIsDownloading] = useState(false);

  /**
   * Opens a print-to-PDF dialog with the preview HTML rendered in a new window.
   * The user can save as PDF from the browser print dialog.
   */
  /**
   * Renders the document HTML into a hidden iframe and triggers the browser's
   * native "Save as PDF" via the print API. We deliberately avoid window.print()
   * on the host window and instead invoke print() on the iframe's contentWindow
   * — this keeps the canonical PDF export pipeline (@react-pdf/renderer via
   * usePdfExport) authoritative for analysis exports while still giving
   * DocsStudio HTML templates a clean PDF path.
   */
  const downloadPDF = useCallback(async (html: string, title?: string) => {
    if (!html) {
      toast.error('No content to download. Fill in the form first.');
      return;
    }

    setIsDownloading(true);

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';

    try {
      const docTitle = title || 'Document';

      const cleanup = () => {
        try { document.body.removeChild(iframe); } catch { /* noop */ }
      };

      document.body.appendChild(iframe);

      const doc = iframe.contentDocument;
      if (!doc) throw new Error('Failed to create offscreen document.');

      doc.open();
      doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${docTitle}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 24px; color: #111827; }
  @page { size: A4; margin: 18mm; }
</style>
</head>
<body>${html}</body>
</html>`);
      doc.close();

      // Wait for iframe to load, then trigger native save-as-PDF.
      await new Promise<void>((resolve) => {
        const onReady = () => resolve();
        if (doc.readyState === 'complete') onReady();
        else iframe.addEventListener('load', onReady, { once: true });
      });

      // Small delay so fonts/images settle before the print snapshot.
      await new Promise((r) => setTimeout(r, 250));

      const win = iframe.contentWindow;
      if (!win) throw new Error('Offscreen window unavailable.');
      win.focus();
      win.print();

      // Browser print dialog is modal; clean up shortly after it closes.
      setTimeout(cleanup, 1000);
      toast.success('Save the file from your browser print dialog');
    } catch (error) {
      logger.error('PDF download error:', error);
      toast.error('Failed to generate PDF');
      try { document.body.removeChild(iframe); } catch { /* noop */ }
    } finally {
      setIsDownloading(false);
    }
  }, []);

  /**
   * Downloads the preview HTML as a standalone .html file
   */
  const downloadHTML = useCallback((html: string, title?: string) => {
    if (!html) {
      toast.error('No content to download. Fill in the form first.');
      return;
    }

    const docTitle = title || 'Document';
    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${docTitle}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; max-width: 800px; margin: 0 auto; padding: 32px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { padding: 8px 12px; text-align: left; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;

    const blob = new Blob([fullHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docTitle.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('HTML document downloaded');
  }, []);

  return {
    downloadPDF,
    downloadHTML,
    isDownloading,
  };
}
