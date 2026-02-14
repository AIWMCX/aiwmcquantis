import React from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun, LogOut, User, Shield, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileNav } from './MobileNav';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import aiwmcLogoText from '@/assets/aiwmc-quantis-logo-text.png';

interface HeaderProps {
  darkMode?: boolean;
  onToggleTheme?: () => void;
}

export function Header({ darkMode: _legacyDarkMode, onToggleTheme: _legacyToggle }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const darkMode = theme === 'dark';
  const onToggleTheme = () => setTheme(darkMode ? 'light' : 'dark');
  const { user, isAuthenticated, signOut, isLoading } = useAuth();
  const { isAdmin } = useAdmin();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Error signing out');
    } else {
      toast.success('You have signed out');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img 
            src={aiwmcLogoText}
            alt="AIWMC Quantis"
            className="h-10 sm:h-12 w-auto object-contain dark:invert"
          />
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            className="h-9 w-9"
          >
            {darkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Mobile hamburger menu */}
          {isMobile && (
            <MobileNav>
              <Button variant="ghost" size="icon" className="h-10 w-10 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </MobileNav>
          )}

          {!isMobile && !isLoading && (
            <>
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <NotificationCenter />
                  {isAdmin && (
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/admin" className="flex items-center gap-1.5">
                        <Shield className="w-4 h-4" />
                        <span>Admin</span>
                      </Link>
                    </Button>
                  )}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground truncate max-w-[150px]">
                      {user?.email}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSignOut}
                    className="h-9 w-9"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ) : (
                <Button asChild variant="default" size="sm">
                  <Link to="/auth">Sign In</Link>
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
