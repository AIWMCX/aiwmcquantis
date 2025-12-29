// ============================================================================
// BULLETPROOF STRIPE CHECKOUT HOOK
// ============================================================================
// This hook ensures the Stripe redirect ALWAYS works by:
// 1. Blocking ALL React updates during checkout
// 2. Using synchronous redirect that can't be interrupted
// 3. Adding a DOM-level loading overlay that survives React unmounts
// ============================================================================

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Plan = 'plus' | 'pro';

interface UseStripeCheckoutReturn {
  initiateCheckout: (plan: Plan) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

// This function creates a DOM overlay that React CAN'T unmount
// Uses hardcoded colors to ensure visibility regardless of CSS variable state
function createBlockingOverlay(): HTMLDivElement {
  // Remove any existing overlay first
  const existing = document.getElementById('stripe-checkout-overlay');
  if (existing) existing.remove();

  // Check if dark mode is active
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

// Synchronous redirect that can't be interrupted
function forceRedirect(url: string): void {
  console.log('[Checkout] Force redirecting to:', url);
  
  // Method 1: Direct assignment (most reliable)
  window.location.href = url;
  
  // Method 2: Backup - if href assignment somehow fails
  setTimeout(() => {
    if (!window.location.href.includes('checkout.stripe.com')) {
      console.log('[Checkout] Fallback: using replace');
      window.location.replace(url);
    }
  }, 100);
  
  // Method 3: Nuclear option - if still here after 500ms
  setTimeout(() => {
    if (!window.location.href.includes('checkout.stripe.com')) {
      console.log('[Checkout] Nuclear: creating click link');
      const link = document.createElement('a');
      link.href = url;
      link.click();
    }
  }, 500);
}

export function useStripeCheckout(): UseStripeCheckoutReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkoutInProgress = useRef(false);

  const initiateCheckout = useCallback(async (plan: Plan) => {
    // Prevent double-clicks
    if (checkoutInProgress.current) {
      console.log('[Checkout] Already in progress, ignoring');
      return;
    }
    
    checkoutInProgress.current = true;
    setIsLoading(true);
    setError(null);

    // Step 1: Create blocking overlay IMMEDIATELY
    const overlay = createBlockingOverlay();

    try {
      console.log('[Checkout] Starting checkout for plan:', plan);

      // Step 2: Create checkout session
      const { data, error: checkoutError } = await supabase.functions.invoke(
        'create-checkout-session',
        { body: { plan } }
      );

      console.log('[Checkout] Response:', { data, error: checkoutError });

      if (checkoutError) {
        throw new Error(checkoutError.message || 'Failed to create checkout session');
      }

      if (!data?.url) {
        throw new Error('No checkout URL received from server');
      }

      console.log('[Checkout] Got URL, redirecting:', data.url);

      // Step 3: Force redirect - this MUST happen before any React updates
      forceRedirect(data.url);

      // Keep loading state - we're leaving the page anyway
      
    } catch (err: any) {
      console.error('[Checkout] Error:', err);
      
      // Remove overlay on error
      overlay.remove();
      
      setError(err.message || 'Checkout failed');
      setIsLoading(false);
      checkoutInProgress.current = false;
    }
  }, []);

  return { initiateCheckout, isLoading, error };
}

// ============================================================================
// STANDALONE FUNCTION (for use outside React)
// ============================================================================
// Use this when you need to trigger checkout from non-React code
// or when you want maximum control

export async function createStripeCheckout(plan: Plan): Promise<void> {
  // Create blocking overlay
  const overlay = createBlockingOverlay();

  try {
    console.log('[Checkout Standalone] Starting checkout for plan:', plan);
    
    const { data, error } = await supabase.functions.invoke(
      'create-checkout-session',
      { body: { plan } }
    );

    console.log('[Checkout Standalone] Response:', { data, error });

    if (error || !data?.url) {
      throw new Error(error?.message || 'No checkout URL received');
    }

    forceRedirect(data.url);
    
  } catch (err) {
    console.error('[Checkout Standalone] Error:', err);
    overlay.remove();
    throw err;
  }
}
