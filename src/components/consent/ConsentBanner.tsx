import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CONSENT_OPEN_EVENT, getConsent, hasGpcSignal, setConsent } from '@/lib/consent';

/**
 * Cookie / tracking consent banner. Shown until the visitor chooses (or a
 * Global Privacy Control signal already said no). Reject and Accept are the
 * same size and style, so neither is the "easy" path.
 */
export function ConsentBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (getConsent() === null) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, []);

  if (!open) return null;

  const choose = (choice: 'granted' | 'denied') => {
    setOpen(false);
    setConsent(choice);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-banner-title"
      aria-describedby="consent-banner-text"
      className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4"
    >
      <div className="mx-auto max-w-3xl rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur sm:p-5">
        <p id="consent-banner-title" className="text-sm font-semibold text-foreground">
          Optional analytics and advertising cookies
        </p>
        <p id="consent-banner-text" className="mt-1 text-sm text-muted-foreground">
          With your OK we use Google Analytics, the Apollo.io visitor tracker and, when our ads run, the Meta and
          TikTok pixels to count visits and see which ads work. They stay off unless you accept. The site works
          the same either way.{' '}
          {hasGpcSignal() && <>Your browser sends a Global Privacy Control signal, so they are off by default. </>}
          <Link to="/privacy#cookies" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button type="button" variant="outline" className="sm:min-w-32" onClick={() => choose('denied')}>
            Reject
          </Button>
          <Button type="button" variant="outline" className="sm:min-w-32" onClick={() => choose('granted')}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
