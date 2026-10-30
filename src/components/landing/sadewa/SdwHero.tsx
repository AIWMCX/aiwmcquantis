import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { submitHeroIdea } from '@/lib/hero-idea';
import { isHiringDecision, isPriceDecision } from '@/lib/location-input';
import { trackCtaClick } from '@/lib/analytics';
import { BENCHMARK_COUNT_DISPLAY, BENCHMARK_SOURCES_DISPLAY } from '@/config/canonical-facts';
import { ENGAGEMENT_OFFER } from '@/config/engagement-offers';
import { FEATURED_DIRECTORY_NAMES } from '@/data/featuredDirectoryNames';
import { CharReveal, Img3D, InView, Marquee, RollingNumber, SegmentRule, SplitButton, WordStagger, usePrefersReducedMotion } from '@/components/sadewa/primitives';

const FILM = '/video/quantis-decision-film.mp4';
const POSTER = '/video/quantis-decision-film-poster.jpg';

const LISTED = FEATURED_DIRECTORY_NAMES;

/** Muted, looping preview of the real product film — only plays while on screen. */
function ShowreelCard({ onOpen }: { onOpen: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const v = videoRef.current;
    if (!v || reduced || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => undefined);
      else v.pause();
    }, { threshold: 0.25 });
    io.observe(v);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block w-full overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-4"
      style={{ aspectRatio: '16 / 9', background: 'var(--sdw-space)', ['--tw-ring-color' as string]: 'var(--sdw-blue)' }}
      aria-label="Play the 25-second Quantis product film"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover object-top opacity-80 transition-transform duration-700 group-hover:scale-[1.04]"
        src={FILM}
        poster={POSTER}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
      />
      <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(5,10,26,0.55), rgba(5,10,26,0.15) 45%, rgba(5,10,26,0.6))' }} aria-hidden="true" />
      <span className="sdw-label absolute left-3 top-3 text-[12px]" style={{ color: 'var(--sdw-blue-hi)' }}>/Product film · 0:25</span>
      <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-[var(--sdw-space)] shadow-lg transition-transform duration-300 group-hover:scale-110">
          <Play className="h-5 w-5 translate-x-[1px]" fill="currentColor" />
        </span>
      </span>
      <Img3D name="cursor" className="absolute -bottom-3 right-3 w-20 drop-shadow-xl transition-transform duration-500 group-hover:-translate-y-1 group-hover:-translate-x-1" />
    </button>
  );
}

// One tap fills the input with a concrete plan, so a visitor who doesn't know
// what to type still gets to a first run. They still press "Test it free".
// Each names a business and a "City, ST": the engine models a business, and
// the city drives local calibration (a bare "hire a technician" was read as a
// new SaaS company, 2026-10-25).
export const EXAMPLE_DECISIONS = [
  'Mobile dog-grooming van in Columbus, OH, $85 per groom',
  'Second coffee shop in Denver, CO, $80K build-out',
  'HVAC repair company in Phoenix, AZ, 3 technicians',
];

export function SdwHero({ onWatchFilm }: { onWatchFilm: () => void }) {
  const openFilm = (source: string) => {
    trackCtaClick('hero_watch_film', source);
    onWatchFilm();
  };

  const navigate = useNavigate();
  const [idea, setIdea] = useState('');
  const ideaInput = useRef<HTMLInputElement>(null);
  const ideaOk = idea.trim().length >= 10;
  const runIdea = (e: React.FormEvent) => {
    e.preventDefault();
    trackCtaClick('hero_run_free_decision', 'hero');
    // Hiring decisions run in the hiring model, which compares with and without the hire.
    if (ideaOk && isHiringDecision(idea)) {
      trackCtaClick('hero_hiring_routed', 'hero');
      navigate('/demo/hiring-decision?from=hero');
      return;
    }
    // Price changes run in the price-change model (#106).
    if (ideaOk && isPriceDecision(idea)) {
      trackCtaClick('hero_price_routed', 'hero');
      navigate('/demo/price-change?from=hero');
      return;
    }
    // The run and its progress live in the form section below (ReportFirstHero).
    document.querySelector('[data-hero-form]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (ideaOk) submitHeroIdea(idea.trim());
  };

  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden">
      <div className="sdw-container pt-10 md:pt-14 pb-16 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-10 lg:gap-16 items-start">
          <div>
            <WordStagger
              as="h1"
              id="hero-heading"
              text="Before you invest $50K, understand what it would take to earn it back."
              className="sdw-display"
              keepVisible
              style={{ fontSize: 'clamp(2.75rem, 6.4vw, 6.25rem)' }}
            />
            {/* The real input, on the first screen. 1 of 191 home visitors in
                30 days submitted the form four sections down. */}
            <form onSubmit={runIdea} className="mt-8 max-w-[640px]" aria-label="Test a business decision">
              <label htmlFor="sdw-hero-idea" className="sdw-label text-[12px]" style={{ color: 'var(--sdw-muted)' }}>
                What are you deciding?
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  ref={ideaInput}
                  id="sdw-hero-idea"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  maxLength={300}
                  placeholder="e.g. Second coffee shop in Denver, CO, $80K build-out"
                  className="h-12 flex-1 rounded-md border bg-white px-4 text-[15px] outline-none focus-visible:ring-2"
                  style={{ borderColor: 'var(--sdw-line)', color: 'var(--sdw-ink)', ['--tw-ring-color' as string]: 'var(--sdw-blue)' }}
                />
                <button
                  type="submit"
                  disabled={!ideaOk}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md px-5 text-[15px] font-semibold text-white transition-opacity disabled:opacity-50"
                  style={{ background: 'var(--sdw-blue)' }}
                >
                  Test it free <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Example decisions">
                <span className="text-[12px]" style={{ color: 'var(--sdw-muted)' }}>Try:</span>
                {EXAMPLE_DECISIONS.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      setIdea(ex);
                      trackCtaClick('hero_example_decision', 'hero');
                      ideaInput.current?.focus();
                    }}
                    className="rounded-full border px-3 py-1 text-[12px] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2"
                    style={{ borderColor: 'var(--sdw-line)', color: 'var(--sdw-ink)', ['--tw-ring-color' as string]: 'var(--sdw-blue)' }}
                  >
                    {ex}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[12px]" style={{ color: 'var(--sdw-muted)' }}>
                No account or card needed for the first run · about a minute
              </p>
            </form>
          </div>
          <InView delay={180} className="w-full max-w-[420px] lg:max-w-none lg:pt-3">
            <ShowreelCard onOpen={() => openFilm('hero_showreel')} />
          </InView>
        </div>

        <div className="mt-14 md:mt-20 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="relative flex justify-center lg:justify-start" aria-hidden="true">
            <div
              className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(42,98,255,0.22), transparent 70%)' }}
            />
            <Img3D name="magnifier" priority bob className="relative w-[260px] sm:w-[340px] lg:w-[440px] drop-shadow-[0_40px_60px_rgba(10,30,90,0.25)]" />
          </div>

          <div className="lg:pl-4">
            <CharReveal
              className="sdw-lead"
              text={`Quantis stress-tests your idea against a ${BENCHMARK_COUNT_DISPLAY}-cell modeled benchmark grid informed by ${BENCHMARK_SOURCES_DISPLAY} — and returns a profitability verdict and reliability score with a saveable PDF.`}
            />

            <InView delay={120} className="mt-8 flex flex-col sm:flex-row gap-3">
              <SplitButton variant="secondary" onClick={() => openFilm('hero_secondary')}>Watch the 25s film</SplitButton>
            </InView>
            <p className="mt-4 sdw-label text-[12px]" style={{ color: 'var(--sdw-muted)' }}>
              See a fictional example report first? It's just below.
            </p>
            <p className="mt-3 text-[14px]" style={{ color: 'var(--sdw-muted)' }}>
              Facing one big decision and want a person to check it?{' '}
              <a
                href="/decision-review"
                onClick={() => trackCtaClick('hero_decision_review', 'hero')}
                className="font-semibold underline underline-offset-4"
                style={{ color: 'var(--sdw-ink)' }}
              >
                {ENGAGEMENT_OFFER.founderReview.name}, ${ENGAGEMENT_OFFER.founderReview.price} →
              </a>
            </p>

            <div className="mt-12">
              <SegmentRule />
              <p className="sdw-label mt-4 text-[12px]">
                /Listed on <RollingNumber value={LISTED.length} as="span" /> founder &amp; AI directories
              </p>
              <Marquee duration={60} className="mt-5" label="Directories listing AIWMC Quantis">
                {LISTED.map((name) => (
                  <span
                    key={name}
                    className="mx-6 whitespace-nowrap text-[19px] font-bold"
                    style={{ color: 'var(--sdw-faint)', letterSpacing: '-0.02em' }}
                  >
                    {name}
                  </span>
                ))}
              </Marquee>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
