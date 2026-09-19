import React from 'react';
import { Lock, FileText, BarChart3, Layers, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LockedFeaturePreviewProps {
  onUpgrade: () => void;
}

const LOCKED_FEATURES = [
  // "12-page" dropped -- unverified specific figure; see LockedAnalysisPaywall.tsx.
  { icon: FileText, label: 'Export PDF Report', description: 'Investor-grade report' },
  { icon: Layers, label: 'Unlimited Scenarios', description: 'Test pessimistic, optimistic & custom' },
  { icon: BarChart3, label: 'Decision Report', description: 'Business plans, pitch decks, NDAs' },
];

export function LockedFeaturePreview({ onUpgrade }: LockedFeaturePreviewProps) {
  return (
    <div className="q-card relative overflow-hidden">
      {/* Ghosted overlay */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Lock className="w-5 h-5 text-primary" />
        </div>
        <h4 className="text-sm font-semibold text-foreground mb-1">Unlock Full Power</h4>
        <p className="text-xs text-muted-foreground text-center max-w-[260px] mb-4">
          Equivalent to 3–5 hours of senior CFO work. Founders usually pay $500–1,500 for a single deck like this.
        </p>
        <Button onClick={onUpgrade} size="sm" className="gap-1.5">
          <Zap className="w-3.5 h-3.5" />
          Upgrade to Plus
        </Button>
        <span className="text-[10px] text-muted-foreground mt-2">14-day free trial included</span>
      </div>

      {/* Ghosted content underneath */}
      <div className="p-5 space-y-3 opacity-40 select-none pointer-events-none" aria-hidden="true">
        {LOCKED_FEATURES.map((feat) => (
          <div key={feat.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
            <feat.icon className="w-5 h-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{feat.label}</p>
              <p className="text-xs text-muted-foreground">{feat.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
