import React from 'react';

/**
 * FeaturedDirectories — "As featured in" trust marquee.
 * Shows real directory logos (via Clearbit Logo API) in a seamless right-to-left scroll.
 */
type Directory = {
  name: string;
  domain: string;
  href: string;
};

const DIRECTORIES: Directory[] = [
  { name: 'SaaSHub',          domain: 'saashub.com',       href: 'https://www.saashub.com' },
  { name: 'TopAI.tools',      domain: 'topai.tools',       href: 'https://topai.tools' },
  { name: 'Dang.ai',          domain: 'dang.ai',           href: 'https://dang.ai' },
  { name: 'insidr.ai',        domain: 'insidr.ai',         href: 'https://www.insidr.ai' },
  { name: "There's An AI",    domain: 'theresanaiforthat.com', href: 'https://theresanaiforthat.com' },
  { name: 'Futurepedia',      domain: 'futurepedia.io',    href: 'https://www.futurepedia.io' },
  { name: 'Product Hunt',     domain: 'producthunt.com',   href: 'https://www.producthunt.com' },
  { name: 'AI Tools Directory', domain: 'aitoolsdirectory.com', href: 'https://aitoolsdirectory.com' },
];

function logoUrl(domain: string) {
  // Clearbit Logo API — clean transparent logos, no API key required
  return `https://logo.clearbit.com/${domain}?size=128`;
}

function faviconFallback(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

function DirectoryCard({ dir }: { dir: Directory }) {
  const [src, setSrc] = React.useState(logoUrl(dir.domain));
  const [failed, setFailed] = React.useState(false);

  return (
    <a
      href={dir.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 px-5 py-3 mx-3 rounded-xl border transition-all hover:scale-[1.03]"
      style={{
        background: 'var(--q-bg-surface)',
        borderColor: 'var(--q-border-default)',
        minWidth: '200px',
      }}
      aria-label={`Featured on ${dir.name}`}
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.96)' }}
      >
        {!failed ? (
          <img
            src={src}
            alt={`${dir.name} logo`}
            width={32}
            height={32}
            loading="lazy"
            className="w-8 h-8 object-contain"
            onError={() => {
              if (src !== faviconFallback(dir.domain)) {
                setSrc(faviconFallback(dir.domain));
              } else {
                setFailed(true);
              }
            }}
          />
        ) : (
          <span
            className="text-sm font-bold"
            style={{ color: 'var(--q-bg-base)' }}
          >
            {dir.name.charAt(0)}
          </span>
        )}
      </div>
      <div className="flex flex-col leading-tight">
        <span
          className="text-[10px] uppercase tracking-[0.18em]"
          style={{ color: 'var(--q-text-tertiary)' }}
        >
          Featured on
        </span>
        <span
          className="text-sm font-semibold tracking-tight"
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
            className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10"
            style={{
              background:
                'linear-gradient(to right, var(--q-bg-elevated), transparent)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10"
            style={{
              background:
                'linear-gradient(to left, var(--q-bg-elevated), transparent)',
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
