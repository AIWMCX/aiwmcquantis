import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function GuaranteeBanner() {
  return (
    <div className="flex items-center justify-center gap-3 py-4 px-6 rounded-xl bg-success/5 border border-success/20 max-w-xl mx-auto">
      <ShieldCheck className="w-6 h-6 text-success flex-shrink-0" />
      <div className="text-center sm:text-left">
        <p className="text-sm font-semibold text-foreground">
          14-Day Money-Back Guarantee
        </p>
        <p className="text-xs text-muted-foreground">
          Not satisfied? Get a full refund, no questions asked.
        </p>
      </div>
    </div>
  );
}
