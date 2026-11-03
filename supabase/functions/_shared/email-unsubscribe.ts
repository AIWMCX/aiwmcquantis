/**
 * One unsubscribe, applied everywhere the address can be emailed from:
 *   - leads (unsubscribe_lead: unsubscribed_at + marketing_opt_in = false)
 *   - profiles.email_marketing_opt_in = false (lifecycle emails to accounts)
 *   - email_suppressions (checked by outreach, lifecycle and weekly sends)
 *
 * Links carry the SHA-256 of the address (and, for accounts, the user id).
 * A user id is only acted on when the hash matches that user's own email,
 * so a crafted link cannot opt out an arbitrary account by id.
 */
// deno-lint-ignore-file no-explicit-any
import { emailHash } from './email-compliance.ts';

type Admin = any;

export interface UnsubscribeResult {
  leadMatched: boolean;
  profileUpdated: boolean;
  suppressed: boolean;
  errors: string[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function userEmailIfHashMatches(admin: Admin, userId: string, hash: string): Promise<string | null> {
  const { data } = await admin.auth.admin.getUserById(userId);
  const email: string | undefined = data?.user?.email;
  if (!email) return null;
  return (await emailHash(email)) === hash ? email.toLowerCase() : null;
}

/**
 * Links sent before the user id was added carry only the hash. The account
 * base is small, so scan it (bounded) rather than leave those links broken.
 */
async function findUserByHash(admin: Admin, hash: string): Promise<{ id: string; email: string } | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const users: Array<{ id: string; email?: string }> = data?.users ?? [];
    for (const u of users) {
      if (u.email && (await emailHash(u.email)) === hash) return { id: u.id, email: u.email.toLowerCase() };
    }
    if (users.length < 1000) return null;
  }
  return null;
}

export async function applyUnsubscribe(
  admin: Admin,
  opts: { emailHash: string; userId?: string | null; source: string },
): Promise<UnsubscribeResult> {
  const hash = opts.emailHash.toLowerCase();
  const result: UnsubscribeResult = { leadMatched: false, profileUpdated: false, suppressed: false, errors: [] };
  let email: string | null = null;

  // 1. Lead rows (newsletter, lead magnets, nurture).
  const { data: leadUpdated, error: leadErr } = await admin.rpc('unsubscribe_lead', { p_email_hash: hash });
  if (leadErr) result.errors.push(`unsubscribe_lead: ${leadErr.message}`);
  const { data: lead } = await admin
    .from('leads').select('id, email_encrypted').eq('email_hash', hash).limit(1).maybeSingle();
  if (lead || leadUpdated) result.leadMatched = true;
  if (lead?.email_encrypted) {
    // decrypt_pii, not get_lead_email: the latter requires an admin user session.
    const { data: plain } = await admin.rpc('decrypt_pii', { encrypted_data: lead.email_encrypted });
    if (typeof plain === 'string' && plain.includes('@')) email = plain.toLowerCase();
  }

  // 2. Account (lifecycle emails).
  let user: { id: string; email: string } | null = null;
  if (opts.userId && UUID.test(opts.userId)) {
    const e = await userEmailIfHashMatches(admin, opts.userId, hash);
    if (e) user = { id: opts.userId, email: e };
  }
  if (!user) user = await findUserByHash(admin, hash);
  if (user) {
    const { error } = await admin.from('profiles').update({ email_marketing_opt_in: false }).eq('id', user.id);
    if (error) result.errors.push(`profiles: ${error.message}`);
    else result.profileUpdated = true;
    email = email ?? user.email;
  }

  // 3. Global suppression list. Never overwrite a stronger reason (hard_bounced, complaint).
  if (email) {
    const { error } = await admin.from('email_suppressions').upsert(
      { email, reason: 'unsubscribed', source: opts.source },
      { onConflict: 'email', ignoreDuplicates: true },
    );
    if (error) result.errors.push(`email_suppressions: ${error.message}`);
    else result.suppressed = true;
  }
  return result;
}

/** Whether an address may not receive marketing: on the suppression list or an unsubscribed lead row. */
export async function isSuppressed(admin: Admin, email: string): Promise<boolean> {
  const lower = email.trim().toLowerCase();
  const { data: sup } = await admin.from('email_suppressions').select('email').eq('email', lower).maybeSingle();
  if (sup) return true;
  const { data: lead } = await admin
    .from('leads').select('id').eq('email_hash', await emailHash(lower)).not('unsubscribed_at', 'is', null).limit(1).maybeSingle();
  return !!lead;
}

/** The singleton sender postal address (founder-provided; never generated). */
export async function loadPostalAddress(admin: Admin): Promise<string | null> {
  const { data } = await admin.from('mail_settings').select('postal_address').eq('id', true).maybeSingle();
  const v = data?.postal_address;
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}
