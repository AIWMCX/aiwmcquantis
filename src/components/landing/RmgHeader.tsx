import React from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun, Menu, ArrowRight } from 'lucide-react';
import { MobileNav } from '@/components/layout/MobileNav';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';

/**
 * RMG Header — "Risk Matrix Grid" direction.
 * The AIWMC // QUANTIS wordmark is engraved directly into the header bar;
 * there is no boxed logo chip. The header sits on the same 12-col grid as
 * the rest of the landing surface.
 */
export function RmgHeader() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const nav = [
    { to: '/how-it-works', label: 'How It Works' },
    { to: '/use-cases', label: 'Use Cases' },
    { to: '/examples', label: 'Examples' },
    { to: '/risk-gallery', label: 'Risk Gallery' },
    { to: '/pricing', label: 'Pricing' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--rmg-ink-2)] bg-[var(--rmg-ink-0)]/85 backdrop-blur-md">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center gap-6">
          {/* Mobile menu */}
          <div className="md:hidden">
            <MobileNav>
              <button
                className="p-2 rounded-md text-[var(--rmg-text-dim)] hover:text-[var(--rmg-text)] hover:bg-[var(--rmg-ink-2)] transition-colors"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </MobileNav>
          </div>

          {/* Engraved wordmark — dissolves into ink */}
          <Link to={user ? '/app' : '/'} className="flex items-baseline gap-2.5 group" aria-label="AIWMC Quantis — home">
            <span className="rmg-wordmark-tag hidden sm:inline">AIWMC //</span>
            <span className="rmg-wordmark text-[20px] sm:text-[22px] leading-none">
              QUANTIS
              <span className="text-[var(--rmg-cyan)] opacity-60">.</span>
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-7 ml-4">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rmg-mono text-[11px] uppercase tracking-[0.14em] text-[var(--rmg-text-dim)] hover:text-[var(--rmg-cyan)] transition-colors"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 rmg-mono text-[10px] uppercase tracking-widest text-[var(--rmg-text-mute)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--rmg-lime)] shadow-[0_0_8px_var(--rmg-lime)]" />
              Engine Online
            </div>

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-md text-[var(--rmg-text-dim)] hover:text-[var(--rmg-text)] hover:bg-[var(--rmg-ink-2)] transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {user ? (
              <Link
                to="/app"
                className="rmg-mono text-[11px] uppercase tracking-[0.14em] bg-[var(--rmg-cyan)] hover:bg-[var(--rmg-cyan-hi)] text-[var(--rmg-ink-0)] font-semibold px-4 py-2.5 inline-flex items-center gap-1.5 transition-colors"
              >
                Go to App <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="hidden sm:inline rmg-mono text-[11px] uppercase tracking-[0.14em] text-[var(--rmg-text-dim)] hover:text-[var(--rmg-text)] transition-colors px-2"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth?mode=signup"
                  className="rmg-mono text-[11px] uppercase tracking-[0.14em] bg-[var(--rmg-cyan)] hover:bg-[var(--rmg-cyan-hi)] text-[var(--rmg-ink-0)] font-semibold px-4 py-2.5 inline-flex items-center gap-1.5 transition-colors"
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
