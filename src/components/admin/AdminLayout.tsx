import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, Mail, Search, Radio, Megaphone, Handshake, Inbox,
  DollarSign, Cpu, ShieldCheck, Activity, Sigma, BarChart3, Database, Settings2,
  MessageSquare, Ban, HeartPulse, Server, ScanSearch, Siren, ArrowLeft, Menu, X, FlaskConical,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useAuth } from '@/hooks/useAuth';
import { isEnabled } from '@/lib/flags';
import { cn } from '@/lib/utils';

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; flag?: string; end?: boolean };
type Group = { label: string; items: Item[] };

/** Every admin page, grouped by the question it answers. */
export const ADMIN_NAV: Group[] = [
  {
    label: 'Daily',
    items: [
      { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/admin/insights', label: 'Metrics & experiments', icon: FlaskConical },
    ],
  },
  {
    label: 'Growth',
    items: [
      { to: '/admin/funnel', label: 'Funnel & sources', icon: TrendingUp },
      { to: '/admin/email-funnel', label: 'Email funnel', icon: Mail },
      { to: '/admin/search-console', label: 'Search console', icon: Search },
      { to: '/admin/content-studio', label: 'Content Studio', icon: Radio },
      { to: '/admin/autoposter', label: 'Autoposter', icon: Megaphone },
      { to: '/admin/commercial', label: 'Commercial Ops', icon: Handshake, flag: 'commercial_workflow' },
      { to: '/admin/inbox', label: 'Business inbox', icon: Inbox },
    ],
  },
  {
    label: 'Revenue & cost',
    items: [
      { to: '/admin/paid-engagements', label: 'Paid engagements', icon: DollarSign },
      { to: '/admin/ai-costs', label: 'AI costs', icon: Cpu },
    ],
  },
  {
    label: 'Product quality',
    items: [
      { to: '/admin/accuracy', label: 'Accuracy', icon: ShieldCheck },
      { to: '/admin/qoc', label: 'QOC monitor', icon: Activity },
      { to: '/admin/formulas', label: 'Formulas', icon: Sigma },
      { to: '/admin/benchmarks', label: 'Benchmarks', icon: BarChart3 },
      { to: '/admin/data-sources', label: 'Data sources', icon: Database },
      { to: '/admin/engine', label: 'Engine', icon: Settings2 },
      { to: '/admin/feedback-baseline', label: 'Feedback baseline', icon: MessageSquare },
      { to: '/admin/denials', label: 'Denials', icon: Ban },
    ],
  },
  {
    label: 'Reliability',
    items: [
      { to: '/admin/health', label: 'System health', icon: HeartPulse },
      { to: '/admin/edge-health', label: 'Edge functions', icon: Server },
      { to: '/admin/invariant-sweeps', label: 'Invariant sweeps', icon: ScanSearch },
      { to: '/admin/incidents', label: 'Incidents', icon: Siren },
    ],
  },
];

const ALL_ITEMS = ADMIN_NAV.flatMap((g) => g.items);

function currentTitle(pathname: string): string {
  const exact = ALL_ITEMS.find((i) => i.to === pathname);
  if (exact) return exact.label;
  const prefix = ALL_ITEMS.filter((i) => i.to !== '/admin' && pathname.startsWith(i.to)).sort((a, b) => b.to.length - a.to.length)[0];
  return prefix?.label ?? 'Admin';
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      {ADMIN_NAV.map((g) => {
        const items = g.items.filter((i) => !i.flag || isEnabled(i.flag as never));
        if (items.length === 0) return null;
        return (
          <div key={g.label}>
            <p className="px-3 mb-1.5 text-[11px] uppercase tracking-[0.08em]" style={{ fontFamily: 'var(--sdw-font-mono)', color: 'var(--sdw-muted)' }}>
              {g.label}
            </p>
            <ul className="space-y-0.5">
              {items.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--sdw-blue-hi)]',
                        isActive ? 'bg-white/10 text-white font-medium' : 'text-[var(--sdw-ink-2)] hover:bg-white/5 hover:text-white',
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  return (
    <>
      <div className="flex items-center justify-between px-5 h-16 border-b" style={{ borderColor: 'var(--sdw-line)' }}>
        <Link to="/admin" onClick={onNavigate} aria-label="Admin overview">
          <BrandLogo height={30} />
        </Link>
        <span className="text-[10px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded" style={{ fontFamily: 'var(--sdw-font-mono)', color: 'var(--sdw-blue-hi)', border: '1px solid var(--sdw-line-strong)' }}>
          Admin
        </span>
      </div>
      <Nav onNavigate={onNavigate} />
      <div className="border-t px-3 py-3 space-y-2" style={{ borderColor: 'var(--sdw-line)' }}>
        <Link to="/app" onClick={onNavigate} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--sdw-ink-2)] hover:bg-white/5 hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--sdw-blue-hi)]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to app
        </Link>
        {user?.email && <p className="px-3 text-xs truncate" style={{ color: 'var(--sdw-muted)' }} title={user.email}>{user.email}</p>}
      </div>
    </>
  );
}

/**
 * Admin shell: every /admin route renders inside this, never inside the
 * customer app shell. Sidebar is the cosmic-navy zone; the work area keeps the
 * app's normal theme so existing admin pages render unchanged.
 */
export function AdminLayout() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const title = currentTitle(pathname);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-background focus:px-3 focus:py-2">
        Skip to content
      </a>

      <aside className="sdw-dark hidden lg:flex lg:flex-col w-64 shrink-0 h-screen sticky top-0" aria-label="Admin navigation">
        <SidebarBody />
      </aside>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="sdw-dark relative flex flex-col w-72 max-w-[85vw] h-full">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-5 p-1 text-[var(--sdw-ink-2)] hover:text-white" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            <SidebarBody onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 sm:px-6 border-b bg-background/90 backdrop-blur">
          <button type="button" className="lg:hidden -ml-1 p-2 rounded-md hover:bg-muted" aria-label="Open admin menu" aria-expanded={open} onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground hidden sm:block">Admin</p>
          <span className="text-muted-foreground hidden sm:block" aria-hidden="true">/</span>
          <p className="text-sm font-semibold truncate">{title}</p>
        </header>
        <main id="admin-main" className="flex-1 min-w-0" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
