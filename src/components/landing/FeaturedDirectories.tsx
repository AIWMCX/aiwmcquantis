import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { directories, type DirectoryEntry } from '@/data/directorySubmissions';
import { Link } from 'react-router-dom';

// Curated set shown on the landing page as a proof-of-presence strip.
// Order matches a "tech SaaS" aesthetic: launch platforms first, then
// AI tool directories, then SaaS comparison sites.
const FEATURED_IDS = [11, 45, 46, 17, 16, 2, 5, 7, 8, 6, 9, 47, 48, 14, 19, 41];

function faviconFor(url: string): string {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return '';
  }
}

// Favicons are fetched from Google's service and vary wildly in their own
// background (many are transparent or white-on-transparent). Rendered
// directly against this section's dark card background, a white/transparent
// icon becomes invisible — indistinguishable from a failed load. Every icon
// gets a small white rounded backing so it reads clearly regardless of its
// own colors, on both light and dark themes.
function DirectoryIcon({ d }: { d: DirectoryEntry }) {
  const [failed, setFailed] = useState(false);
  const src = faviconFor(d.url);

  if (failed || !src) {
    // Fallback: colored initial avatar — never leave an invisible gap where
    // a logo should be.
    return (
      <span
        aria-hidden="true"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-primary/15 text-[10px] font-bold text-primary"
      >
        {d.name.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-white p-0.5">
      <img
        src={src}
        alt=""
        width={16}
        height={16}
        loading="lazy"
        className="h-4 w-4 rounded-[2px]"
        onError={() => setFailed(true)}
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
