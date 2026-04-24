import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

import { logger } from '@/lib/logger';
/**
 * Hook to check if the current visitor is a bot.
 * Calls the bot-detection edge function on mount.
 * If bot detected, sets a flag to suppress analytics events.
 */
export function useBotDetection() {
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    const checkBot = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('bot-detection', {
          method: 'POST',
          body: { honeypot_field: '' },
        });

        if (!error && data?.isBot) {
          // Set flag to suppress analytics
          sessionStorage.setItem('is_bot', 'true');
          logger.debug('[bot-detection] Bot detected:', data.reason);
        }
      } catch {
        // Silently fail — don't block user experience
      }
    };

    // Defer to not block initial render
    const timer = setTimeout(checkBot, 3000);
    return () => clearTimeout(timer);
  }, []);
}

/**
 * Check if current session is flagged as bot
 */
export function isBot(): boolean {
  try {
    return sessionStorage.getItem('is_bot') === 'true';
  } catch {
    return false;
  }
}
