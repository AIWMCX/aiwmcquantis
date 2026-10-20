import React from 'react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useAdmin } from '@/hooks/useAdmin';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ActivationWidget } from '@/components/engagement/ActivationWidget';
import {
  Home,
  Clock,
  FileText,
  Settings,
  CreditCard,
  HelpCircle,
  Zap,
  Crown,
  Plus,
  ChevronRight,
  ShieldAlert,
  GitCompare,
  Gauge,
  Receipt,
  FolderOpen,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { isEnabled } from '@/lib/flags';

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  external?: boolean;
  badge?: string;
  flag?: 'service_job' | 'commercial_workflow';
  cta?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
  /** Collapsed by default; expands on click or when one of its items is active. */
  collapsible?: boolean;
}

const MORE_TOOLS_KEY = 'q:sidebar:more-tools-open';

// Stage 1 dashboard IA compression (2026-09-27): collapsed from ~15 top-level
// destinations down to the object model in
// docs/execution/dashboard-ia-stage1 (see the PR description's KEEP/MERGE/
// MOVE/RENAME table). No route was deleted: tools are reached from inside a
// Decision (DecisionSummary / AccuracyTransparentResults), from Reports, or
// from the collapsed "More tools" section below.
const NAV_SECTIONS: NavSection[] = [
  {
    label: '',
    items: [
      { title: 'New Decision', url: '/app/new-decision', icon: Plus, cta: true },
    ],
  },
  {
    label: '',
    items: [
      { title: 'Home', url: '/app', icon: Home },
    ],
  },
  {
    label: 'WORK',
    items: [
      { title: 'Decisions', url: '/app?tab=history', icon: Clock },
    ],
  },
  {
    label: 'OUTPUTS',
    items: [
      { title: 'Reports', url: '/docs', icon: FileText },
    ],
  },
  // Compress, don't remove: every standalone tool stays one click away for
  // people who want it directly, without competing with New Decision on the
  // first screen. Before this, My Documents and My Stats had no in-app link
  // at all after the Stage 1 IA compression.
  {
    label: 'More tools',
    collapsible: true,
    items: [
      { title: 'Failure Pre-Mortem', url: '/app/pre-mortem', icon: ShieldAlert },
      { title: 'Scenario Workspace', url: '/app/scenarios', icon: GitCompare },
      { title: 'Capacity Check', url: '/app/invoices', icon: Gauge },
      { title: 'Service Quotes', url: '/quote', icon: Receipt, flag: 'service_job' },
      { title: 'My Documents', url: '/app/documents', icon: FolderOpen },
      { title: 'My Stats', url: '/app/stats', icon: TrendingUp },
    ],
  },
  {
    label: '',
    items: [
      // Admin tools live in their own shell (/admin), not in the customer app.
      { title: 'Admin panel', url: '/admin', icon: Shield, adminOnly: true },
      { title: 'Billing', url: '__settings__?tab=billing', icon: CreditCard },
      { title: 'Settings', url: '__settings__', icon: Settings },
      { title: 'Help', url: 'https://aiwmcquantis.com/how-it-works', icon: HelpCircle, external: true },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = React.useState<boolean>(() => {
    try {
      return window.localStorage.getItem(MORE_TOOLS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggleMore = () =>
    setMoreOpen((open) => {
      try {
        window.localStorage.setItem(MORE_TOOLS_KEY, open ? '0' : '1');
      } catch {
        /* private mode */
      }
      return !open;
    });
  const { isPlus, isPro } = useSubscription();
  const { isAdmin } = useAdmin();

  const settingsPath = isPro ? '/pro-settings' : '/plus-settings';
  const resolveUrl = (url: string) => url.replace('__settings__', settingsPath);

  const isActive = (url: string) => {
    const resolvedUrl = resolveUrl(url);
    const [path, query] = resolvedUrl.split('?');
    if (query) return location.pathname === path && location.search.includes(query);
    return location.pathname === path && !location.search;
  };

  const handleNavClick = (item: NavItem) => {
    if (item.external) window.open(item.url, '_blank', 'noopener,noreferrer');
    else navigate(resolveUrl(item.url));
  };

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'U';
  const userEmail = user?.email || '';

  const tierLabel = isPro ? 'PRO' : isPlus ? 'PLUS' : 'FREE';
  const tierColor = isPro
    ? 'text-amber-400'
    : isPlus
      ? 'text-[var(--q-accent-primary)]'
      : 'text-[var(--q-text-tertiary)]';

  return (
    <TooltipProvider delayDuration={200}>
      <Sidebar
        collapsible="offcanvas"
        className="border-r"
        style={{
          background: 'var(--q-bg-surface)',
          borderColor: 'var(--q-border-subtle)',
          width: collapsed ? '60px' : '228px',
        }}
      >
        {/* ── HEADER — AIWMC QUANTIS logo ── */}
        <SidebarHeader
          className="flex items-center px-4 border-b"
          style={{
            height: '52px',
            borderColor: 'var(--q-border-subtle)',
          }}
        >
          {collapsed ? (
            /* Collapsed: accent bar only */
            <div
              className="w-[3px] h-6 rounded-full mx-auto"
              style={{ background: 'var(--q-accent-primary)' }}
            />
          ) : (
            <div className="flex items-center gap-2.5">
              <BrandLogo height={24} tile alt="AIWMC Quantis" />
              <span
                className="text-[9px] tracking-[0.08em] uppercase"
                style={{ fontFamily: 'var(--q-font-mono)', color: 'var(--q-text-tertiary)' }}
              >
                {tierLabel} PLAN
              </span>
            </div>
          )}
        </SidebarHeader>

        {/* ── NAV ── */}
        <SidebarContent className="py-3 overflow-y-auto">
          {NAV_SECTIONS.map((section, sectionIdx) => {
            const visibleItems = section.items.filter(
              (item) =>
                (!item.adminOnly || isAdmin) &&
                (!item.flag || isEnabled(item.flag))
            );
            if (visibleItems.length === 0) return null;
            const sectionOpen =
              !section.collapsible || moreOpen || visibleItems.some((item) => isActive(item.url));
            if (section.collapsible && collapsed) return null;

            return (
              <SidebarGroup key={`${section.label || 'section'}-${sectionIdx}`} className="mb-1">
                {/* Section label — IBM Plex Mono, uppercase, faint */}
                {!collapsed && section.label && section.collapsible && (
                  <button
                    type="button"
                    onClick={toggleMore}
                    aria-expanded={sectionOpen}
                    className="px-4 mb-1 mt-2 flex items-center gap-1 w-full text-left hover:opacity-80"
                    style={{
                      fontFamily: 'var(--q-font-mono)',
                      fontSize: '9px',
                      fontWeight: 600,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--q-text-ghost)',
                    }}
                  >
                    <ChevronRight
                      className="w-3 h-3 transition-transform"
                      style={{ transform: sectionOpen ? 'rotate(90deg)' : 'none' }}
                    />
                    {section.label}
                  </button>
                )}
                {!collapsed && section.label && !section.collapsible && (
                  <div
                    className="px-4 mb-1 mt-2"
                    style={{
                      fontFamily: 'var(--q-font-mono)',
                      fontSize: '9px',
                      fontWeight: 600,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--q-text-ghost)',
                    }}
                  >
                    {section.label}
                  </div>
                )}
                {sectionOpen && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleItems.map((item) => {
                      const active = isActive(item.url);
                      const Icon = item.icon;

                      const btn = (
                        <SidebarMenuButton
                          onClick={() => handleNavClick(item)}
                          style={{
                            height: item.cta ? '38px' : '36px',
                            margin: item.cta ? '2px 6px 6px' : '1px 6px',
                            borderRadius: 'var(--q-radius-md)',
                            transition: 'all 120ms ease-out',
                            fontFamily: 'var(--q-font-body)',
                            fontSize: '13px',
                            fontWeight: item.cta ? 600 : active ? 500 : 400,
                            ...(item.cta
                              ? {
                                  background: 'var(--q-accent-primary)',
                                  color: 'var(--q-bg-surface)',
                                  justifyContent: collapsed ? 'center' : 'flex-start',
                                }
                              : active
                              ? {
                                  background: 'var(--q-bg-elevated)',
                                  borderLeft: '2px solid var(--q-accent-primary)',
                                  color: 'var(--q-accent-primary)',
                                  paddingLeft: '10px',
                                }
                              : {
                                  color: 'var(--q-text-secondary)',
                                }),
                          }}
                          className={
                            item.cta
                              ? 'hover:opacity-90'
                              : !active
                              ? 'hover:bg-[var(--q-bg-elevated)] hover:text-[var(--q-text-primary)]'
                              : ''
                          }
                        >
                          <Icon
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ color: item.cta ? 'inherit' : active ? 'var(--q-accent-primary)' : 'inherit' }}
                          />
                          {!collapsed && (
                            <>
                              <span className="ml-2.5 truncate">{item.title}</span>
                              {/* Generic badge (BETA etc.) */}
                              {item.badge && (
                                <span
                                  className="ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded"
                                  style={{
                                    fontFamily: 'var(--q-font-mono)',
                                    letterSpacing: '0.08em',
                                    background: 'var(--q-status-green-bg)',
                                    color: 'var(--q-status-green)',
                                    border: '1px solid var(--q-status-green-border)',
                                  }}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                        </SidebarMenuButton>
                      );

                      return (
                        <SidebarMenuItem key={item.title}>
                          {collapsed ? (
                            <Tooltip>
                              <TooltipTrigger asChild>{btn}</TooltipTrigger>
                              <TooltipContent side="right">{item.title}</TooltipContent>
                            </Tooltip>
                          ) : btn}
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
                )}
              </SidebarGroup>
            );
          })}
        </SidebarContent>

        {/* ── FOOTER — user info ── */}
        <SidebarFooter
          className="border-t"
          style={{
            padding: '12px',
            borderColor: 'var(--q-border-subtle)',
          }}
        >
          <ActivationWidget collapsed={collapsed} />
          <div className={`flex items-center mt-2 ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback
                className="text-[10px] font-bold"
                style={{
                  background: 'var(--q-accent-glow)',
                  color: 'var(--q-accent-primary)',
                  fontFamily: 'var(--q-font-mono)',
                }}
              >
                {userInitials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p
                  className="truncate leading-none"
                  style={{
                    fontFamily: 'var(--q-font-body)',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--q-text-primary)',
                  }}
                >
                  {userEmail}
                </p>
                <span
                  className={`text-[9px] font-bold tracking-[0.1em] uppercase mt-0.5 block ${tierColor}`}
                  style={{ fontFamily: 'var(--q-font-mono)' }}
                >
                  {isPro && <Crown className="w-2.5 h-2.5 inline mr-0.5 mb-px" />}
                  {!isPro && isPlus && <Zap className="w-2.5 h-2.5 inline mr-0.5 mb-px" />}
                  {tierLabel}
                </span>
              </div>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}
