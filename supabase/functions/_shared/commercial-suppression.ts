/**
 * Commercial Ops workflow -- deterministic suppression engine.
 *
 * Purely a function of its inputs: no LLM call, no fabricated answer, no
 * network access. Callers (commercial-workflow/index.ts) are responsible
 * for querying the small amount of context this needs from
 * commercial_prospects / commercial_prospect_stage_history and passing it
 * in -- keeping this module trivially unit-testable and reusable outside an
 * edge-function request/response cycle.
 *
 * Checks, in order (first match wins -- a prospect can be suppressed for
 * more than one reason, but callers only need the first actionable one):
 *   1. an explicit non-'active' suppression_status on the prospect itself
 *      (unsubscribed / hard_bounced / do_not_contact -- see the
 *      commercial_prospects_suppression_status_chk CHECK constraint added
 *      in 20260927030000_commercial_campaigns_batches_attribution_outcomes.sql)
 *   2. a duplicate company_name/contact_channel already present in the same
 *      campaign
 *   3. a contact within the recent-contact window (default 30 days,
 *      confirmed against the most recent 'contacted' stage-history entry --
 *      see RECENT_CONTACT_WINDOW_DAYS below for why 30 was chosen)
 *   4. an existing prospect (any campaign) for the same company/contact
 *      that is not yet in a terminal funnel stage (won/lost/not_fit)
 */

/** Default lookback window for the "already contacted recently" check.
 *  30 days is a sane default for B2B outbound cadences (long enough that a
 *  prospect isn't re-hit mid-sequence, short enough that a stale run months
 *  later doesn't permanently block re-engagement) -- not sourced from any
 *  existing config in this codebase, so callers may override it.
 */
export const DEFAULT_RECENT_CONTACT_WINDOW_DAYS = 30;

export type SuppressionReasonCode =
  | 'unsubscribed'
  | 'hard_bounced'
  | 'do_not_contact'
  | 'duplicate_in_campaign'
  | 'recent_contact'
  | 'active_opportunity';

export type SuppressionResult =
  | { suppressed: false }
  | { suppressed: true; reasonCode: SuppressionReasonCode };

/** Matches public.commercial_prospects' suppression_status CHECK values. */
export type ProspectSuppressionStatus =
  | 'active'
  | 'unsubscribed'
  | 'hard_bounced'
  | 'do_not_contact';

export interface SuppressionProspect {
  id: string;
  company_name: string;
  contact_channel: string | null;
  suppression_status: ProspectSuppressionStatus;
}

/** A minimal identity for another prospect row, used for dedupe/opportunity
 *  matching -- callers fetch these with a narrow SELECT, never a full row.
 */
export interface OtherProspectIdentity {
  id: string;
  company_name: string;
  contact_channel: string | null;
  /** Present only for the "existing active opportunity" check. */
  stage?: string;
}

export interface SuppressionContext {
  /** Other prospects already in the SAME campaign (excluding this one). */
  campaignSiblingProspects: OtherProspectIdentity[];
  /** Any other prospect (any campaign, excluding this one) not yet in a
   *  terminal funnel stage, for the active-opportunity check. */
  activeOpportunityProspects: OtherProspectIdentity[];
  /** ISO timestamp of the most recent 'contacted' stage-history transition
   *  for THIS prospect, or null if it has never been contacted. */
  lastContactedAt: string | null;
  /** Defaults to DEFAULT_RECENT_CONTACT_WINDOW_DAYS. */
  recentContactWindowDays?: number;
  /** Injection point for deterministic testing; defaults to `new Date()`. */
  now?: Date;
}

function normalizeIdentity(companyName: string, contactChannel: string | null): string {
  const company = companyName.trim().toLowerCase();
  const contact = (contactChannel ?? '').trim().toLowerCase();
  return `${company}::${contact}`;
}

function sameIdentity(
  a: { company_name: string; contact_channel: string | null },
  b: { company_name: string; contact_channel: string | null },
): boolean {
  // A shared, non-empty contact_channel is the strongest signal (e.g. the
  // same email address). Otherwise fall back to company_name alone, since
  // contact_channel is frequently null (see commercial_prospects schema).
  const aContact = (a.contact_channel ?? '').trim().toLowerCase();
  const bContact = (b.contact_channel ?? '').trim().toLowerCase();
  if (aContact && bContact) return aContact === bContact;
  return a.company_name.trim().toLowerCase() === b.company_name.trim().toLowerCase();
}

const TERMINAL_STAGES = new Set(['won', 'lost', 'not_fit']);

/**
 * Deterministic, side-effect-free suppression check. Never calls an LLM and
 * never guesses -- every branch is a plain boolean/date comparison over the
 * inputs given.
 */
export function checkSuppression(
  prospect: SuppressionProspect,
  context: SuppressionContext,
): SuppressionResult {
  if (prospect.suppression_status !== 'active') {
    return { suppressed: true, reasonCode: prospect.suppression_status };
  }

  const selfIdentity = { company_name: prospect.company_name, contact_channel: prospect.contact_channel };

  const isDuplicateInCampaign = context.campaignSiblingProspects.some(
    (other) => other.id !== prospect.id && sameIdentity(selfIdentity, other),
  );
  if (isDuplicateInCampaign) {
    return { suppressed: true, reasonCode: 'duplicate_in_campaign' };
  }

  if (context.lastContactedAt) {
    const windowDays = context.recentContactWindowDays ?? DEFAULT_RECENT_CONTACT_WINDOW_DAYS;
    const now = context.now ?? new Date();
    const lastContacted = new Date(context.lastContactedAt);
    const msSinceContact = now.getTime() - lastContacted.getTime();
    const windowMs = windowDays * 24 * 60 * 60 * 1000;
    if (msSinceContact >= 0 && msSinceContact < windowMs) {
      return { suppressed: true, reasonCode: 'recent_contact' };
    }
  }

  const hasActiveOpportunity = context.activeOpportunityProspects.some(
    (other) =>
      other.id !== prospect.id &&
      sameIdentity(selfIdentity, other) &&
      !(other.stage !== undefined && TERMINAL_STAGES.has(other.stage)),
  );
  if (hasActiveOpportunity) {
    return { suppressed: true, reasonCode: 'active_opportunity' };
  }

  return { suppressed: false };
}

/** Exported for reuse by callers that need the same normalization the
 *  dedupe check uses (e.g. to pre-filter a query). Not used internally
 *  above (sameIdentity is used directly) -- kept for symmetry/testability.
 */
export function identityKey(companyName: string, contactChannel: string | null): string {
  return normalizeIdentity(companyName, contactChannel);
}
