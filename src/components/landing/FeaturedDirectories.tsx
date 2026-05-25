import React, { useEffect } from 'react';
import { useDirectoryLogo, prefetchDirectoryLogos } from '@/lib/directoryLogoCache';

/**
 * FeaturedDirectories — "As featured in" trust marquee.
 * Logos are prefetched on mount and have a guaranteed SVG fallback,
 * so a real branded tile is ALWAYS visible before/while the marquee scrolls.
 */
type Directory = {
  name: string;
  domain: string;
  href: string;
};

const DIRECTORIES: Directory[] = [
  { name: 'SaaSHub', domain: 'saashub.com', href: 'https://www.saashub.com' },
  { name: 'TopAI.tools', domain: 'topai.tools', href: 'https://topai.tools' },
  { name: 'Dang.ai', domain: 'dang.ai', href: 'https://dang.ai' },
  { name: 'insidr.ai', domain: 'insidr.ai', href: 'https://www.insidr.ai' },
  { name: "There's An AI", domain: 'theresanaiforthat.com', href: 'https://theresanaiforthat.com' },
  { name: 'Futurepedia', domain: 'futurepedia.io', href: 'https://www.futurepedia.io' },
  { name: 'Product Hunt', domain: 'producthunt.com', href: 'https://www.producthunt.com' },
  { name: 'AI Tools Directory', domain: 'aitoolsdirectory.com', href: 'https://aitoolsdirectory.com' },
];

function LogoTile({ dir }: { dir: Directory }) {
  const { src, status, onLoad, onError } = useDirectoryLogo(dir.name, dir.domain);

  return (
    <div
      className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg shrink-0 overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.96)' }}
    >
      {status === 'loading' && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{ background: 'linear-gradient(90deg, #e5e7eb, #f3f4f6, #e5e7eb)' }}
          aria-hidden="true"
        />
      )}
      <img
        src={src}
        alt={`${dir.name} logo`}
        width={32}
        height={32}
        decoding="async"
        loading="eager"
        fetchPriority="low"
        referrerPolicy="no-referrer"
        className="relative w-7 h-7 sm:w-8 sm:h-8 object-contain"
        style={{ opacity: status === 'loaded' ? 1 : 0, transition: 'opacity 200ms ease' }}
        onLoad={onLoad}
        onError={onError}
      />
    </div>
  );
}

function DirectoryCard({ dir }: { dir: Directory }) {
  return (
    <a
      href={dir.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-2.5 sm:gap-3 px-4 py-2.5 sm:px-5 sm:py-3 mx-2 sm:mx-3 rounded-xl border transition-all hover:scale-[1.03]"
      style={{
        background: 'var(--q-bg-surface)',
        borderColor: 'var(--q-border-default)',
        minWidth: '170px',
      }}
      aria-label={`Featured on ${dir.name}`}
    >
      <LogoTile dir={dir} />
      <div className="flex flex-col leading-tight min-w-0">
        <span
          className="text-[10px] uppercase tracking-[0.14em] sm:tracking-[0.18em]"
          style={{ color: 'var(--q-text-tertiary)' }}
        >
          Featured on
        </span>
        <span
          className="text-[13px] sm:text-sm font-semibold tracking-tight truncate max-w-[120px] sm:max-w-none"
          style={{ color: 'var(--q-text-primary)' }}
        >
          {dir.name}
        </span>
      </div>
    </a>
  );
}

export function FeaturedDirectories() {
  const items = [...DIRECTORIES, ...DIRECTORIES];

  // Warm every directory logo before it scrolls into view.
  useEffect(() => {
    const run = () => {
      void prefetchDirectoryLogos(DIRECTORIES);
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(run);
    else window.setTimeout(run, 0);
  }, []);

  return (
    <section
      aria-label="Featured in directories"
      className="border-y overflow-hidden"
      style={{
        borderColor: 'var(--q-border-default)',
        background: 'var(--q-bg-elevated)',
      }}
    >
      <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <p
          className="text-center text-[11px] uppercase tracking-[0.22em] mb-5"
          style={{ color: 'var(--q-text-tertiary)' }}
        >
          As featured in
        </p>

        <div className="relative">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-24 z-10"
            style={{
              background: 'linear-gradient(to right, var(--q-bg-elevated), transparent)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-24 z-10"
            style={{
              background: 'linear-gradient(to left, var(--q-bg-elevated), transparent)',
            }}
          />

          <div className="flex w-max animate-marquee-x [animation-play-state:running] hover:[animation-play-state:paused]">
            {items.map((dir, i) => (
              <DirectoryCard key={`${dir.domain}-${i}`} dir={dir} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
