import React from 'react';
import { useDocuments, useDeleteDocument } from '@/hooks/useDocuments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileText, MoreVertical, Pencil, Trash2, Plus, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Document, DocumentStatus } from '@/types/document';

interface DocumentsListProps {
  onEdit: (document: Document) => void;
  onNew: () => void;
}

const STATUS_COLORS: Record<DocumentStatus, string> = {
  draft: 'border-amber-500 text-amber-700 dark:text-amber-400',
  review: 'border-blue-500 text-blue-700 dark:text-blue-400',
  final: 'bg-emerald-500 text-white border-emerald-500',
};

export function DocumentsList({ onEdit, onNew }: DocumentsListProps) {
  const { data: documents, isLoading } = useDocuments();
  const { mutate: deleteDocument } = useDeleteDocument();
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  const handleDelete = () => {
    if (deleteTarget) {
      deleteDocument(deleteTarget);
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!documents?.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
          <p className="text-muted-foreground text-center mb-4">
            Create your first document from a professional template.
          </p>
          <Button onClick={onNew} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Document
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {documents.map((doc) => (
          <Card
            key={doc.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onEdit(doc)}
          >
            <CardHeader className="py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{doc.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      Updated {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
                    </span>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn('capitalize', STATUS_COLORS[doc.status])}
                  >
                    {doc.status}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(doc); }}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(doc.id); }}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The document will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
