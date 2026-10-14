import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { trackCtaClick } from '@/lib/analytics';
import { InView, SectionLabel } from '@/components/sadewa/primitives';

/**
 * WhoItsFor — homepage discovery section.
 *
 * Exists to keep /consultants and /use-cases reachable from the homepage
 * body (both were previously orphaned with zero internal links). The first
 * card serves the primary path on this same page — it scrolls to the hero
 * form instead of competing with it.
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

  const cards = [
    {
      n: '01',
      title: 'Founders & Operators',
      body: 'Deciding whether to commit your own capital, time, or the next hire. Run the analysis on this page — no signup for the first result.',
      cta: 'Start above',
      onClick: scrollToHero,
    },
    {
      n: '02',
      title: 'Consultants & Fractional CFOs',
      body: "Pre-screening client engagements or stress-testing a deck before a board meeting. White-labeled exports, your firm's name on the cover.",
      cta: 'See how it fits your practice',
      onClick: goToConsultants,
    },
    {
      n: '03',
      title: 'Something else',
      body: 'Pricing changes, a hiring decision, a new location, a pivot — see the full range of decisions Quantis is built to stress-test.',
      cta: 'Browse use cases',
      onClick: goToUseCases,
    },
  ];

  return (
    <section aria-labelledby="who-its-for-heading" className="sdw-section">
      <div className="sdw-container">
        <SectionLabel>Who it's for</SectionLabel>
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-6 lg:gap-16 lg:items-end">
          <h2 id="who-its-for-heading" className="sdw-h2">Built for whoever has to answer “will this actually work?”</h2>
          <p className="sdw-lead text-[17px] lg:justify-self-end max-w-[460px]">
            The math is the same either way. Who's asking the question changes what you need from the report.
          </p>
        </div>

        <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-2">
          {cards.map((c, i) => (
            <InView key={c.n} delay={i * 100}>
              <button
                type="button"
                onClick={c.onClick}
                className="sdw-card sdw-white group h-full w-full text-left p-6 md:p-8 flex flex-col min-h-[300px] focus:outline-none focus-visible:ring-2"
                style={{ ['--tw-ring-color' as string]: 'var(--sdw-blue)', background: 'var(--sdw-surface)' }}
              >
                <span className="sdw-label text-[12px]" style={{ color: 'var(--sdw-muted)' }}>/{c.n}</span>
                <h3 className="mt-auto pt-16 text-[26px] font-bold leading-tight" style={{ letterSpacing: '-0.03em', color: 'var(--sdw-ink)' }}>{c.title}</h3>
                <p className="sdw-body mt-3" style={{ color: 'var(--sdw-ink-2)' }}>{c.body}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-[15px] font-medium" style={{ color: 'var(--sdw-blue-ink)' }}>
                  {c.cta}
                  <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:rotate-45" aria-hidden="true" />
                </span>
              </button>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}
