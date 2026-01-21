import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ExitIntentOptions {
  enabled?: boolean;
  threshold?: number; // pixels from top before triggering
  delay?: number; // ms delay before showing
  cooldownDays?: number; // days before showing again after submission
  dismissCooldownHours?: number; // hours before showing again if just dismissed
}

interface ExitIntentState {
  lastSubmitted: string | null; // ISO date when email was submitted
  lastDismissed: string | null; // ISO date when popup was closed without submission
  dismissCount: number; // how many times dismissed without submitting
}

const STORAGE_KEY = 'exitIntent_state';
const LEGACY_KEY = 'exitIntentShown'; // Old key to migrate from

const getStoredState = (): ExitIntentState => {
  try {
    // Migrate from legacy key if it exists
    const legacyValue = localStorage.getItem(LEGACY_KEY);
    if (legacyValue) {
      // Legacy was just a date string, treat as last dismissed
      localStorage.removeItem(LEGACY_KEY);
      const newState: ExitIntentState = {
        lastSubmitted: null,
        lastDismissed: legacyValue,
        dismissCount: 1
      };
      saveState(newState);
      return newState;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse exit intent state:', e);
  }
  return { lastSubmitted: null, lastDismissed: null, dismissCount: 0 };
};

const saveState = (state: ExitIntentState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save exit intent state:', e);
  }
};

export const useExitIntent = (options: ExitIntentOptions = {}) => {
  const {
    enabled = true,
    threshold = 20,
    delay = 500,
    cooldownDays = 14, // 14 days after submission (they already gave email)
    dismissCooldownHours = 4, // 4 hours if just dismissed (respect their choice, but try again later)
  } = options;

  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    // Don't show to authenticated users - they're already converted
    if (!enabled || user) {
      setShouldShow(false);
      return;
    }

    const state = getStoredState();
    
    // Check if user already submitted email (long cooldown)
    if (state.lastSubmitted) {
      const submittedDate = new Date(state.lastSubmitted);
      const daysSinceSubmission = (Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceSubmission < cooldownDays) {
        setHasShown(true);
        return;
      }
    }

    // Check if user just dismissed (short cooldown - respect but don't give up)
    if (state.lastDismissed) {
      const dismissedDate = new Date(state.lastDismissed);
      const hoursSinceDismissal = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceDismissal < dismissCooldownHours) {
        setHasShown(true);
        return;
      }
    }

    // If dismissed 3+ times, use longer cooldown (7 days) - they really don't want it
    if (state.dismissCount >= 3 && state.lastDismissed) {
      const dismissedDate = new Date(state.lastDismissed);
      const daysSinceDismissal = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceDismissal < 7) {
        setHasShown(true);
        return;
      }
    }

    let isExiting = false;
    let timer: ReturnType<typeof setTimeout>;

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if mouse is leaving from top of page (closing tab/navigating away)
      if (e.clientY <= threshold && !isExiting && !hasShown) {
        isExiting = true;
        
        timer = setTimeout(() => {
          setShouldShow(true);
          setHasShown(true);
        }, delay);
      }
    };

    const handleMouseEnter = () => {
      isExiting = false;
      if (timer) clearTimeout(timer);
    };

    // Only add listeners after a short delay (don't trigger immediately on page load)
    // Increased to 3 seconds to ensure user has time to engage with content first
    const initTimer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
      document.addEventListener('mouseenter', handleMouseEnter);
    }, 3000);

    return () => {
      clearTimeout(initTimer);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      if (timer) clearTimeout(timer);
    };
  }, [enabled, threshold, delay, cooldownDays, dismissCooldownHours, hasShown, user]);

  // Called when user submits their email (successful conversion)
  const markSubmitted = useCallback(() => {
    const state = getStoredState();
    state.lastSubmitted = new Date().toISOString();
    state.dismissCount = 0; // Reset dismiss count on submission
    saveState(state);
    setShouldShow(false);
  }, []);

  // Called when user closes popup without submitting
  const close = useCallback(() => {
    const state = getStoredState();
    state.lastDismissed = new Date().toISOString();
    state.dismissCount = (state.dismissCount || 0) + 1;
    saveState(state);
    setShouldShow(false);
  }, []);

  // For testing/debugging - clears all state
  const reset = useCallback(() => {
    setHasShown(false);
    setShouldShow(false);
    localStorage.removeItem(STORAGE_KEY);
    // Also remove legacy key if exists
    localStorage.removeItem('exitIntentShown');
  }, []);

  return { shouldShow, close, markSubmitted, reset, hasShown };
};
