import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BrandingSettings } from '@/components/pro/BrandingSettings';
import { ApiKeysManager } from '@/components/pro/ApiKeysManager';
import { TeamSettings } from '@/components/pro/TeamSettings';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Palette, 
  Key, 
  Users, 
  Crown, 
  ArrowLeft, 
  Lock,
  Sparkles 
} from 'lucide-react';

export default function ProSettings() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isPro, loading: subscriptionLoading, createCheckout } = useSubscription();
  
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  React.useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const isLoading = authLoading || subscriptionLoading;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header darkMode={darkMode} onToggleTheme={() => setDarkMode(!darkMode)} />
        <main className="flex-1 container max-w-4xl px-4 sm:px-6 py-8">
          <div className="space-y-6">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header darkMode={darkMode} onToggleTheme={() => setDarkMode(!darkMode)} />
        <main className="flex-1 container max-w-4xl px-4 sm:px-6 py-8">
          <Card>
            <CardHeader className="text-center">
              <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                Please sign in to access Pro settings
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Not Pro subscriber
  if (!isPro) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header darkMode={darkMode} onToggleTheme={() => setDarkMode(!darkMode)} />
        <main className="flex-1 container max-w-4xl px-4 sm:px-6 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/app')}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>

          <Card className="border-warning/30 bg-gradient-to-br from-warning/5 to-background">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 rounded-full bg-warning/10 w-fit">
                <Crown className="w-12 h-12 text-warning" />
              </div>
              <CardTitle className="text-2xl">Upgrade to Pro</CardTitle>
              <CardDescription className="text-base max-w-md mx-auto">
                Unlock powerful Pro features including custom branding, API access, and team collaboration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border border-border bg-card">
                  <Palette className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-1">Custom Branding</h3>
                  <p className="text-sm text-muted-foreground">
                    White-label PDF exports with your company logo and colors
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-card">
                  <Key className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-1">API Access</h3>
                  <p className="text-sm text-muted-foreground">
                    Programmatic access for integrations and automation
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-card">
                  <Users className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-1">Team Workspaces</h3>
                  <p className="text-sm text-muted-foreground">
                    Collaborate with your team on shared analyses
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Button
                  size="lg"
                  onClick={() => createCheckout('pro')}
                  className="gap-2 bg-warning hover:bg-warning/90 text-warning-foreground"
                >
                  <Sparkles className="w-4 h-4" />
                  Upgrade to Pro - $29/month
                </Button>
                <p className="text-sm text-muted-foreground">
                  14-day free trial included
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Pro subscriber - show settings
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header darkMode={darkMode} onToggleTheme={() => setDarkMode(!darkMode)} />
      
      <main className="flex-1 container max-w-4xl px-4 sm:px-6 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/app')}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>

          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Pro Settings</h1>
            <Badge className="gap-1 bg-warning/10 text-warning border-warning/30">
              <Crown className="w-3 h-3" />
              Pro
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2">
            Manage your Pro features: custom branding, API access, and team collaboration
          </p>
        </div>

        <Tabs defaultValue="branding" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="branding" className="gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Branding</span>
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-2">
              <Key className="w-4 h-4" />
              <span className="hidden sm:inline">API</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branding">
            <BrandingSettings />
          </TabsContent>

          <TabsContent value="api">
            <ApiKeysManager />
          </TabsContent>

          <TabsContent value="team">
            <TeamSettings />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
