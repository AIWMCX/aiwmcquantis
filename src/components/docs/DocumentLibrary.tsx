import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import { getUserDocumentLibrary, type GeneratedDocument } from '@/services/docs-engine';
import { useDocSignals } from '@/hooks/useDocSignals';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface DocumentLibraryProps {
  userId: string;
}

type FilterTab = 'all' | 'starred' | 'invoices' | 'reports';

const PAGE_SIZE = 20;

const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  finance: <FileText className="w-4 h-4 text-[var(--q-accent-primary)]" />,
  legal: <Scale className="w-4 h-4 text-[var(--q-status-yellow)]" />,
  operations: <Settings className="w-4 h-4 text-[var(--q-chart-1)]" />,
  tech: <Code className="w-4 h-4 text-[var(--q-accent-secondary)]" />,
};

const FILTER_TABS: { value: FilterTab; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: null },
  { value: 'starred', label: 'Starred', icon: <Star className="w-3.5 h-3.5" /> },
  { value: 'invoices', label: 'Invoices', icon: <FileText className="w-3.5 h-3.5" /> },
  { value: 'reports', label: 'Reports', icon: null },
];

export function DocumentLibrary({ userId }: DocumentLibraryProps) {
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [page, setPage] = useState(0);
  const [ratingDoc, setRatingDoc] = useState<GeneratedDocument | null>(null);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

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
    return () => { cancelled = true; };
  }, [userId]);

  const filtered = useMemo(() => {
    let result = documents;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) => d.title.toLowerCase().includes(q));
    }
    if (activeFilter === 'starred') {
      result = result.filter((d) => starredIds.has(d.id));
    } else if (activeFilter === 'invoices') {
      result = result.filter((d) =>
        d.title.toLowerCase().includes('invoice') || d.template_id?.toLowerCase().includes('invoice')
      );
    } else if (activeFilter === 'reports') {
      result = result.filter((d) =>
        d.title.toLowerCase().includes('report') || d.title.toLowerCase().includes('plan') || d.title.toLowerCase().includes('analysis')
      );
    }
    return result;
  }, [documents, searchQuery, activeFilter, starredIds]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getCategoryFromTemplate = (doc: GeneratedDocument) => {
    const json = doc.document_json as any;
    return json?.brand?.category || json?.category || 'finance';
  };

  const toggleStar = useCallback((id: string) => {
    setStarredIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDownload = useCallback((doc: GeneratedDocument) => {
    recordSignal(doc.id, 'downloaded', undefined, { template_id: doc.template_id, title: doc.title });
    const json = doc.document_json as any;
    if (json?.fileUrl) window.open(json.fileUrl, '_blank');
  }, [recordSignal]);

  const handleShare = useCallback((doc: GeneratedDocument) => {
    recordSignal(doc.id, 'shared', undefined, { template_id: doc.template_id, title: doc.title });
    const shareUrl = `${window.location.origin}/shared/${(doc as any).share_token || doc.id}`;
    navigator.clipboard.writeText(shareUrl).catch(() => {});
  }, [recordSignal]);

  const handleRate = useCallback((doc: GeneratedDocument, rating: number) => {
    recordSignal(doc.id, 'rated', rating, { template_id: doc.template_id, title: doc.title });
    setRatingDoc(null);
    setHoveredStar(0);
  }, [recordSignal]);

  return (
    <>
      <div className="q-card rounded-[var(--q-radius-lg)] border border-[var(--q-border-default)] bg-[var(--q-bg-surface)] p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--q-text-primary)] flex items-center gap-2" style={{ fontFamily: 'var(--q-font-heading)' }}>
            <FileText className="w-5 h-5 text-[var(--q-accent-primary)]" />
            Document Library
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs text-[var(--q-text-tertiary)] gap-1">
                Most Recent <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Most Recent</DropdownMenuItem>
              <DropdownMenuItem>Name A-Z</DropdownMenuItem>
              <DropdownMenuItem>Oldest</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--q-text-tertiary)]" />
            <Input
              placeholder="Search documents..."
              className="pl-9 bg-[var(--q-bg-elevated)] border-[var(--q-border-default)]"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            />
          </div>
          <div className="flex gap-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setActiveFilter(tab.value); setPage(0); }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  activeFilter === tab.value
                    ? 'bg-[var(--q-accent-primary)] text-white border-[var(--q-accent-primary)]'
                    : 'bg-[var(--q-bg-elevated)] text-[var(--q-text-secondary)] border-[var(--q-border-default)] hover:border-[var(--q-border-strong)]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Document List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-[var(--q-radius-md)] bg-[var(--q-bg-elevated)] animate-pulse" />
            ))}
          </div>
        ) : paged.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-[var(--q-bg-elevated)] flex items-center justify-center">
              <FileText className="w-8 h-8 text-[var(--q-text-tertiary)]" />
            </div>
            <h4 className="text-base font-semibold text-[var(--q-text-secondary)]" style={{ fontFamily: 'var(--q-font-heading)' }}>
              No documents yet
            </h4>
            <p className="text-sm text-[var(--q-text-tertiary)]">
              Generate your first document from any analysis
            </p>
            <Link to="/app">
              <Button className="mt-2 gap-1.5">
                <ArrowRight className="w-4 h-4" />
                Go to Latest Analysis
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-1.5">
            {paged.map((doc) => {
              const cat = getCategoryFromTemplate(doc);
              const isStarred = starredIds.has(doc.id);
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-[var(--q-radius-md)] border border-transparent bg-[var(--q-bg-elevated)] hover:border-[var(--q-border-default)] hover:shadow-sm transition-all"
                >
                  <div className="shrink-0">
                    {CATEGORY_ICON_MAP[cat] ?? <FileText className="w-4 h-4 text-[var(--q-text-tertiary)]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--q-text-primary)] truncate">{doc.title}</p>
                    <p className="text-xs text-[var(--q-text-tertiary)]">
                      {formatDate(doc.created_at)}
                      {doc.status && (
                        <>
                          {' · '}
                          <Badge variant="outline" className="text-[10px] px-1 py-0">{doc.status}</Badge>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleStar(doc.id)}
                    >
                      <Star className={cn('w-4 h-4', isStarred ? 'fill-[var(--q-accent-primary)] text-[var(--q-accent-primary)]' : 'text-[var(--q-text-tertiary)]')} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Download" onClick={() => handleDownload(doc)}>
                      <Download className="w-4 h-4 text-[var(--q-text-tertiary)]" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4 text-[var(--q-text-tertiary)]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleShare(doc)}>
                          <Share2 className="w-4 h-4 mr-2" /> Share link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRatingDoc(doc)}>
                          <Star className="w-4 h-4 mr-2" /> Rate
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
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
            <p className="text-xs text-[var(--q-text-tertiary)]">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Rating Dialog */}
      <Dialog open={!!ratingDoc} onOpenChange={(open) => !open && setRatingDoc(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rate this document</DialogTitle>
            <DialogDescription className="truncate">{ratingDoc?.title}</DialogDescription>
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
                    star <= hoveredStar ? 'fill-[var(--q-accent-primary)] text-[var(--q-accent-primary)]' : 'text-[var(--q-text-tertiary)]'
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
