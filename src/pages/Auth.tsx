import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Brain, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { redirectToPaymentLink } from '@/hooks/useStripeCheckout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SignupForm, LoginForm } from '@/components/auth';
import { trackPageView } from '@/lib/analytics';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const checkoutTriggered = useRef(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  // Track page view
  useEffect(() => {
    trackPageView('/auth', 'Sign In / Sign Up');
  }, []);

  // Handle redirect after auth - check both URL params and localStorage
  useEffect(() => {
    if (isAuthenticated && !checkoutTriggered.current) {
      // First check URL params (from old flow)
      const redirect = searchParams.get('redirect');
      const urlPlan = searchParams.get('plan') as 'plus' | null;
      const returnUrl = searchParams.get('returnUrl');
      
      // Then check localStorage (from new flow)
      const storedPlan = localStorage.getItem('pending_checkout_plan') as 'plus' | null;
      
      const plan: 'plus' | null = urlPlan || storedPlan;
      const shouldCheckout = (redirect === 'checkout' && urlPlan) || storedPlan;
      
      if (shouldCheckout && plan) {
        checkoutTriggered.current = true;
        setIsProcessingCheckout(true);
        // Clear stored plan
        localStorage.removeItem('pending_checkout_plan');
        
        // Get user info and redirect to Payment Link
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            redirectToPaymentLink(plan, user.id, user.email || undefined);
          } else {
            setIsProcessingCheckout(false);
            toast.error('Failed to get user info. Please try again.');
            navigate('/app');
          }
        });
      } else {
        // Redirect to returnUrl if provided, otherwise to /app
        const destination = returnUrl ? decodeURIComponent(returnUrl) : '/app';
        navigate(destination);
      }
    }
  }, [isAuthenticated, searchParams, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Full-screen loading when processing checkout redirect
  if (isProcessingCheckout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium text-foreground">Redirecting to payment...</p>
          <p className="text-sm text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  const returnUrl = searchParams.get('returnUrl');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container max-w-lg mx-auto flex-1 flex flex-col items-center justify-center px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="self-start mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">AIWMC Quantis<sup className="text-xs align-super">™</sup></h1>
        </div>

        <Card className="w-full">
          <Tabs defaultValue="signup">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="login">Sign In</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="signup" className="mt-0">
                <CardTitle className="mb-2">Create an account</CardTitle>
                <CardDescription className="mb-6">
                  Start your free trial • No credit card required
                </CardDescription>
                <SignupForm />
              </TabsContent>

              <TabsContent value="login" className="mt-0">
                <CardTitle className="mb-2">Sign in to your account</CardTitle>
                <CardDescription className="mb-6">
                  Welcome back! Sign in to access your analyses
                </CardDescription>
                <LoginForm returnUrl={returnUrl || undefined} />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
