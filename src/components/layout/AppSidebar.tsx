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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
  Lock,
} from 'lucide-react';

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  external?: boolean;
  badge?: string;
  /** True = the item itself is a Plus-only module — show 🔒 to Free users */
  plusOnly?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'ANALYSIS',
    items: [
      { title: 'Dashboard', url: '/app', icon: LayoutDashboard },
      { title: 'History', url: '/app?tab=history', icon: Clock },
    ],
  },
  {
    label: 'DOCUMENTS',
    items: [
      { title: 'My Documents', url: '/docs', icon: FileText, plusOnly: true },
      { title: 'Templates', url: '/docs?view=templates', icon: FolderOpen, plusOnly: true },
    ],
  },
  {
    label: 'BILLING',
    items: [
      { title: 'Invoices', url: '/app/invoices', icon: Receipt, plusOnly: true },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { title: 'Benchmarks', url: '/admin/benchmarks', icon: BarChart3, adminOnly: true },
      { title: 'Scenarios', url: '/app?tab=scenarios', icon: GitBranch },
      { title: 'My Stats', url: '/app/stats', icon: Trophy },
      { title: 'Progress', url: '/leaderboard', icon: TrendingUp },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { title: 'Settings', url: '/plus-settings', icon: Settings },
      { title: 'Billing', url: '/plus-settings?tab=billing', icon: CreditCard },
      { title: 'Help', url: 'https://aiwmcquantis.lovable.app/how-it-works', icon: HelpCircle, external: true },
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
  const { isAdmin } = useAdmin();

  const isActive = (url: string) => {
    const [path, query] = url.split('?');
    if (query) {
      return location.pathname === path && location.search.includes(query);
    }
    return location.pathname === path && !location.search;
  };

  const handleNavClick = (item: NavItem) => {
    if (item.external) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(item.url);
    }
  };

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'U';
  const userEmail = user?.email || 'User';
  const settingsPath = isPro ? '/pro-settings' : '/plus-settings';

  return (
    <TooltipProvider delayDuration={200}>
      <Sidebar
        collapsible="offcanvas"
        className="border-r border-[var(--q-border-subtle)] bg-[var(--q-bg-surface)]"
        style={{ width: collapsed ? '60px' : '240px' }}
      >
        <SidebarHeader className="h-16 flex items-center px-4 border-b border-[var(--q-border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-[3px] h-8 bg-[var(--q-accent-primary)] rounded-full" />
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-sora font-bold text-sm text-[var(--q-text-primary)]">
                  AIWMC Quantis
                </span>
                <span className="font-dm-sans font-mono font-semibold text-xs border-[sidebar-accent-foreground] border-card shadow-none">
                  by AIWMC​™  LLC
                </span>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="py-4">
          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter(
              (item) => !item.adminOnly || isAdmin
            );
            
            if (visibleItems.length === 0) return null;

            return (
              <SidebarGroup key={section.label}>
                {!collapsed && (
                  <SidebarGroupLabel className="px-4 mb-2 text-[12px] font-dm-sans font-medium tracking-[0.06em] text-[#94A3B8] uppercase">
                    {section.label}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleItems.map((item) => {
                      const active = isActive(item.url);
                      const Icon = item.icon;

                      const button = (
                        <SidebarMenuButton
                          onClick={() => handleNavClick(item)}
                          className={`
                            h-11 mx-2 rounded-[var(--q-radius-md)] transition-all duration-150
                            ${active
                              ? 'bg-[var(--q-bg-elevated)] border-l-[3px] border-[var(--q-accent-primary)] text-[var(--q-accent-primary)]'
                              : 'text-[var(--q-text-secondary)] hover:bg-[var(--q-bg-elevated)] hover:text-[var(--q-text-primary)]'
                            }
                          `}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 ${active ? 'text-[var(--q-accent-primary)]' : ''}`}
                          />
                          {!collapsed && (
                            <span className="ml-3 text-sm font-dm-sans font-medium">
                              {item.title}
                            </span>
                          )}
                          {!collapsed && item.plusOnly && !isPlus && (
                            <span
                              className="ml-auto inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--q-accent-glow)] text-[var(--q-accent-primary)] border border-[var(--q-accent-primary)]/30"
                              title="Plus only"
                            >
                              <Lock className="w-2.5 h-2.5" />
                              Plus
                            </span>
                          )}
                          {!collapsed && item.badge && (
                            <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--q-status-red)', color: '#fff' }}>
                              {item.badge}
                            </span>
                          )}
                        </SidebarMenuButton>
                      );

                      return (
                        <SidebarMenuItem key={item.title}>
                          {collapsed ? (
                            <Tooltip>
                              <TooltipTrigger asChild>{button}</TooltipTrigger>
                              <TooltipContent side="right">{item.title}</TooltipContent>
                            </Tooltip>
                          ) : (
                            button
                          )}
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </SidebarContent>

        <SidebarFooter className="p-4 border-t border-[var(--q-border-subtle)]">
          <ActivationWidget collapsed={collapsed} />
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-[var(--q-accent-glow)] text-[var(--q-accent-primary)] text-xs font-medium">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-dm-sans font-medium text-[var(--q-text-primary)] truncate">
                  {userEmail}
                </p>
                <Badge
                  variant={isPlus ? 'default' : 'secondary'}
                  className={`mt-0.5 text-[10px] h-5 ${
                    isPlus
                      ? 'bg-[var(--q-accent-glow)] text-[var(--q-accent-primary)] border-[var(--q-accent-primary)]/30'
                      : ''
                  }`}
                >
                  {isPlus && <Zap className="w-2.5 h-2.5 mr-1" />}
                  {isPlus ? 'Plus' : 'Free'}
                </Badge>
              </div>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}
