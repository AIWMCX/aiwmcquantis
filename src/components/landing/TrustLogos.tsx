import React from 'react';

const TRUST_LOGOS = [
  { name: 'Y Combinator Alumni', abbr: 'YC' },
  { name: 'TechStars', abbr: 'TS' },
  { name: 'Stanford Founders', abbr: 'SF' },
  { name: '500 Startups', abbr: '500' },
  { name: 'Harvard Business', abbr: 'HBS' },
];

export function TrustLogos() {
  return (
    <section className="py-8 md:py-12 border-b border-border bg-muted/30">
      <div className="container max-w-5xl mx-auto px-4 sm:px-6">
        <p className="text-center text-sm text-muted-foreground mb-6">
          Trusted by founders from
        </p>
        
        <div className="flex items-center justify-center gap-6 md:gap-10 flex-wrap">
          {TRUST_LOGOS.map((logo, index) => (
            <div
              key={logo.name}
              className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity duration-300 grayscale hover:grayscale-0"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Logo placeholder - styled text badge */}
              <div className="flex items-center justify-center px-3 py-1.5 rounded-lg bg-card border border-border">
                <span className="text-sm font-bold text-muted-foreground">
                  {logo.abbr}
                </span>
              </div>
              <span className="hidden sm:inline text-xs text-muted-foreground font-medium">
                {logo.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
