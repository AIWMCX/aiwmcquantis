import React, { useCallback, useEffect } from 'react';
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
import { useDocumentExport } from '@/hooks/useDocumentExport';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle } from 'lucide-react';
import { cn, useDebouncedCallback } from '@/lib/utils';
import type { Document, DocumentStatus } from '@/types/document';

interface DocumentEditorProps {
  document: Document;
  onBack?: () => void;
}

export function DocumentEditor({ document, onBack }: DocumentEditorProps) {
  const { mutate: updateDocument, isPending: isSaving } = useUpdateDocument();
  const { exportDocument, isExporting } = useDocumentExport();
  const [title, setTitle] = React.useState(document.title);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse border border-border w-full',
        },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-border p-2',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-border p-2 bg-muted font-semibold',
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
    ],
    content: document.document_json as Record<string, unknown>,
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

  const handleExport = useCallback(async (format: 'pdf' | 'docx' | 'md') => {
    await exportDocument(document.id, format);
  }, [document.id, exportDocument]);

  const handleStatusChange = useCallback((status: DocumentStatus) => {
    updateDocument({
      documentId: document.id,
      status,
    });
  }, [document.id, updateDocument]);

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
        <div className="flex-1 max-w-xl">
          <Input
            value={title}
            onChange={handleTitleChange}
            className="text-lg font-semibold border-0 shadow-none focus-visible:ring-0 px-0"
            placeholder="Untitled Document"
          />
        </div>
        <div className="flex items-center gap-3">
          {/* Save status */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : lastSaved ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Saved</span>
              </>
            ) : null}
          </div>
          
          {/* Status badge */}
          <Badge
            variant={document.status === 'final' ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer',
              document.status === 'draft' && 'border-warning text-warning',
              document.status === 'review' && 'border-primary text-primary',
              document.status === 'final' && 'bg-primary'
            )}
          >
            {document.status}
          </Badge>
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

      {/* Export panel */}
      <ExportPanel
        onExport={handleExport}
        isExporting={isExporting}
        status={document.status}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
