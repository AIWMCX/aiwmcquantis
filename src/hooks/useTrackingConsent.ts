import { useEffect, useState } from 'react';
import { CONSENT_CHANGE_EVENT, isTrackingAllowed } from '@/lib/consent';

/** True once the visitor has accepted optional analytics (re-renders on change). */
export function useTrackingConsent(): boolean {
  const [allowed, setAllowed] = useState<boolean>(() => isTrackingAllowed());
  useEffect(() => {
    const onChange = () => setAllowed(isTrackingAllowed());
    window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
  }, []);
  return allowed;
}
