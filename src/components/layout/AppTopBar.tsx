import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface AppTopBarProps {
  title?: string;
}

export function AppTopBar({ title }: AppTopBarProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isPro, isPlus } = useSubscription();

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'U';
  const settingsPath = isPro ? '/pro-settings' : '/plus-settings';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const tierLabel = isPro ? 'PRO' : isPlus ? 'PLUS' : 'FREE';
  const tierColor = isPro
    ? 'text-amber-400 border-amber-400/30 bg-amber-400/8'
    : isPlus
      ? 'text-[var(--q-accent-primary)] border-[var(--q-accent-primary)]/30 bg-[var(--q-accent-primary)]/8'
      : 'text-[var(--q-text-tertiary)] border-[var(--q-border-default)] bg-transparent';

  return (
    <header
      className="flex items-center justify-between px-4 md:px-6 border-b"
      style={{
        height: '52px',
        background: 'var(--q-bg-base)',
        borderColor: 'var(--q-border-subtle)',
        fontFamily: 'var(--q-font-body)',
      }}
    >
      {/* LEFT: sidebar toggle + optional breadcrumb title */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="h-8 w-8 text-[var(--q-text-tertiary)] hover:text-[var(--q-text-primary)]" />
        {title && (
          <span
            className="text-xs font-medium tracking-[0.1em] uppercase text-[var(--q-text-tertiary)] hidden sm:block"
            style={{ fontFamily: 'var(--q-font-mono)' }}
          >
            {title}
          </span>
        )}
      </div>

      {/* CENTER: ENGINE ONLINE status — matches landing header exactly */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-1.5">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"
          style={{ boxShadow: '0 0 6px rgba(52,211,153,0.9)' }}
        />
        <span
          className="text-[10px] font-medium tracking-[0.14em] uppercase text-[var(--q-text-tertiary)]"
          style={{ fontFamily: 'var(--q-font-mono)' }}
        >
          ENGINE ONLINE
        </span>
      </div>

      {/* RIGHT: tier badge + theme toggle + user */}
      <div className="flex items-center gap-1.5">
        {/* Tier chip */}
        <span
          className={`hidden sm:inline-flex items-center text-[9px] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded border ${tierColor}`}
          style={{ fontFamily: 'var(--q-font-mono)' }}
        >
          {tierLabel}
        </span>

        <ThemeToggle />

        {/* User avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full p-0 hover:bg-[var(--q-bg-elevated)]"
            >
              <Avatar className="h-7 w-7">
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
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48"
            style={{ background: 'var(--q-bg-surface)', border: '1px solid var(--q-border-default)' }}
          >
            <div
              className="px-3 py-2 text-xs text-[var(--q-text-tertiary)] truncate"
              style={{ fontFamily: 'var(--q-font-mono)', fontSize: '10px', letterSpacing: '0.05em' }}
            >
              {user?.email}
            </div>
            <DropdownMenuSeparator style={{ background: 'var(--q-border-subtle)' }} />
            <DropdownMenuItem onClick={() => navigate(settingsPath)}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(settingsPath)}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator style={{ background: 'var(--q-border-subtle)' }} />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-[var(--q-status-red)] focus:text-[var(--q-status-red)]"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
