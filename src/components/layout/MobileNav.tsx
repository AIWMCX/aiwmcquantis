import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  LayoutDashboard, 
  Shield, 
  Settings, 
  LogOut, 
  User,
  FileText,
  Lock,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
 import aiwmcLogoLight from '@/assets/aiwmc-quantis-logo-light.png';

interface MobileNavProps {
  children: React.ReactNode;
}

export function MobileNav({ children }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);
  const { user, isAuthenticated, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const location = useLocation();

  const handleSignOut = async () => {
    setOpen(false);
    const { error } = await signOut();
    if (error) {
      toast.error('Error signing out');
    } else {
      toast.success('You have signed out');
    }
  };

  const handleLinkClick = () => {
    setOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Home', icon: Home, show: true },
    { path: '/app', label: 'Dashboard', icon: LayoutDashboard, show: isAuthenticated },
    { path: '/plus-settings', label: 'Plus Settings', icon: Settings, show: isAuthenticated },
    { path: '/admin', label: 'Admin Panel', icon: Shield, show: isAuthenticated && isAdmin },
    { path: '/terms', label: 'Terms of Service', icon: FileText, show: true },
    { path: '/privacy', label: 'Privacy Policy', icon: Lock, show: true },
  ];

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src={aiwmcLogoLight}
                alt="AIWMC Quantis"
                className="h-8 w-auto object-contain"
              />
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <X className="h-5 w-5" />
                <span className="sr-only">Close menu</span>
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="px-4 py-4">
          {/* User info section */}
          {isAuthenticated && user && (
            <div className="flex items-center gap-3 p-3 mb-4 rounded-lg bg-muted">
              <div className="p-2 rounded-full bg-primary/10">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? 'Administrator' : 'Member'}
                </p>
              </div>
            </div>
          )}

          {/* Navigation links */}
          <nav className="space-y-1">
            {navItems.filter(item => item.show).map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[48px]",
                  isActive(item.path)
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Auth actions */}
          <div className="mt-6 pt-4 border-t border-border">
            {isAuthenticated ? (
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12"
                onClick={handleSignOut}
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </Button>
            ) : (
              <Button
                asChild
                className="w-full justify-center h-12"
              >
                <Link to="/auth" onClick={handleLinkClick}>
                  Sign In to Get Started
                </Link>
              </Button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
