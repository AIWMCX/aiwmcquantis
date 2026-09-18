import React from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Menu, ArrowRight } from 'lucide-react';
import { MobileNav } from '@/components/layout/MobileNav';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';

/**
 * Quantis Landing Header
 *
 * Unified with the in-app design system — uses only var(--q-*) tokens
 * and the same Cabinet Grotesk / IBM Plex Mono font pair as the sidebar.
 * No more rmg-* CSS dependencies.
 */

const NAV = [
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/use-cases',    label: 'Use Cases'    },
  // 2026-08-02 (GTM/ICP-discoverability finding): /consultants is a
  // real, fully-built ICP landing page -- honest ROI calculator, objection
  // FAQ, white-label pricing -- that had zero internal links pointing to it
  // anywhere in the live app (not this nav, not the footer, not the
  // homepage body). It was reachable only via a direct URL or a search-
  // engine hit landing exactly on that page. Adding it here, alongside the
  // homepage's own "Who it's for" section, is the actual fix -- the page
  // itself needed no rebuild.
  { to: '/consultants',  label: 'For Consultants' },
  { to: '/examples',     label: 'Examples'     },
  { to: '/risk-gallery', label: 'Risk Gallery' },
  { to: '/pricing',      label: 'Pricing'      },
];

export function RmgHeader() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        background: 'rgba(7,13,26,0.88)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--q-border-subtle)',
      }}
    >
      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-6" style={{ height: '56px' }}>

          {/* ── Mobile hamburger ── */}
          <div className="md:hidden">
            <MobileNav>
              <button
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--q-text-tertiary)' }}
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </MobileNav>
          </div>

          {/* ── AIWMC // QUANTIS. wordmark — same as AppSidebar ── */}
          <Link
            to={user ? '/app' : '/'}
            className="flex items-baseline gap-2 flex-shrink-0 group"
            aria-label="AIWMC Quantis — home"
          >
            <span
              className="hidden sm:inline-block text-[10px] font-semibold tracking-[0.16em] uppercase transition-opacity group-hover:opacity-100 opacity-75"
              style={{
                fontFamily: 'var(--q-font-mono)',
                color: 'var(--q-accent-primary)',
              }}
            >
              AIWMC //
            </span>
            <span
              className="text-[20px] sm:text-[22px] font-extrabold leading-none tracking-tight"
              style={{
                fontFamily: 'var(--q-font-heading)',
                color: 'var(--q-text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              QUANTIS
              <span style={{ color: 'var(--q-accent-primary)' }}>.</span>
            </span>
          </Link>

          {/* ── Primary nav ── */}
          <nav className="hidden md:flex items-center gap-6 ml-2">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="text-[11px] font-medium uppercase tracking-[0.13em] transition-colors whitespace-nowrap"
                style={{
                  fontFamily: 'var(--q-font-mono)',
                  color: 'var(--q-text-tertiary)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--q-text-primary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--q-text-tertiary)'; }}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {/* ── Right cluster ── */}
          <div className="ml-auto flex items-center gap-3 flex-shrink-0">

            {/* ENGINE ONLINE — matches AppTopBar */}
            <div
              className="hidden lg:flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] whitespace-nowrap"
              style={{
                fontFamily: 'var(--q-font-mono)',
                color: 'var(--q-text-tertiary)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{
                  background: 'var(--q-status-green)',
                  boxShadow: '0 0 7px var(--q-status-green)',
                }}
              />
              Engine Online
            </div>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--q-text-tertiary)' }}
              aria-label="Toggle theme"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--q-text-primary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--q-text-tertiary)'; }}
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4" />
                : <Moon className="w-4 h-4" />}
            </button>

            {/* CTA — same teal as before, but via css variable */}
            {user ? (
              <Link
                to="/app"
                className="inline-flex items-center gap-1.5 font-semibold transition-opacity hover:opacity-90"
                style={{
                  fontFamily: 'var(--q-font-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  background: 'var(--aiwmc-grad-brand, #0b5fff)',
                  color: '#ffffff',
                  padding: '9px 16px',
                  borderRadius: '4px',
                }}
              >
                Go to App <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="hidden sm:inline text-[11px] font-medium uppercase tracking-[0.12em] transition-colors px-2"
                  style={{
                    fontFamily: 'var(--q-font-mono)',
                    color: 'var(--q-text-tertiary)',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--q-text-primary)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--q-text-tertiary)'; }}
                >
                  Sign In
                </Link>
                <Link
                  to="/app"
                  className="inline-flex items-center gap-1.5 font-semibold transition-opacity hover:opacity-90"
                  style={{
                    fontFamily: 'var(--q-font-mono)',
                    fontSize: '11px',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    background: 'var(--aiwmc-teal, #2DD4BF)',
                    color: '#060C18',
                    padding: '9px 16px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Start Free Analysis <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
