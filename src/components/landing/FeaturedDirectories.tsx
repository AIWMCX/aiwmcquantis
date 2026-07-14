import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { directories, type DirectoryEntry } from '@/data/directorySubmissions';
import { Link } from 'react-router-dom';

// Curated set shown on the landing page as a proof-of-presence strip.
// Order matches a "tech SaaS" aesthetic: launch platforms first, then
// AI tool directories, then SaaS comparison sites.
const FEATURED_IDS = [11, 45, 46, 17, 16, 2, 5, 7, 8, 6, 9, 47, 48, 14, 19, 41];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Multi-provider favicon fallback chain. Empirically, no single provider
// works for every domain from every browser + network:
//   - Google's s2/favicons returns transparent 1x1s for domains it doesn't
//     index, which "load" but render invisibly.
//   - DuckDuckGo's ip3 is more permissive but occasionally slow or 4xx.
//   - Self-hosted /favicon.ico works ~90% of the time but is often 16x16
//     (blurry when upscaled) and some sites redirect to HTML pages.
// So we chain all three, in order of image-quality-first, and finally fall
// back to a stylized letter chip if every provider fails.
function icoSources(url: string): string[] {
  const host = hostOf(url);
  if (!host) return [];
  // Google's s2 endpoint is the most reliable across strict CSP + nosniff
  // headers we ship in prod — it always returns a correct image/* content-type
  // and a real 16–64px icon. DDG is second because it's more permissive when
  // Google returns a generic globe. Self-hosted /favicon.ico is last resort.
  return [
    `https://www.google.com/s2/favicons?domain=${host}&sz=64`,
    `https://icons.duckduckgo.com/ip3/${host}.ico`,
    `https://${host}/favicon.ico`,
  ];
}

function DirectoryIcon({ d }: { d: DirectoryEntry }) {
  const sources = icoSources(d.url);
  const [srcIdx, setSrcIdx] = useState(0);

  const onError = () => {
    // Log which URL failed so devtools can pinpoint any future provider
    // issue without needing a code round-trip. Silent in production for
    // users, useful for us when we open the site with the console open.
    if (typeof console !== 'undefined' && sources[srcIdx]) {
      // eslint-disable-next-line no-console
      console.warn('[FeaturedDirectories] favicon load failed:', sources[srcIdx]);
    }
    setSrcIdx((i) => i + 1);
  };

  if (srcIdx >= sources.length) {
    // Final fallback — every entry gets a distinctive chip so the strip
    // stays visually readable when a domain has no fetchable favicon at all.
    const initial = d.name.charAt(0).toUpperCase();
    return (
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold"
        style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          background: 'hsl(var(--foreground) / 0.08)',
          color: 'hsl(var(--foreground) / 0.75)',
          border: '1px solid hsl(var(--foreground) / 0.10)',
        }}
      >
        {initial}
      </span>
    );
  }

  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md p-1"
      style={{
        background: 'white',
        border: '1px solid hsl(var(--foreground) / 0.08)',
      }}
    >
      <img
        // key= forces a fresh mount on each provider swap, so the browser
        // actually re-fetches instead of reusing the cached failed state.
        key={sources[srcIdx]}
        src={sources[srcIdx]}
        alt=""
        width={16}
        height={16}
        referrerPolicy="no-referrer"
        className="h-4 w-4 rounded-[2px] object-contain"
        onError={onError}
      />
    </span>
  );
}

function DirectoryChip({ d }: { d: DirectoryEntry }) {
  const href = d.proofUrl ?? d.url;
  const isLive = d.status === 'live' && !!d.proofUrl;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`AIWMC Quantis on ${d.name}${isLive ? ' (verified listing)' : ''}`}
      className="group flex items-center gap-2.5 rounded-xl border border-border bg-card/60 px-4 py-2.5 transition-all hover:border-primary/40 hover:bg-card hover:shadow-sm"
    >
      <DirectoryIcon d={d} />
      <span className="text-sm font-medium text-foreground">{d.name}</span>
      {isLive && (
        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">Live</span>
      )}
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
}

export function FeaturedDirectories() {
  const items = FEATURED_IDS
    .map((id) => directories.find((d) => d.id === id))
    .filter((d): d is DirectoryEntry => !!d);

  return (
    <section aria-labelledby="featured-on-heading" className="border-y border-border/60 bg-muted/20 py-10 md:py-14">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6 flex flex-col items-center text-center">
          <p id="featured-on-heading" className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Listed on
          </p>
          <h2 className="mt-1 text-lg md:text-xl font-semibold text-foreground">
            Where founders are finding AIWMC Quantis
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {items.map((d) => (
            <DirectoryChip key={d.id} d={d} />
          ))}
        </div>

        <div className="mt-5 text-center">
          <Link
            to="/directory-tracker"
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            See the full directory tracker →
          </Link>
        </div>
      </div>
    </section>
  );
}

export default FeaturedDirectories;
