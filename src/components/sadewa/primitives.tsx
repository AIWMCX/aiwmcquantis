import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { animate, stagger } from 'animejs';
import { cn } from '@/lib/utils';

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);
  return reduced;
}

/** True once the element has entered the viewport (one-shot). */
export function useInView<T extends HTMLElement = HTMLDivElement>(rootMargin = '0px 0px -12% 0px') {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setInView(true); io.disconnect(); }
      },
      { rootMargin, threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return { ref, inView };
}

export function InView({
  as: Tag = 'div',
  className,
  delay = 0,
  fromX,
  fromY,
  children,
  ...rest
}: {
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  delay?: number;
  fromX?: string;
  fromY?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const { ref, inView } = useInView<HTMLElement>();
  const style = {
    '--sdw-delay': `${delay}ms`,
    ...(fromX ? { '--sdw-from-x': fromX } : {}),
    ...(fromY ? { '--sdw-from-y': fromY } : {}),
    ...(rest.style ?? {}),
  } as React.CSSProperties;
  const Comp = Tag as React.ElementType;
  return (
    <Comp ref={ref} {...rest} style={style} className={cn('sdw-in', inView && 'is-in', className)}>
      {children}
    </Comp>
  );
}

export function SlashLabel({ children, className, as: Tag = 'p' }: { children: React.ReactNode; className?: string; as?: keyof JSX.IntrinsicElements }) {
  const Comp = Tag as React.ElementType;
  return <Comp className={cn('sdw-label', className)}>/{children}</Comp>;
}

export function SegmentRule({ className, segment }: { className?: string; segment?: number }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn('sdw-rule', inView && 'is-in', className)}
      style={segment ? ({ '--sdw-seg': `${segment}px` } as React.CSSProperties) : undefined}
    />
  );
}

/** Rule + slash label, Sadewa's standard section opener. */
export function SectionLabel({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <div className={className}>
      <SegmentRule />
      <p id={id} className="sdw-label mt-4">/{children}</p>
    </div>
  );
}

type SplitVariant = 'primary' | 'secondary' | 'accent' | 'ghost-dark';

type SplitCommon = {
  children: React.ReactNode;
  variant?: SplitVariant;
  size?: 'md' | 'sm';
  block?: boolean;
  className?: string;
  icon?: React.ReactNode;
};

function splitClass(variant: SplitVariant, size: 'md' | 'sm', block?: boolean, className?: string) {
  return cn(
    'sdw-btn',
    variant !== 'primary' && `sdw-btn--${variant}`,
    size === 'sm' && 'sdw-btn--sm',
    block && 'sdw-btn--block',
    className,
  );
}

function SplitInner({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <>
      <span className="sdw-btn__label">{children}</span>
      <span className="sdw-btn__ico" aria-hidden="true">
        {icon ?? <ArrowUpRight className="w-4 h-4" strokeWidth={2.25} />}
      </span>
    </>
  );
}

/** Sadewa's signature split button. Renders a router Link, an anchor or a button. */
export function SplitButton(
  props: SplitCommon &
    (
      | ({ to: string; href?: never } & Omit<React.ComponentProps<typeof Link>, 'to' | 'className' | 'children'>)
      | ({ href: string; to?: never } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children'>)
      | ({ to?: never; href?: never } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>)
    ),
) {
  const { children, variant = 'primary', size = 'md', block, className, icon, ...rest } = props;
  const cls = splitClass(variant, size, block, className);
  if ('to' in rest && rest.to) {
    const { to, ...linkRest } = rest as { to: string } & Record<string, unknown>;
    return (
      <Link to={to} className={cls} {...(linkRest as object)}>
        <SplitInner icon={icon}>{children}</SplitInner>
      </Link>
    );
  }
  if ('href' in rest && rest.href) {
    return (
      <a className={cls} {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        <SplitInner icon={icon}>{children}</SplitInner>
      </a>
    );
  }
  return (
    <button type="button" className={cls} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      <SplitInner icon={icon}>{children}</SplitInner>
    </button>
  );
}

export function Marquee({ children, duration = 48, className, label }: { children: React.ReactNode; duration?: number; className?: string; label?: string }) {
  return (
    <div className={cn('sdw-marquee', className)} role={label ? 'region' : undefined} aria-label={label}>
      <div className="sdw-marquee__track" style={{ '--sdw-dur': `${duration}s` } as React.CSSProperties}>
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden="true">{children}</div>
      </div>
    </div>
  );
}

const GLYPHS = '!<>-_\\/[]{}—=+*^?#%@$&01';

/** Random glyphs that resolve into the real text once in view (Sadewa footer labels). */
export function ScrambleText({ text, className, duration = 900 }: { text: string; className?: string; duration?: number }) {
  const { ref, inView } = useInView<HTMLSpanElement>('0px');
  const reduced = usePrefersReducedMotion();
  const [out, setOut] = useState(text);

  useEffect(() => {
    if (!inView || reduced) { setOut(text); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const settled = Math.floor(p * text.length);
      let s = '';
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        s += i < settled || c === ' ' ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      setOut(s);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, text, duration]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      <span aria-hidden="true">{out}</span>
    </span>
  );
}

/** Character-by-character reveal; screen readers get the plain sentence. */
export function CharReveal({ text, className, as: Tag = 'p' }: { text: string; className?: string; as?: keyof JSX.IntrinsicElements }) {
  const { ref, inView } = useInView<HTMLElement>();
  const Comp = Tag as React.ElementType;
  const words = text.split(' ');
  let n = 0;
  return (
    <Comp ref={ref} className={cn(inView && 'is-in', className)} aria-label={text}>
      {words.map((w, wi) => (
        <span key={wi} aria-hidden="true" className="inline-block whitespace-nowrap">
          {Array.from(w).map((ch) => {
            const i = n++;
            return (
              <span key={i} className="sdw-char" style={{ '--i': i } as React.CSSProperties}>
                {ch}
              </span>
            );
          })}
          {wi < words.length - 1 && <span className="sdw-char" style={{ '--i': n++ } as React.CSSProperties}>&nbsp;</span>}
        </span>
      ))}
    </Comp>
  );
}

export function Img3D({ name, alt = '', className, bob, priority }: { name: 'magnifier' | 'notebook' | 'code-window' | 'cursor'; alt?: string; className?: string; bob?: boolean; priority?: boolean }) {
  return (
    <img
      src={`/brand/3d/${name}.webp`}
      alt={alt}
      width={720}
      height={720}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={cn('select-none pointer-events-none', bob && 'sdw-bob', className)}
    />
  );
}

/**
 * Heading whose words stagger up into place (anime.js), once in view. Use
 * for Sadewa headlines that want more weight than the plain `.sdw-in` fade.
 * Word spans are rendered by React (not anime's `splitText`, which mutates
 * React-owned DOM); screen readers get the sentence via `aria-label`.
 */
export function WordStagger({
  text,
  className,
  as: Tag = 'h2',
  delay = 0,
  stagger: staggerMs = 55,
  keepVisible = false,
  ...rest
}: {
  text: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  /** ms before the first word starts */
  delay?: number;
  /** ms between each word's start */
  stagger?: number;
  /**
   * Never hide the words: animate position only. For the page's main
   * headline (the LCP element), which otherwise stays at opacity 0 until JS,
   * the IntersectionObserver and the animation library have all run.
   */
  keepVisible?: boolean;
} & React.HTMLAttributes<HTMLElement>) {
  const { ref, inView } = useInView<HTMLElement>();
  const reduced = usePrefersReducedMotion();
  const Comp = Tag as React.ElementType;
  const played = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!inView || reduced || !el || played.current) return;
    played.current = true;
    animate(el.querySelectorAll('.sdw-word'), {
      ...(keepVisible ? {} : { opacity: [0, 1] }),
      translateY: [22, 0],
      duration: 650,
      ease: 'outQuad',
      delay: stagger(staggerMs, { start: delay }),
    });
  }, [inView, reduced, delay, staggerMs, keepVisible]);

  const words = text.split(' ');
  return (
    <Comp ref={ref} className={className} aria-label={text} {...rest}>
      {words.map((w, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="sdw-word inline-block"
          style={reduced || played.current || keepVisible ? undefined : { opacity: 0 }}
        >
          {w}
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Comp>
  );
}

/**
 * Odometer-style numeral: counts from `from` to `value` once in view.
 * `format` controls the rendered string per frame (default: rounded
 * integer with thousands separators). Use for stat callouts, step
 * numbers, and pricing — never for anything that must be exact/legible
 * immediately (screen readers get the final value via an sr-only copy).
 */
export function RollingNumber({
  value,
  from = 0,
  duration = 1200,
  format,
  className,
  as: Tag = 'span',
}: {
  value: number;
  from?: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}) {
  const { ref, inView } = useInView<HTMLElement>();
  const reduced = usePrefersReducedMotion();
  const Comp = Tag as React.ElementType;
  const fmt = format ?? ((n: number) => Math.round(n).toLocaleString('en-US'));
  const [display, setDisplay] = useState(fmt(reduced ? value : from));
  const played = useRef(false);

  useEffect(() => {
    if (!inView || reduced || played.current) return;
    played.current = true;
    const tweened = { n: from };
    animate(tweened, {
      n: value,
      duration,
      ease: 'outExpo',
      onUpdate: () => setDisplay(fmt(tweened.n)),
    });
  }, [inView, reduced, from, value, duration]);

  return (
    <Comp ref={ref} className={cn('sdw-num', className)}>
      <span aria-hidden="true">{display}</span>
      <span className="sr-only">{fmt(value)}</span>
    </Comp>
  );
}

export function Crosshairs({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('relative h-[15px]', className)}>
      <span className="sdw-cross" style={{ left: 0 }} />
      <span className="sdw-cross" style={{ left: 'calc(50% - 7px)' }} />
      <span className="sdw-cross" style={{ right: 0 }} />
    </div>
  );
}
