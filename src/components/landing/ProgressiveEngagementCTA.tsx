import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Eye, Zap, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackCtaClick } from '@/lib/analytics';

/**
 * ProgressiveEngagementCTA — Two-tier CTA section.
 * Tier 1 (low friction): "See a real example" — no signup needed.
 * Tier 2 (medium friction): "Run your own analysis" — leads to /app.
 * Reduces bounce by offering a non-committal first step.
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
    <section className="py-16 md:py-24" style={{ background: 'var(--q-bg-surface)' }}>
      <div className="container max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold tracking-wider uppercase mb-3" style={{ color: 'var(--q-accent-primary)' }}>
            See it in action
          </p>
          <h2
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{ color: 'var(--q-text-primary)', fontFamily: 'var(--q-font-heading)' }}
          >
            Don't take our word for it — see real output
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--q-text-secondary)' }}>
            Browse a complete analysis of a real business model. No signup required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Low-friction: See example */}
          <div
            className="relative group cursor-pointer rounded-2xl border p-6 transition-all duration-300 hover:shadow-lg"
            style={{ borderColor: 'var(--q-accent-primary)', background: 'var(--q-accent-glow)' }}
            onClick={handleSeeExample}
          >
            <div className="absolute -top-3 left-4">
              <span
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold uppercase"
                style={{ background: 'var(--q-accent-primary)', color: 'white' }}
              >
                <PlayCircle className="w-3 h-3" />
                Recommended first step
              </span>
            </div>
            <div className="pt-2">
              <Eye className="w-8 h-8 mb-3" style={{ color: 'var(--q-accent-primary)' }} />
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--q-text-primary)' }}>
                See a Real Analysis
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--q-text-secondary)' }}>
                Explore a complete coffee shop analysis — revenue projections, risk flags, competitive landscape. No signup needed.
              </p>
              <span className="inline-flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all" style={{ color: 'var(--q-accent-primary)' }}>
                View example report <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* Medium-friction: Run analysis */}
          <div
            className="relative group cursor-pointer rounded-2xl border p-6 transition-all duration-300 hover:shadow-lg"
            style={{ borderColor: 'var(--q-border-default)', background: 'var(--q-bg-elevated)' }}
            onClick={handleRunAnalysis}
          >
            <div className="pt-2">
              <Zap className="w-8 h-8 mb-3" style={{ color: 'var(--q-status-yellow)' }} />
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--q-text-primary)' }}>
                Run Your Own Analysis
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--q-text-secondary)' }}>
                Enter your business idea and get a full pre-mortem report in 90 seconds. Free — no credit card.
              </p>
              <span className="inline-flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all" style={{ color: 'var(--q-text-primary)' }}>
                Start free analysis <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
