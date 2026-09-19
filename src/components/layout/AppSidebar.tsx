import React from 'react';
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
  LayoutDashboard,
  Clock,
  FileText,
  Receipt,
  FolderOpen,
  BarChart3,
  GitBranch,
  TrendingUp,
  Trophy,
  Settings,
  CreditCard,
  HelpCircle,
  Zap,
  Crown,
  Megaphone,
  Radio,
} from 'lucide-react';
import { isEnabled } from '@/lib/flags';

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  contentAdminOnly?: boolean;
  external?: boolean;
  badge?: string;
  flag?: 'service_job';
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'ANALYSIS',
    items: [
      { title: 'Decision Analysis', url: '/app', icon: LayoutDashboard, badge: '5 FREE' },
      { title: 'Failure Pre-Mortem', url: '/app/pre-mortem', icon: Zap, badge: 'INCLUDED' },
      { title: 'Client Proposal', url: '/quote', icon: Receipt, badge: 'BETA', flag: 'service_job' },
      { title: 'Decision History', url: '/app?tab=history', icon: Clock },
    ],
  },
  {
    label: 'DOCUMENTS',
    items: [
      { title: 'Decision Report', url: '/docs', icon: FileText },
      { title: 'Document Templates', url: '/docs?view=templates', icon: FolderOpen },
    ],
  },
  {
    label: 'BILLING',
    items: [
      { title: 'Invoice & Capacity', url: '/app/invoices', icon: Receipt },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { title: 'Benchmarks', url: '/admin/benchmarks', icon: BarChart3, adminOnly: true },
      { title: 'Compare Outcomes', url: '/app/scenarios', icon: GitBranch, badge: 'INCLUDED' },
      { title: 'My Stats', url: '/app/stats', icon: Trophy },
      { title: 'Progress', url: '/leaderboard', icon: TrendingUp },
    ],
  },
  {
    label: 'ADMIN',
    items: [
      { title: 'Content Studio', url: '/admin/content-studio', icon: Radio, contentAdminOnly: true },
      { title: 'Autoposter', url: '/admin/autoposter', icon: Megaphone, contentAdminOnly: true },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { title: 'Settings', url: '__settings__', icon: Settings },
      { title: 'Billing', url: '__settings__?tab=billing', icon: CreditCard },
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
  const { isPlus, isPro } = useSubscription();
  const { isAdmin, isContentAdmin } = useAdmin();

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
        {/* ── HEADER — AIWMC // QUANTIS. wordmark ── */}
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
              <div
                className="w-[3px] h-7 rounded-full flex-shrink-0"
                style={{ background: 'var(--q-accent-primary)' }}
              />
              <div className="flex flex-col leading-none">
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-[9px] font-semibold tracking-[0.15em] uppercase"
                    style={{
                      fontFamily: 'var(--q-font-mono)',
                      color: 'var(--q-accent-primary)',
                    }}
                  >
                    AIWMC //
                  </span>
                  <span
                    className="text-sm font-extrabold tracking-tight"
                    style={{
                      fontFamily: 'var(--q-font-heading)',
                      color: 'var(--q-text-primary)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    QUANTIS
                    <span style={{ color: 'var(--q-accent-primary)' }}>.</span>
                  </span>
                </div>
                <span
                  className="text-[9px] tracking-[0.08em] uppercase"
                  style={{
                    fontFamily: 'var(--q-font-mono)',
                    color: 'var(--q-text-tertiary)',
                    marginTop: '1px',
                  }}
                >
                  {tierLabel} PLAN
                </span>
              </div>
            </div>
          )}
        </SidebarHeader>

        {/* ── NAV ── */}
        <SidebarContent className="py-3 overflow-y-auto">
          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter(
              (item) =>
                (!item.adminOnly || isAdmin) &&
                (!item.contentAdminOnly || isContentAdmin) &&
                (!item.flag || isEnabled(item.flag))
            );
            if (visibleItems.length === 0) return null;

            return (
              <SidebarGroup key={section.label} className="mb-1">
                {/* Section label — IBM Plex Mono, uppercase, faint */}
                {!collapsed && (
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
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleItems.map((item) => {
                      const active = isActive(item.url);
                      const Icon = item.icon;

                      const btn = (
                        <SidebarMenuButton
                          onClick={() => handleNavClick(item)}
                          style={{
                            height: '36px',
                            margin: '1px 6px',
                            borderRadius: 'var(--q-radius-md)',
                            transition: 'all 120ms ease-out',
                            fontFamily: 'var(--q-font-body)',
                            fontSize: '13px',
                            fontWeight: active ? 500 : 400,
                            ...(active
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
                          className={!active ? 'hover:bg-[var(--q-bg-elevated)] hover:text-[var(--q-text-primary)]' : ''}
                        >
                          <Icon
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ color: active ? 'var(--q-accent-primary)' : 'inherit' }}
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
