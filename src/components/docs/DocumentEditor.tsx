import React, { useCallback, useEffect, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorToolbar } from './EditorToolbar';
import { ExportPanel } from './ExportPanel';
import { useUpdateDocument } from '@/hooks/useDocuments';
import { useDocumentDownload } from '@/hooks/useDocumentDownload';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useDebouncedCallback } from '@/lib/utils';
import type { Document, DocumentStatus, ExportFormat } from '@/types/document';
import { toast } from 'sonner';

interface DocumentEditorProps {
  document: Document;
  onBack?: () => void;
}

export function DocumentEditor({ document, onBack }: DocumentEditorProps) {
  const { mutate: updateDocument, isPending: isSaving } = useUpdateDocument();
  const { downloadPDF, downloadHTML, isDownloading } = useDocumentDownload();
  const [title, setTitle] = React.useState(document.title);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [status, setStatus] = React.useState<DocumentStatus>(document.status);

  // Determine initial editor content: use htmlSnapshot if available, otherwise document_json
  const initialContent = useMemo(() => {
    const docJson = document.document_json as Record<string, unknown>;
    
    // Check if we have an HTML snapshot stored (from saveAndDownload)
    const htmlSnapshot = (docJson?.attrs as Record<string, unknown>)?.htmlSnapshot as string | undefined;
    if (htmlSnapshot) {
      // Let TipTap parse the HTML directly
      return htmlSnapshot;
    }

    // Check if the doc JSON is a stub (just a paragraph with "Document generated from...")
    const content = docJson?.content as Array<Record<string, unknown>> | undefined;
    if (content?.length === 1) {
      const firstNode = content[0];
      const textContent = (firstNode?.content as Array<Record<string, unknown>>)?.[0]?.text as string;
      if (textContent?.startsWith('Document generated from')) {
        return '<p>This document was created before rich content saving was enabled. You can edit it here or create a new one from a template.</p>';
      }
    }

    // Valid TipTap JSON — use as-is
    return docJson;
  }, [document.document_json]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: 'border-collapse border border-border w-full' },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: { class: 'border border-border p-2' },
      }),
      TableHeader.configure({
        HTMLAttributes: { class: 'border border-border p-2 bg-muted font-semibold' },
      }),
      Placeholder.configure({ placeholder: 'Start writing...' }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  // Debounced autosave
  const debouncedSave = useDebouncedCallback(
    (json: Record<string, unknown>) => {
      updateDocument(
        {
          documentId: document.id,
          documentJson: json,
          title,
        },
        {
          onSuccess: () => setLastSaved(new Date()),
        }
      );
    },
    2000
  );

  // Handle editor updates
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const json = editor.getJSON();
      debouncedSave(json as Record<string, unknown>);
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, debouncedSave]);

  // Handle title changes
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    debouncedSave(editor?.getJSON() as Record<string, unknown>);
  }, [editor, debouncedSave]);

  const handleStatusChange = useCallback((newStatus: DocumentStatus) => {
    setStatus(newStatus);
    updateDocument({
      documentId: document.id,
      status: newStatus,
    });
  }, [document.id, updateDocument]);

  // Export handler for ExportPanel
  const handleExport = useCallback((format: ExportFormat) => {
    if (!editor) return;
    const html = editor.getHTML();
    
    switch (format) {
      case 'pdf':
        downloadPDF(html, title);
        break;
      case 'html':
        downloadHTML(html, title);
        break;
      case 'md':
        // Convert HTML to basic markdown (simple approach)
        const mdContent = html
          .replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1\n')
          .replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1\n')
          .replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1\n')
          .replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n')
          .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
          .replace(/<em>(.*?)<\/em>/g, '*$1*')
          .replace(/<[^>]+>/g, '');
        
        const blob = new Blob([mdContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = `${title || 'document'}.md`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Markdown file downloaded');
        break;
      case 'docx':
        toast.info('DOCX export coming soon');
        break;
    }
  }, [editor, downloadPDF, downloadHTML, title]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4 border-b border-border">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <Input
            value={title}
            onChange={handleTitleChange}
            className="text-lg font-semibold border-0 shadow-none focus-visible:ring-0 px-0 max-w-xl"
            placeholder="Untitled Document"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : lastSaved ? (
            <span className="text-emerald-600 dark:text-emerald-400">Saved</span>
          ) : null}
        </div>
      </div>

      {/* Toolbar */}
      <EditorToolbar editor={editor} />

      {/* Editor content */}
      <div className="flex-1 overflow-auto bg-background">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="bg-card border border-border rounded-lg shadow-sm min-h-[600px]">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* ExportPanel replaces inline export dropdown */}
      <ExportPanel
        onExport={handleExport}
        isExporting={isDownloading}
        status={status}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}

// Default export for lazy loading
export default DocumentEditor;
