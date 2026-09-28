/**
 * Plan invites — "one link → one person → one month of Pro".
 *
 * The token rides in the URL (/invite/<token>) and is also kept in
 * localStorage, because Google sign-in returns to the site root and email
 * confirmation lands on its own page: wherever the invitee ends up signed
 * in, PendingInviteRedirect brings them back to the invite page, which
 * redeems it server-side (redeem_plan_invite).
 */

const STORAGE_KEY = 'quantis_pending_invite_v1';
const MAGIC_ENTRY_KEY = 'quantis_magic_link_entry_v1';
const TOKEN_RE = /^[A-Za-z0-9_-]{12,64}$/;

export type InvitePreviewStatus = 'valid' | 'used' | 'expired' | 'revoked' | 'not_found';
export type InviteRedeemResult =
  | 'granted'
  | 'already_redeemed'
  | 'already_had_invite'
  | 'already_subscribed'
  | 'used'
  | 'expired'
  | 'revoked'
  | 'not_found'
  | 'not_signed_in'
  | 'wrong_email';

export function isValidInviteToken(token: string | null | undefined): token is string {
  return !!token && TOKEN_RE.test(token);
}

export function rememberInvite(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, at: Date.now() }));
  } catch { /* private mode: the URL still carries it */ }
}

/** The stored token if it is less than 7 days old. */
export function pendingInvite(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { token, at } = JSON.parse(raw) as { token?: string; at?: number };
    if (!isValidInviteToken(token) || !at || Date.now() - at > 7 * 86_400_000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function forgetInvite(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

/**
 * A passwordless (magic-link) entry never set a password, so there's
 * nothing to log back in with next time except another email round
 * trip. Marked right before the link is sent, consumed once on the
 * invite's "granted" screen to offer setting one -- optional, so
 * skipping it costs nothing and never blocks the free month itself.
 */
export function markMagicLinkEntry(): void {
  try {
    localStorage.setItem(MAGIC_ENTRY_KEY, '1');
  } catch { /* ignore */ }
}

export function consumeMagicLinkEntry(): boolean {
  try {
    const was = localStorage.getItem(MAGIC_ENTRY_KEY) === '1';
    localStorage.removeItem(MAGIC_ENTRY_KEY);
    return was;
  } catch {
    return false;
  }
}

/** 22-char URL-safe random token (~131 bits). */
export function generateInviteToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function inviteUrl(token: string, origin = 'https://aiwmcquantis.com'): string {
  return `${origin}/invite/${token}`;
}

const EMAIL_RE = /[^\s<>]+@[^\s<>]+\.[^\s<>]+/;

/**
 * Pulls an email address out of a bulk-invite line, if there is one, so
 * one paste can mix known-email rows (cold outreach -- gets bound to
 * that exact address) with label-only rows (LinkedIn -- first verified
 * email to redeem it owns it). "Jane Doe <jane@co.com>" or a bare
 * "jane@co.com" both work; anything left over after removing the email
 * becomes the label, falling back to the email itself.
 */
export function parseInviteLine(line: string): { label: string; expectedEmail: string | null } {
  const match = line.match(EMAIL_RE);
  if (!match) return { label: line.trim(), expectedEmail: null };
  const email = match[0].toLowerCase();
  const label = line.replace(match[0], '').replace(/[<>]/g, '').trim();
  return { label: label || email, expectedEmail: email };
}

/** What the invitee sees for each server answer. */
export function redeemMessage(result: InviteRedeemResult, endsAt: string | null): { ok: boolean; title: string; body: string } {
  const until = endsAt ? new Date(endsAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : null;
  switch (result) {
    case 'granted':
    case 'already_redeemed':
      return { ok: true, title: 'Your Pro month is active', body: until ? `Full Pro access until ${until}. No card needed, nothing renews automatically.` : 'Full Pro access is active.' };
    case 'already_had_invite':
      return { ok: true, title: 'You already have your free month', body: until ? `Your free Pro month runs until ${until}. Each person gets one.` : 'Each person gets one free month.' };
    case 'already_subscribed':
      return { ok: true, title: "You're already on a paid plan", body: 'Nothing changes: your current subscription stays exactly as it is.' };
    case 'used':
      return { ok: false, title: 'This invite has already been used', body: 'Each invite link works for one person. Ask the person who sent it for your own link.' };
    case 'expired':
      return { ok: false, title: 'This invite has expired', body: 'Ask the person who sent it for a fresh link — it takes them a minute.' };
    case 'revoked':
      return { ok: false, title: 'This invite is no longer active', body: 'Ask the person who sent it for a new link.' };
    case 'not_found':
      return { ok: false, title: "We couldn't find this invite", body: 'Check that the whole link was copied, or ask for a new one.' };
    case 'wrong_email':
      return { ok: false, title: 'This invite is for a different email', body: 'This link was sent to a specific address. Sign in or sign up with that exact email to activate it.' };
    default:
      return { ok: false, title: 'Please sign in', body: 'Sign in or create a free account to activate your invite.' };
  }
}
