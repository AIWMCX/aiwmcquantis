import React from 'react';
import { ArrowLeft, FileDown, Share2, RefreshCw, Loader2, Zap, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ResultsTopBarProps {
  ideaName: string;
  location?: string;
  confidenceScore: number;
  onExportPDF: () => void;
  onShare?: () => void;
  onReset?: () => void;
  isGeneratingPdf: boolean;
  isSharing: boolean;
}

export function ResultsTopBar({
  ideaName,
  location,
  confidenceScore,
  onExportPDF,
  onShare,
  onReset,
  isGeneratingPdf,
  isSharing,
}: ResultsTopBarProps) {
  const confidenceLabel = confidenceScore >= 90 ? 'VERIFIED' : confidenceScore >= 70 ? 'CONFIDENT' : 'ESTIMATED';

  return (
    <div className="sticky top-0 z-30 bg-[var(--q-bg-surface)]/95 backdrop-blur-sm border-b border-[var(--q-border-subtle)] px-4 py-2.5">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Left: back + name */}
        <div className="flex items-center gap-3 min-w-0">
          {onReset && (
            <button onClick={onReset} className="p-1.5 rounded-lg hover:bg-[var(--q-bg-elevated)] transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4 text-[var(--q-text-secondary)]" />
            </button>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--q-text-primary)] truncate" style={{ fontFamily: 'var(--q-font-heading)' }}>
              {ideaName}
            </p>
            {location && (
              <p className="text-xs text-[var(--q-text-tertiary)] flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 shrink-0" /> {location}
              </p>
            )}
          </div>
        </div>

        {/* Center: confidence badge */}
        <Badge className={cn(
          "shrink-0 gap-1",
          confidenceScore >= 90 ? 'q-badge-success' :
          confidenceScore >= 70 ? 'q-badge-ai' : 'q-badge-warning'
        )}>
          <Zap className="w-3 h-3" />
          <span className="text-xs font-bold tabular-nums">{confidenceLabel} {confidenceScore}%</span>
        </Badge>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button onClick={onExportPDF} variant="outline" size="sm" className="gap-1.5 text-xs h-8" disabled={isGeneratingPdf}>
            {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Download</span>
          </Button>
          {onShare && (
            <Button onClick={onShare} variant="outline" size="sm" className="gap-1.5 text-xs h-8" disabled={isSharing}>
              {isSharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Share</span>
            </Button>
          )}
          {onReset && (
            <Button onClick={onReset} variant="ghost" size="sm" className="gap-1.5 text-xs h-8">
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
