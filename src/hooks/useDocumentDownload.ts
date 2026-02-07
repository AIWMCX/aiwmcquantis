import { useCallback, useState } from 'react';
import { toast } from 'sonner';

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
  const downloadPDF = useCallback((html: string, title?: string) => {
    if (!html) {
      toast.error('No content to download. Fill in the form first.');
      return;
    }

    setIsDownloading(true);

    try {
      const docTitle = title || 'Document';
      const printWindow = window.open('', '_blank', 'width=900,height=700');

      if (!printWindow) {
        toast.error('Pop-up blocked. Please allow pop-ups for this site.');
        setIsDownloading(false);
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>${docTitle}</title>
          <style>
            @page {
              size: A4;
              margin: 15mm 20mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
              color: #1f2937;
              background: #fff;
              margin: 0;
              padding: 20px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            table {
              border-collapse: collapse;
              width: 100%;
            }
            th, td {
              padding: 8px 12px;
              text-align: left;
            }
            @media print {
              body {
                padding: 0;
              }
              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="
            background: #f0f4f8; 
            border: 1px solid #d1d5db; 
            border-radius: 8px; 
            padding: 16px 24px; 
            margin-bottom: 24px; 
            display: flex; 
            align-items: center; 
            justify-content: space-between;
            font-family: 'Segoe UI', Arial, sans-serif;
          ">
            <div>
              <p style="margin: 0; font-weight: 600; color: #1f2937;">Ready to download</p>
              <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">
                Use <strong>Ctrl+P</strong> (or <strong>Cmd+P</strong> on Mac) → Save as PDF
              </p>
            </div>
            <button onclick="window.print()" style="
              background: #2563eb; 
              color: white; 
              border: none; 
              padding: 10px 24px; 
              border-radius: 6px; 
              font-size: 14px; 
              font-weight: 600; 
              cursor: pointer;
            ">
              Print / Save as PDF
            </button>
          </div>
          ${html}
        </body>
        </html>
      `);

      printWindow.document.close();

      // Auto-trigger print after content loads
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 300);
      };

      toast.success('PDF preview opened — save from print dialog');
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to generate PDF');
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
