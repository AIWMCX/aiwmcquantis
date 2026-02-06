import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Brain, 
  Home, 
  LayoutDashboard, 
  Shield, 
  Settings, 
  LogOut, 
  User,
  FileText,
  Lock,
  X,
  Sparkles,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { trackEvent } from '@/lib/analytics';

interface MobileNavProps {
  children: React.ReactNode;
}

export function MobileNav({ children }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);
  const { user, isAuthenticated, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if user is Plus subscriber (simplified check)
  const isPlusUser = false; // This would come from user metadata/subscription status
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

  const handleNewAnalysis = () => {
    trackEvent('mobile_nav_new_analysis');
    setOpen(false);
    navigate('/app');
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
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <DrawerTitle className="text-left">
                AIWMC Quantis<sup className="text-xs align-super">™</sup>
              </DrawerTitle>
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
          {/* Quick Analysis CTA - Top of drawer */}
          <Button 
            onClick={handleNewAnalysis}
            className="w-full gap-2 h-12 mb-4 font-semibold"
          >
            <Sparkles className="w-5 h-5" />
            New Analysis
          </Button>

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
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    {isAdmin ? 'Administrator' : 'Member'}
                  </p>
                  {isPlusUser && (
                    <Badge variant="secondary" className="text-xs gap-1 px-1.5 py-0">
                      <Crown className="w-3 h-3" />
                      Plus
                    </Badge>
                  )}
                </div>
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
