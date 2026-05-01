// ============================================================================
// PAYMENT LINKS - Simple, bulletproof Stripe integration
// ============================================================================
// Uses Stripe Payment Links for maximum reliability - no API calls needed!
// Just redirect to the Payment Link with user identification params
// ============================================================================

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { trackCheckoutStart } from '@/lib/analytics';

import { logger } from '@/lib/logger';
type Plan = 'plus_monthly' | 'plus_annual' | 'pro_monthly' | 'pro_annual';

// Approximate plan values (USD) for funnel value tracking. Source of truth is Stripe.
const PLAN_VALUES: Record<Plan, number> = {
  plus_monthly: 17,
  plus_annual: 168,   // $14/mo × 12
  pro_monthly: 49,
  pro_annual: 492,    // $41/mo × 12
};

// Payment Links - configured in Stripe Dashboard with 14-day trials
// Plus: $17/mo or $14/mo annual. Pro: $49/mo or $41/mo annual.
const PAYMENT_LINKS: Record<Plan, string> = {
  plus_monthly: 'https://buy.stripe.com/28EfZi2N1gte3AqeQJe7m00',
  plus_annual: 'https://buy.stripe.com/aFa9AUfzN0ug4Eu9wpe7m02',
  pro_monthly: 'https://buy.stripe.com/cNi8wQbjxgte5Iy6kde7m03',
  pro_annual: 'https://buy.stripe.com/6oU7sMevJccYdb06kde7m04',
};

interface UsePaymentLinksReturn {
  redirectToPayment: (plan: Plan, userId: string, email?: string) => void;
  isLoading: boolean;
}

// Build Payment Link URL with user identification
function buildPaymentLinkUrl(plan: Plan, userId: string, email?: string): string {
  const baseUrl = PAYMENT_LINKS[plan];
  const params = new URLSearchParams();
  
  // client_reference_id identifies the user in the webhook
  params.set('client_reference_id', userId);
  
  // Prefill email for better UX
  if (email) {
    params.set('prefilled_email', email);
  }
  
  return `${baseUrl}?${params.toString()}`;
}

// Hook for React components
export function usePaymentLinks(): UsePaymentLinksReturn {
  const [isLoading, setIsLoading] = useState(false);
  const redirectInProgress = useRef(false);

  const redirectToPayment = useCallback((plan: Plan, userId: string, email?: string) => {
    if (redirectInProgress.current) {
      logger.info('[PaymentLinks] Already redirecting, ignoring');
      return;
    }
    
    redirectInProgress.current = true;
    setIsLoading(true);

    logger.info('[PaymentLinks] Starting redirect', { metadata: { plan, userId } });

    // SOW canonical funnel — fire `paid_checkout_start` BEFORE the redirect
    // so we capture intent even when the user bounces from the Stripe page.
    try {
      trackCheckoutStart(plan, PLAN_VALUES[plan]);
    } catch {
      /* analytics must never block checkout */
    }

    // Build URL
    const url = buildPaymentLinkUrl(plan, userId, email);
    
    // Simple redirect - no overlay
    window.location.href = url;
    
    // Fallback: if still on page after 3 seconds, show manual link
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        logger.info('[PaymentLinks] Redirect may have failed, showing fallback');
        redirectInProgress.current = false;
        setIsLoading(false);
        
        // Create clickable link element and add to toast
        toast({
          title: 'Click to continue to checkout',
          description: 'If redirect failed, click the link below.',
          duration: 30000,
          action: (() => {
            const link = document.createElement('a');
            link.href = url;
            link.textContent = '→ Open Stripe Checkout';
            link.style.cssText = 'text-decoration: underline; font-weight: 500; color: hsl(var(--primary));';
            link.onclick = () => { window.location.href = url; };
            return link as unknown as React.ReactElement;
          })(),
        });
      }
    }, 3000);
  }, []);

  return { redirectToPayment, isLoading };
}

// Standalone function for use outside React (e.g., after auth)
export function redirectToPaymentLink(plan: Plan, userId: string, email?: string): void {
  logger.info('[PaymentLinks Standalone] Starting redirect for plan:', plan);

  // Mirror the hook's funnel emission for the standalone post-auth path.
  try {
    trackCheckoutStart(plan, PLAN_VALUES[plan]);
  } catch {
    /* analytics must never block checkout */
  }

  const url = buildPaymentLinkUrl(plan, userId, email);
  window.location.href = url;
}

// ============================================================================
// LEGACY COMPATIBILITY - Keep old exports working
// ============================================================================

export function useStripeCheckout() {
  const { redirectToPayment, isLoading } = usePaymentLinks();
  
  const initiateCheckout = useCallback(async (plan: Plan) => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      logger.error('[PaymentLinks] No user found, cannot redirect');
      return;
    }
    
    redirectToPayment(plan, user.id, user.email || undefined);
  }, [redirectToPayment]);

  return { 
    initiateCheckout, 
    isLoading, 
    error: null 
  };
}

export async function createStripeCheckout(plan: Plan): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('No user found');
  }
  
  redirectToPaymentLink(plan, user.id, user.email || undefined);
}
