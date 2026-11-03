/**
 * Signup consent record (Terms + age confirmation, optional marketing opt-in).
 *
 * Stored in Supabase Auth user metadata (raw_user_meta_data) at sign-up, so
 * each account carries when it accepted which Terms version, that the person
 * confirmed they are 18+, and whether they opted in to marketing email —
 * the record CASL/CAN-SPAM consent questions are answered from.
 *
 * Marketing opt-in is never implied: the checkbox starts unchecked and a
 * missing or false value means "no marketing email".
 */

/** Bump when the Terms or Privacy Policy change materially. */
export const TERMS_VERSION = '2026-11-03';

export const PENDING_CONSENT_SLOT = 'aiwmc_pending_signup_consent_v1';

export type ConsentSource = 'signup_form' | 'google_oauth' | 'invite_magic_link' | 'account_gate';

const CONSENT_SOURCES: readonly ConsentSource[] = ['signup_form', 'google_oauth', 'invite_magic_link', 'account_gate'];

export interface SignupConsentMetadata {
  age_confirmed: true;
  terms_accepted_at: string;
  terms_version: string;
  marketing_opt_in: boolean;
  marketing_opt_in_at: string | null;
  consent_source: ConsentSource;
}

export interface SignupConsentInput {
  termsAccepted: boolean;
  marketingOptIn: boolean;
  source?: ConsentSource;
  now?: Date;
}

/** Builds the metadata record; refuses to build one without Terms + 18+ acceptance. */
export function buildSignupConsentMetadata(input: SignupConsentInput): SignupConsentMetadata {
  if (input.termsAccepted !== true) {
    throw new Error('Terms and age confirmation are required to create an account');
  }
  const at = (input.now ?? new Date()).toISOString();
  const marketing = input.marketingOptIn === true;
  return {
    age_confirmed: true,
    terms_accepted_at: at,
    terms_version: TERMS_VERSION,
    marketing_opt_in: marketing,
    marketing_opt_in_at: marketing ? at : null,
    consent_source: input.source ?? 'signup_form',
  };
}

/** True when an account has no recorded Terms acceptance yet (e.g. first OAuth sign-in). */
export function needsConsentSync(userMetadata: Record<string, unknown> | null | undefined): boolean {
  return !userMetadata || typeof userMetadata.terms_accepted_at !== 'string' || !userMetadata.terms_accepted_at;
}

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** True while a record saved before a redirect is waiting to be written to the account. */
export function hasPendingConsent(storage: KV = window.localStorage): boolean {
  try {
    return Boolean(storage.getItem(PENDING_CONSENT_SLOT));
  } catch {
    return false;
  }
}

/** Saved before an OAuth redirect, because the provider round-trip cannot carry metadata. */
export function savePendingConsent(consent: SignupConsentMetadata, storage: KV = window.localStorage): void {
  try {
    storage.setItem(PENDING_CONSENT_SLOT, JSON.stringify(consent));
  } catch { /* storage blocked: the account simply has no recorded consent and gets no marketing */ }
}

/** Reads and clears the pending record; returns null when absent or malformed. */
export function takePendingConsent(storage: KV = window.localStorage): SignupConsentMetadata | null {
  try {
    const raw = storage.getItem(PENDING_CONSENT_SLOT);
    if (!raw) return null;
    storage.removeItem(PENDING_CONSENT_SLOT);
    const parsed = JSON.parse(raw) as Partial<SignupConsentMetadata>;
    if (parsed?.age_confirmed !== true || typeof parsed.terms_accepted_at !== 'string') return null;
    return {
      age_confirmed: true,
      terms_accepted_at: parsed.terms_accepted_at,
      terms_version: typeof parsed.terms_version === 'string' ? parsed.terms_version : TERMS_VERSION,
      marketing_opt_in: parsed.marketing_opt_in === true,
      marketing_opt_in_at: parsed.marketing_opt_in === true && typeof parsed.marketing_opt_in_at === 'string' ? parsed.marketing_opt_in_at : null,
      consent_source: CONSENT_SOURCES.includes(parsed.consent_source as ConsentSource) ? (parsed.consent_source as ConsentSource) : 'signup_form',
    };
  } catch {
    return null;
  }
}
