// ============================================================================
// PAYMENT LINKS - Simple, bulletproof Stripe integration
// ============================================================================
// Uses Stripe Payment Links for maximum reliability - no API calls needed!
// Just redirect to the Payment Link with user identification params
// ============================================================================

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Plan = 'plus' | 'pro';

// Payment Links - configured in Stripe Dashboard with 14-day trials
const PAYMENT_LINKS = {
  plus: 'https://buy.stripe.com/28EfZi2N1gte3AqeQJe7m00',
  pro: 'https://buy.stripe.com/dRmbJ20ET6SEb2S5g9e7m01'
};

interface UsePaymentLinksReturn {
  redirectToPayment: (plan: Plan, userId: string, email?: string) => void;
  isLoading: boolean;
}

// This function creates a DOM overlay that React CAN'T unmount
function createBlockingOverlay(): HTMLDivElement {
  const existing = document.getElementById('stripe-checkout-overlay');
  if (existing) existing.remove();

  const isDark = document.documentElement.classList.contains('dark') || 
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const bgColor = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#f9fafb' : '#111827';
  const mutedColor = isDark ? '#9ca3af' : '#6b7280';
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const primaryColor = '#3b82f6';

  const overlay = document.createElement('div');
  overlay.id = 'stripe-checkout-overlay';
  overlay.innerHTML = `
    <div style="
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: ${bgColor};
    ">
      <div style="
        width: 48px;
        height: 48px;
        border: 4px solid ${borderColor};
        border-top-color: ${primaryColor};
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 16px;
      "></div>
      <p style="
        font-size: 18px;
        font-weight: 500;
        color: ${textColor};
        margin: 0 0 8px 0;
      ">Redirecting to Stripe...</p>
      <p style="
        font-size: 14px;
        color: ${mutedColor};
        margin: 0;
      ">Please wait, do not close this page</p>
    </div>
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;
  document.body.appendChild(overlay);
  return overlay;
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

// Force redirect with multiple fallbacks
function forceRedirect(url: string): void {
  console.log('[PaymentLinks] Force redirecting to:', url);
  
  // Method 1: Direct assignment
  window.location.href = url;
  
  // Method 2: Backup after 100ms
  setTimeout(() => {
    if (window.location.href.indexOf('buy.stripe.com') === -1) {
      console.log('[PaymentLinks] Fallback: using replace');
      window.location.replace(url);
    }
  }, 100);
  
  // Method 3: Nuclear option after 500ms
  setTimeout(() => {
    if (window.location.href.indexOf('buy.stripe.com') === -1) {
      console.log('[PaymentLinks] Nuclear: creating click link');
      const link = document.createElement('a');
      link.href = url;
      link.click();
    }
  }, 500);
}

// Hook for React components
export function usePaymentLinks(): UsePaymentLinksReturn {
  const [isLoading, setIsLoading] = useState(false);
  const redirectInProgress = useRef(false);

  const redirectToPayment = useCallback((plan: Plan, userId: string, email?: string) => {
    if (redirectInProgress.current) {
      console.log('[PaymentLinks] Already redirecting, ignoring');
      return;
    }
    
    redirectInProgress.current = true;
    setIsLoading(true);

    console.log('[PaymentLinks] Starting redirect for plan:', plan, 'user:', userId);

    // Show overlay immediately
    createBlockingOverlay();

    // Build URL and redirect
    const url = buildPaymentLinkUrl(plan, userId, email);
    forceRedirect(url);
  }, []);

  return { redirectToPayment, isLoading };
}

// Standalone function for use outside React (e.g., after auth)
export function redirectToPaymentLink(plan: Plan, userId: string, email?: string): void {
  console.log('[PaymentLinks Standalone] Starting redirect for plan:', plan);
  
  createBlockingOverlay();
  const url = buildPaymentLinkUrl(plan, userId, email);
  forceRedirect(url);
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
      console.error('[PaymentLinks] No user found, cannot redirect');
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
