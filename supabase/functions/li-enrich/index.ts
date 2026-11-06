// AIWMC Quantis — published email finder for LinkedIn leads (admin-only)
// ---------------------------------------------------------------------------
// Finds an email address that a firm publishes on its OWN website and attaches
// it to a LinkedIn Growth lead, so the existing first-touch email path (the
// business-mail sender reads the recipient out of contact_channel) can use it.
// The compliant rebuild of Traxy's enrichment step:
//   - reads only the firm's own website: robots.txt first, then at most the
//     five candidatePaths, same site only. Never LinkedIn or another social
//     network (hostProblem() refuses them), never a third-party finder API.
//   - never constructs or guesses an address (no first.last@ patterns) and
//     never decodes addresses hidden by Cloudflare email protection.
//   - sends nothing: attaching an address drafts, approves and queues no
//     email. Caps, ramp, the outreach switch and the sender are untouched.
//
// Actions (POST JSON):
//   { action: 'scan', prospect_id, website }
//       -> { candidates: [{ email, kind, source_url }] } on the site's own
//          domain. Read-only: nothing is stored.
//   { action: 'attach', prospect_id, email, source_url, website }
//       -> re-fetches source_url, confirms the exact address is still on it,
//          checks the domain has MX records, then stores it on the prospect:
//          contact_channel "email:<address> <previous value>" (the LinkedIn
//          URL stays), website, an evidence entry appended to
//          supporting_evidence, and li_engagement_targets.has_verified_email.
//
// SSRF: public hostnames only (no IP literals, localhost or internal names,
// and the resolved A/AAAA addresses must be public too), ports 80/443 only,
// redirect: 'manual' with at most 2 same-site hops, 8 s per request, 1.5 MB
// per body.
//
// Auth: same as li-growth-draft: Bearer token -> auth.getUser() -> user_roles
// admin. Writes use the service role, so this check is the gate.
// ---------------------------------------------------------------------------
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { corsHeadersFor } from '../_shared/cors.ts';
import { maybeHealthResponse } from '../_shared/health.ts';
import {
  PUBLISHED_EMAIL_METHOD,
  appendEmailEvidence,
  candidatePaths,
  checkSameSiteUrl,
  classifyEmail,
  emailDomain,
  extractEmails,
  hasProtectedEmails,
  hostProblem,
  isEmailShape,
  isPublicIp,
  normalizeWebsite,
  publishedSiteEmails,
  robotsAllows,
  sameSite,
  withEmailChannel,
  type EmailKind,
} from '../_shared/commercial/published-email.ts';

const FUNCTION_NAME = 'li-enrich';
const FUNCTION_VERSION = '1.0.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const USER_AGENT = 'AIWMC Quantis enrichment (hello@aiwmcquantis.com)';
const FETCH_TIMEOUT_MS = 8_000;
const MAX_BODY_BYTES = 1.5 * 1024 * 1024;
const MAX_REDIRECTS = 2;
const SCAN_BUDGET_MS = 50_000; // robots.txt + 5 pages, well inside the edge wall clock
const ATTACH_BUDGET_MS = 25_000;
const RATE_LIMIT = { windowMinutes: 5, maxRequests: 30 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// deno-lint-ignore no-explicit-any
type Svc = SupabaseClient<any, 'public', any>;

interface Target {
  prospect_id: string;
  commercial_prospects: {
    contact_name: string | null;
    contact_channel: string | null;
    suppression_status: string;
    supporting_evidence: unknown;
  } | null;
}

interface Site {
  origin: string;
  host: string;
}

interface Ctx {
  site: Site;
  deadline: number;
  hosts: Map<string, string | null>; // host -> problem (null = public), checked once per request
}

type Fetched = { ok: true; url: string; body: string } | { ok: false; status?: number; reason: string };

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
  });
}

async function loadTarget(svc: Svc, prospectId: string): Promise<Target | null> {
  const { data } = await svc
    .from('li_engagement_targets')
    .select('prospect_id, commercial_prospects(contact_name, contact_channel, suppression_status, supporting_evidence)')
    .eq('prospect_id', prospectId)
    .maybeSingle();
  return (data ?? null) as Target | null;
}

// ─── DNS ────────────────────────────────────────────────────────────────────

async function resolveAddresses(host: string): Promise<string[]> {
  const out: string[] = [];
  for (const type of ['A', 'AAAA'] as const) {
    try {
      out.push(...(await Deno.resolveDns(host, type)));
    } catch (e) {
      if (!(e instanceof Deno.errors.NotFound)) throw e;
    }
  }
  return out;
}

/** MX hosts for a mail domain; a null MX ("0 .", RFC 7505) counts as none. */
async function resolveMx(domain: string): Promise<string[]> {
  try {
    const records = await Deno.resolveDns(domain, 'MX');
    return records.map((r) => r.exchange.replace(/\.$/, '')).filter(Boolean);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return [];
    throw e;
  }
}

/** hostProblem() plus DNS: a public name that points at a private address is refused. */
async function publicHostProblem(ctx: Ctx, host: string): Promise<string | null> {
  if (ctx.hosts.has(host)) return ctx.hosts.get(host) ?? null;
  let problem = hostProblem(host);
  if (!problem) {
    try {
      const ips = await resolveAddresses(host);
      if (ips.length === 0) problem = 'The site has no address in DNS';
      else if (ips.some((ip) => !isPublicIp(ip))) problem = 'The site points at a private network address';
    } catch {
      problem = 'DNS lookup failed for the site';
    }
  }
  ctx.hosts.set(host, problem);
  return problem;
}

// ─── Fetching ───────────────────────────────────────────────────────────────

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BODY_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    const take = value.subarray(0, Math.min(value.byteLength, MAX_BODY_BYTES - size));
    chunks.push(take);
    size += take.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  const buf = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    buf.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(buf);
}

/**
 * One page of the firm's site, following at most MAX_REDIRECTS same-site
 * redirects by hand. robots.txt is read whatever its content type (single-page
 * sites often answer it with their HTML shell); pages must be HTML or text.
 */
async function fetchSameSite(ctx: Ctx, start: URL, anyType = false): Promise<Fetched> {
  let url = start;
  for (let hop = 0; ; hop++) {
    const checked = checkSameSiteUrl(url.href, ctx.site.host);
    if (!checked.ok) return { ok: false, reason: checked.reason };
    url = checked.url;
    const problem = await publicHostProblem(ctx, url.hostname);
    if (problem) return { ok: false, reason: problem };
    const left = ctx.deadline - Date.now();
    if (left < 1_000) return { ok: false, reason: 'Time budget used up' };

    let res: Response;
    try {
      res = await fetch(url.href, {
        redirect: 'manual',
        signal: AbortSignal.timeout(Math.min(FETCH_TIMEOUT_MS, left)),
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,text/plain;q=0.8' },
      });
    } catch (e) {
      const timedOut = e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError');
      return { ok: false, reason: timedOut ? 'Timed out' : 'Could not connect' };
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      await res.body?.cancel();
      if (!location) return { ok: false, status: res.status, reason: `Redirect without a location (HTTP ${res.status})` };
      if (hop >= MAX_REDIRECTS) return { ok: false, status: res.status, reason: 'Too many redirects' };
      const next = checkSameSiteUrl(location, ctx.site.host, url.href);
      if (!next.ok) return { ok: false, status: res.status, reason: `Redirect refused: ${next.reason}` };
      url = next.url;
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { ok: false, status: res.status, reason: `HTTP ${res.status}` };
    }
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!anyType && type && !/^(text\/(html|plain)|application\/xhtml\+xml)$/.test(type)) {
      await res.body?.cancel();
      return { ok: false, status: res.status, reason: `Not a web page (${type})` };
    }
    return { ok: true, url: url.href, body: await readCapped(res) };
  }
}

/**
 * robots.txt per RFC 9309: a 4xx means there is none (everything allowed);
 * a 5xx, a network error or a redirect we may not follow means we do not
 * know what is allowed, so nothing is read.
 */
async function loadRobots(ctx: Ctx): Promise<{ ok: true; text: string } | { ok: false; reason: string }> {
  const res = await fetchSameSite(ctx, new URL('/robots.txt', ctx.site.origin), true);
  if (res.ok) return { ok: true, text: res.body };
  if (res.status && res.status >= 400 && res.status < 500) return { ok: true, text: '' };
  return { ok: false, reason: `robots.txt could not be read (${res.reason}), so Quantis reads nothing on this site` };
}

function newCtx(site: Site, budgetMs: number): Ctx {
  return { site, deadline: Date.now() + budgetMs, hosts: new Map() };
}

// ─── Actions ────────────────────────────────────────────────────────────────

async function scan(req: Request, svc: Svc, body: Record<string, unknown>): Promise<Response> {
  const prospectId = String(body.prospect_id ?? '');
  if (!UUID.test(prospectId)) return json(req, { error: 'prospect_id is required' }, 400);
  const site = normalizeWebsite(String(body.website ?? ''));
  if (!site.ok) return json(req, { error: site.reason }, 400);

  const target = await loadTarget(svc, prospectId);
  if (!target) return json(req, { error: 'Not a LinkedIn target' }, 404);
  const p = target.commercial_prospects;
  if (p?.suppression_status !== 'active') return json(req, { error: 'Prospect is do-not-contact' }, 409);

  const ctx = newCtx(site, SCAN_BUDGET_MS);
  const robots = await loadRobots(ctx);
  if (!robots.ok) return json(req, { error: robots.reason }, 502);

  const candidates: Array<{ email: string; kind: EmailKind; source_url: string }> = [];
  const pages: Array<{ path: string; result: string }> = [];
  const seenUrls = new Set<string>();
  let protectedHidden = false;
  for (const path of candidatePaths) {
    if (!robotsAllows(robots.text, path)) {
      pages.push({ path, result: 'robots.txt disallows' });
      continue;
    }
    const page = await fetchSameSite(ctx, new URL(path, site.origin));
    if (!page.ok) {
      pages.push({ path, result: page.reason });
      continue;
    }
    if (seenUrls.has(page.url)) {
      pages.push({ path, result: 'same page as above' });
      continue;
    }
    seenUrls.add(page.url);
    pages.push({ path, result: 'read' });
    protectedHidden ||= hasProtectedEmails(page.body);
    for (const email of publishedSiteEmails(page.body, site.host)) {
      if (candidates.some((c) => c.email === email)) continue;
      candidates.push({ email, kind: classifyEmail(email.split('@')[0], p?.contact_name ?? null), source_url: page.url });
    }
  }
  return json(req, { success: true, website: site.origin, candidates, pages, protected_hidden: protectedHidden });
}

async function attach(req: Request, svc: Svc, body: Record<string, unknown>): Promise<Response> {
  const prospectId = String(body.prospect_id ?? '');
  if (!UUID.test(prospectId)) return json(req, { error: 'prospect_id is required' }, 400);
  const site = normalizeWebsite(String(body.website ?? ''));
  if (!site.ok) return json(req, { error: site.reason }, 400);
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!isEmailShape(email)) return json(req, { error: 'email is required' }, 400);
  const domain = emailDomain(email);
  if (!sameSite(domain, site.host)) return json(req, { error: 'That address is not on the firm\'s own domain' }, 422);
  const source = checkSameSiteUrl(String(body.source_url ?? ''), site.host);
  if (!source.ok) return json(req, { error: `source_url: ${source.reason}` }, 400);

  const target = await loadTarget(svc, prospectId);
  if (!target) return json(req, { error: 'Not a LinkedIn target' }, 404);
  const p = target.commercial_prospects;
  if (!p || p.suppression_status !== 'active') return json(req, { error: 'Prospect is do-not-contact' }, 409);
  const { data: sup } = await svc.from('email_suppressions').select('reason').eq('email', email).maybeSingle();
  if (sup) return json(req, { error: `That address is suppressed (${(sup as { reason: string }).reason})` }, 409);
  const channel = withEmailChannel(p.contact_channel, email);
  if (!channel.ok) return json(req, { error: `This prospect already has ${channel.existing}. Quantis does not overwrite an address.` }, 409);

  // Re-read the page now: the address must still be published there.
  const ctx = newCtx(site, ATTACH_BUDGET_MS);
  const robots = await loadRobots(ctx);
  if (!robots.ok) return json(req, { error: robots.reason }, 502);
  if (!robotsAllows(robots.text, `${source.url.pathname}${source.url.search}`)) {
    return json(req, { error: 'robots.txt does not allow reading that page' }, 409);
  }
  const page = await fetchSameSite(ctx, source.url);
  if (!page.ok) return json(req, { error: `Could not re-read the source page: ${page.reason}` }, 502);
  if (!extractEmails(page.body).includes(email)) return json(req, { error: 'That address is no longer on the source page' }, 422);

  let mx: string[];
  try {
    mx = await resolveMx(domain);
  } catch {
    return json(req, { error: `MX lookup failed for ${domain}. Try again later.` }, 502);
  }
  if (mx.length === 0) return json(req, { error: `${domain} has no MX records, so it does not receive email` }, 422);

  const kind = classifyEmail(email.split('@')[0], p.contact_name);
  const now = new Date().toISOString();
  const evidence = { email, email_source_url: page.url, email_kind: kind, found_at: now, method: PUBLISHED_EMAIL_METHOD } as const;
  const { data: saved, error } = await svc
    .from('commercial_prospects')
    .update({
      contact_channel: channel.channel,
      website: site.origin,
      supporting_evidence: appendEmailEvidence(p.supporting_evidence, evidence),
      updated_at: now,
    })
    .eq('id', prospectId)
    .eq('suppression_status', 'active')
    .select('id, contact_channel, website')
    .maybeSingle();
  if (error) return json(req, { error: `Could not save the address: ${error.message}` }, 500);
  if (!saved) return json(req, { error: 'Prospect is do-not-contact' }, 409);

  const { error: flagErr } = await svc
    .from('li_engagement_targets')
    .update({ has_verified_email: true, updated_at: now })
    .eq('prospect_id', prospectId);
  if (flagErr) return json(req, { error: `Saved the address but could not mark it verified: ${flagErr.message}` }, 500);

  return json(req, {
    success: true,
    email,
    email_kind: kind,
    source_url: page.url,
    website: site.origin,
    contact_channel: (saved as { contact_channel: string }).contact_channel,
  });
}

Deno.serve(async (req) => {
  const health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (health) return health;
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(req) });
  if (req.method !== 'POST') return json(req, { error: 'POST only' }, 405);

  try {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return json(req, { error: 'Unauthorized' }, 401);
    const svc: Svc = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes } = await svc.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return json(req, { error: 'Unauthorized' }, 401);
    const { data: roleRows } = await svc.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin');
    if (!roleRows || roleRows.length === 0) return json(req, { error: 'Admin only' }, 403);

    try {
      const { data: rl, error: rlErr } = await svc.rpc('check_rate_limit', {
        p_user_id: user.id,
        p_endpoint: FUNCTION_NAME,
        p_window_minutes: RATE_LIMIT.windowMinutes,
        p_max_requests: RATE_LIMIT.maxRequests,
      });
      if (!rlErr && rl && !(rl as { allowed?: boolean }).allowed) {
        return json(req, { error: 'Too many requests. Wait a few minutes.', code: 'RATE_LIMIT_EXCEEDED' }, 429);
      }
    } catch (e) {
      console.warn(`[${FUNCTION_NAME}] rate limit check failed, failing open:`, e);
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? '');
    if (action === 'scan') return await scan(req, svc, body);
    if (action === 'attach') return await attach(req, svc, body);
    return json(req, { error: `Unknown action ${action}` }, 400);
  } catch (e) {
    // No addresses or page text in logs: contact data is sensitive.
    console.error(`[${FUNCTION_NAME}] failed:`, e instanceof Error ? `${e.name}: ${e.message}` : 'unknown error');
    return json(req, { error: 'Internal error' }, 500);
  }
});
