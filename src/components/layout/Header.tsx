import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, Moon, Sun, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface HeaderProps {
  darkMode: boolean;
  onToggleTheme: () => void;
}

export function Header({ darkMode, onToggleTheme }: HeaderProps) {
  const { user, isAuthenticated, signOut, isLoading } = useAuth();

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
        <Link to="/" className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">AI Business Analyzer</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Professional business idea analysis</p>
          </div>
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

          {!isLoading && (
            <>
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
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
                    title="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
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
