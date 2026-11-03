import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { buildSignupConsentMetadata, hasPendingConsent, needsConsentSync } from '@/lib/signupConsent';

/** Pages the person may need to read before agreeing; the gate stays out of their way there. */
const READABLE_WITHOUT_GATE = ['/terms', '/privacy', '/ai-policy', '/dmca', '/auth'];

/** Lets a pending record saved before a redirect reach the account before the gate decides. */
const SETTLE_MS = 2500;

/**
 * Every account must carry a Terms + 18+ record (2026-11-03). The sign-up
 * form, Google from the sign-up form and the invite magic link record it on
 * the way in; Google from the login page, a magic link opened on another
 * device, and accounts created before the record existed do not. Those are
 * asked once here, after sign-in, before using the product.
 */
export function AccountConsentGate() {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missing = Boolean(user) && needsConsentSync(user?.user_metadata);
  const exempt = READABLE_WITHOUT_GATE.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (!missing || exempt) {
      setOpen(false);
      return;
    }
    const t = window.setTimeout(() => {
      if (!hasPendingConsent()) setOpen(true);
    }, SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [missing, exempt]);

  if (!open) return null;

  const confirm = async () => {
    if (!termsAccepted) {
      setError('Confirm you are 18 or older and agree to the Terms to continue');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const consent = buildSignupConsentMetadata({ termsAccepted: true, marketingOptIn, source: 'account_gate' });
      const { error: e } = await supabase.auth.updateUser({ data: { ...consent } });
      if (e) {
        setError(e.message);
        return;
      }
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => { /* a choice is required */ }}>
      <DialogContent
        className="max-w-md [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>One step before you continue</DialogTitle>
          <DialogDescription>
            We need your agreement to the Terms on record for this account. It takes one click.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="gate-accept-terms"
              checked={termsAccepted}
              onCheckedChange={(v) => setTermsAccepted(v === true)}
              disabled={busy}
              aria-required="true"
              className="mt-0.5"
            />
            <Label htmlFor="gate-accept-terms" className="text-sm font-normal leading-snug text-muted-foreground">
              I am 18 or older and agree to the{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline text-foreground">Terms of Service</a>{' '}
              and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline text-foreground">Privacy Policy</a>.
            </Label>
          </div>
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="gate-marketing-opt-in"
              checked={marketingOptIn}
              onCheckedChange={(v) => setMarketingOptIn(v === true)}
              disabled={busy}
              className="mt-0.5"
            />
            <Label htmlFor="gate-marketing-opt-in" className="text-sm font-normal leading-snug text-muted-foreground">
              Optional: email me occasional product updates and tips from AIWMC LLC. Unsubscribe anytime.
            </Label>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
            <Button variant="ghost" onClick={() => void signOut()} disabled={busy}>Sign out</Button>
            <Button onClick={() => void confirm()} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Agree and continue'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
