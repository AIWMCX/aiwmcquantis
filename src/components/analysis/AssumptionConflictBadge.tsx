import React, { useState } from 'react';
import { AlertCircle, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export interface ConflictItem {
  id: string;
  message: string;
  explanation: string;
  lever?: string; // which lever to scroll to
  severity: 'warning' | 'error';
}

interface AssumptionConflictBadgeProps {
  conflicts: ConflictItem[];
  onFixClick?: (lever: string) => void;
}

export function AssumptionConflictBadge({ conflicts, onFixClick }: AssumptionConflictBadgeProps) {
  if (conflicts.length === 0) return null;

  const hasErrors = conflicts.some(c => c.severity === 'error');

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all',
            hasErrors
              ? 'bg-[var(--q-status-red-bg)] text-[var(--q-status-red)] border border-[var(--q-status-red-border)] animate-pulse-subtle'
              : 'bg-[var(--q-status-yellow-bg)] text-[var(--q-status-yellow)] border border-[var(--q-status-yellow-border)]'
          )}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[var(--q-status-yellow)]" />
            Assumption Conflicts
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {conflicts.map((conflict) => (
            <div
              key={conflict.id}
              className={cn(
                'p-4 rounded-lg border-l-4',
                conflict.severity === 'error'
                  ? 'bg-[var(--q-status-red-bg)] border-l-[var(--q-status-red)]'
                  : 'bg-[var(--q-status-yellow-bg)] border-l-[var(--q-status-yellow)]'
              )}
            >
              <p className="text-sm font-medium text-foreground">{conflict.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{conflict.explanation}</p>
              {conflict.lever && onFixClick && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFixClick(conflict.lever!)}
                  className="mt-2 h-7 px-2 text-xs gap-1 text-[var(--q-accent-primary)]"
                >
                  Fix in Levers Lab <ArrowRight className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
