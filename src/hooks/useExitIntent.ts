import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

import { logger } from '@/lib/logger';
interface ExitIntentOptions {
  enabled?: boolean;
  threshold?: number;
  delay?: number;
  cooldownDays?: number;
  dismissCooldownHours?: number;
  scrollDepthThreshold?: number;
  scrollBackThreshold?: number;
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
    logger.error('Failed to parse exit intent state:', e);
  }
  return { lastSubmitted: null, lastDismissed: null, dismissCount: 0 };
};

const saveState = (state: ExitIntentState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    logger.error('Failed to save exit intent state:', e);
  }
};

// Pure function - no hooks
const checkCooldown = (cooldownDays: number, dismissCooldownHours: number): boolean => {
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
};

// Pure function - no hooks
const isTouchDevice = (): boolean => {
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
    scrollDepthThreshold = 40,
    scrollBackThreshold = 25,
  } = options;

  // All hooks MUST be called unconditionally at the top
  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const maxScrollDepth = useRef(0);
  const hasReachedThreshold = useRef(false);

  // Effect for desktop mouse-leave detection
  useEffect(() => {
    if (!enabled || user || hasShown) return;
    if (checkCooldown(cooldownDays, dismissCooldownHours)) {
      setHasShown(true);
      return;
    }

    const isMobile = isTouchDevice();
    if (isMobile) return;

    let isExiting = false;
    let timer: ReturnType<typeof setTimeout>;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= threshold && !isExiting) {
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

    const initTimer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
      document.addEventListener('mouseenter', handleMouseEnter);
    }, 3000);

    return () => {
      clearTimeout(initTimer);
      if (timer) clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [enabled, threshold, delay, hasShown, user, cooldownDays, dismissCooldownHours]);

  // Effect for mobile scroll-depth detection
  useEffect(() => {
    if (!enabled || user || hasShown) return;
    if (checkCooldown(cooldownDays, dismissCooldownHours)) {
      setHasShown(true);
      return;
    }

    const isMobile = isTouchDevice();
    if (!isMobile) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      
      const scrollPercent = (scrollTop / docHeight) * 100;

      if (scrollPercent > maxScrollDepth.current) {
        maxScrollDepth.current = scrollPercent;
      }

      if (maxScrollDepth.current >= scrollDepthThreshold) {
        hasReachedThreshold.current = true;
      }

      if (hasReachedThreshold.current && scrollPercent <= scrollBackThreshold) {
        setShouldShow(true);
        setHasShown(true);
      }
    };

    const initTimer = setTimeout(() => {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }, 3000);

    return () => {
      clearTimeout(initTimer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [enabled, hasShown, user, cooldownDays, dismissCooldownHours, scrollDepthThreshold, scrollBackThreshold]);

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
