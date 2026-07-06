/**
 * /trial — Founder Trial Landing Page
 * =====================================
 * Dedicated conversion landing for the 50-seat AIWMCQJULY17 founder cohort.
 *
 * Flow:
 *   1. DM/email shares: aiwmcquantis.com/trial?code=AIWMCQJULY17
 *   2. Visitor lands here, code auto-detected from URL
 *   3. Signed-out: prompt to sign in/up (preserves code through auth)
 *   4. Signed-in: one-click "Start free month" → calls createCheckout('plus', 'AIWMCQJULY17')
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
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle2, Sparkles, Lock, Clock, BarChart3, FileText, Brain, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { usePromoStatus, FOUNDER_PROMO_ENABLED } from '@/hooks/usePromoStatus';
import { recordFunnelEvent } from '@/lib/analytics';
import { PageSEO } from '@/components/seo/PageSEO';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard } from '@/components/ui/glass-card';
import { TIERS } from '@/config/tiers';

const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

/**
 * Marketing-tracked promo codes. Keep this small — each code corresponds
 * to a specific campaign and must exist in the Stripe Dashboard as an
 * active promotion code with appropriate `max_redemptions` set.
 */
const RECOGNIZED_PROMO_CODES = new Set(['AIWMCQJULY17']);

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

  // ─── Kill switch — promo temporarily paused ─────────────────────────────
  // Checkout confirmed NOT applying the discount in production even though
  // this exact page and the create-checkout-session code are verified
  // correct — root cause is a broken deploy pipeline (CI failing silently,
  // which skips Production Deploy's job chain entirely). This blocks the
  // real checkout button so nobody gets charged full price expecting $0.00
  // while that's being fixed. See FOUNDER_PROMO_ENABLED in usePromoStatus.ts.
  if (!FOUNDER_PROMO_ENABLED) {
    return (
      <PublicPageShell maxWidth="sm">
        <PageSEO
          title="Founder trial — back shortly | AIWMC Quantis"
          description="The founder trial invitation is temporarily paused while we finish a checkout fix. Check back soon, or start free today."
          canonical="/trial"
          noindex
        />
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <GlassCard glow="none" className="max-w-md w-full p-8 text-center">
            <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h1 className="text-xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>This invitation is paused for a moment</h1>
            <p className="text-sm text-muted-foreground mb-6">
              We're finishing a checkout fix for the founder trial. Your invitation code is still reserved —
              check back shortly, or start free right now with no card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate('/pricing')}>See plans</Button>
              <Button onClick={() => navigate('/app')} className="gap-2">
                Try Free <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </GlassCard>
        </div>
      </PublicPageShell>
    );
  }

  // ─── Already a paid subscriber ──────────────────────────────────────────
  if (!authLoading && isAuthenticated && (isPlus || isPro)) {
    return (
      <PublicPageShell maxWidth="sm">
        <PageSEO
          title="You're already on Plus — AIWMC Quantis"
          description="You already have access to Plus features. Head to your dashboard to keep running analyses."
          canonical="/trial"
          noindex
        />
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <GlassCard glow="cyan" className="max-w-md w-full p-8 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#4ade80' }} />
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>You're already on Plus</h1>
            <p className="text-muted-foreground mb-6">
              No need to redeem — your subscription is active. Head to your dashboard to keep validating ideas.
            </p>
            <Button size="lg" onClick={() => navigate('/app')} className="gap-2">
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </Button>
          </GlassCard>
        </div>
      </PublicPageShell>
    );
  }

  // ─── Already redeemed this promo before (even if no longer subscribed) ──
  // Server-verified via promo_redemptions — a Stripe-confirmed record that
  // survives cancellation, cleared cookies, and a different browser/device.
  if (!authLoading && isAuthenticated && !promoStatusLoading && alreadyRedeemed) {
    return (
      <PublicPageShell maxWidth="sm">
        <PageSEO
          title="Promotion already redeemed — AIWMC Quantis"
          description="You've already used this founder trial promotion."
          canonical="/trial"
          noindex
        />
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <GlassCard glow="cyan" className="max-w-md w-full p-8 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#4ade80' }} />
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>You've already claimed this offer</h1>
            <p className="text-muted-foreground mb-6">
              Code {promoCode || 'AIWMCQJULY17'} was already redeemed on this account. Each founder invite is one-time only —
              head to Pricing to see current plans, or your dashboard if you're still subscribed.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate('/pricing')}>See plans</Button>
              <Button onClick={() => navigate('/app')} className="gap-2">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </GlassCard>
        </div>
      </PublicPageShell>
    );
  }

  // ─── Unrecognized or missing code ───────────────────────────────────────
  if (!isRecognized) {
    return (
      <PublicPageShell maxWidth="sm">
        <PageSEO
          title="Trial invitation — AIWMC Quantis"
          description="This trial page is for invited founders only. Visit aiwmcquantis.com to start with the free tier."
          canonical="/trial"
          noindex
        />
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <GlassCard glow="none" className="max-w-md w-full p-8 text-center">
            <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h1 className="text-xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
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
          </GlassCard>
        </div>
      </PublicPageShell>
    );
  }

  // ─── Main trial offer ───────────────────────────────────────────────────
  return (
    <PublicPageShell maxWidth="lg">
      <PageSEO
        title="Plus — Free for 1 Month | Founder Trial | AIWMC Quantis"
        description={`Personal invitation for 50 founders. Get Plus capabilities free for 1 month with code ${promoCode}. No card charged for 14 days. Cancel anytime.`}
        canonical="/trial"
        noindex
      />
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="py-10 md:py-16">
        {/* Code banner */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Badge className="gap-1.5 px-3 py-1.5 text-sm" style={{ background: 'rgba(79,70,229,0.14)', color: 'var(--aiwmc-grad-cyan)', border: 'none' }}>
            <Sparkles className="w-3.5 h-3.5" /> Personal invitation
          </Badge>
          <div className="text-base rounded-md px-3 py-1.5 tracking-wider" style={{ ...MONO, background: 'rgba(148,163,255,0.08)', border: '1px solid rgba(148,163,255,0.16)', color: 'hsl(var(--foreground))' }}>
            {promoCode}
          </div>
        </div>

        {/* Hero */}
        <div className="text-center mb-10 md:mb-14">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-tight" style={{ color: 'hsl(var(--foreground))' }}>
            One month of <span style={{ color: 'var(--aiwmc-grad-cyan)' }}>Plus</span>.<br />
            On the house.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-2">
            You were invited because we think Quantis can save you a serious mistake or surface a real opportunity.
            Run as many financial pre-mortems as you want for the next month — no card charged for 14 days, cancel anytime.
          </p>
          <p className="text-sm text-muted-foreground">
            Limited to 50 founders. Auto-applies <span className="font-medium" style={{ ...MONO, color: 'hsl(var(--foreground))' }}>{promoCode}</span> at checkout.
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
                className="font-medium hover:underline"
                style={{ color: 'var(--aiwmc-grad-cyan)' }}
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
          <h2 id="unlock-heading" className="text-xl md:text-2xl font-bold mb-5 text-center" style={{ color: 'hsl(var(--foreground))' }}>
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
              <GlassCard key={i} glow={i % 2 === 0 ? 'cyan' : 'violet'} revealDelay={i * 40} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(148,163,255,0.10)' }}>
                    <f.icon className="w-4.5 h-4.5" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1" style={{ color: 'hsl(var(--foreground))' }}>{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Honest mechanics */}
        <section className="mb-12" aria-labelledby="mechanics-heading">
          <h2 id="mechanics-heading" className="text-xl md:text-2xl font-bold mb-5 text-center" style={{ color: 'hsl(var(--foreground))' }}>
            How this works (so there are no surprises)
          </h2>
          <GlassCard glow="brand" className="p-6">
            <ol className="space-y-4">
              {[
                { t: 'You hit Start', d: 'We open Stripe Checkout with your invitation code pre-applied. No card charged.' },
                { t: 'Days 1–14: Free trial', d: 'Full Plus access. Run analyses, generate documents, export PDFs.' },
                { t: 'Day 15: Promo applies', d: `Your trial ends and Stripe generates your first invoice. Code ${promoCode} gives 100% off that invoice — Stripe shows $0.00, covering a full month of Plus.` },
                { t: 'The following month: Standard billing begins', d: `$${TIERS.plus.priceMonthly}/mo unless you cancel beforehand. You can cancel in 1 click from the billing portal.` },
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div
                    className="flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold shrink-0"
                    style={{ background: 'var(--aiwmc-grad-brand)', color: '#ffffff' }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{step.t}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-6 pt-5 flex items-start gap-2.5 text-sm text-muted-foreground" style={{ borderTop: '1px solid rgba(148,163,255,0.14)' }}>
              <Clock className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                Limited to <span className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>50 founders</span>.
                When seats run out, the code stops working — Stripe enforces this on their side.
              </p>
            </div>
          </GlassCard>
        </section>

        {/* Bottom CTA */}
        <section className="text-center pb-4">
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
      </div>
    </PublicPageShell>
  );
}
