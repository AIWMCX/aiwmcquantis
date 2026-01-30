/**
 * Popup Manager Hook
 * 
 * Coordinates multiple popup triggers with priority system:
 * - Exit intent (priority 1 - highest)
 * - Scroll trigger (priority 2)
 * - Time delay (priority 3)
 * 
 * Rules:
 * - Maximum 1 popup per session
 * - Never show to authenticated users
 * - Respect individual cooldowns
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/lib/analytics';
import { 
  POPUP_TRIGGERS, 
  PopupTriggerConfig,
  STORAGE_KEYS,
  COOLDOWN_CONFIG,
} from '@/lib/leadMagnets';

// ============================================
// Types
// ============================================

export type ActivePopupType = 'exit_intent' | 'scroll' | 'time_delay' | null;

interface UsePopupManagerReturn {
  activePopup: ActivePopupType;
  closePopup: () => void;
  markSubmitted: () => void;
  getTriggerConfig: () => PopupTriggerConfig | null;
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

function hasShownThisSession(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEYS.SESSION_POPUP_SHOWN) === 'true';
  } catch {
    return false;
  }
}

function markShownThisSession(): void {
  try {
    sessionStorage.setItem(STORAGE_KEYS.SESSION_POPUP_SHOWN, 'true');
  } catch {
    // Ignore
  }
}

function checkTriggerCooldown(trigger: PopupTriggerConfig): boolean {
  const state = getPopupState();
  const stateKey = `${trigger.source}_${trigger.offer}`;
  const sourceState = state[stateKey];
  const cooldown = COOLDOWN_CONFIG[trigger.source];

  if (!sourceState) return false;

  // Check submit cooldown
  if (sourceState.lastSubmitted) {
    const hoursSinceSubmit = (Date.now() - new Date(sourceState.lastSubmitted).getTime()) / (1000 * 60 * 60);
    if (hoursSinceSubmit < cooldown.submit) return true;
  }

  // Check dismiss cooldown
  if (sourceState.lastDismissed && cooldown.dismiss > 0) {
    const hoursSinceDismiss = (Date.now() - new Date(sourceState.lastDismissed).getTime()) / (1000 * 60 * 60);
    if (hoursSinceDismiss < cooldown.dismiss) return true;
  }

  // Excessive dismissals
  if ((sourceState.dismissCount || 0) >= 3 && sourceState.lastDismissed) {
    const daysSinceDismiss = (Date.now() - new Date(sourceState.lastDismissed).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDismiss < 7) return true;
  }

  return false;
}

// ============================================
// Hook Implementation
// ============================================

export function usePopupManager(): UsePopupManagerReturn {
  const { user } = useAuth();
  const [activePopup, setActivePopup] = useState<ActivePopupType>(null);
  const [hasShown, setHasShown] = useState(false);
  const scrollDepthRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Find the trigger config for current active popup
  const getTriggerConfig = useCallback((): PopupTriggerConfig | null => {
    if (!activePopup) return null;
    return POPUP_TRIGGERS.find(t => t.type === activePopup) || null;
  }, [activePopup]);

  // Trigger a popup by type
  const triggerPopup = useCallback((type: ActivePopupType) => {
    if (hasShown || hasShownThisSession() || user) return;
    
    const trigger = POPUP_TRIGGERS.find(t => t.type === type);
    if (!trigger || checkTriggerCooldown(trigger)) return;

    setActivePopup(type);
    setHasShown(true);
    markShownThisSession();
    
    trackEvent('popup_triggered', { 
      type, 
      source: trigger.source, 
      offer: trigger.offer 
    });
  }, [hasShown, user]);

  // Close popup and mark as dismissed
  const closePopup = useCallback(() => {
    const trigger = getTriggerConfig();
    if (trigger) {
      const state = getPopupState();
      const stateKey = `${trigger.source}_${trigger.offer}`;
      const sourceState = state[stateKey] || {};
      
      state[stateKey] = {
        ...sourceState,
        lastDismissed: new Date().toISOString(),
        dismissCount: (sourceState.dismissCount || 0) + 1,
      };
      
      try {
        localStorage.setItem(STORAGE_KEYS.POPUP_STATE, JSON.stringify(state));
      } catch {
        // Ignore
      }
      
      trackEvent('popup_dismissed', { 
        type: trigger.type, 
        source: trigger.source, 
        offer: trigger.offer 
      });
    }
    setActivePopup(null);
  }, [getTriggerConfig]);

  // Mark as submitted (longer cooldown)
  const markSubmitted = useCallback(() => {
    const trigger = getTriggerConfig();
    if (trigger) {
      const state = getPopupState();
      const stateKey = `${trigger.source}_${trigger.offer}`;
      
      state[stateKey] = {
        ...state[stateKey],
        lastSubmitted: new Date().toISOString(),
        dismissCount: 0,
      };
      
      try {
        localStorage.setItem(STORAGE_KEYS.POPUP_STATE, JSON.stringify(state));
      } catch {
        // Ignore
      }
    }
    setActivePopup(null);
  }, [getTriggerConfig]);

  // Exit intent detection (desktop)
  useEffect(() => {
    if (user || hasShown) return;

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    let isExiting = false;
    let timer: ReturnType<typeof setTimeout>;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 20 && !isExiting) {
        isExiting = true;
        timer = setTimeout(() => {
          triggerPopup('exit_intent');
        }, 500);
      }
    };

    const handleMouseEnter = () => {
      isExiting = false;
      if (timer) clearTimeout(timer);
    };

    // Delay before enabling
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
  }, [user, hasShown, triggerPopup]);

  // Scroll trigger (50% depth)
  useEffect(() => {
    if (user || hasShown) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      
      const scrollPercent = (scrollTop / docHeight) * 100;
      
      if (scrollPercent > scrollDepthRef.current) {
        scrollDepthRef.current = scrollPercent;
      }

      // Trigger at 50% scroll
      if (scrollDepthRef.current >= 50 && !hasShown) {
        // Check if exit intent has higher priority and isn't in cooldown
        const exitTrigger = POPUP_TRIGGERS.find(t => t.type === 'exit_intent');
        if (exitTrigger && !checkTriggerCooldown(exitTrigger)) {
          // Don't show scroll popup if exit intent is available
          return;
        }
        triggerPopup('scroll');
      }
    };

    const initTimer = setTimeout(() => {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }, 5000);

    return () => {
      clearTimeout(initTimer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [user, hasShown, triggerPopup]);

  // Time delay trigger (30 seconds)
  useEffect(() => {
    if (user || hasShown) return;

    const timeTrigger = POPUP_TRIGGERS.find(t => t.type === 'time_delay');
    if (!timeTrigger) return;

    timeoutRef.current = setTimeout(() => {
      // Check if higher priority popups are available
      const exitTrigger = POPUP_TRIGGERS.find(t => t.type === 'exit_intent');
      const scrollTrigger = POPUP_TRIGGERS.find(t => t.type === 'scroll');
      
      if (exitTrigger && !checkTriggerCooldown(exitTrigger)) return;
      if (scrollTrigger && !checkTriggerCooldown(scrollTrigger)) return;
      
      triggerPopup('time_delay');
    }, (timeTrigger.delaySeconds || 30) * 1000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [user, hasShown, triggerPopup]);

  return {
    activePopup,
    closePopup,
    markSubmitted,
    getTriggerConfig,
  };
}
