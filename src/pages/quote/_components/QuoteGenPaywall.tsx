/**
 * QuoteGenUsageBanner — pill banner shown above the QuoteGen wizard.
 *
 * - Signed-out users: locked card with signup CTA.
 * - Free users: "X of 5 quotes used this month".
 * - Plus/Pro: unlimited QuoteGen access.
 */
import { Link } from 'react-router-dom';
import { Lock, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { QuoteGenStatus } from '@/hooks/useQuoteGenUsage';
import { TIERS } from '@/config/tiers';

const PLUS_PRICE_MONTHLY = TIERS.plus.priceMonthly;
const PRO_PRICE_MONTHLY = TIERS.pro.priceMonthly;

export function QuoteGenUsagePill({ status }: { status: QuoteGenStatus }) {
  if (!status.isEnabled) return null;
  const pct = status.limit && status.limit > 0 ? status.used / status.limit : 0;
  const tone =
    status.isExhausted
      ? 'border-destructive/40 bg-destructive/10 text-destructive'
      : pct >= 0.8
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
        : 'border-border bg-muted/40 text-foreground';
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${tone}`}>
      <Sparkles className="w-3.5 h-3.5" />
      {status.isUnlimited
        ? `QuoteGen (Beta) — unlimited on ${status.planTier === 'pro' ? 'Pro' : 'Plus'}`
        : `QuoteGen (Beta) — ${status.used} / ${status.limit ?? 5} used this month`}
    </div>
  );
}

export function QuoteGenFreeLock() {
  return (
    <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-card p-8 sm:p-10 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
        <Lock className="w-6 h-6 text-primary" />
      </div>
      <Badge variant="secondary" className="mb-3">Beta</Badge>
      <h2 className="text-2xl font-bold text-foreground mb-2">Sign in for QuoteGen (Beta)</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
        Generate priced, PDF-ready service quotes in seconds. Free includes
        5 quotes/mo; Plus and Pro include unlimited QuoteGen.
      </p>
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto mb-6 text-left">
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plus</p>
          <p className="text-lg font-bold text-foreground mt-1">Unlimited quotes</p>
          <p className="text-xs text-muted-foreground">${PLUS_PRICE_MONTHLY} / mo</p>
        </div>
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Pro</p>
          <p className="text-lg font-bold text-foreground mt-1">Unlimited quotes</p>
          <p className="text-xs text-muted-foreground">${PRO_PRICE_MONTHLY} / mo</p>
        </div>
      </div>
      <Link to="/pricing">
        <Button size="lg" className="min-h-[48px] px-6">Unlock QuoteGen (Beta)</Button>
      </Link>
      <p className="text-[11px] text-muted-foreground mt-4">
        QuoteGen is in Beta. Limits may change as we tune the system with real usage.
      </p>
    </div>
  );
}

export function QuoteGenExhaustedBanner({ status }: { status: QuoteGenStatus }) {
  if (!status.isExhausted || !status.isEnabled || status.isUnlimited) return null;
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">
          You've used all {status.limit ?? 5} free QuoteGen quotes for this month.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Upgrade for unlimited QuoteGen, or wait until next month's reset (UTC).
        </p>
        <Link to="/pricing" className="inline-block mt-2">
          <Button size="sm" variant="outline">Upgrade</Button>
        </Link>
      </div>
    </div>
  );
}
