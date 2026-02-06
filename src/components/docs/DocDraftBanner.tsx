import React from 'react';
import { RotateCcw, X, Clock, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DocDraftBannerProps {
  hasDraft: boolean;
  draftAge: string | null;
  isSaving: boolean;
  lastSaved: Date | null;
  onRestore: () => void;
  onDismiss: () => void;
  className?: string;
}

export function DocDraftBanner({
  hasDraft,
  draftAge,
  isSaving,
  lastSaved,
  onRestore,
  onDismiss,
  className,
}: DocDraftBannerProps) {
  // Show draft recovery prompt
  if (hasDraft) {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-3 p-3 rounded-lg',
          'bg-primary/5 border border-primary/20',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-sm text-foreground">
            You have unsaved work from <strong>{draftAge}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onRestore}
            className="gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restore
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Dismiss
          </Button>
        </div>
      </div>
    );
  }

  // Show save status indicator
  if (isSaving || lastSaved) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-xs text-muted-foreground',
          className
        )}
      >
        {isSaving ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Saving draft...</span>
          </>
        ) : lastSaved ? (
          <>
            <Check className="w-3 h-3 text-success" />
            <span>Draft saved {formatTimeAgo(lastSaved)}</span>
          </>
        ) : null}
      </div>
    );
  }

  return null;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
