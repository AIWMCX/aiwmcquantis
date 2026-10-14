import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, ArrowUpRight } from 'lucide-react';
import { MobileNav } from '@/components/layout/MobileNav';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/brand/BrandLogo';

/**
 * Landing header — Sadewa layout (logo left, mono nav centre, outlined CTA
 * right) on a cosmic-navy bar, the surface the AIWMC QUANTIS logo is made for.
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
        'sdw-dark sticky top-0 z-50 w-full transition-[background-color,border-color] duration-300',
        scrolled ? 'border-b' : 'border-b border-transparent',
      )}
      style={{
        background: scrolled ? 'rgba(5,10,26,0.88)' : '#050a1a',
        backdropFilter: scrolled ? 'blur(14px)' : undefined,
        WebkitBackdropFilter: scrolled ? 'blur(14px)' : undefined,
        borderColor: scrolled ? 'var(--sdw-line)' : 'transparent',
      }}
    >
      <div className="sdw-container">
        <div className="flex items-center gap-6 h-[72px]">
          <div className="xl:hidden -ml-2">
            <MobileNav>
              <button className="p-2" style={{ color: 'var(--sdw-ink)' }} aria-label="Open menu">
                <Menu className="w-5 h-5" />
              </button>
            </MobileNav>
          </div>

          <Link to={user ? '/app' : '/'} className="flex-shrink-0" aria-label="AIWMC Quantis — home">
            <BrandLogo height={34} alt="AIWMC Quantis" />
          </Link>

          <nav className="hidden xl:flex flex-1 items-center justify-center gap-8 2xl:gap-10" aria-label="Primary">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="sdw-label text-[13px] whitespace-nowrap transition-colors hover:text-[var(--sdw-blue-hi)]"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto xl:ml-0 flex items-center gap-4 flex-shrink-0">
            {user ? (
              <Link to="/app" className="sdw-navbtn">
                Go to App <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link to="/auth" className="hidden sm:inline sdw-label text-[13px] hover:text-[var(--sdw-blue-hi)] transition-colors">
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
