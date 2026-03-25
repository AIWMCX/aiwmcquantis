import React from 'react';
import { Share2, FileText, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NextStepsBarProps {
  onShare: () => void;
  onExport: () => void;
  onNewAnalysis: () => void;
  isSharing?: boolean;
  isExporting?: boolean;
}

export function NextStepsBar({ onShare, onExport, onNewAnalysis, isSharing, isExporting }: NextStepsBarProps) {
  return (
    <div className="sticky bottom-0 z-40 animate-fade-in">
      <div
        className="mx-auto max-w-3xl rounded-t-xl border border-b-0 border-border bg-card/95 backdrop-blur-md px-4 py-3 shadow-lg"
        style={{ boxShadow: 'var(--q-shadow-elevated)' }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center mb-2.5">
          What's next?
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onShare}
            disabled={isSharing}
            className="gap-1.5 min-h-[40px] text-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share with co-founder
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={isExporting}
            className="gap-1.5 min-h-[40px] text-xs"
          >
            <FileText className="w-3.5 h-3.5" />
            Export as PDF
          </Button>
          <Button
            size="sm"
            onClick={onNewAnalysis}
            className="gap-1.5 min-h-[40px] text-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Run another idea
          </Button>
        </div>
      </div>
    </div>
  );
}
