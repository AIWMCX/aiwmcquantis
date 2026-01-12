import React from 'react';
import { FileText, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DraftRecoveryBannerProps {
  draftAge: string | null;
  onRestore: () => void;
  onDismiss: () => void;
  className?: string;
}

export function DraftRecoveryBanner({
  draftAge,
  onRestore,
  onDismiss,
  className,
}: DraftRecoveryBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 p-3 rounded-lg",
        "bg-primary/5 border border-primary/20",
        "animate-in slide-in-from-top-2 duration-300",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-md bg-primary/10">
          <FileText className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            Unsaved draft found
          </p>
          <p className="text-xs text-muted-foreground">
            Saved {draftAge}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-8 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onRestore}
          className="h-8 gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restore
        </Button>
      </div>
    </div>
  );
}
