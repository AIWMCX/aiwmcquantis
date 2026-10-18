import React, { useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import { trackCtaClick } from '@/lib/analytics';
import { BENCHMARK_COUNT_DISPLAY, BENCHMARK_SOURCES_DISPLAY } from '@/config/canonical-facts';
import { directories } from '@/data/directorySubmissions';
import { FEATURED_IDS } from '@/components/landing/FeaturedDirectories';
import { CharReveal, Img3D, InView, Marquee, RollingNumber, SegmentRule, SplitButton, WordStagger, usePrefersReducedMotion } from '@/components/sadewa/primitives';

const FILM = '/video/quantis-decision-film.mp4';
const POSTER = '/video/quantis-decision-film-poster.jpg';

const LISTED = FEATURED_IDS
  .map((id) => directories.find((d) => d.id === id))
  .filter((d): d is NonNullable<typeof d> => !!d)
  .map((d) => d.name.replace(/\s*\(.*\)\s*$/, ''));

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

export function SdwHero({ onWatchFilm }: { onWatchFilm: () => void }) {
  const openFilm = (source: string) => {
    trackCtaClick('hero_watch_film', source);
    onWatchFilm();
  };

  const scrollToForm = (e: React.MouseEvent) => {
    e.preventDefault();
    trackCtaClick('hero_run_free_decision', 'hero');
    document.querySelector('[data-hero-form]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden">
      <div className="sdw-container pt-10 md:pt-14 pb-16 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-10 lg:gap-16 items-start">
          <WordStagger
            as="h1"
            id="hero-heading"
            text="Before you invest $50K, find out if you’ll get it back."
            className="sdw-display"
            style={{ fontSize: 'clamp(2.75rem, 6.4vw, 6.25rem)' }}
          />
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
              <SplitButton href="#single-input-hero" onClick={scrollToForm}>Run a free decision</SplitButton>
              <SplitButton variant="secondary" onClick={() => openFilm('hero_secondary')}>Watch the 25s film</SplitButton>
            </InView>
            <p className="mt-4 sdw-label text-[12px]" style={{ color: 'var(--sdw-muted)' }}>
              No credit card · First analysis free
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
