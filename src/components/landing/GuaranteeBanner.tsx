import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function GuaranteeBanner() {
  return (
    <div className="flex items-center justify-center gap-3 py-4 px-6 rounded-xl bg-success/5 border border-success/20 max-w-xl mx-auto">
      <ShieldCheck className="w-6 h-6 text-success flex-shrink-0" />
      <div className="text-center sm:text-left">
        <p className="text-sm font-semibold text-foreground">
          14-day money-back guarantee on Plus and Pro
        </p>
        <p className="text-xs text-muted-foreground">
          Full refund within 14 days of your first charge, no questions asked. Renewals and founder-assisted reviews have their own terms.
        </p>
      </div>
    </div>
  );
}
