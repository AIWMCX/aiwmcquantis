/**
 * /trial — Founder Trial Landing Page
 * =====================================
 * Dedicated conversion landing for the 50-seat AIWMCQ17 founder cohort.
 *
 * Flow:
 *   1. DM/email shares: aiwmcquantis.com/trial?code=AIWMCQ17
 *   2. Visitor lands here, code auto-detected from URL
 *   3. Signed-out: prompt to sign in/up (preserves code through auth)
 *   4. Signed-in: one-click "Start free month" → calls createCheckout('plus', 'AIWMCQ17')
 *   5. Stripe Checkout applies the 100%-off coupon + 14-day trial
 *   6. Webhook activates Plus tier; user lands back on /app?checkout=success
 *
 * Tracked in funnel_events:
 *   - trial_page_view (with code, source)
 *   - trial_redeem_click (the moment they hit the CTA)
 *   - paid_checkout_complete (downstream on success_url)
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle2, Sparkles, Lock, Clock, BarChart3, FileText, Brain, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { usePromoStatus } from '@/hooks/usePromoStatus';
import { recordFunnelEvent } from '@/lib/analytics';
import { Footer } from '@/components/layout/Footer';
import { PageSEO } from '@/components/seo/PageSEO';
import { TIERS } from '@/config/tiers';

/**
 * Marketing-tracked promo codes. Keep this small — each code corresponds
 * to a specific campaign and must exist in the Stripe Dashboard as an
 * active promotion code with appropriate `max_redemptions` set.
 */
const RECOGNIZED_PROMO_CODES = new Set(['AIWMCQ17']);

/** sessionStorage key for preserving the code through auth redirects. */
const SESSION_KEY = 'quantis_trial_promo_code';

export default function Trial() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isPlus, isPro, createCheckout } = useSubscription();
  const { alreadyRedeemed, loading: promoStatusLoading } = usePromoStatus();
  const [redeeming, setRedeeming] = useState(false);

  // Resolve the promo code from URL or sessionStorage. URL takes precedence;
  // sessionStorage handles the case where the user signs in/up mid-flow and
  // returns here. Once redeemed, we clear it.
  const urlCode = (searchParams.get('code') ?? '').trim().toUpperCase();
  const storedCode = typeof window !== 'undefined'
    ? (sessionStorage.getItem(SESSION_KEY) ?? '').trim().toUpperCase()
    : '';
  const promoCode = urlCode || storedCode;
  const isRecognized = promoCode.length > 0 && RECOGNIZED_PROMO_CODES.has(promoCode);

  // Persist the code so it survives the sign-in detour
  useEffect(() => {
    if (urlCode && isRecognized) {
      sessionStorage.setItem(SESSION_KEY, urlCode);
    }
  }, [urlCode, isRecognized]);

  // Fire the trial_page_view event once on mount
  useEffect(() => {
    if (!promoCode) return;
    recordFunnelEvent('trial_page_view' as any, {
      code: promoCode,
      recognized: isRecognized,
      source: searchParams.get('src') ?? 'direct',
    });
    // intentionally omit deps — fire once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRedeem = async () => {
    if (!isRecognized) return;
    setRedeeming(true);
    recordFunnelEvent('trial_redeem_click' as any, { code: promoCode, user_id: user?.id });
    try {
      await createCheckout('plus', promoCode);
      // createCheckout handles its own redirect on success; clear the stored code
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      setRedeeming(false);
    }
  };

  // ─── Already a paid subscriber ──────────────────────────────────────────
  if (!authLoading && isAuthenticated && (isPlus || isPro)) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <PageSEO
          title="You're already on Plus — AIWMC Quantis"
          description="You already have access to Plus features. Head to your dashboard to keep running analyses."
          canonical="/trial"
          noindex
        />
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-foreground mb-2">You're already on Plus</h1>
            <p className="text-muted-foreground mb-6">
              No need to redeem — your subscription is active. Head to your dashboard to keep validating ideas.
            </p>
            <Button size="lg" onClick={() => navigate('/app')} className="gap-2">
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Already redeemed this promo before (even if no longer subscribed) ──
  // Server-verified via promo_redemptions — a Stripe-confirmed record that
  // survives cancellation, cleared cookies, and a different browser/device.
  if (!authLoading && isAuthenticated && !promoStatusLoading && alreadyRedeemed) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <PageSEO
          title="Promotion already redeemed — AIWMC Quantis"
          description="You've already used this founder trial promotion."
          canonical="/trial"
          noindex
        />
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-foreground mb-2">You've already claimed this offer</h1>
            <p className="text-muted-foreground mb-6">
              Code {promoCode || 'AIWMCQ17'} was already redeemed on this account. Each founder invite is one-time only —
              head to Pricing to see current plans, or your dashboard if you're still subscribed.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate('/pricing')}>See plans</Button>
              <Button onClick={() => navigate('/app')} className="gap-2">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Unrecognized or missing code ───────────────────────────────────────
  if (!isRecognized) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <PageSEO
          title="Trial invitation — AIWMC Quantis"
          description="This trial page is for invited founders only. Visit aiwmcquantis.com to start with the free tier."
          canonical="/trial"
          noindex
        />
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-6 text-center">
            <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h1 className="text-xl font-bold text-foreground mb-2">
              {promoCode ? 'This invitation code isn’t recognized' : 'This page is for invited founders'}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {promoCode
                ? `“${promoCode}” isn’t a valid invitation. If you were sent a code, check the spelling.`
                : 'If a friend sent you here, ask them to share the invitation link with the code attached.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate('/pricing')}>See plans</Button>
              <Button onClick={() => navigate('/app')} className="gap-2">
                Try Free <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main trial offer ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageSEO
        title="Plus — Free for 1 Month | Founder Trial | AIWMC Quantis"
        description={`Personal invitation for 50 founders. Get Plus capabilities free for 1 month with code ${promoCode}. No card charged for 14 days. Cancel anytime.`}
        canonical="/trial"
        noindex
      />
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <main className="container max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-16">
        {/* Code banner */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Badge className="gap-1.5 px-3 py-1.5 text-sm bg-primary/15 text-primary border-primary/30">
            <Sparkles className="w-3.5 h-3.5" /> Personal invitation
          </Badge>
          <div className="font-mono text-base bg-muted/50 border border-border rounded-md px-3 py-1.5 tracking-wider">
            {promoCode}
          </div>
        </div>

        {/* Hero */}
        <div className="text-center mb-10 md:mb-14">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-5 leading-tight">
            One month of <span className="text-primary">Plus</span>.<br />
            On the house.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-2">
            You were invited because we think Quantis can save you a serious mistake or surface a real opportunity.
            Run as many financial pre-mortems as you want for the next month — no card charged for 14 days, cancel anytime.
          </p>
          <p className="text-sm text-muted-foreground">
            Limited to 50 founders. Auto-applies <span className="font-mono font-medium text-foreground">{promoCode}</span> at checkout.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="flex flex-col items-center mb-12">
          <Button
            size="lg"
            onClick={handleRedeem}
            disabled={redeeming || authLoading || !isAuthenticated}
            className="gap-2 text-base md:text-lg px-8 py-6 h-auto min-w-[260px] hover:scale-[1.02] transition-transform"
          >
            {redeeming ? 'Redirecting to Stripe…' :
             !isAuthenticated ? 'Sign in to redeem' :
             <>Start free month <ArrowRight className="w-5 h-5" /></>}
          </Button>

          {!isAuthenticated && !authLoading && (
            <p className="text-sm text-muted-foreground mt-4 text-center max-w-md">
              You'll need a free Quantis account first. Your invitation code will be preserved through sign-in.{' '}
              <button
                onClick={() => navigate(`/auth?redirect=/trial%3Fcode%3D${promoCode}`)}
                className="text-primary hover:underline font-medium"
              >
                Create account or sign in →
              </button>
            </p>
          )}

          <p className="text-xs text-muted-foreground/70 mt-4 max-w-md text-center">
            No card charged for the first 14 days. Plus tier (${TIERS.plus.priceMonthly}/mo regular) — you'll see 100% off
            for month 1 on the Stripe page. Cancel anytime in your billing portal.
          </p>
        </div>

        {/* What you unlock */}
        <section className="mb-12" aria-labelledby="unlock-heading">
          <h2 id="unlock-heading" className="text-xl md:text-2xl font-bold text-foreground mb-5 text-center">
            What's in Plus
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: BarChart3, title: 'Unlimited analyses', body: 'No monthly cap. Stress-test every variation of your idea.' },
              { icon: Brain, title: 'Monte Carlo + 36-month P&L', body: 'Probabilistic scenario modeling instead of single-point projections.' },
              { icon: Zap, title: 'Pre-Mortem stress test', body: 'Find what kills the business before you launch it.' },
              { icon: FileText, title: 'Doc Studio (10 templates)', body: 'Business plan, pitch deck, NDA, founder agreement — auto-filled from your analysis.' },
              { icon: CheckCircle2, title: 'Watermark-free PDF export', body: 'Investor-ready, branded reports you can actually send.' },
              { icon: Sparkles, title: 'Custom branding', body: 'Your logo and color on every export.' },
            ].map((f, i) => (
              <Card key={i}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <f.icon className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                      <p className="text-sm text-foreground/70 leading-relaxed">{f.body}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Honest mechanics */}
        <section className="mb-12" aria-labelledby="mechanics-heading">
          <h2 id="mechanics-heading" className="text-xl md:text-2xl font-bold text-foreground mb-5 text-center">
            How this works (so there are no surprises)
          </h2>
          <Card>
            <CardContent className="pt-6 pb-6">
              <ol className="space-y-4">
                {[
                  { t: 'You hit Start', d: 'We open Stripe Checkout with your invitation code pre-applied. No card charged.' },
                  { t: 'Days 1–14: Free trial', d: 'Full Plus access. Run analyses, generate documents, export PDFs.' },
                  { t: 'Days 15–30: Promo covers it', d: `Code ${promoCode} gives 100% off the first month — Stripe shows $0.00.` },
                  { t: 'Day 31: Standard billing begins', d: `$${TIERS.plus.priceMonthly}/mo unless you cancel beforehand. You can cancel in 1 click from the billing portal.` },
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{step.t}</h3>
                      <p className="text-sm text-foreground/70 leading-relaxed">{step.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-6 pt-5 border-t border-border/40 flex items-start gap-2.5 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  Limited to <span className="font-medium text-foreground">50 founders</span>.
                  When seats run out, the code stops working — Stripe enforces this on their side.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Bottom CTA */}
        <section className="text-center pb-8">
          <Button
            size="lg"
            onClick={handleRedeem}
            disabled={redeeming || authLoading || !isAuthenticated}
            className="gap-2 text-base px-8 py-5 h-auto"
          >
            {redeeming ? 'Redirecting…' :
             !isAuthenticated ? 'Sign in to redeem' :
             <>Claim your free month <ArrowRight className="w-5 h-5" /></>}
          </Button>
        </section>
      </main>

      <Footer />
    </div>
  );
}
