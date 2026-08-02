import React from 'react';
import { Link } from 'react-router-dom';
import { History, Trash2, ExternalLink, Clock, MapPin, TrendingUp, Cloud, CloudOff, Loader2, LogIn, RefreshCw, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnalysisHistory } from '@/hooks/useAnalysisHistory';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import type { AnalysisHistoryEntry, BusinessAnalysisResult } from '@/types/analysis';
import { getMonthlyProfit, getPaybackMonths } from '@/types/analysis';
import { formatPaybackDisplay } from '@/lib/formatPayback';

interface AnalysisHistoryProps {
  onSelect: (result: BusinessAnalysisResult, analysisId: string) => void;
  onClone?: (idea: string, location: string) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    notation: 'compact',
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AnalysisHistory({ onSelect, onClone }: AnalysisHistoryProps) {
  const {
    history,
    isLoaded,
    isSyncing,
    isAuthenticated,
    removeEntry,
    clearHistory,
    hasHistory,
    refresh,
    loadMore,
    hasMore,
    isLoadingMore,
  } = useAnalysisHistory();

  const { containerRef, pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: refresh,
    threshold: 80,
  });

  // Infinite scroll: load next page when sentinel comes into view.
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const el = sentinelRef.current;
    const root = (containerRef as React.RefObject<HTMLElement>).current ?? null;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { root, rootMargin: '120px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore, containerRef]);

  const indicatorOpacity = Math.min(pullDistance / 40, 1);
  const indicatorRotation = (pullDistance / 80) * 180;
  const isThresholdReached = pullDistance >= 80;

  if (!isLoaded) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="w-5 h-5 text-primary" />
            Analysis History ({history.length})
            {(isSyncing || isRefreshing) ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : isAuthenticated ? (
              <span title="Synced to cloud"><Cloud className="w-4 h-4 text-primary" /></span>
            ) : (
              <span title="Local only"><CloudOff className="w-4 h-4 text-muted-foreground" /></span>
            )}
          </CardTitle>
          {hasHistory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm('Clear all history?')) {
                  clearHistory();
                }
              }}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      
      {/* Pull-to-refresh container */}
      <CardContent 
        ref={containerRef}
        className="space-y-3 overflow-y-auto max-h-[60vh] relative"
      >
        {/* Pull indicator - visible when pulling */}
        {(pullDistance > 0 || isRefreshing) && isAuthenticated && (
          <div 
            className="flex items-center justify-center py-2 -mt-2 mb-2"
            style={{ 
              opacity: isRefreshing ? 1 : indicatorOpacity,
              transform: `translateY(${Math.min(pullDistance / 2, 20)}px)`
            }}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw 
                className={`w-4 h-4 transition-transform ${isRefreshing ? 'pull-indicator-spin' : ''}`}
                style={{ 
                  transform: isRefreshing ? undefined : `rotate(${indicatorRotation}deg)`,
                  color: isThresholdReached ? 'hsl(var(--primary))' : undefined
                }}
              />
              <span className="text-xs">
                {isRefreshing ? 'Refreshing...' : isThresholdReached ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </div>
          </div>
        )}
        
        {!isAuthenticated && (
          <div className="p-4 rounded-lg bg-muted/50 border border-border mb-4">
            <div className="flex items-start gap-3">
              <LogIn className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Sign in to sync
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your analyses are saved locally. Sign in to save them to the cloud.
                </p>
                <Button asChild variant="link" size="sm" className="px-0 mt-2 h-auto">
                  <Link to="/auth">Sign in or register</Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {!hasHistory ? (
          <div className="py-8 text-center">
            <History className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">History is empty</h3>
            <p className="text-sm text-muted-foreground">
              Your analyses will be saved here automatically
            </p>
          </div>
        ) : (
          history.map((entry: AnalysisHistoryEntry) => (
            <div
              key={entry.id}
              className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer group haptic-btn relative overflow-hidden"
              onClick={() => onSelect(entry.result, entry.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {entry.idea}
                  </h4>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {entry.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(entry.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-muted-foreground">
                      Investment: <span className="font-medium text-foreground">
                        {formatCurrency(entry.result.financial_analysis.startup_investment.total)}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Payback: <span className="font-medium text-foreground">
                        {formatPaybackDisplay(
                          getPaybackMonths(entry.result.financial_analysis),
                          getMonthlyProfit(entry.result.financial_analysis),
                        )}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-success" />
                      <span className="font-medium text-success">
                        {formatCurrency(getMonthlyProfit(entry.result.financial_analysis))}/mo
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onClone && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClone(entry.idea, entry.location);
                      }}
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      aria-label="Clone analysis"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeEntry(entry.id);
                    }}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          ))
        )}
        {hasHistory && hasMore && (
          <div
            ref={sentinelRef}
            className="flex items-center justify-center py-4 text-xs text-muted-foreground"
          >
            {isLoadingMore ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading more…
              </span>
            ) : (
              <span>Scroll to load more</span>
            )}
          </div>
        )}
        {hasHistory && !hasMore && isAuthenticated && (
          <div className="py-3 text-center text-[11px] text-muted-foreground">
            End of history
          </div>
        )}
      </CardContent>
    </Card>
  );
}
