import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Play, Volume2, VolumeX } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { markIntroFilmSeen as markSeen } from '@/lib/intro-film';

/**
 * IntroFilm — first-visit showcase. On a visitor's first arrival the 25-second
 * Quantis film plays full-screen above every other layer of the landing page;
 * when it ends (or the visitor skips) the layer fades away and the homepage is
 * revealed exactly as it was. Shown once per browser (localStorage), never to
 * automation/prerender, and re-openable with `?intro=1`.
 */

const SRC = '/video/quantis-decision-film.mp4';
const POSTER = '/video/quantis-decision-film-poster.jpg';
const BLUE = '#478AFF';
const FADE_MS = 650;

const MONO: React.CSSProperties = { fontFamily: 'var(--rmg-font-mono)', fontFeatureSettings: "'tnum' 1, 'zero' 1" };

export function IntroFilm({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const skipRef = useRef<HTMLButtonElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [closing, setClosing] = useState(false);
  const [entered, setEntered] = useState(false);
  const closedRef = useRef(false);

  const close = useCallback((reason: 'ended' | 'skip' | 'escape' | 'error') => {
    if (closedRef.current) return;
    closedRef.current = true;
    markSeen();
    const v = videoRef.current;
    trackEvent('intro_film_close', { reason, at_seconds: v ? Math.round(v.currentTime) : 0 });
    setClosing(true);
    window.setTimeout(() => {
      v?.pause();
      onDone();
    }, FADE_MS);
  }, [onDone]);

  // Mount: lock page scroll beneath the layer, fade in, try muted autoplay.
  useEffect(() => {
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => setEntered(true));
    trackEvent('intro_film_open', {});
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) videoRef.current?.play().catch(() => undefined);
    skipRef.current?.focus({ preventScroll: true });
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close('escape');
      // keep keyboard focus inside the layer
      if (e.key === 'Tab') {
        const root = document.getElementById('intro-film-layer');
        const items = root ? Array.from(root.querySelectorAll<HTMLElement>('button')) : [];
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      if (v && v.duration) setProgress(v.currentTime / v.duration);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const play = useCallback(() => { videoRef.current?.play().catch(() => undefined); }, []);

  const toggleSound = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted) {
      if (v.currentTime > 1.5 && v.currentTime < 4) v.currentTime = 0; // let the score open with the story
      v.play().catch(() => undefined);
      trackEvent('intro_film_sound_on', {});
    }
  }, []);

  const shown = entered && !closing;

  // Portal to <body>: the layer must sit above every landing stacking context
  // (.rmg-surface forces position:relative on its direct children).
  return createPortal(
    <div
      id="intro-film-layer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-film-title"
      className="fixed inset-0 z-[2147483000] flex flex-col"
      style={{
        background: '#060C18',
        opacity: shown ? 1 : 0,
        transform: closing ? 'scale(1.015)' : 'none',
        transition: `opacity ${FADE_MS}ms cubic-bezier(.4,0,.2,1), transform ${FADE_MS}ms cubic-bezier(.4,0,.2,1)`,
      }}
    >
      {/* blueprint grid + institutional light, matching the RMG surface */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(50% 55% at 50% 45%, rgba(71,138,255,0.16), transparent 70%), linear-gradient(var(--rmg-ink-2, #0F1A2E) 1px, transparent 1px), linear-gradient(90deg, var(--rmg-ink-2, #0F1A2E) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 48px 48px, 48px 48px',
          maskImage: 'radial-gradient(80% 80% at 50% 50%, #000 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(80% 80% at 50% 50%, #000 40%, transparent 100%)',
        }}
      />

      {/* header */}
      <header className="relative flex items-center justify-between px-5 sm:px-8 pt-4 sm:pt-6">
        <div className="flex items-center gap-3 text-[11px] uppercase" style={{ ...MONO, letterSpacing: '0.18em', color: 'var(--rmg-text-dim, #94A3B8)' }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: BLUE }} aria-hidden="true" />
          <span id="intro-film-title" style={{ color: 'var(--rmg-text, #E6ECF5)' }}>AIWMC Quantis</span>
          <span className="hidden sm:inline-block w-8 h-px" style={{ background: 'var(--rmg-ink-4, #1E2A44)' }} aria-hidden="true" />
          <span className="hidden sm:inline">Product film · 25 seconds</span>
        </div>
        <button
          ref={skipRef}
          type="button"
          onClick={() => close('skip')}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2"
          style={{ color: 'var(--rmg-text, #E6ECF5)', background: 'rgba(148,163,184,0.10)', border: '1px solid var(--rmg-ink-4, #1E2A44)', outlineColor: BLUE }}
        >
          Skip to homepage
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </header>

      {/* stage */}
      <main className="relative flex flex-1 min-h-0 items-center justify-center px-4 py-4 sm:py-6">
        <figure
          className="relative rounded-[22px] p-2 sm:p-2.5"
          style={{
            // fit the 4:5 film + control row inside whatever viewport we get
            width: 'min(100%, calc((100dvh - 190px) * 0.8))',
            background: 'linear-gradient(180deg, rgba(20,28,46,0.92), rgba(11,18,32,0.94))',
            border: '1px solid var(--rmg-ink-4, #1E2A44)',
            boxShadow: '0 60px 140px -50px rgba(71,138,255,0.55), 0 30px 60px -30px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.05)',
            transform: shown ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.985)',
            transition: `transform ${FADE_MS + 250}ms cubic-bezier(.2,.8,.2,1)`,
          }}
        >
          {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
            <span
              key={c}
              aria-hidden="true"
              className="absolute w-3.5 h-3.5"
              style={{
                top: c[0] === 't' ? -1 : undefined, bottom: c[0] === 'b' ? -1 : undefined,
                left: c[1] === 'l' ? -1 : undefined, right: c[1] === 'r' ? -1 : undefined,
                borderColor: BLUE, borderStyle: 'solid',
                borderWidth: `${c[0] === 't' ? 1 : 0}px ${c[1] === 'r' ? 1 : 0}px ${c[0] === 'b' ? 1 : 0}px ${c[1] === 'l' ? 1 : 0}px`,
                borderTopLeftRadius: c === 'tl' ? 22 : 0, borderTopRightRadius: c === 'tr' ? 22 : 0,
                borderBottomLeftRadius: c === 'bl' ? 22 : 0, borderBottomRightRadius: c === 'br' ? 22 : 0,
              }}
            />
          ))}

          <div className="relative overflow-hidden rounded-[14px]" style={{ aspectRatio: '4 / 5', background: '#060C18', boxShadow: 'inset 0 0 0 1px rgba(71,138,255,0.18)' }}>
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              src={SRC}
              poster={POSTER}
              width={1080}
              height={1350}
              muted
              playsInline
              preload="auto"
              aria-label="AIWMC Quantis product film, 25 seconds"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => close('ended')}
              // Video failed to load: never leave the visitor on a black layer.
              onError={() => close('error')}
              onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
            />
            {!playing && !closing && (
              <button
                type="button"
                onClick={play}
                className="group absolute inset-0 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                style={{ background: 'radial-gradient(60% 45% at 50% 50%, rgba(6,12,24,0.62), rgba(6,12,24,0.38))', outlineColor: BLUE }}
                aria-label="Play the 25-second film"
              >
                <span className="inline-flex items-center gap-3 rounded-full pl-4 pr-5 py-3 text-sm font-medium transition-transform duration-200 group-hover:scale-[1.03]" style={{ background: 'rgba(6,12,24,0.78)', border: '1px solid rgba(71,138,255,0.55)', color: '#E6ECF5', backdropFilter: 'blur(8px)' }}>
                  <span className="inline-flex w-8 h-8 items-center justify-center rounded-full" style={{ background: BLUE }}>
                    <Play className="w-4 h-4 translate-x-[1px]" fill="currentColor" aria-hidden="true" />
                  </span>
                  Play the 25-second film
                </span>
              </button>
            )}
          </div>

          {/* controls */}
          <div className="flex items-center gap-3 px-1.5 pt-2.5">
            <div className="relative h-[3px] flex-1 overflow-hidden rounded-full" style={{ background: 'rgba(148,163,184,0.22)' }} role="progressbar" aria-label="Film progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
              <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${progress * 100}%`, background: BLUE }} />
            </div>
            <button
              type="button"
              onClick={toggleSound}
              aria-label={muted ? 'Turn sound on' : 'Mute'}
              className="inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-[12px] font-medium focus:outline-none focus-visible:ring-2"
              style={{ ...MONO, color: muted ? '#E6ECF5' : '#060C18', background: muted ? 'rgba(148,163,184,0.10)' : BLUE, border: '1px solid var(--rmg-ink-4, #1E2A44)', outlineColor: BLUE }}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" aria-hidden="true" /> : <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />}
              {muted ? 'Sound on' : 'Sound'}
            </button>
          </div>
        </figure>
      </main>

      <p className="relative pb-4 sm:pb-6 text-center text-[11px]" style={{ ...MONO, color: 'var(--rmg-text-mute, #64748B)' }}>
        Illustrative example company · not a forecast or advice
      </p>
    </div>,
    document.body,
  );
}

export default IntroFilm;
