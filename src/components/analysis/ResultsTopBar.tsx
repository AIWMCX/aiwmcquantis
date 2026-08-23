import React from 'react';
import { ArrowLeft, FileDown, Share2, RefreshCw, Loader2, Zap, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const confidenceLabel = confidenceScore >= 90 ? 'HIGH CONFIDENCE' : confidenceScore >= 70 ? 'CONFIDENT' : 'ESTIMATED';

  return (
    <div className="sticky top-0 z-[100] h-14 flex items-center border-b border-[var(--q-border-subtle)] px-4"
      style={{ background: 'color-mix(in srgb, var(--q-bg-surface) 85%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >
      <div className="flex items-center justify-between gap-3 w-full max-w-7xl mx-auto">
        {/* Left: back + name + location */}
        <div className="flex items-center gap-3 min-w-0">
          {onReset && (
            <button onClick={onReset} className="flex items-center gap-1.5 text-sm text-[var(--q-text-secondary)] hover:text-[var(--q-text-primary)] transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}
          <div className="h-5 w-px bg-[var(--q-border-subtle)] hidden sm:block" />
          <p className="text-sm font-medium text-[var(--q-text-primary)] truncate" style={{ fontFamily: 'var(--q-font-heading)' }}>
            {ideaName}
          </p>
          {location && (
            <span className="text-xs text-[var(--q-text-secondary)] hidden md:flex items-center gap-1 shrink-0">
              <MapPin className="w-3 h-3" /> {location}
            </span>
          )}
        </div>

        {/* Right: confidence + actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Confidence badge */}
          <span className={cn(
            'hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold tabular-nums',
            confidenceScore >= 90 ? 'q-badge-success' :
            confidenceScore >= 70 ? 'q-badge-ai' : 'q-badge-warning'
          )}>
            <Zap className="w-3 h-3" />
            {confidenceScore}% · {confidenceLabel}
          </span>

          <Button onClick={onExportPDF} variant="outline" size="sm" className="gap-1.5 text-xs h-8" disabled={isGeneratingPdf}>
            {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Download ↓</span>
          </Button>

          {onShare && (
            <Button onClick={onShare} variant="outline" size="sm" className="gap-1.5 text-xs h-8" disabled={isSharing}>
              {isSharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Share</span>
            </Button>
          )}

          {onReset && (
            <Button onClick={onReset} size="sm" className="gap-1.5 text-xs h-8 q-btn-ai text-[var(--q-text-inverse)]">
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Analysis</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
