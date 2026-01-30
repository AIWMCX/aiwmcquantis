/**
 * Popup Manager Component
 * 
 * Coordinates and renders popups based on priority:
 * - Exit intent (priority 1)
 * - Scroll trigger (priority 2)
 * - Time delay (priority 3)
 * 
 * Only shows one popup per session.
 */

import React from 'react';
import { usePopupManager, ActivePopupType } from '@/hooks/usePopupManager';
import { ScrollTriggerPopup } from './ScrollTriggerPopup';
import { TimeDelayPopup } from './TimeDelayPopup';
import { ExitIntentPopup } from './ExitIntentPopup';
import { PopupErrorBoundary } from './PopupErrorBoundary';

export function PopupManager() {
  const { activePopup, closePopup, markSubmitted, getTriggerConfig } = usePopupManager();
  const config = getTriggerConfig();

  return (
    <PopupErrorBoundary>
      {/* Exit Intent Popup */}
      <ExitIntentPopup 
        isOpen={activePopup === 'exit_intent'} 
        onClose={closePopup} 
        onSubmitSuccess={markSubmitted} 
      />

      {/* Scroll Trigger Popup */}
      <ScrollTriggerPopup
        isOpen={activePopup === 'scroll'}
        onClose={closePopup}
        onSubmitSuccess={markSubmitted}
      />

      {/* Time Delay Popup */}
      <TimeDelayPopup
        isOpen={activePopup === 'time_delay'}
        onClose={closePopup}
        onSubmitSuccess={markSubmitted}
      />
    </PopupErrorBoundary>
  );
}
