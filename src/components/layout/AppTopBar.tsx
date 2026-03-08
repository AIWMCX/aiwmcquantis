import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
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
import { Bell, LogOut, Settings, User } from 'lucide-react';

interface AppTopBarProps {
  title?: string;
}

export function AppTopBar({ title }: AppTopBarProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, signOut } = useAuth();

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'U';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-[var(--q-border-subtle)] bg-[var(--q-bg-base)]">
      {/* Left: Sidebar trigger (always visible) */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="h-9 w-9" />
        {title && (
          <h1 className="font-sora font-medium text-base text-[var(--q-text-primary)]">
            {title}
          </h1>
        )}
      </div>

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-[var(--q-text-secondary)] hover:text-[var(--q-text-primary)]"
        >
          <Bell className="h-4 w-4" />
        </Button>

        {/* User Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full p-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[var(--q-accent-glow)] text-[var(--q-accent-primary)] text-xs font-medium">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/plus-settings')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/plus-settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-[var(--q-status-red)]">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
