import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ExitIntentOptions {
  enabled?: boolean;
  threshold?: number; // pixels from top before triggering (desktop)
  delay?: number; // ms delay before showing
  cooldownDays?: number; // days before showing again after submission
  dismissCooldownHours?: number; // hours before showing again if just dismissed
  scrollDepthThreshold?: number; // % of page scrolled before enabling scroll-back trigger (mobile)
  scrollBackThreshold?: number; // % scrolled back up to trigger (mobile)
}

interface ExitIntentState {
  lastSubmitted: string | null;
  lastDismissed: string | null;
  dismissCount: number;
}

const STORAGE_KEY = 'exitIntent_state';
const LEGACY_KEY = 'exitIntentShown';

const getStoredState = (): ExitIntentState => {
  try {
    const legacyValue = localStorage.getItem(LEGACY_KEY);
    if (legacyValue) {
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

// Detect if user is on mobile/touch device
const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const useExitIntent = (options: ExitIntentOptions = {}) => {
  const {
    enabled = true,
    threshold = 20,
    delay = 500,
    cooldownDays = 14,
    dismissCooldownHours = 4,
    scrollDepthThreshold = 40, // User must scroll 40% down first (engaged)
    scrollBackThreshold = 25, // Then scroll back to 25% of page (leaving signal)
  } = options;

  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  
  // Track scroll state for mobile
  const maxScrollDepth = useRef(0);
  const hasReachedThreshold = useRef(false);
  const isInitialized = useRef(false);

  // Check if we're in cooldown period
  const isInCooldown = useCallback(() => {
    const state = getStoredState();
    
    if (state.lastSubmitted) {
      const daysSinceSubmission = (Date.now() - new Date(state.lastSubmitted).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceSubmission < cooldownDays) return true;
    }

    if (state.lastDismissed) {
      const hoursSinceDismissal = (Date.now() - new Date(state.lastDismissed).getTime()) / (1000 * 60 * 60);
      if (hoursSinceDismissal < dismissCooldownHours) return true;
    }

    if (state.dismissCount >= 3 && state.lastDismissed) {
      const daysSinceDismissal = (Date.now() - new Date(state.lastDismissed).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissal < 7) return true;
    }

    return false;
  }, [cooldownDays, dismissCooldownHours]);

  useEffect(() => {
    // Don't show to authenticated users
    if (!enabled || user) {
      setShouldShow(false);
      return;
    }

    if (isInCooldown()) {
      setHasShown(true);
      return;
    }

    const isMobile = isTouchDevice();
    let isExiting = false;
    let timer: ReturnType<typeof setTimeout>;

    // Desktop: Mouse leave detection
    const handleMouseLeave = (e: MouseEvent) => {
      if (isMobile) return; // Skip on mobile
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

    // Mobile: Scroll-depth detection
    const handleScroll = () => {
      if (!isMobile || hasShown) return;

      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;

      // Track maximum scroll depth
      if (scrollPercent > maxScrollDepth.current) {
        maxScrollDepth.current = scrollPercent;
      }

      // Check if user has scrolled deep enough to be "engaged"
      if (maxScrollDepth.current >= scrollDepthThreshold) {
        hasReachedThreshold.current = true;
      }

      // If user was engaged and is now scrolling back up significantly
      if (hasReachedThreshold.current && scrollPercent <= scrollBackThreshold) {
        // User scrolled down, engaged with content, now scrolling back up (leaving signal)
        setShouldShow(true);
        setHasShown(true);
      }
    };

    // Initialize after delay
    const initTimer = setTimeout(() => {
      isInitialized.current = true;
      
      if (!isMobile) {
        document.addEventListener('mouseleave', handleMouseLeave);
        document.addEventListener('mouseenter', handleMouseEnter);
      } else {
        window.addEventListener('scroll', handleScroll, { passive: true });
      }
    }, 3000);

    return () => {
      clearTimeout(initTimer);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      window.removeEventListener('scroll', handleScroll);
      if (timer) clearTimeout(timer);
    };
  }, [enabled, threshold, delay, hasShown, user, isInCooldown, scrollDepthThreshold, scrollBackThreshold]);

  const markSubmitted = useCallback(() => {
    const state = getStoredState();
    state.lastSubmitted = new Date().toISOString();
    state.dismissCount = 0;
    saveState(state);
    setShouldShow(false);
  }, []);

  const close = useCallback(() => {
    const state = getStoredState();
    state.lastDismissed = new Date().toISOString();
    state.dismissCount = (state.dismissCount || 0) + 1;
    saveState(state);
    setShouldShow(false);
  }, []);

  const reset = useCallback(() => {
    setHasShown(false);
    setShouldShow(false);
    maxScrollDepth.current = 0;
    hasReachedThreshold.current = false;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('exitIntentShown');
  }, []);

  return { shouldShow, close, markSubmitted, reset, hasShown };
};
