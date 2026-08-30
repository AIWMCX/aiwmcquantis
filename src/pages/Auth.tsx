import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import aiwmcLogoText from '@/assets/aiwmc-quantis-logo-text.png';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SignupForm, LoginForm, ForgotPasswordForm } from '@/components/auth';
import { trackPageView, trackEvent, recordFunnelEvent } from '@/lib/analytics';
import { sendWelcomeEmail, isNewUser, wasWelcomeEmailSent, markWelcomeEmailSent } from '@/lib/welcomeEmail';
import { consumeShareOrigin } from '@/lib/shareOrigin';
import { PageSEO } from '@/components/seo/PageSEO';

import { logger } from '@/lib/logger';
export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { createCheckout } = useSubscription();
  const checkoutTriggered = useRef(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Track page view
  useEffect(() => {
    trackPageView('/auth', 'Sign In / Sign Up');
  }, []);

  // Handle redirect after auth - check both URL params and localStorage
  // Also send welcome email for OAuth signups
  useEffect(() => {
    if (isAuthenticated && !checkoutTriggered.current) {
      // First check URL params (from old flow)
      const redirect = searchParams.get('redirect');
      type PlanParam = 'plus_monthly' | 'plus_annual' | 'pro_monthly' | 'pro_annual' | 'plus' | 'pro' | null;
      const urlPlan = searchParams.get('plan') as PlanParam;
      const returnUrl = searchParams.get('returnUrl');
      
      // Then check localStorage (from new flow)
      const storedPlan = localStorage.getItem('pending_checkout_plan') as PlanParam;
      
      // Normalize plan: legacy 'plus'/'pro' map to monthly variants for backwards compatibility
      const rawPlan = urlPlan || storedPlan;
      type CheckoutPlan = 'plus_monthly' | 'plus_annual' | 'pro_monthly' | 'pro_annual';
      const plan: CheckoutPlan | null =
        rawPlan === 'plus' ? 'plus_monthly'
        : rawPlan === 'pro' ? 'pro_monthly'
        : (rawPlan as CheckoutPlan | null);
      const shouldCheckout = (redirect === 'checkout' && urlPlan) || storedPlan;
      
      // Get user info for checkout and welcome email
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (user) {
          // Share-loop attribution (MP2 WS-5) — independent of the welcome-email
          // dedup below (that's about not re-sending an email; this is about
          // logging a genuinely new account, once, regardless of signup method).
          // consumeShareOrigin() is read-and-clear, so this can only fire once
          // per marked share visit even if this effect re-runs.
          if (isNewUser(user.created_at)) {
            const shareToken = consumeShareOrigin();
            if (shareToken) {
              recordFunnelEvent('share_originated_signup', { source_token: shareToken });
            }
          }

          // Check if this is a new OAuth user (created within last 60 seconds)
          // and we haven't already sent them a welcome email
          if (isNewUser(user.created_at) && !wasWelcomeEmailSent(user.id)) {
            const userName = user.user_metadata?.full_name || 
                           user.user_metadata?.name || 
                           user.email?.split('@')[0] || 
                           'Friend';
            
            logger.info('[Auth] New OAuth user detected, sending welcome email');
            trackEvent('oauth_welcome_email_attempt', { provider: user.app_metadata?.provider });
            
            const result = await sendWelcomeEmail({
              email: user.email!,
              name: userName
            });
            
            if (result.success) {
              markWelcomeEmailSent(user.id);
              logger.info('[Auth] Welcome email sent for OAuth user');
              trackEvent('oauth_welcome_email_sent', { provider: user.app_metadata?.provider });
            } else {
              logger.error('[Auth] Failed to send welcome email:', result.error);
              trackEvent('oauth_welcome_email_failed', { 
                provider: user.app_metadata?.provider,
                error: result.error 
              });
            }
          }
          
          if (shouldCheckout && plan) {
            checkoutTriggered.current = true;
            setIsProcessingCheckout(true);
            // Clear stored plan
            localStorage.removeItem('pending_checkout_plan');
            const [planOnly, billing] = plan.split('_') as ['plus' | 'pro', 'monthly' | 'annual'];
            createCheckout(planOnly, undefined, billing).catch(() => setIsProcessingCheckout(false));
          } else {
            // Redirect to returnUrl if provided, otherwise to /app
            const destination = returnUrl ? decodeURIComponent(returnUrl) : '/app';
            navigate(destination);
          }
        } else if (shouldCheckout) {
          setIsProcessingCheckout(false);
          toast.error('Failed to get user info. Please try again.');
          navigate('/app');
        }
      });
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
      <PageSEO
        title="Sign In | AIWMC Quantis"
        description="Sign in or create an account to access AI-powered business analysis with financial projections and market insights."
        canonical="/auth"
        noindex
      />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left — Brand panel (hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center px-12 py-16" style={{ background: '#0a0e1f' }}>
          <div className="max-w-md space-y-8">
            <div className="mb-6">
              <img src={aiwmcLogoText} alt="AIWMC Quantis" className="h-12 w-auto object-contain dark:invert" />
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">
              AI-powered business validation. Stress-test your startup idea before you commit capital.
            </p>
            <div className="space-y-3 pt-4">
              {[
                { metric: '12', label: 'Financial variables stress-tested' },
                { metric: '97,500', label: 'Industry benchmarks' },
                { metric: '1,000', label: 'Monte Carlo iterations' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-4 px-4 py-3 rounded-lg"
                  style={{ background: 'rgba(148,163,255,0.05)', border: '1px solid rgba(148,163,255,0.10)' }}
                >
                  <span
                    className="text-xl font-semibold tabular-nums"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--aiwmc-grad-cyan)' }}
                  >
                    {stat.metric}
                  </span>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/60 pt-6">
              Equivalent to 3–5 hours of senior CFO work each month
            </p>
          </div>
        </div>

        {/* Right — Auth form */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-8">
          <div className="w-full max-w-md">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="self-start mb-6 text-[var(--q-text-secondary)] hover:text-[var(--q-text-primary)]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>

            {/* Mobile-only logo */}
            <div className="mb-8 lg:hidden">
              <img src={aiwmcLogoText} alt="AIWMC Quantis" className="h-10 w-auto object-contain dark:invert" />
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
                    {showForgotPassword ? (
                      <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />
                    ) : (
                      <>
                        <CardTitle className="mb-2">Sign in to your account</CardTitle>
                        <CardDescription className="mb-6">
                          Welcome back! Sign in to access your analyses
                        </CardDescription>
                        <LoginForm 
                          returnUrl={returnUrl || undefined} 
                          onForgotPassword={() => setShowForgotPassword(true)}
                        />
                      </>
                    )}
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
