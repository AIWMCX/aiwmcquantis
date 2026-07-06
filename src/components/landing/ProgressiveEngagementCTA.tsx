import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackCtaClick } from '@/lib/analytics';
import { GlassCard, SectionHeader } from '@/components/ui/glass-card';

const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

/**
 * ProgressiveEngagementCTA — Two-tier CTA section.
 * Tier 1 (low friction): "See a real example" — no signup needed.
 * Tier 2 (medium friction): "Run your own analysis" — leads to /app.
 * One primary CTA (Run), the example is a ghost link — SoW Screen 2 fix.
 */
export function ProgressiveEngagementCTA() {
  const navigate = useNavigate();

  const handleSeeExample = () => {
    trackCtaClick('see_example_progressive', 'progressive_cta');
    navigate('/examples/coffee-shop-denver');
  };

  const handleRunAnalysis = () => {
    trackCtaClick('run_analysis_progressive', 'progressive_cta');
    navigate('/app');
  };

  return (
    <section aria-labelledby="see-in-action-heading" className="aiwmc-section-wash py-16 md:py-24">
      <div className="container max-w-5xl mx-auto px-4 sm:px-6">
        <SectionHeader
          eyebrow="See it in action"
          title="Don't take our word for it — see real output"
          subtitle="Browse a complete analysis of a real business model. No signup required."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 max-w-3xl mx-auto mt-12">
          {/* Ghost: See example (thumbnail preview, no primary CTA weight) */}
          <GlassCard glow="cyan" className="p-6 cursor-pointer" onClick={handleSeeExample}>
            <div
              className="rounded-lg mb-4 h-24 flex items-center justify-center overflow-hidden"
              style={{ background: 'rgba(103,232,249,0.06)', border: '1px solid rgba(103,232,249,0.18)' }}
            >
              <span className="text-[10px] uppercase tracking-[0.14em]" style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}>
                Coffee Shop · page 1 of 24
              </span>
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
              Read a Real Analysis
            </h3>
            <p className="text-sm mb-4 text-muted-foreground">
              A complete coffee shop report — revenue projections, risk flags, competitive landscape.
            </p>
            <span
              className="inline-flex items-center gap-2 text-sm font-semibold hover:gap-3 transition-all"
              style={{ color: 'var(--aiwmc-grad-cyan)' }}
            >
              View example report <ArrowRight className="w-4 h-4" />
            </span>
          </GlassCard>

          {/* Primary: Run analysis */}
          <GlassCard glow="brand" revealDelay={80} className="p-6">
            <div
              className="rounded-lg mb-4 h-24 flex items-center justify-center overflow-hidden"
              style={{ background: 'rgba(143,255,42,0.06)', border: '1px solid rgba(143,255,42,0.18)' }}
            >
              <span className="text-[10px] uppercase tracking-[0.14em]" style={{ ...MONO, color: 'var(--aiwmc-grad-brand)' }}>
                Industry ▾ · City · Capital
              </span>
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
              Run Your Own Analysis
            </h3>
            <p className="text-sm mb-4 text-muted-foreground">
              Enter your business idea and get a full pre-mortem report in 90 seconds. Free — no credit card.
            </p>
            <Button onClick={handleRunAnalysis} className="w-full gap-2" size="lg">
              Start free analysis <ArrowRight className="w-4 h-4" />
            </Button>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
