import React from 'react';
import { Lock, Eye, Shield, Server } from 'lucide-react';

const TRUST_BADGES = [
  { icon: Lock, label: 'AES-256 Encrypted' },
  { icon: Eye, label: 'GDPR Compliant' },
  { icon: Shield, label: 'No Data Sold' },
  { icon: Server, label: 'Open Audit Trail' },
];

export function TrustLogos() {
  return (
    <section className="py-6 md:py-8 border-b border-border bg-muted/30">
      <div className="container max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-center gap-5 md:gap-8 flex-wrap">
          {TRUST_BADGES.map((badge) => (
            <div
              key={badge.label}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <badge.icon className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium">{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
