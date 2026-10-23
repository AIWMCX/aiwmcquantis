// Pure helpers for /admin/users (rows come from public.admin_users_overview()).

export interface AdminUserRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  signed_up_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  sign_in_provider: string;
  is_admin: boolean;
  is_internal: boolean;
  plan_id: string;
  subscription_status: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  has_stripe_customer: boolean;
  analyses_count: number;
  first_analysis_at: string | null;
  last_analysis_at: string | null;
  marketing_opt_in: boolean | null;
}

export type UserSegment = 'all' | 'activated' | 'never_analyzed' | 'paying' | 'trialing' | 'recent';

const DAY = 86_400_000;

/** Paying = a paid plan with an active Stripe subscription, not a founder/invite grant. */
export function isPaying(u: AdminUserRow): boolean {
  return u.plan_id !== 'free' && u.subscription_status === 'active' && u.has_stripe_customer;
}

export function isTrialing(u: AdminUserRow, now = Date.now()): boolean {
  return u.subscription_status === 'trialing' || (!!u.trial_ends_at && Date.parse(u.trial_ends_at) > now);
}

export function inSegment(u: AdminUserRow, seg: UserSegment, now = Date.now()): boolean {
  switch (seg) {
    case 'activated': return u.analyses_count > 0;
    case 'never_analyzed': return u.analyses_count === 0;
    case 'paying': return isPaying(u);
    case 'trialing': return isTrialing(u, now);
    case 'recent': return !!u.last_sign_in_at && now - Date.parse(u.last_sign_in_at) <= 30 * DAY;
    default: return true;
  }
}

export function filterUsers(rows: AdminUserRow[], opts: { query: string; segment: UserSegment; includeInternal: boolean }, now = Date.now()): AdminUserRow[] {
  const q = opts.query.trim().toLowerCase();
  return rows.filter((u) =>
    (opts.includeInternal || !u.is_internal)
    && inSegment(u, opts.segment, now)
    && (!q || `${u.email ?? ''} ${u.full_name ?? ''}`.toLowerCase().includes(q)));
}

export interface UserSummary {
  total: number; internal: number; external: number; activated: number;
  activationRate: number; signedInLast30: number; signedUpLast7: number; paying: number; trialing: number;
}

/** Headline numbers. Everything except total/internal counts external accounts only. */
export function summarize(rows: AdminUserRow[], now = Date.now()): UserSummary {
  const ext = rows.filter((u) => !u.is_internal);
  const activated = ext.filter((u) => u.analyses_count > 0).length;
  return {
    total: rows.length,
    internal: rows.length - ext.length,
    external: ext.length,
    activated,
    activationRate: ext.length ? Math.round((activated / ext.length) * 100) : 0,
    signedInLast30: ext.filter((u) => inSegment(u, 'recent', now)).length,
    signedUpLast7: ext.filter((u) => now - Date.parse(u.signed_up_at) <= 7 * DAY).length,
    paying: ext.filter(isPaying).length,
    trialing: ext.filter((u) => isTrialing(u, now)).length,
  };
}

const CSV_COLS: Array<keyof AdminUserRow> = [
  'email', 'full_name', 'signed_up_at', 'last_sign_in_at', 'sign_in_provider', 'email_confirmed',
  'plan_id', 'subscription_status', 'trial_ends_at', 'analyses_count', 'last_analysis_at', 'is_internal', 'marketing_opt_in',
];

export function toCsv(rows: AdminUserRow[]): string {
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    // Leading = + - @ would run as a formula when the CSV is opened in a spreadsheet.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [CSV_COLS.join(','), ...rows.map((r) => CSV_COLS.map((c) => cell(r[c])).join(','))].join('\n');
}
