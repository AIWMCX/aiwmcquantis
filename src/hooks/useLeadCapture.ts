/**
 * Unified Lead Capture Hook
 * 
 * Centralizes all lead capture logic with:
 * - Cooldown management per source/offer
 * - Analytics tracking
 * - Lead memory integration
 * - Backend submission to capture_lead RPC
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';
import { saveLeadEmail } from '@/lib/leadMemory';
import { 
  LeadSource, 
  LeadOffer, 
  COOLDOWN_CONFIG,
  STORAGE_KEYS,
} from '@/lib/leadMagnets';

// ============================================
// Types
// ============================================

interface LeadCaptureConfig {
  source: LeadSource;
  offer: LeadOffer;
}

interface UseLeadCaptureReturn {
  captureLead: (email: string, metadata?: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  isSubmitting: boolean;
  isSuccess: boolean;
  checkCooldown: () => { inCooldown: boolean; remainingHours?: number };
  markDismissed: () => void;
}

interface PopupState {
  [key: string]: {
    lastSubmitted?: string;
    lastDismissed?: string;
    dismissCount?: number;
  };
}

// ============================================
// Storage Helpers
// ============================================

function getPopupState(): PopupState {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.POPUP_STATE);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function savePopupState(state: PopupState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.POPUP_STATE, JSON.stringify(state));
  } catch (e) {
    console.error('[useLeadCapture] Failed to save state:', e);
  }
}

// ============================================
// Hook Implementation
// ============================================

export function useLeadCapture(config: LeadCaptureConfig): UseLeadCaptureReturn {
  const { source, offer } = config;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const stateKey = `${source}_${offer}`;
  const cooldownConfig = COOLDOWN_CONFIG[source];

  /**
   * Check if source/offer is in cooldown period
   */
  const checkCooldown = useCallback((): { inCooldown: boolean; remainingHours?: number } => {
    const state = getPopupState();
    const sourceState = state[stateKey];

    if (!sourceState) {
      return { inCooldown: false };
    }

    // Check submit cooldown
    if (sourceState.lastSubmitted) {
      const hoursSinceSubmit = (Date.now() - new Date(sourceState.lastSubmitted).getTime()) / (1000 * 60 * 60);
      if (hoursSinceSubmit < cooldownConfig.submit) {
        return { 
          inCooldown: true, 
          remainingHours: Math.ceil(cooldownConfig.submit - hoursSinceSubmit) 
        };
      }
    }

    // Check dismiss cooldown
    if (sourceState.lastDismissed && cooldownConfig.dismiss > 0) {
      const hoursSinceDismiss = (Date.now() - new Date(sourceState.lastDismissed).getTime()) / (1000 * 60 * 60);
      if (hoursSinceDismiss < cooldownConfig.dismiss) {
        return { 
          inCooldown: true, 
          remainingHours: Math.ceil(cooldownConfig.dismiss - hoursSinceDismiss) 
        };
      }
    }

    // Check excessive dismissals (3+ dismissals = 7-day cooldown)
    if ((sourceState.dismissCount || 0) >= 3 && sourceState.lastDismissed) {
      const daysSinceDismiss = (Date.now() - new Date(sourceState.lastDismissed).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < 7) {
        return { 
          inCooldown: true, 
          remainingHours: Math.ceil((7 - daysSinceDismiss) * 24) 
        };
      }
    }

    return { inCooldown: false };
  }, [stateKey, cooldownConfig]);

  /**
   * Mark popup as dismissed
   */
  const markDismissed = useCallback(() => {
    const state = getPopupState();
    const sourceState = state[stateKey] || {};
    
    state[stateKey] = {
      ...sourceState,
      lastDismissed: new Date().toISOString(),
      dismissCount: (sourceState.dismissCount || 0) + 1,
    };
    
    savePopupState(state);
    
    trackEvent('popup_dismissed', { 
      type: source, 
      offer,
      dismiss_count: state[stateKey].dismissCount,
    });
  }, [stateKey, source, offer]);

  /**
   * Capture lead email
   */
  const captureLead = useCallback(async (
    email: string, 
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> => {
    // Basic validation
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return { success: false, error: 'Invalid email' };
    }

    setIsSubmitting(true);
    
    // Track attempt
    trackEvent('lead_capture_attempted', { 
      source, 
      offer, 
      email_domain: email.split('@')[1] 
    });

    try {
      // 1. Capture lead in database
      const { data, error } = await supabase.rpc('capture_lead', {
        p_email: email,
        p_source: source,
        p_offer: offer,
        p_metadata: {
          user_agent: navigator.userAgent,
          referrer: document.referrer,
          page_url: window.location.href,
          timestamp: new Date().toISOString(),
          ...metadata,
        },
      });

      if (error) {
        if (error.message.includes('already captured')) {
          toast.info("You've already signed up. Check your email!");
          setIsSuccess(true);
          return { success: true };
        }
        if (error.message.includes('Invalid email')) {
          toast.error('Please enter a valid email address');
          return { success: false, error: 'Invalid email format' };
        }
        throw error;
      }

      console.log('✅ Lead captured:', data);

      // 2. Save to localStorage for auth prefill
      saveLeadEmail(email, source as 'exit_intent_popup' | 'landing_page' | 'other');

      // 3. Send welcome email
      const emailName = email.split('@')[0].replace(/[._-]/g, ' ') || 'Friend';
      const capitalizedName = emailName.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');

      const { error: emailError } = await supabase.functions.invoke('send-welcome-email', {
        body: { email, name: capitalizedName },
      });

      if (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the flow - lead is captured
      }

      // 4. Update cooldown state
      const state = getPopupState();
      state[stateKey] = {
        ...state[stateKey],
        lastSubmitted: new Date().toISOString(),
        dismissCount: 0,
      };
      savePopupState(state);

      // 5. Track success
      setIsSuccess(true);
      trackEvent('lead_capture_success', { 
        source, 
        offer, 
        lead_id: data,
        email_domain: email.split('@')[1],
      });

      return { success: true };
    } catch (error) {
      console.error('Lead capture error:', error);
      toast.error('Something went wrong. Please try again.');
      return { success: false, error: 'Capture failed' };
    } finally {
      setIsSubmitting(false);
    }
  }, [source, offer, stateKey]);

  return {
    captureLead,
    isSubmitting,
    isSuccess,
    checkCooldown,
    markDismissed,
  };
}

// ============================================
// Session Tracking for Popup Manager
// ============================================

export function hasShownPopupThisSession(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEYS.SESSION_POPUP_SHOWN) === 'true';
  } catch {
    return false;
  }
}

export function markPopupShownThisSession(): void {
  try {
    sessionStorage.setItem(STORAGE_KEYS.SESSION_POPUP_SHOWN, 'true');
  } catch {
    // Ignore
  }
}
