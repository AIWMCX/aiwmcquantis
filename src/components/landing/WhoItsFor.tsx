import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, Briefcase, Compass, ArrowRight } from 'lucide-react';
import { GlassCard, SectionHeader } from '@/components/ui/glass-card';
import { trackCtaClick } from '@/lib/analytics';

const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

/**
 * WhoItsFor — homepage discovery section.
 *
 * REWRITTEN 2026-08-02 (previous version was dead code -- built, styled,
 * but never imported anywhere in the app, confirmed via repo-wide grep).
 * The prior version also had no navigation of any kind (static bullet
 * lists, zero <Link>/onClick), so even if it had been wired in it would not
 * have closed the actual gap it needed to.
 *
 * Root cause this closes: /consultants is a real, fully-built ICP landing
 * page (honest ROI calculator, objection FAQ, white-label pricing) that had
 * zero internal links pointing to it anywhere in the live app -- not the
 * header nav, not the footer, not the homepage body. It was reachable only
 * via a direct URL or a search-engine hit landing exactly on that page.
 * This section (plus the header/mobile-nav entries added alongside it) is
 * the actual fix; the destination page itself needed no rebuild.
 *
 * Deliberately 3 cards, not a persona-marketing wall: the first card
 * (Founders & Operators) is the primary path the rest of this page already
 * serves -- it scrolls to the hero form on this same page, not a separate
 * destination, so it doesn't compete with the main conversion path. The
 * other two are genuine, previously-orphaned destinations.
 */
export function WhoItsFor() {
  const navigate = useNavigate();

  const scrollToHero = () => {
    trackCtaClick('who_its_for_founder', 'who_its_for');
    document.querySelector('[data-hero-form]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goToConsultants = () => {
    trackCtaClick('who_its_for_consultant', 'who_its_for');
    navigate('/consultants');
  };

  const goToUseCases = () => {
    trackCtaClick('who_its_for_use_cases', 'who_its_for');
    navigate('/use-cases');
  };

  return (
    <section aria-labelledby="who-its-for-heading" className="aiwmc-section-wash py-16 md:py-24">
      <div className="container max-w-5xl mx-auto px-4 sm:px-6">
        <SectionHeader
          eyebrow="Who it's for"
          title="Built for whoever has to answer &ldquo;will this actually work?&rdquo;"
          subtitle="The math is the same either way. Who's asking the question changes what you need from the report."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 mt-12">
          <GlassCard glow="brand" className="p-6 cursor-pointer" onClick={scrollToHero}>
            <Rocket className="w-6 h-6 mb-4" style={{ color: 'var(--aiwmc-grad-brand)' }} />
            <h3 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
              Founders &amp; Operators
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Deciding whether to commit your own capital, time, or the next
              hire. Run the analysis above — no signup for the first result.
            </p>
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold"
              style={{ ...MONO, color: 'var(--aiwmc-grad-brand)' }}
            >
              Start above <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </GlassCard>

          <GlassCard glow="cyan" revealDelay={80} className="p-6 cursor-pointer" onClick={goToConsultants}>
            <Briefcase className="w-6 h-6 mb-4" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
            <h3 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
              Consultants &amp; Fractional CFOs
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Pre-screening client engagements or stress-testing a deck before
              a board meeting. White-labeled exports, your firm's name on the
              cover.
            </p>
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold"
              style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}
            >
              See how it fits your practice <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </GlassCard>

          <GlassCard glow="violet" revealDelay={160} className="p-6 cursor-pointer" onClick={goToUseCases}>
            <Compass className="w-6 h-6 mb-4" style={{ color: 'var(--aiwmc-grad-violet)' }} />
            <h3 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
              Something else
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Pricing changes, a hiring decision, a new location, a pivot —
              see the full range of decisions Quantis is built to stress-test.
            </p>
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold"
              style={{ ...MONO, color: 'var(--aiwmc-grad-violet)' }}
            >
              Browse use cases <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
