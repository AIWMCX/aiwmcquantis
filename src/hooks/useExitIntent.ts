import { useEffect, useState, useCallback } from 'react';

interface ExitIntentOptions {
  enabled?: boolean;
  threshold?: number; // pixels from top before triggering
  delay?: number; // ms delay before showing
  cookieExpiry?: number; // days before showing again
}

export const useExitIntent = (options: ExitIntentOptions = {}) => {
  const {
    enabled = true,
    threshold = 20,
    delay = 500,
    cookieExpiry = 7,
  } = options;

  const [shouldShow, setShouldShow] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    // Check if user has seen popup recently
    const lastShown = localStorage.getItem('exitIntentShown');
    if (lastShown) {
      const lastShownDate = new Date(lastShown);
      const daysSinceShown = (Date.now() - lastShownDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceShown < cookieExpiry) {
        setHasShown(true);
        return;
      }
    }

    let isExiting = false;
    let timer: ReturnType<typeof setTimeout>;

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if mouse is leaving from top of page
      if (e.clientY <= threshold && !isExiting && !hasShown) {
        isExiting = true;
        
        timer = setTimeout(() => {
          setShouldShow(true);
          setHasShown(true);
          localStorage.setItem('exitIntentShown', new Date().toISOString());
        }, delay);
      }
    };

    const handleMouseEnter = () => {
      isExiting = false;
      if (timer) clearTimeout(timer);
    };

    // Only add listeners after a short delay (don't trigger immediately on page load)
    const initTimer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
      document.addEventListener('mouseenter', handleMouseEnter);
    }, 2000);

    return () => {
      clearTimeout(initTimer);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      if (timer) clearTimeout(timer);
    };
  }, [enabled, threshold, delay, cookieExpiry, hasShown]);

  const close = useCallback(() => {
    setShouldShow(false);
  }, []);

  const reset = useCallback(() => {
    setHasShown(false);
    setShouldShow(false);
    localStorage.removeItem('exitIntentShown');
  }, []);

  return { shouldShow, close, reset, hasShown };
};
