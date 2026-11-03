import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Consent statement shown under every email-capture form (CASL: purpose,
 * sender, how to withdraw; CAN-SPAM: honest about what is sent). Submitting
 * only starts a double opt-in: nothing but the confirmation request is sent
 * until the owner of the address clicks the link.
 */
export function EmailConsentNote({ className }: { className?: string }) {
  return (
    <p className={cn('text-[11px] leading-snug text-muted-foreground', className)}>
      AIWMC LLC will email you a confirmation link first. You get Quantis emails (decision-testing tips and
      product updates) only after you click it, and you can unsubscribe from any email.{' '}
      <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>
    </p>
  );
}
