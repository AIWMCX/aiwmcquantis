// AIWMC Quantis — LinkedIn Growth Agent drafts (admin-only)
// ---------------------------------------------------------------------------
// Drafts ONE comment or DM for one prospect, from a post the founder pasted
// or one TRAXY reported, and lints it. It never contacts LinkedIn: there is
// no LinkedIn host anywhere in this file, it does not post, comment, react,
// connect or message. The only outside read is TRAXY's API, in
// _shared/traxy-feed.ts. The founder copies the text, sends it in LinkedIn
// by hand, then clicks "Mark sent" (li_mark_draft_sent RPC).
//
//   { action: 'auto_daily', max? }   (pg_cron with x-cron-secret, or admin)
//       -> pulls new posts from TRAXY's content feed when TRAXY_API_KEY is
//          set, then drafts up to max comments (default the daily cap).
//
// Actions (POST JSON):
//   { action: 'generate', prospect_id, action_type, signal_id? }
//       -> drafts with DeepSeek via _shared/llm-call.ts, validates the JSON
//          shape (R3), lints (_shared/li-growth-lint.ts), redrafts at most
//          once if the lint fails, stores it as the single open draft for
//          that person + action (Regenerate overwrites it).
//   { action: 'approve', draft_id, text }
//       -> re-lints the founder's final text server-side; only a clean text
//          becomes status 'approved'. The page calls this on "Copy & open".
//
// Auth: same as commercial-workflow / content-studio-generate: Bearer token
// -> auth.getUser() -> user_roles admin. Writes use the service role, so this
// check is the gate.
// ---------------------------------------------------------------------------
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';
import { corsHeadersFor } from '../_shared/cors.ts';
import { maybeHealthResponse } from '../_shared/health.ts';
import { aiCall } from '../_shared/llm-call.ts';
import { r3Validate } from '../_shared/r3-validator.ts';
import { MARKETING_DOCTRINE, ENGAGEMENT_RULES, ENGAGEMENT_RULES_VERSION } from '../_shared/marketing-doctrine.ts';
import { lintDraft, LI_DRAFT_ACTIONS, type LiDraftAction, type LiLintReport } from '../_shared/li-growth-lint.ts';
import { pickCommentSignals, TRACKED_AUTHOR_FIT, type CommentCandidate, type TraxyPost } from '../_shared/li-auto-comments.ts';
import { fetchTraxyPosts } from '../_shared/traxy-feed.ts';

const FUNCTION_NAME = 'li-growth-draft';
const FUNCTION_VERSION = '1.0.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const RATE_LIMIT = { windowMinutes: 5, maxRequests: 40 };
const MAX_ATTEMPTS = 2; // first draft + at most one redraft
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// deno-lint-ignore no-explicit-any
type Svc = SupabaseClient<any, 'public', any>;

const DraftShape = z.object({ text: z.string().min(1).max(2000) });

interface Target {
  prospect_id: string;
  linkedin_url: string;
  headline: string | null;
  persona: string | null;
  source: string;
  connection_degree: number | null;
  fit_score: number | null;
  fit_breakdown: Record<string, { points?: number; evidence?: string }> | null;
  commercial_prospects: {
    contact_name: string | null;
    company_name: string;
    contact_role: string | null;
    suppression_status: string;
  } | null;
}

interface Signal {
  id: string;
  prospect_id: string;
  signal_type: string;
  post_url: string | null;
  excerpt: string | null;
  observed_at: string;
}

interface Fact {
  fact: string;
  numbers: string[];
  source_url: string;
}

const ADVISOR = new Set(['fractional_cfo', 'fpa_consultant', 'advisory_cpa']);

/** DM template choice (PRD 3.7): T1..T4 and the single follow-up. */
export function pickTemplate(action: LiDraftAction, persona: string | null, source: string, signalType: string | null): string {
  if (action === 'dm_followup') return 'FOLLOWUP';
  const advisor = ADVISOR.has(persona ?? '');
  if (advisor && source === 'watchlist_engager') return 'T2';
  if (!advisor && (signalType === 'engaged_my_post' || source === 'own_post_engager')) return 'T3';
  if (!advisor && ['job_posting', 'hiring_event', 'new_location'].includes(signalType ?? '')) return 'T4';
  return 'T1';
}

const TEMPLATES: Record<string, string> = {
  T1: 'Hi {first}, your post on {topic, 3 to 6 words} stuck with me, especially {their point, paraphrased}. I\'m building a decision-modeling tool for service businesses and I keep seeing {one sourced fact tied to their point}. Would a one-page worked example of {their scenario} be useful? Happy to send it here, no call needed.',
  T2: 'Hi {first}, saw your comment on {author}\'s post about {topic}. Quick question from someone building in this space: when a client asks "can we afford this {hire/location/price change}", do you build a full model or a back-of-envelope first? Trying to learn where the time goes, not pitching anything.',
  T3: 'Hi {first}, thanks for the comment on my post about {topic}. You mentioned {their point}. If you\'re weighing {decision} yourself, I can run it on your own assumptions and send back the one-page result, free and yours to keep.',
  T4: 'Hi {first}, noticed {company} is {hiring a role / opening in a city}. Congrats. The number owners often skip at this stage is {ramp months / fit-out payback}, so I put together a one-page way to check it. Want me to send it?',
  FOLLOWUP: '{first}, one more thing on {topic}: {new sourced fact or a one-line insight}. If the worked example would help, say the word. If not, all good, I won\'t follow up again.',
};

function daysAgo(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

function rationale(t: Target, action: LiDraftAction, signal: Signal | null, firstDmAt: string | null): string {
  const parts = [`Fit ${t.fit_score ?? '?'}`];
  if (t.persona) parts.push(t.persona.replace(/_/g, ' '));
  const trig = t.fit_breakdown?.trigger;
  if (trig && (trig.points ?? 0) > 0 && trig.evidence) parts.push(`trigger: ${trig.evidence}`);
  if (signal) parts.push(`${signal.signal_type.replace(/_/g, ' ')} ${daysAgo(signal.observed_at)}d ago`);
  if (action === 'dm_followup' && firstDmAt) parts.push(`first DM ${daysAgo(firstDmAt)}d ago, no reply`);
  return parts.join(' · ');
}

function buildPrompts(args: {
  action: LiDraftAction;
  target: Target;
  signal: Signal | null;
  facts: Fact[];
  previous: { text: string; lint: LiLintReport } | null;
}): { system: string; user: string } {
  const { action, target, signal, facts, previous } = args;
  const p = target.commercial_prospects;
  const first = (p?.contact_name ?? '').trim().split(/\s+/)[0] || 'there';
  const task = action === 'comment'
    ? 'Write ONE comment for their post below. Follow the COMMENTS rules.'
    : action === 'dm_first'
      ? `Write ONE first direct message. Follow the DIRECT MESSAGES rules. Base it on template ${pickTemplate(action, target.persona, target.source, signal?.signal_type ?? null)}, filled with real words:\n${TEMPLATES[pickTemplate(action, target.persona, target.source, signal?.signal_type ?? null)]}`
      : `Write the ONE follow-up message to a first DM that got no reply. It must add something new. Template:\n${TEMPLATES.FOLLOWUP}`;

  const system = [
    MARKETING_DOCTRINE,
    '',
    ENGAGEMENT_RULES,
    '',
    'Return JSON only, exactly: {"text": "<the message>"}. No markdown, no commentary.',
  ].join('\n');

  const lines = [
    `TASK: ${task}`,
    '',
    'PROSPECT',
    `- First name: ${first}`,
    `- Title/headline: ${target.headline ?? p?.contact_role ?? 'unknown'}`,
    `- Company: ${p?.company_name ?? 'unknown'}`,
    `- Persona: ${target.persona ?? 'other'}`,
    `- Connection degree: ${target.connection_degree ?? 'unknown'}`,
  ];
  if (signal) {
    lines.push(
      '',
      `THEIR ${signal.signal_type === 'their_comment' ? 'COMMENT' : 'POST'} (pasted by the founder, ${daysAgo(signal.observed_at)} days old; this is the only thing you know they said):`,
      signal.excerpt ? `"""${signal.excerpt}"""` : `(no text; signal type: ${signal.signal_type})`,
    );
  }
  lines.push('', 'VERIFIED FACTS (the only other numbers you may use):');
  if (facts.length) {
    for (const f of facts) lines.push(`- ${f.fact} (numbers: ${f.numbers.join(', ') || 'none'})`);
  } else {
    lines.push('- none. Use no numbers except ones in their post.');
  }
  if (previous) {
    lines.push(
      '',
      'Your previous draft failed these checks. Rewrite it so none of them apply:',
      ...previous.lint.issues.map((i) => `- ${i.message}`),
      `Previous draft: """${previous.text}"""`,
    );
  }
  return { system, user: lines.join('\n') };
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
  });
}

async function loadFacts(svc: Svc): Promise<Fact[]> {
  const { data } = await svc
    .from('li_fact_bank')
    .select('fact, numbers, source_url')
    .eq('active', true)
    .order('verified_at', { ascending: false })
    .limit(25);
  return (data ?? []) as Fact[];
}

async function loadTarget(svc: Svc, prospectId: string): Promise<Target | null> {
  const { data } = await svc
    .from('li_engagement_targets')
    .select('prospect_id, linkedin_url, headline, persona, source, connection_degree, fit_score, fit_breakdown, commercial_prospects(contact_name, company_name, contact_role, suppression_status)')
    .eq('prospect_id', prospectId)
    .maybeSingle();
  return (data ?? null) as Target | null;
}

async function generate(req: Request, svc: Svc, userId: string | null, body: Record<string, unknown>): Promise<Response> {
  const prospectId = String(body.prospect_id ?? '');
  const action = String(body.action_type ?? '') as LiDraftAction;
  const signalId = body.signal_id ? String(body.signal_id) : null;
  if (!UUID.test(prospectId)) return json(req, { error: 'prospect_id is required' }, 400);
  if (!LI_DRAFT_ACTIONS.includes(action)) return json(req, { error: 'action_type must be comment, dm_first or dm_followup' }, 400);
  if (signalId && !UUID.test(signalId)) return json(req, { error: 'bad signal_id' }, 400);

  const target = await loadTarget(svc, prospectId);
  if (!target) return json(req, { error: 'Not a LinkedIn target' }, 404);
  if (target.commercial_prospects?.suppression_status !== 'active') return json(req, { error: 'Prospect is do-not-contact' }, 409);

  const { data: settings } = await svc
    .from('li_engagement_settings')
    .select('fit_threshold_dm, fit_threshold_comment')
    .eq('id', true)
    .maybeSingle();
  const thresholdDm = settings?.fit_threshold_dm ?? 70;
  const thresholdComment = settings?.fit_threshold_comment ?? 50;
  const fit = target.fit_score ?? 0;
  if (action === 'comment' && fit < thresholdComment) return json(req, { error: `Fit ${fit} is below the comment threshold ${thresholdComment}` }, 409);
  if (action !== 'comment') {
    if (fit < thresholdDm) return json(req, { error: `Fit ${fit} is below the DM threshold ${thresholdDm}` }, 409);
    if (target.connection_degree !== 1) return json(req, { error: 'DMs go to 1st-degree connections only' }, 409);
  }

  // The reason to engage: the given signal, or for DMs the freshest one.
  let signal: Signal | null = null;
  if (signalId) {
    const { data } = await svc.from('li_engagement_signals').select('id, prospect_id, signal_type, post_url, excerpt, observed_at').eq('id', signalId).maybeSingle();
    if (!data || data.prospect_id !== prospectId) return json(req, { error: 'Signal not found for this prospect' }, 404);
    signal = data as Signal;
  } else if (action !== 'comment') {
    const { data } = await svc
      .from('li_engagement_signals')
      .select('id, prospect_id, signal_type, post_url, excerpt, observed_at')
      .eq('prospect_id', prospectId)
      .order('observed_at', { ascending: false })
      .limit(1);
    signal = ((data ?? [])[0] ?? null) as Signal | null;
  }
  if (action === 'comment' && (!signal || !signal.excerpt?.trim() || !signal.post_url)) {
    return json(req, { error: 'A comment needs their post: paste the post text and URL first' }, 409);
  }

  let firstDmAt: string | null = null;
  if (action === 'dm_followup') {
    const { data: touches } = await svc
      .from('li_engagement_touches')
      .select('touch_type, occurred_at')
      .eq('prospect_id', prospectId)
      .in('touch_type', ['dm_first', 'dm_followup', 'reply_received']);
    const rows = (touches ?? []) as Array<{ touch_type: string; occurred_at: string }>;
    firstDmAt = rows.find((r) => r.touch_type === 'dm_first')?.occurred_at ?? null;
    if (!firstDmAt) return json(req, { error: 'No first DM was sent' }, 409);
    if (rows.some((r) => r.touch_type === 'dm_followup')) return json(req, { error: 'The one follow-up was already sent' }, 409);
    if (rows.some((r) => r.touch_type === 'reply_received')) return json(req, { error: 'They replied: answer the reply instead' }, 409);
  }

  const facts = await loadFacts(svc);
  const factNumbers = facts.flatMap((f) => f.numbers ?? []);
  const sourceText = signal?.excerpt ?? null;

  let best: { text: string; lint: LiLintReport } | null = null;
  let attempts = 0;
  let model: string | null = null;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    attempts++;
    const { system, user } = buildPrompts({ action, target, signal, facts, previous: best });
    const res = await aiCall(
      {
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.6,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      },
      {
        task: FUNCTION_NAME,
        userId,
        timeoutMs: 25_000,
        // Not a customer analysis: no tier rules or analysis disclaimer.
        injectUniversalRules: false,
        metadata: { action_type: action, attempt: attempts },
      },
    );
    if (!res.ok) {
      if (best) break;
      return json(req, { error: res.message, code: res.error }, res.status);
    }
    model = String((res.data as { model?: unknown }).model ?? 'deepseek');
    const content = String(
      ((res.data as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message?.content) ?? '',
    );
    const parsed = r3Validate(content, DraftShape);
    if (!parsed.ok) {
      if (best) break;
      continue;
    }
    const text = parsed.data.text.trim();
    const lint = lintDraft({ text, action, sourceText, factNumbers });
    best = { text, lint };
    if (lint.ok) break;
  }
  if (!best) return json(req, { error: 'The model did not return a usable draft. Try again.' }, 502);

  const row = {
    prospect_id: prospectId,
    signal_id: signal?.id ?? null,
    action_type: action,
    target_url: action === 'comment' ? (signal?.post_url as string) : target.linkedin_url,
    rationale: rationale(target, action, signal, firstDmAt),
    draft_text: best.text,
    lint_report: best.lint,
    status: 'draft',
    final_text: null,
    approved_at: null,
    attempts,
    generator_model: model,
    rules_version: ENGAGEMENT_RULES_VERSION,
    created_by: userId,
    updated_at: new Date().toISOString(),
  };

  // One open draft per person + action: Regenerate overwrites it.
  const { data: open } = await svc
    .from('li_engagement_drafts')
    .select('id')
    .eq('prospect_id', prospectId)
    .eq('action_type', action)
    .in('status', ['draft', 'approved'])
    .maybeSingle();
  const write = open
    ? svc.from('li_engagement_drafts').update(row).eq('id', open.id).select().single()
    : svc.from('li_engagement_drafts').insert(row).select().single();
  const { data: saved, error } = await write;
  if (error) return json(req, { error: `Could not save the draft: ${error.message}` }, 500);
  return json(req, { success: true, draft: saved, lint: best.lint, attempts });
}

async function approve(req: Request, svc: Svc, body: Record<string, unknown>): Promise<Response> {
  const draftId = String(body.draft_id ?? '');
  const text = String(body.text ?? '').trim();
  if (!UUID.test(draftId)) return json(req, { error: 'draft_id is required' }, 400);
  if (!text) return json(req, { error: 'text is required' }, 400);

  const { data: draft } = await svc
    .from('li_engagement_drafts')
    .select('id, prospect_id, signal_id, action_type, status')
    .eq('id', draftId)
    .maybeSingle();
  if (!draft) return json(req, { error: 'Draft not found' }, 404);
  if (draft.status !== 'draft' && draft.status !== 'approved') return json(req, { error: `Draft is already ${draft.status}` }, 409);

  let sourceText: string | null = null;
  if (draft.signal_id) {
    const { data: s } = await svc.from('li_engagement_signals').select('excerpt').eq('id', draft.signal_id).maybeSingle();
    sourceText = (s?.excerpt as string | null) ?? null;
  }
  const facts = await loadFacts(svc);
  const lint = lintDraft({
    text,
    action: draft.action_type as LiDraftAction,
    sourceText,
    factNumbers: facts.flatMap((f) => f.numbers ?? []),
  });
  if (!lint.ok) return json(req, { error: 'Lint failed: fix the draft first', lint }, 422);

  const { data: saved, error } = await svc
    .from('li_engagement_drafts')
    .update({ status: 'approved', final_text: text, lint_report: lint, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', draftId)
    .in('status', ['draft', 'approved'])
    .select()
    .single();
  if (error) return json(req, { error: `Could not approve: ${error.message}` }, 500);
  return json(req, { success: true, draft: saved, lint });
}

// ---------------------------------------------------------------------------
// Daily automatic comment drafts (pg_cron, weekdays before the founder's day).
// 1. If TRAXY_API_KEY is set, read TRAXY's content feed (posts from the
//    profiles tracked in TRAXY, last 3 days) and store each post as a
//    'their_post' signal on its author (created as a target if new).
// 2. Draft comments for the best fresh signals, one per author, up to
//    li_engagement_settings.max_comments_day, honouring the author cooldown.
// Nothing is posted: drafts wait in /admin/linkedin-growth for the founder.
// ---------------------------------------------------------------------------
async function ingestTraxyPosts(svc: Svc, posts: TraxyPost[]): Promise<{ targets: number; signals: number }> {
  let targets = 0;
  let signals = 0;
  const { data: admin } = await svc.from('user_roles').select('user_id').eq('role', 'admin').limit(1).maybeSingle();
  for (const p of posts) {
    let { data: t } = await svc.from('li_engagement_targets').select('prospect_id').eq('linkedin_url', p.authorUrl).maybeSingle();
    if (!t) {
      const { data: prospect, error: pe } = await svc
        .from('commercial_prospects')
        .insert({
          owner_user_id: admin?.user_id ?? null,
          company_name: p.authorHeadline?.split(/ at | @ /i)[1]?.slice(0, 120) || p.authorName || 'LinkedIn author',
          contact_name: p.authorName,
          contact_channel: `linkedin:${p.authorUrl}`,
          segment: 'linkedin',
          stage: 'discovered',
          observed_signals: ['TRAXY tracked profile'],
          supporting_evidence: [p.authorUrl],
          unknowns: [],
        })
        .select('id')
        .single();
      if (pe || !prospect) continue;
      const { error: te } = await svc.from('li_engagement_targets').insert({
        prospect_id: prospect.id,
        linkedin_url: p.authorUrl,
        headline: p.authorHeadline,
        source: 'traxy',
        warmth: 'cold',
        persona: 'other',
        fit_score: TRACKED_AUTHOR_FIT,
        fit_breakdown: { traxy: { points: TRACKED_AUTHOR_FIT, evidence: 'Profile tracked in TRAXY; owners engage with their posts' } },
        notes: 'Added automatically from the TRAXY content feed.',
      });
      if (te) continue;
      t = { prospect_id: prospect.id };
      targets++;
    }
    const { data: dup } = await svc.from('li_engagement_signals').select('id').eq('prospect_id', t.prospect_id).eq('post_url', p.postUrl).maybeSingle();
    if (dup) continue;
    const { error: se } = await svc.from('li_engagement_signals').insert({
      prospect_id: t.prospect_id,
      signal_type: 'their_post',
      capture_method: 'traxy',
      post_url: p.postUrl,
      excerpt: p.text,
      observed_at: p.publishedAt ?? new Date().toISOString(),
      evidence_state: 'observed',
    });
    if (!se) signals++;
  }
  return { targets, signals };
}

async function autoDaily(req: Request, svc: Svc, body: Record<string, unknown>): Promise<Response> {
  const now = new Date();
  const { data: settings } = await svc
    .from('li_engagement_settings')
    .select('max_comments_day, fit_threshold_comment, author_cooldown_days, paused_until')
    .eq('id', true)
    .maybeSingle();
  if (settings?.paused_until && new Date(settings.paused_until) > now) {
    return json(req, { success: true, skipped: 'paused', paused_until: settings.paused_until });
  }

  const report: Record<string, unknown> = {};
  const apiKey = Deno.env.get('TRAXY_API_KEY');
  if (apiKey) {
    const feed = await fetchTraxyPosts(apiKey, new Date(now.getTime() - 3 * 24 * 3600 * 1000));
    report.traxy = { raw_posts: feed.raw, usable_posts: feed.posts.length, error: feed.error ?? null };
    if (feed.posts.length) report.ingested = await ingestTraxyPosts(svc, feed.posts);
  } else {
    report.traxy = 'TRAXY_API_KEY is not set; drafting only from signals already stored';
  }

  const maxAgeDays = 5;
  const since = new Date(now.getTime() - maxAgeDays * 24 * 3600 * 1000).toISOString();
  const { data: sigs } = await svc
    .from('li_engagement_signals')
    .select('id, prospect_id, observed_at, post_url, excerpt, li_engagement_targets(fit_score, commercial_prospects(suppression_status))')
    .gte('observed_at', since)
    .not('post_url', 'is', null)
    .not('excerpt', 'is', null)
    .limit(500);
  const rows = (sigs ?? []) as unknown as Array<{
    id: string; prospect_id: string; observed_at: string;
    li_engagement_targets: { fit_score: number | null; commercial_prospects: { suppression_status: string } | null } | null;
  }>;
  const prospectIds = [...new Set(rows.map((r) => r.prospect_id))];
  const { data: drafts } = prospectIds.length
    ? await svc.from('li_engagement_drafts').select('prospect_id, signal_id, status, created_at').eq('action_type', 'comment').in('prospect_id', prospectIds)
    : { data: [] };
  const lastByAuthor = new Map<string, string>();
  const signalHasDraft = new Set<string>();
  for (const d of (drafts ?? []) as Array<{ prospect_id: string; signal_id: string | null; status: string; created_at: string }>) {
    if (d.signal_id) signalHasDraft.add(d.signal_id);
    if (d.status === 'skipped') continue;
    const prev = lastByAuthor.get(d.prospect_id);
    if (!prev || prev < d.created_at) lastByAuthor.set(d.prospect_id, d.created_at);
  }
  const cands: CommentCandidate[] = rows.map((r) => ({
    signalId: r.id,
    prospectId: r.prospect_id,
    fit: r.li_engagement_targets?.fit_score ?? 0,
    observedAt: r.observed_at,
    lastCommentAt: lastByAuthor.get(r.prospect_id) ?? null,
    hasDraftForSignal: signalHasDraft.has(r.id),
    suppressed: r.li_engagement_targets?.commercial_prospects?.suppression_status !== 'active',
  }));
  const max = Math.min(Number(body.max ?? settings?.max_comments_day ?? 10), 10);
  const picked = pickCommentSignals(cands, {
    max,
    fitThreshold: settings?.fit_threshold_comment ?? 50,
    cooldownDays: settings?.author_cooldown_days ?? 7,
    now,
    maxAgeDays,
  });

  const results: Array<{ signal_id: string; ok: boolean; error?: string }> = [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const signalId of picked) {
    const r = byId.get(signalId)!;
    const res = await generate(req, svc, null, { prospect_id: r.prospect_id, action_type: 'comment', signal_id: signalId });
    const out = (await res.json().catch(() => ({}))) as { error?: string };
    results.push({ signal_id: signalId, ok: res.ok, ...(res.ok ? {} : { error: out.error ?? `HTTP ${res.status}` }) });
  }
  report.candidates = cands.length;
  report.drafted = results.filter((r) => r.ok).length;
  report.failed = results.filter((r) => !r.ok);
  console.log(`[${FUNCTION_NAME}] auto_daily`, JSON.stringify(report));
  return json(req, { success: true, ...report });
}

Deno.serve(async (req) => {
  const health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (health) return health;
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(req) });
  if (req.method !== 'POST') return json(req, { error: 'POST only' }, 405);

  try {
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (cronSecret && req.headers.get('x-cron-secret') === cronSecret) {
      const svc: Svc = createClient(SUPABASE_URL, SERVICE_KEY);
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      if (String(body.action ?? '') !== 'auto_daily') return json(req, { error: 'cron may only run auto_daily' }, 400);
      return await autoDaily(req, svc, body);
    }

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
        return json(req, { error: 'Too many draft requests. Wait a few minutes.', code: 'RATE_LIMIT_EXCEEDED' }, 429);
      }
    } catch (e) {
      console.warn(`[${FUNCTION_NAME}] rate limit check failed, failing open:`, e);
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? 'generate');
    if (action === 'generate') return await generate(req, svc, user.id, body);
    if (action === 'approve') return await approve(req, svc, body);
    if (action === 'auto_daily') return await autoDaily(req, svc, body);
    return json(req, { error: `Unknown action ${action}` }, 400);
  } catch (e) {
    console.error(`[${FUNCTION_NAME}] failed:`, e);
    return json(req, { error: 'Internal error' }, 500);
  }
});
