import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, ArrowUpRight } from 'lucide-react';
import { MobileNav } from '@/components/layout/MobileNav';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

/**
 * Landing header — Sadewa layout (wordmark left, mono nav centre,
 * outlined CTA right) on the AIWMC palette. The AIWMC // QUANTIS.
 * wordmark itself is unchanged.
 */

const NAV = [
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/use-cases',    label: 'Use Cases'    },
  // /consultants is the ICP landing page; it must stay linked from the nav
  // (pinned by production-freeze T19) or it becomes orphaned again.
  { to: '/consultants',  label: 'For Consultants' },
  { to: '/examples',     label: 'Examples'     },
  { to: '/risk-gallery', label: 'Risk Gallery' },
  { to: '/pricing',      label: 'Pricing'      },
];

export function RmgHeader() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-[background-color,border-color] duration-300',
        scrolled ? 'border-b' : 'border-b border-transparent',
      )}
      style={{
        background: scrolled ? 'rgba(243,245,249,0.86)' : 'var(--sdw-bg)',
        backdropFilter: scrolled ? 'blur(14px)' : undefined,
        WebkitBackdropFilter: scrolled ? 'blur(14px)' : undefined,
        borderColor: scrolled ? 'var(--sdw-line)' : 'transparent',
      }}
    >
      <div className="sdw-container">
        <div className="flex items-center gap-6 h-[72px]">
          <div className="lg:hidden -ml-2">
            <MobileNav>
              <button className="p-2" style={{ color: 'var(--sdw-ink)' }} aria-label="Open menu">
                <Menu className="w-5 h-5" />
              </button>
            </MobileNav>
          </div>

          {/* AIWMC // QUANTIS. wordmark */}
          <Link to={user ? '/app' : '/'} className="flex items-baseline gap-2 flex-shrink-0 group" aria-label="AIWMC Quantis — home">
            <span
              className="hidden sm:inline-block text-[10px] font-semibold tracking-[0.16em] uppercase opacity-80 group-hover:opacity-100 transition-opacity"
              style={{ fontFamily: 'var(--sdw-font-mono)', color: 'var(--sdw-blue-ink)' }}
            >
              AIWMC //
            </span>
            <span
              className="text-[22px] sm:text-[24px] font-extrabold leading-none"
              style={{ fontFamily: 'var(--sdw-font-display)', color: 'var(--sdw-ink)', letterSpacing: '-0.03em' }}
            >
              QUANTIS<span style={{ color: 'var(--sdw-blue)' }}>.</span>
            </span>
          </Link>

          <nav className="hidden lg:flex flex-1 items-center justify-center gap-7 xl:gap-10" aria-label="Primary">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="sdw-label text-[13px] whitespace-nowrap transition-colors hover:text-[var(--sdw-blue-ink)]"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto lg:ml-0 flex items-center gap-4 flex-shrink-0">
            {user ? (
              <Link to="/app" className="sdw-navbtn">
                Go to App <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link to="/auth" className="hidden sm:inline sdw-label text-[13px] hover:text-[var(--sdw-blue-ink)] transition-colors">
                  Sign in
                </Link>
                <Link to="/app" className="sdw-navbtn">
                  Start free <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
