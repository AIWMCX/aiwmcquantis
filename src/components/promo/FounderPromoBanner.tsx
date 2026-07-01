/**
 * FounderPromoBanner — site-wide invite for the 50-seat founder trial
 * (AIWMCQ17: 1 month of Plus, 100% off, layered on top of the standard
 * 14-day trial). Mounted once at the app root (see App.tsx) so it appears
 * on every route — public marketing pages AND the authenticated dashboard.
 *
 * Visibility is server-verified via usePromoStatus, not a client-side flag:
 *  - Anonymous visitors: always shown.
 *  - Signed-in, not yet redeemed, not already Plus/Pro: shown.
 *  - Signed-in AND redeemed before (real `promo_redemptions` row): never shown again.
 *  - Session-dismissible (X) so it doesn't nag within one visit; reappears
 *    next session until the user actually redeems or the promo disappears.
 */
import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePromoStatus, FOUNDER_PROMO_CODE } from '@/hooks/usePromoStatus';

const STORAGE_KEY = 'quantis_founder_promo_dismissed_session_v1';

// Pages where the invite is redundant or would clutter an active flow.
const EXCLUDED_PATH_PREFIXES = ['/trial', '/__maintenance', '/auth'];

export function FounderPromoBanner() {
  const location = useLocation();
  const { showPromo, loading } = usePromoStatus();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (loading || !showPromo || dismissed) return null;
  if (EXCLUDED_PATH_PREFIXES.some((p) => location.pathname.startsWith(p))) return null;

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full border-b border-primary/40 bg-primary/10 text-foreground"
    >
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Sparkles className="h-4 w-4 flex-shrink-0" aria-hidden />
          <p className="text-sm font-medium truncate">
            Founder trial — 50 seats
            <span className="ml-2 font-normal opacity-80">
              One month of Plus, 100% off. Code {FOUNDER_PROMO_CODE}.
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="sm" variant="default" className="h-8" asChild>
            <Link to={`/trial?code=${FOUNDER_PROMO_CODE}`} onClick={handleDismiss}>
              Claim free month
            </Link>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            className="h-8 w-8"
            aria-label="Dismiss promo banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
