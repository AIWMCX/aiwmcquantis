import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BrandingSettings } from '@/components/pro/BrandingSettings';
import { PlusValueIndicator } from '@/components/pro/PlusValueIndicator';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageSEO } from '@/components/seo/PageSEO';
import { 
  Palette, 
  Zap, 
  ArrowLeft, 
  Lock,
  TrendingUp
} from 'lucide-react';

export default function PlusSettings() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isPlus, loading: subscriptionLoading, createCheckout } = useSubscription();
  
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
                Please sign in to access Plus settings
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

  // Not Plus subscriber
  if (!isPlus) {
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

          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 w-fit">
                <Zap className="w-12 h-12 text-primary" />
              </div>
              <CardTitle className="text-2xl">Upgrade to Plus</CardTitle>
              <CardDescription className="text-base max-w-md mx-auto">
                Unlock powerful Plus features including custom branding for your PDF exports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg border border-border bg-card max-w-sm mx-auto">
                <Palette className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold mb-1">Custom Branding</h3>
                <p className="text-sm text-muted-foreground">
                  White-label PDF exports with your company logo and colors
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Button
                  size="lg"
                  onClick={() => createCheckout('plus')}
                  className="gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Upgrade to Plus - $17/month
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

  // Plus subscriber - show settings
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PageSEO
        title="Plus Settings | AIWMC Quantis"
        description="Manage your Plus subscription settings and custom branding."
        canonical="/plus-settings"
        noindex={true}
      />
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
            <h1 className="text-3xl font-bold">Plus Settings</h1>
            <Badge className="gap-1 bg-primary/10 text-primary border-primary/30">
              <Zap className="w-3 h-3" />
              Plus
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2">
            Manage your Plus subscription and see your exclusive advantages
          </p>
        </div>

        <Tabs defaultValue="intelligence" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="intelligence" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Plus Intelligence
            </TabsTrigger>
            <TabsTrigger value="branding" className="gap-2">
              <Palette className="w-4 h-4" />
              Custom Branding
            </TabsTrigger>
          </TabsList>

          <TabsContent value="intelligence" className="mt-6">
            <PlusValueIndicator />
          </TabsContent>

          <TabsContent value="branding" className="mt-6">
            <BrandingSettings />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
