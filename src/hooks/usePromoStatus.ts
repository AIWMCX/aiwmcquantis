/**
 * usePromoStatus — server-verified visibility decision for a promo invite.
 *
 * Rules:
 *  - Anonymous visitor (no session): always eligible — this IS the acquisition funnel.
 *  - Signed in, already Plus/Pro: never eligible (they don't need the offer).
 *  - Signed in, a `promo_redemptions` row exists for (user_id, code): never
 *    eligible again — this is a real, Stripe-confirmed redemption, not a
 *    client-side flag, so it cannot be bypassed by clearing localStorage or
 *    switching browsers.
 *  - Otherwise: eligible.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import { logger } from '@/lib/logger';

export const FOUNDER_PROMO_CODE = 'AIWMCQJULY17';

/**
 * KILL SWITCH — 2026-06-30: disabled site-wide (banner, dashboard card, and
 * /trial page's offer) after discovering create-checkout-session was NOT
 * actually applying the promo discount in production despite the code being
 * verified correct in the repo — root cause under investigation (CI has been
 * failing silently on every push for some time, which skips the entire
 * Production Deploy job chain via its workflow_run trigger condition, so
 * backend edge-function changes never reached Supabase while the Vercel
 * frontend deployed independently and looked correct). Flip back to `true`
 * only after a live end-to-end $0 checkout is confirmed working in prod.
 */
export const FOUNDER_PROMO_ENABLED = false;

interface PromoStatus {
  showPromo: boolean;
  /** True only when a real, webhook-confirmed redemption row exists for this user+code. */
  alreadyRedeemed: boolean;
  loading: boolean;
}

export function usePromoStatus(promoCode: string = FOUNDER_PROMO_CODE): PromoStatus {
  const { user, isLoading: authLoading } = useAuth();
  const { isPlus, isPro, loading: subLoading } = useSubscription();
  const [alreadyRedeemed, setAlreadyRedeemed] = useState<boolean | null>(null);

  const checkRedemption = useCallback(async () => {
    if (!user) {
      setAlreadyRedeemed(false); // anonymous — nothing to have redeemed yet
      return;
    }
    try {
      const { data, error } = await supabase
        .from('promo_redemptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('promo_code', promoCode)
        .maybeSingle();
      if (error) {
        logger.error('[usePromoStatus] redemption check failed:', error);
        setAlreadyRedeemed(false); // fail open on the query — banner shown, Stripe still enforces the cap
        return;
      }
      setAlreadyRedeemed(!!data);
    } catch (err) {
      logger.error('[usePromoStatus] redemption check crashed:', err);
      setAlreadyRedeemed(false);
    }
  }, [user, promoCode]);

  useEffect(() => {
    if (authLoading) return;
    checkRedemption();
  }, [authLoading, checkRedemption]);

  const loading = authLoading || subLoading || alreadyRedeemed === null;
  const showPromo = FOUNDER_PROMO_ENABLED && !loading && !isPlus && !isPro && !alreadyRedeemed;

  return { showPromo, alreadyRedeemed: alreadyRedeemed === true, loading };
}
