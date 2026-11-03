/**
 * LinkedIn Growth Agent: fit score rubric v1 (pure, deterministic).
 *
 * Source: LinkedIn Growth Agent PRD 2026-11-03, section 3.4. Five dimensions
 * (role 30, business 20, decision trigger 25, warmth 15, reachability 10) and
 * hard disqualifiers that force the score to 0. Every dimension records its
 * evidence and whether it was observed (stated in the data) or inferred.
 *
 * No LLM is involved: persona comes from keyword rules on the title/headline.
 */

export const FIT_VERSION = 'li-fit-v2';

export type Persona = 'fractional_cfo' | 'fpa_consultant' | 'advisory_cpa' | 'owner_operator' | 'other';
export type BusinessType = 'service' | 'cfo_practice' | 'saas' | 'enterprise' | 'ecommerce' | 'other';
export type Warmth = 'engaged_my_post' | 'replied_my_comment' | 'watchlist_comment' | 'mutual_connection' | 'cold';
export type SignalType =
  | 'their_post'
  | 'their_comment'
  | 'engaged_my_post'
  | 'job_posting'
  | 'hiring_event'
  | 'new_location'
  | 'role_change'
  | 'funding'
  | 'other';
export type FitTier = 'dm' | 'comment' | 'none';

export const BUSINESS_TYPES: BusinessType[] = ['service', 'cfo_practice', 'saas', 'enterprise', 'ecommerce', 'other'];
export const WARMTH_POINTS: Record<Warmth, number> = {
  engaged_my_post: 15,
  replied_my_comment: 10,
  watchlist_comment: 8,
  mutual_connection: 5,
  cold: 0,
};
export const SIGNAL_TYPES: SignalType[] = [
  'their_post', 'their_comment', 'engaged_my_post', 'job_posting', 'hiring_event', 'new_location', 'role_change', 'funding', 'other',
];

export interface FitSignal {
  signal_type: SignalType;
  excerpt: string | null;
  observed_at: string;
}

export interface FitInput {
  name: string | null;
  headline: string | null;
  company: string | null;
  linkedin_url: string | null;
  contact_channel?: string | null;
  country: string | null;
  business_type: BusinessType | null;
  employees: number | null;
  warmth: Warmth | null;
  connection_degree: number | null;
  posts_weekly: boolean;
  has_verified_email: boolean;
  /** commercial_prospects.suppression_status !== 'active' */
  do_not_contact: boolean;
  signals: FitSignal[];
}

export interface FitDimension {
  points: number;
  max: number;
  evidence: string;
  state: 'observed' | 'inferred' | 'none';
}

export interface FitBreakdown {
  role: FitDimension;
  business: FitDimension;
  trigger: FitDimension;
  warmth: FitDimension;
  reachability: FitDimension;
}

export interface FitResult {
  score: number;
  tier: FitTier;
  persona: Persona;
  disqualified: string | null;
  breakdown: FitBreakdown;
  version: string;
}

export interface FitThresholds {
  dm: number;
  comment: number;
}

export const DEFAULT_THRESHOLDS: FitThresholds = { dm: 70, comment: 50 };

const INTERNAL = /jeltov|beltov|aiwmc|jjbalaganvasya/i;

const EXCLUDED_ROLES: Array<[RegExp, string]> = [
  [/\brecruit(er|ers|ing|ment)\b|\btalent acquisition\b|\bheadhunter\b|\bstaffing\b/i, 'recruiter'],
  [/\bghost ?writ/i, 'ghostwriter'],
  [
    /\b(lead[- ]?gen(eration)?|outbound|appointment[- ]setting|growth|marketing|linkedin|sales) agency\b|\bhelp(ing|s)? (founders|coaches|agencies|consultants) (get|grow|scale|land|book)\b/i,
    'agency selling to founders',
  ],
  [/\bcoach(es|ing)?\b/i, 'coach'],
  [/\bstudent\b|\bmba candidate\b|\bintern(ship)?\b/i, 'student'],
  [/\bopen to work\b|\bjob seeker\b|\bseeking (new )?(opportunit|role|position)|\blooking for (a |my next )?(new )?(role|job|position|opportunit)/i, 'job seeker'],
  [/\binvestor\b|\bventure capital\b|\bventure partner\b|\b(vc|angel)\b/i, 'investor'],
  [
    /\b(fp&a|fpa|forecasting|budgeting|cash ?flow|financial planning) (software|platform|tool|saas|app)\b|\b(jirav|datarails|planful|finmark|liveplan|abacum|dryrun)\b/i,
    'vendor of competing finance software',
  ],
];

const ROLE = {
  cfo: /\b(fractional|outsourced|virtual|part[- ]time|interim)\s+(cfo|chief financial officer|finance director)\b|\bcfo services\b/i,
  fpa: /\bfp\s?&\s?a\b|\bfpa\b|\bfinancial planning (and|&) analysis\b|\b(advisory|finance|financial|cfo) (consultant|advisor|adviser)\b|\bfinancial model(l)?er\b/i,
  cpa: /\bcpa\b|\bchartered (professional )?accountant\b/i,
  advisory: /\badvis(ory|or|er)\b|\bforecast|\bscenario|\bcfo\b/i,
  founderOnly: /\b(co-?)?founder\b/i,
  owner: /\b(owner|co-owner|president|ceo|general manager|gm|coo|chief operating officer|managing (partner|director))\b/i,
  bookkeeper: /\bbookkeep|\baccountant\b|\baccounting\b/i,
  finance: /\b(finance|financial|controller|treasurer|accounts (payable|receivable)|cfo)\b/i,
};

/** A post this recent is still worth a comment (LinkedIn comment reach drops after ~3 days). */
export const FRESH_POST_DAYS = 3;
export const FRESH_POST_POINTS = 15;
/** A fresh post only counts when it is about money or running a business ("Happy Friday" does not). */
export const BUSINESS_TOPIC =
  /\b(cash|costs?|costing|margins?|financ(e|es|ing|ial)|inventory|revenue|profits?|profitability|pric(e|es|ing)|clients?|customers?|tax(es)?|fund(s|ing|raising)?|debt|loans?|capital|valuation|working capital|expenses?|cfo|forecast|budget|payables|receivables|growth|owners?|deals?|acquisitions?|p&l|balance sheet|ebitda|business(es)?|money|bookkeeping|books|labor|sales)\b/i;

/** Post text about a decision Quantis models (PRD 3.4, decision trigger 25). */
export const TRIGGER_WORDS =
  /\b(hir(e|es|ed|ing)|new hire|headcount|first employee|raise (our |my )?prices|price (increase|change|hike|rise)|pricing|new location|second location|expan(d|ding|sion)|new (office|shop|clinic|branch)|contract|lease|cash (crunch|flow|squeeze|position|low)|runway|payroll|forecast(s|ing)?|scenario(s)?|13[- ]week|afford|break[- ]?even|budget(s|ing)?)\b/i;

const COUNTRY_ALIASES: Record<string, 'US' | 'CA'> = {
  us: 'US', usa: 'US', 'u.s.': 'US', 'u.s.a.': 'US', 'united states': 'US', 'united states of america': 'US', america: 'US',
  ca: 'CA', can: 'CA', canada: 'CA',
};

export function normalizeCountry(country: string | null | undefined): 'US' | 'CA' | null {
  if (!country) return null;
  return COUNTRY_ALIASES[country.trim().toLowerCase()] ?? null;
}

function dim(points: number, max: number, evidence: string, state: FitDimension['state']): FitDimension {
  return { points, max, evidence, state };
}

function daysAgo(iso: string, now: Date): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return Infinity;
  return (now.getTime() - t) / 86_400_000;
}

function isServiceType(t: BusinessType | null): boolean {
  return t === 'service' || t === 'cfo_practice';
}

export function classifyRole(headline: string | null, businessType: BusinessType | null): { persona: Persona; dim: FitDimension } {
  const h = (headline ?? '').trim();
  if (!h) return { persona: 'other', dim: dim(0, 30, 'no title or headline', 'none') };
  const hit = (re: RegExp) => h.match(re)?.[0] ?? null;

  const cfo = hit(ROLE.cfo);
  if (cfo) return { persona: 'fractional_cfo', dim: dim(30, 30, `title says "${cfo}"`, 'observed') };
  const fpa = hit(ROLE.fpa);
  if (fpa) return { persona: 'fpa_consultant', dim: dim(30, 30, `title says "${fpa}"`, 'observed') };
  const cpa = hit(ROLE.cpa);
  const advisory = hit(ROLE.advisory);
  if (cpa && advisory) {
    return { persona: 'advisory_cpa', dim: dim(30, 30, `title says "${cpa}" and "${advisory}"`, 'observed') };
  }
  // Owner/GM/COO earn 25 only "of a service business" (rubric): with the
  // business type unset there is no evidence yet, same as a generic Founder.
  const owner = hit(ROLE.owner) ?? hit(ROLE.founderOnly);
  if (owner) {
    if (isServiceType(businessType)) {
      const of = businessType === 'cfo_practice' ? 'a CFO practice' : 'a service business';
      return { persona: 'owner_operator', dim: dim(25, 30, `"${owner}" of ${of}`, 'observed') };
    }
    if (businessType === null) return { persona: 'owner_operator', dim: dim(0, 30, `"${owner}" with no service-business evidence yet`, 'none') };
    return { persona: 'other', dim: dim(0, 30, `"${owner}" of a ${businessType} business`, 'observed') };
  }
  const book = cpa ?? hit(ROLE.bookkeeper);
  if (book) return { persona: 'other', dim: dim(15, 30, `"${book}"; advisory work not confirmed`, 'inferred') };
  const fin = hit(ROLE.finance);
  if (fin) return { persona: 'other', dim: dim(5, 30, `other finance title ("${fin}")`, 'observed') };
  return { persona: 'other', dim: dim(0, 30, 'title does not match an ICP role', 'observed') };
}

function businessDim(type: BusinessType | null, employees: number | null): FitDimension {
  if (!type) return dim(0, 20, 'business type unknown', 'none');
  if (!isServiceType(type)) return dim(0, 20, `${type} is not a service business`, 'observed');
  const label = type === 'cfo_practice' ? 'CFO practice' : 'service business';
  if (employees === null || employees === undefined) return dim(10, 20, `${label}, size unknown`, 'observed');
  if (employees >= 5 && employees <= 100) return dim(20, 20, `${label}, ${employees} employees`, 'observed');
  return dim(0, 20, `${label}, ${employees} employees is outside 5 to 100`, 'observed');
}

function triggerDim(signals: FitSignal[], now: Date): FitDimension {
  let best = dim(0, 25, 'no decision trigger in the last 30 days', 'none');
  for (const s of signals) {
    const age = daysAgo(s.observed_at, now);
    if (!(age <= 30)) continue;
    const ageLabel = `${Math.max(0, Math.floor(age))}d ago`;
    let cand: FitDimension | null = null;
    if (s.signal_type === 'their_post' || s.signal_type === 'their_comment' || s.signal_type === 'engaged_my_post') {
      const m = (s.excerpt ?? '').match(TRIGGER_WORDS);
      const what = s.signal_type === 'their_post' ? 'post' : 'comment';
      if (m) cand = dim(25, 25, `"${m[0]}" in their ${what} (${ageLabel})`, 'observed');
      // v2 (2026-11-03): a fresh post on another topic is still something to
      // comment on. It earns enough for a comment card with a strong role, not
      // for a DM: "Whiskey aging carrying costs" from a fractional CFO scored 40.
      else if (age <= FRESH_POST_DAYS && s.signal_type !== 'engaged_my_post' && BUSINESS_TOPIC.test(s.excerpt ?? '')) {
        cand = dim(FRESH_POST_POINTS, 25, `fresh ${what} to comment on (${ageLabel})`, 'observed');
      }
    } else if (s.signal_type === 'job_posting' || s.signal_type === 'hiring_event' || s.signal_type === 'new_location' || s.signal_type === 'funding') {
      cand = dim(20, 25, `${s.signal_type.replace('_', ' ')} (${ageLabel})`, 'observed');
    } else if (s.signal_type === 'role_change') {
      cand = dim(10, 25, `role change (${ageLabel})`, 'observed');
    }
    if (cand && cand.points > best.points) best = cand;
  }
  return best;
}

function warmthDim(warmth: Warmth | null, signals: FitSignal[]): FitDimension {
  const engaged = signals.some((s) => s.signal_type === 'engaged_my_post');
  const set = warmth ?? 'cold';
  if (engaged && WARMTH_POINTS.engaged_my_post > WARMTH_POINTS[set]) {
    return dim(15, 15, 'engaged with a founder post (signal)', 'observed');
  }
  if (set === 'cold') return dim(0, 15, 'cold', 'none');
  return dim(WARMTH_POINTS[set], 15, set.replace(/_/g, ' '), 'observed');
}

function reachDim(degree: number | null, postsWeekly: boolean, email: boolean): FitDimension {
  if (degree === 1) return dim(10, 10, '1st-degree connection', 'observed');
  if (degree === 2 && postsWeekly) return dim(6, 10, '2nd-degree and posts or comments weekly', 'observed');
  if (email) return dim(4, 10, 'verified business email only', 'observed');
  return dim(0, 10, degree ? `${degree}${degree === 2 ? 'nd' : 'rd'}-degree, not active weekly` : 'degree unknown', 'none');
}

export function disqualifier(input: FitInput): string | null {
  const ids = [input.name, input.linkedin_url, input.contact_channel, input.company].filter(Boolean).join(' ');
  if (INTERNAL.test(ids)) return 'internal account';
  if (input.do_not_contact) return 'do not contact';
  if (!normalizeCountry(input.country)) return input.country ? `outside the US or Canada (${input.country})` : 'country unknown';
  const company = (input.company ?? '').trim();
  if (!company || /^(unknown|n\/a|none|-)$/i.test(company)) return 'company unknown';
  const headline = input.headline ?? '';
  for (const [re, label] of EXCLUDED_ROLES) {
    if (re.test(headline)) return `excluded role: ${label}`;
  }
  return null;
}

export function tierFor(score: number, thresholds: FitThresholds = DEFAULT_THRESHOLDS): FitTier {
  if (score >= thresholds.dm) return 'dm';
  if (score >= thresholds.comment) return 'comment';
  return 'none';
}

export function scoreFit(input: FitInput, now: Date = new Date(), thresholds: FitThresholds = DEFAULT_THRESHOLDS): FitResult {
  const role = classifyRole(input.headline, input.business_type);
  const breakdown: FitBreakdown = {
    role: role.dim,
    business: businessDim(input.business_type, input.employees),
    trigger: triggerDim(input.signals ?? [], now),
    warmth: warmthDim(input.warmth, input.signals ?? []),
    reachability: reachDim(input.connection_degree, input.posts_weekly, input.has_verified_email),
  };
  const dq = disqualifier(input);
  const raw = Object.values(breakdown).reduce((s, d) => s + d.points, 0);
  // A fresh post with no decision in it is a reason to comment, never to DM:
  // without this cap a 1st-degree fractional CFO reached 75 on one post.
  const freshOnly = breakdown.trigger.points === FRESH_POST_POINTS && breakdown.trigger.evidence.startsWith('fresh ');
  const capped = freshOnly ? Math.min(raw, thresholds.dm - 1) : raw;
  const score = dq ? 0 : Math.max(0, Math.min(100, capped));
  return { score, tier: dq ? 'none' : tierFor(score, thresholds), persona: role.persona, disqualified: dq, breakdown, version: FIT_VERSION };
}
