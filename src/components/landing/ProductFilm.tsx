import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Pause, PictureInPicture2, Play, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackCtaClick, trackEvent } from '@/lib/analytics';

/**
 * ProductFilm — the 25-second Quantis decision film, framed as an instrument
 * panel on the RMG surface. The film itself is shipped untouched
 * (public/video/quantis-decision-film.mp4, 1080×1350, 4:5); every number in it
 * is engine output on the fixed FOUNDER_DEMO_FIXTURE (see FounderDecisionDemo).
 *
 * Behaviour: muted autoplay only while in view and only without
 * prefers-reduced-motion; chapters are synced to playback and seekable;
 * native picture-in-picture when the browser supports it.
 */

const SRC = '/video/quantis-decision-film.mp4';
const POSTER = '/video/quantis-decision-film-poster.jpg';
const DURATION = 25;
const BLUE = '#478AFF';

const CHAPTERS = [
  { start: 0, end: 3, title: 'The question', line: 'What has to be true?' },
  { start: 3, end: 7, title: 'The product', line: 'Financial pre-mortem & decision support' },
  { start: 7, end: 12, title: 'The assumptions', line: 'Make assumptions visible.' },
  { start: 12, end: 17, title: 'The scenarios', line: 'Compare what changes.' },
  { start: 17, end: 21, title: 'The decision', line: 'Find the fragile assumption.' },
  { start: 21, end: 25, title: 'Before the decision', line: 'Examine the assumptions.' },
] as const;

const fmt = (s: number) => `0:${String(Math.min(DURATION, Math.floor(s))).padStart(2, '0')}`;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

const MONO: React.CSSProperties = { fontFamily: 'var(--rmg-font-mono)', fontFeatureSettings: "'tnum' 1, 'zero' 1" };

export function ProductFilm() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const userPaused = useRef(false);
  const trackedPlay = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    setPipSupported(typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  // Autoplay (muted) only while the film is on screen; pause when it leaves,
  // unless the viewer has popped it out into picture-in-picture.
  useEffect(() => {
    const el = sectionRef.current;
    const v = videoRef.current;
    if (!el || !v || reducedMotion) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!userPaused.current) v.play().catch(() => undefined);
        } else if (document.pictureInPictureElement !== v) {
          v.pause();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reducedMotion]);

  // Smooth progress while playing.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      if (v) setT(v.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const markPlay = useCallback((source: string) => {
    if (trackedPlay.current) return;
    trackedPlay.current = true;
    trackEvent('product_film_play', { source });
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      userPaused.current = false;
      v.play().catch(() => undefined);
      markPlay('button');
    } else {
      userPaused.current = true;
      v.pause();
    }
  }, [markPlay]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    setMuted(next);
    // First time sound comes on, start from the opening so the score lands with the story.
    if (!next && !trackedPlay.current) v.currentTime = 0;
    if (!next) {
      userPaused.current = false;
      v.play().catch(() => undefined);
      markPlay('sound_on');
    }
  }, [markPlay]);

  const seek = useCallback((start: number, label: string) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = start;
    setT(start);
    userPaused.current = false;
    v.play().catch(() => undefined);
    markPlay('chapter');
    trackEvent('product_film_chapter', { chapter: label });
  }, [markPlay]);

  const togglePip = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement === v) await document.exitPictureInPicture();
      else {
        await v.requestPictureInPicture();
        trackEvent('product_film_pip', {});
      }
    } catch { /* PiP refused by the browser — nothing to do */ }
  }, []);

  const active = CHAPTERS.reduce((a, c, i) => (t >= c.start ? i : a), 0);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="product-film-heading"
      className="sdw-dark sdw-stars relative w-full overflow-hidden py-20 md:py-28"
    >
      {/* soft institutional light, same hue as the film's electric blue */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(55% 45% at 72% 42%, rgba(71,138,255,0.10), transparent 70%)' }}
      />

      <div className="sdw-container relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-14 gap-y-10 items-start">
          {/* A — heading */}
          <header className="lg:col-span-5 lg:row-start-1 lg:pt-6">
            <div
              className="flex items-center gap-3 mb-6 text-[11px] font-semibold uppercase"
              style={{ ...MONO, letterSpacing: '0.18em', color: 'var(--rmg-text-dim)' }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: BLUE }} aria-hidden="true" />
              Product film
              <span className="inline-block w-8 h-px" style={{ background: 'var(--rmg-ink-4)' }} aria-hidden="true" />
              25 seconds
            </div>
            <h2
              id="product-film-heading"
              className="font-bold tracking-tight"
              style={{
                fontFamily: "var(--sdw-font-display, 'Cabinet Grotesk')",
                fontSize: 'clamp(2.3rem, 4.4vw, 3.75rem)',
                lineHeight: 1,
                letterSpacing: '-0.04em',
              }}
            >
              <span style={{ color: 'var(--rmg-text-dim)' }}>Before the decision,</span>{' '}
              <span style={{ color: 'var(--rmg-text)' }}>examine the assumptions.</span>
            </h2>
            <p className="mt-5 text-base md:text-[17px] leading-relaxed max-w-xl" style={{ color: 'var(--rmg-text-dim)' }}>
              Twenty-five seconds inside Quantis: one $120K growth decision, the four assumptions behind it, and the
              one with the least room. The same deterministic engine as every Decision Run, on a fixed, fictional
              example company.
            </p>
          </header>

          {/* B — the framed film */}
          <div className="lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:row-span-2">
            <div className="relative mx-auto w-full max-w-[540px] lg:mr-0">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-10 rounded-[48px] blur-3xl"
                style={{ background: 'radial-gradient(50% 50% at 50% 45%, rgba(71,138,255,0.22), transparent 72%)' }}
              />
              <figure
                className="relative rounded-[22px] p-2.5 sm:p-3"
                style={{
                  background: 'linear-gradient(180deg, rgba(20,28,46,0.92), rgba(11,18,32,0.94))',
                  border: '1px solid var(--rmg-ink-4)',
                  boxShadow: '0 50px 120px -50px rgba(71,138,255,0.45), 0 30px 60px -30px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                {/* instrument corner ticks */}
                {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
                  <span
                    key={c}
                    aria-hidden="true"
                    className="absolute w-3.5 h-3.5"
                    style={{
                      top: c[0] === 't' ? -1 : undefined,
                      bottom: c[0] === 'b' ? -1 : undefined,
                      left: c[1] === 'l' ? -1 : undefined,
                      right: c[1] === 'r' ? -1 : undefined,
                      borderColor: BLUE,
                      borderStyle: 'solid',
                      borderWidth: `${c[0] === 't' ? 1 : 0}px ${c[1] === 'r' ? 1 : 0}px ${c[0] === 'b' ? 1 : 0}px ${c[1] === 'l' ? 1 : 0}px`,
                      borderTopLeftRadius: c === 'tl' ? 22 : 0,
                      borderTopRightRadius: c === 'tr' ? 22 : 0,
                      borderBottomLeftRadius: c === 'bl' ? 22 : 0,
                      borderBottomRightRadius: c === 'br' ? 22 : 0,
                      opacity: 0.85,
                    }}
                  />
                ))}

                {/* title bar */}
                <div
                  className="flex items-center justify-between px-2 pt-1 pb-2.5 text-[10.5px] uppercase"
                  style={{ ...MONO, letterSpacing: '0.16em', color: 'var(--rmg-text-mute)' }}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: playing ? BLUE : 'var(--rmg-text-mute)' }} aria-hidden="true" />
                    Quantis · Decision film
                  </span>
                  <span>
                    {String(active + 1).padStart(2, '0')} / 06<span className="hidden sm:inline"> · {CHAPTERS[active].title}</span>
                  </span>
                </div>

                {/* screen */}
                <div
                  className="relative overflow-hidden rounded-[14px]"
                  style={{ aspectRatio: '4 / 5', background: '#060C18', boxShadow: 'inset 0 0 0 1px rgba(71,138,255,0.18)' }}
                >
                  <video
                    ref={videoRef}
                    className="absolute inset-0 h-full w-full object-cover"
                    src={SRC}
                    poster={POSTER}
                    width={1080}
                    height={1350}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    aria-label="AIWMC Quantis product film, 25 seconds. Chapters are listed beside the player."
                    aria-describedby="product-film-chapters"
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
                    onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
                  />
                  {!playing && (
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="group absolute inset-0 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                      style={{ background: 'radial-gradient(60% 45% at 50% 50%, rgba(6,12,24,0.62), rgba(6,12,24,0.38))', outlineColor: BLUE }}
                      aria-label="Play the 25-second film"
                    >
                      <span
                        className="inline-flex items-center gap-3 rounded-full pl-4 pr-5 py-3 text-sm font-medium transition-transform duration-200 group-hover:scale-[1.03]"
                        style={{ background: 'rgba(6,12,24,0.78)', border: '1px solid rgba(71,138,255,0.55)', color: 'var(--rmg-text)', backdropFilter: 'blur(8px)' }}
                      >
                        <span className="inline-flex w-8 h-8 items-center justify-center rounded-full" style={{ background: BLUE }}>
                          <Play className="w-4 h-4 translate-x-[1px]" fill="currentColor" aria-hidden="true" />
                        </span>
                        Play the 25-second film
                      </span>
                    </button>
                  )}
                </div>

                {/* controls */}
                <div className="flex items-center gap-3 px-1.5 pt-3 pb-1">
                  <IconButton label={playing ? 'Pause film' : 'Play film'} onClick={togglePlay}>
                    {playing ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 translate-x-[1px]" fill="currentColor" />}
                  </IconButton>
                  <div className="flex flex-1 items-center gap-1" role="group" aria-label="Film chapters">
                    {CHAPTERS.map((c, i) => {
                      const fill = clamp01((t - c.start) / (c.end - c.start));
                      return (
                        <button
                          key={c.title}
                          type="button"
                          onClick={() => seek(c.start, c.title)}
                          className="group relative h-6 focus:outline-none focus-visible:ring-1 rounded-sm"
                          style={{ flexGrow: c.end - c.start, flexBasis: 0, outlineColor: BLUE }}
                          aria-label={`Jump to ${c.title} (${fmt(c.start)})`}
                        >
                          <span className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full overflow-hidden transition-[height] group-hover:h-[5px]" style={{ background: 'rgba(148,163,184,0.22)' }}>
                            <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${fill * 100}%`, background: i === active ? BLUE : 'rgba(71,138,255,0.6)' }} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[11px] tabular-nums" style={{ ...MONO, color: 'var(--rmg-text-dim)' }}>
                    {fmt(t)} / {fmt(DURATION)}
                  </span>
                  <IconButton label={muted ? 'Turn sound on' : 'Mute'} onClick={toggleMute} active={!muted}>
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </IconButton>
                  {pipSupported && (
                    <IconButton label="Picture-in-picture" onClick={togglePip}>
                      <PictureInPicture2 className="w-4 h-4" />
                    </IconButton>
                  )}
                </div>
                <figcaption className="sr-only">
                  Illustrative scenario on a fixed example company, not a forecast. Chapters: {CHAPTERS.map((c) => `${c.title}: ${c.line}`).join('; ')}.
                </figcaption>
              </figure>
            </div>
          </div>

          {/* C — chapters + actions */}
          <div className="lg:col-span-5 lg:row-start-2">
            <ol id="product-film-chapters" className="relative" style={{ borderTop: '1px solid var(--rmg-ink-2)' }}>
              {CHAPTERS.map((c, i) => {
                const on = i === active;
                const fill = clamp01((t - c.start) / (c.end - c.start));
                return (
                  <li key={c.title} style={{ borderBottom: '1px solid var(--rmg-ink-2)' }}>
                    <button
                      type="button"
                      onClick={() => seek(c.start, c.title)}
                      aria-current={on ? 'step' : undefined}
                      className="relative grid w-full grid-cols-[3.25rem_1fr] items-baseline gap-x-3 py-3.5 pl-4 pr-3 text-left transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-inset"
                      style={{ background: on ? 'rgba(71,138,255,0.06)' : 'transparent', outlineColor: BLUE }}
                    >
                      <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: on ? BLUE : 'transparent' }} />
                      <span className="text-[12px]" style={{ ...MONO, color: on ? BLUE : 'var(--rmg-text-mute)' }}>{fmt(c.start)}</span>
                      <span className="min-w-0">
                        <span className="block text-[15px] font-medium" style={{ color: on ? 'var(--rmg-text)' : 'var(--rmg-text-dim)' }}>
                          {c.title}
                        </span>
                        <span className="block truncate text-[13px] mt-0.5" style={{ color: 'var(--rmg-text-mute)' }}>
                          {c.line}
                        </span>
                      </span>
                      {on && (
                        <span aria-hidden="true" className="absolute left-4 right-3 bottom-0 h-px" style={{ background: 'rgba(71,138,255,0.18)' }}>
                          <span className="block h-full" style={{ width: `${fill * 100}%`, background: BLUE }} />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
              <Button asChild size="lg" className="gap-2">
                <a href="#single-input-hero" onClick={() => trackCtaClick('film_run_own_decision', 'product_film')}>
                  Run your own decision
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </a>
              </Button>
              <Link
                to="/demo/founder-decision-review"
                onClick={() => trackCtaClick('film_open_demo', 'product_film')}
                className="inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
                style={{ color: 'var(--rmg-text)' }}
              >
                Break the model yourself
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
            <p className="mt-4 text-[12px]" style={{ ...MONO, color: 'var(--rmg-text-mute)' }}>
              Illustrative example company · not a forecast or advice
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function IconButton({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2"
      style={{
        color: active ? '#060C18' : 'var(--rmg-text)',
        background: active ? BLUE : 'rgba(148,163,184,0.10)',
        border: '1px solid var(--rmg-ink-4)',
        outlineColor: BLUE,
      }}
    >
      {children}
    </button>
  );
}

export default ProductFilm;
