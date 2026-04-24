import React, { useRef, useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { useAnalysisHistory } from '@/hooks/useAnalysisHistory';
import { ViralCard } from '@/components/viral/ViralCard';
import { Button } from '@/components/ui/button';
import { Download, Image, RefreshCw, ArrowLeft, Twitter, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { AnalysisHistoryEntry } from '@/types/analysis';

import { logger } from '@/lib/logger';
type Variant = 'twitter' | 'reddit';

export default function ViralContent() {
  const { history, isLoaded, hasHistory, refresh, isSyncing } = useAnalysisHistory();
  const [generating, setGenerating] = useState<string | null>(null);
  const [variant, setVariant] = useState<Variant>('twitter');
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const downloadCard = useCallback(async (entry: AnalysisHistoryEntry) => {
    const node = cardRefs.current[entry.id];
    if (!node) return;

    setGenerating(entry.id);
    try {
      // Render twice — first pass warms fonts
      await toPng(node, { quality: 1, pixelRatio: 2 });
      const dataUrl = await toPng(node, { quality: 1, pixelRatio: 2 });

      const link = document.createElement('a');
      link.download = `quantis-${entry.idea.slice(0, 30).replace(/\s+/g, '-').toLowerCase()}-${variant}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Card downloaded!');
    } catch (err) {
      logger.error('Failed to generate image:', err);
      toast.error('Failed to generate image. Try again.');
    } finally {
      setGenerating(null);
    }
  }, [variant]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/app" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-foreground">Viral Content Studio</h1>
              <p className="text-xs text-muted-foreground">Download shareable cards from your analyses</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={variant === 'twitter' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVariant('twitter')}
              className="gap-1.5"
            >
              <Twitter className="w-3.5 h-3.5" /> Twitter
            </Button>
            <Button
              variant={variant === 'reddit' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVariant('reddit')}
              className="gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Reddit
            </Button>
            <Button variant="ghost" size="sm" onClick={refresh} disabled={isSyncing}>
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {!isLoaded ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasHistory ? (
          <div className="text-center py-20">
            <Image className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No analyses yet</h2>
            <p className="text-muted-foreground mb-6">Run your first analysis to generate shareable cards.</p>
            <Link to="/app">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {history.map((entry) => (
              <div key={entry.id} className="space-y-3">
                {/* Preview label + download button */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm truncate max-w-md">
                      {entry.idea}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {entry.location} · {new Date(entry.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => downloadCard(entry)}
                    disabled={generating === entry.id}
                    className="gap-1.5"
                  >
                    {generating === entry.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    Download PNG
                  </Button>
                </div>

                {/* Card preview (scaled down for viewport) */}
                <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
                  <div className="overflow-x-auto">
                    <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '1200px', height: variant === 'twitter' ? '675px' : '628px' }}>
                      <ViralCard
                        ref={(el) => { cardRefs.current[entry.id] = el; }}
                        result={entry.result}
                        variant={variant}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
