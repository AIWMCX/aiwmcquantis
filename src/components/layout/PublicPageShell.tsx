import React from 'react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/Footer';
import { ExploreMoreGrid } from '@/components/layout/ExploreMoreGrid';

/**
 * PublicPageShell — the single consistent shell every public,
 * non-Landing page renders inside. Replaces the ~26 hand-rolled
 * nav+dark-background+footer copies that were drifting apart across
 * Blog, Pricing, Methodology, Security, /vs/*, etc. Anchors every
 * page to the same rmg-surface dark background + glass-compatible
 * sticky nav so the entire site reads as one visual system.
 *
 * Usage:
 *   <PublicPageShell active="blog">
 *     ...page content, wrapped in <main>...
 *   </PublicPageShell>
 */

export type PublicNavKey =
  | 'home'
  | 'how-it-works'
  | 'use-cases'
  | 'methodology'
  | 'examples'
  | 'pricing'
  | 'blog';

interface Props {
  children: React.ReactNode;
  /** Highlights the active nav item. */
  active?: PublicNavKey;
  /** Optional back-link text; hidden if undefined. */
  backTo?: { href: string; label: string };
  /** Container size for the <main> wrapper. */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

const NAV_ITEMS: Array<{ key: PublicNavKey; to: string; label: string }> = [
  { key: 'home', to: '/', label: 'Home' },
  { key: 'how-it-works', to: '/how-it-works', label: 'How It Works' },
  { key: 'use-cases', to: '/use-cases', label: 'Use Cases' },
  { key: 'methodology', to: '/methodology', label: 'Methodology' },
  { key: 'examples', to: '/examples', label: 'Examples' },
  { key: 'pricing', to: '/pricing', label: 'Pricing' },
  { key: 'blog', to: '/blog', label: 'Blog' },
];

const MAX_WIDTHS: Record<NonNullable<Props['maxWidth']>, string> = {
  sm: 'max-w-3xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
};

export function PublicPageShell({
  children,
  active,
  backTo,
  maxWidth = 'lg',
}: Props) {
  const { pathname } = useLocation();
  const resolvedActive: PublicNavKey | undefined =
    active ?? (NAV_ITEMS.find((n) => n.to === pathname)?.key);

  return (
    <div className="min-h-screen rmg-surface dark text-[var(--rmg-text)]">
      {/* Nav — sticky, translucent, glass-compatible */}
      <nav
        className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-lg"
        style={{ background: 'rgba(11,14,26,0.72)' }}
      >
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="shrink-0" aria-label="AIWMC Quantis — home">
              <BrandLogo height={32} />
            </Link>
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              {NAV_ITEMS.map((n) => (
                <Link
                  key={n.key}
                  to={n.to}
                  className={
                    resolvedActive === n.key
                      ? 'text-sm font-semibold text-foreground'
                      : 'text-sm font-medium text-muted-foreground hover:text-foreground transition-colors'
                  }
                >
                  {n.label}
                </Link>
              ))}
            </div>
            <Link to="/app" className="shrink-0">
              <Button size="sm" className="gap-2 min-h-[48px] px-5 text-sm font-semibold">
                Start Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className={`container ${MAX_WIDTHS[maxWidth]} mx-auto px-4 sm:px-6`}>
        {backTo && (
          <div className="pt-6 pb-2">
            <Link
              to={backTo.href}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> {backTo.label}
            </Link>
          </div>
        )}

        {children}
      </main>

      <ExploreMoreGrid />
      <Footer />
    </div>
  );
}
