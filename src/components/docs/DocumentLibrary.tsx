import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Search,
  Download,
  MoreHorizontal,
  Trash2,
  Share2,
  FileText,
  Scale,
  Settings,
  Code,
  ChevronLeft,
  ChevronRight,
  Star,
} from 'lucide-react';
import { getUserDocumentLibrary, type GeneratedDocument } from '@/services/docs-engine';
import { useDocSignals } from '@/hooks/useDocSignals';
import { cn } from '@/lib/utils';

interface DocumentLibraryProps {
  userId: string;
}

type FilterTab = 'all' | 'invoices' | 'reports';

const PAGE_SIZE = 20;

const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  finance: <FileText className="w-4 h-4 text-emerald-600" />,
  legal: <Scale className="w-4 h-4 text-amber-600" />,
  operations: <Settings className="w-4 h-4 text-blue-600" />,
  tech: <Code className="w-4 h-4 text-purple-600" />,
};

export function DocumentLibrary({ userId }: DocumentLibraryProps) {
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [page, setPage] = useState(0);
  const [ratingDoc, setRatingDoc] = useState<GeneratedDocument | null>(null);
  const [hoveredStar, setHoveredStar] = useState(0);

  const { recordSignal } = useDocSignals();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getUserDocumentLibrary(userId, { limit: 200 })
      .then((docs) => {
        if (!cancelled) setDocuments(docs);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const filtered = useMemo(() => {
    let result = documents;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) => d.title.toLowerCase().includes(q));
    }

    if (activeFilter === 'invoices') {
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes('invoice') ||
          d.template_id?.toLowerCase().includes('invoice')
      );
    } else if (activeFilter === 'reports') {
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes('report') ||
          d.title.toLowerCase().includes('plan') ||
          d.title.toLowerCase().includes('analysis')
      );
    }

    return result;
  }, [documents, searchQuery, activeFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCategoryFromTemplate = (doc: GeneratedDocument) => {
    const json = doc.document_json as any;
    return json?.brand?.category || json?.category || 'finance';
  };

  const handleDownload = useCallback(
    (doc: GeneratedDocument) => {
      recordSignal(doc.id, 'downloaded', undefined, {
        template_id: doc.template_id,
        title: doc.title,
      });
      // Trigger actual download if there's a URL in the doc JSON
      const json = doc.document_json as any;
      if (json?.fileUrl) {
        window.open(json.fileUrl, '_blank');
      }
    },
    [recordSignal],
  );

  const handleShare = useCallback(
    (doc: GeneratedDocument) => {
      recordSignal(doc.id, 'shared', undefined, {
        template_id: doc.template_id,
        title: doc.title,
      });
      // Copy share link to clipboard
      const shareUrl = `${window.location.origin}/shared/${doc.share_token || doc.id}`;
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    },
    [recordSignal],
  );

  const handleRate = useCallback(
    (doc: GeneratedDocument, rating: number) => {
      recordSignal(doc.id, 'rated', rating, {
        template_id: doc.template_id,
        title: doc.title,
      });
      setRatingDoc(null);
      setHoveredStar(0);
    },
    [recordSignal],
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Document Library
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <Tabs
              value={activeFilter}
              onValueChange={(v) => {
                setActiveFilter(v as FilterTab);
                setPage(0);
              }}
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Document List */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : paged.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground text-sm">
                {searchQuery
                  ? 'No documents match your search.'
                  : 'No documents yet — run an analysis to generate your first document.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {paged.map((doc) => {
                const cat = getCategoryFromTemplate(doc);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="shrink-0">
                      {CATEGORY_ICON_MAP[cat] ?? (
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(doc.created_at)}
                        {doc.status && (
                          <>
                            {' · '}
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {doc.status}
                            </Badge>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Rate"
                        onClick={() => setRatingDoc(doc)}
                      >
                        <Star className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Download"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleShare(doc)}>
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{' '}
                {filtered.length}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rating Dialog */}
      <Dialog open={!!ratingDoc} onOpenChange={(open) => !open && setRatingDoc(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rate this document</DialogTitle>
            <DialogDescription className="truncate">
              {ratingDoc?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-2 py-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className="p-1 transition-transform hover:scale-110"
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => ratingDoc && handleRate(ratingDoc, star)}
              >
                <Star
                  className={cn(
                    'w-8 h-8 transition-colors',
                    star <= hoveredStar
                      ? 'fill-primary text-primary'
                      : 'text-muted-foreground'
                  )}
                />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
