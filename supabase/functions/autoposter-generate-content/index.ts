import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';


import { maybeHealthResponse } from '../_shared/health.ts';
const FUNCTION_NAME = 'autoposter-generate-content';
const FUNCTION_VERSION = '1.0.0';

// Provider order matches content-studio-generate: DeepSeek first (the
// production default since the Anthropic account ran out of credits),
// then Anthropic, then the Lovable gateway. Each is tried only if its key
// is set; a provider error falls through to the next one.
interface Provider { name: string; kind: 'openai' | 'anthropic'; url: string; key: string; model: string }

function providers(): Provider[] {
  const out: Provider[] = [];
  const ds = Deno.env.get('DEEPSEEK_API_KEY');
  if (ds) out.push({ name: 'deepseek', kind: 'openai', url: 'https://api.deepseek.com/v1/chat/completions', key: ds, model: 'deepseek-v4-flash' });
  const an = Deno.env.get('ANTHROPIC_API_KEY');
  if (an) out.push({ name: 'anthropic', kind: 'anthropic', url: 'https://api.anthropic.com/v1/messages', key: an, model: 'claude-haiku-4-5' });
  const lv = Deno.env.get('LOVABLE_API_KEY');
  if (lv) out.push({ name: 'lovable', kind: 'openai', url: 'https://ai.gateway.lovable.dev/v1/chat/completions', key: lv, model: 'google/gemini-3-flash-preview' });
  return out;
}

async function callProvider(p: Provider, system: string, user: string): Promise<string> {
  const res = p.kind === 'anthropic'
    ? await fetch(p.url, {
        method: 'POST',
        headers: { 'x-api-key': p.key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: p.model, max_tokens: 1024, system, messages: [{ role: 'user', content: user }] }),
      })
    : await fetch(p.url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${p.key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: p.model,
          max_tokens: 2048,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          // DeepSeek V4 defaults to thinking mode: the answer stays in
          // reasoning_content and message.content comes back empty (seen in
          // production 2026-10-16 00:58; same root cause as the 2026-06-10
          // narrator incident, handled in _shared/llm-call.ts). Disable it.
          ...(p.model.startsWith('deepseek-v4') ? { thinking: { type: 'disabled' } } : {}),
        }),
      });
  if (!res.ok) throw new Error(`${p.name} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text: string = p.kind === 'anthropic' ? (data?.content?.[0]?.text ?? '') : (data?.choices?.[0]?.message?.content ?? '');
  if (!text.trim()) throw new Error(`${p.name}: empty response`);
  return text.trim();
}

/** Try each configured provider in order; return the first success. */
async function generateText(system: string, user: string): Promise<{ content: string; model: string }> {
  const list = providers();
  if (list.length === 0) throw new Error('No AI provider configured (DEEPSEEK_API_KEY / ANTHROPIC_API_KEY / LOVABLE_API_KEY)');
  const errors: string[] = [];
  for (const p of list) {
    try {
      return { content: await callProvider(p, system, user), model: `${p.name}:${p.model}` };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  throw new Error(`All providers failed — ${errors.join(' | ')}`);
}
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ALLOWED_PLATFORMS = ['linkedin', 'facebook', 'instagram'] as const;
type Platform = typeof ALLOWED_PLATFORMS[number];

const BEST_TIMES_MT: Record<Platform, string> = {
  linkedin: '08:00:00',
  facebook: '13:00:00',
  instagram: '10:00:00',
};

// Claim Firewall (docs/content-os/EXISTING_SYSTEM_MAP.md): no unregistered
// numeric or superlative product claim may be hardcoded into a generation
// prompt. Every fact below has either been directly verified this session
// or is deliberately omitted until it has a claim-registry record. Do not
// add a new number here without one — this list is the enforcement point
// until a real claim_registry table exists.
// Applied to every platform. Keeps generated copy inside what Quantis can
// actually support (no Monte Carlo/benchmark/accuracy claims, no prices
// that could drift from the canonical tiers, no manufactured fear).
const CLAIM_RULES = `Claim rules (mandatory):
- Never invent numbers, statistics, customer counts, ratings, testimonials, results or savings. Any number in the brief that is illustrative must stay labelled "illustrative".
- Never claim prediction accuracy, guaranteed outcomes, benchmark counts, Monte Carlo simulation, speed ("in 90 seconds"), or "audit-grade"/"institutional-grade" quality.
- Do not state prices or discounts; point to aiwmcquantis.com instead.
- No urgency or scarcity (countdowns, "ends tonight", "only N spots") and no manufactured fear. Explain real financial consequences calmly.
- Describe Quantis only as: it helps structure assumptions and compare cash, break-even, payback and downside scenarios before committing money.
- One audience, one problem, one call to action.`;

const PLATFORM_PROMPTS: Record<Platform, string> = {
  linkedin: `You are writing for AIWMC Quantis on LinkedIn. Audience: founders, early-stage operators, B2B professionals.

Brand voice: Honest, transparent, founder-authentic. Brutal honesty, no AI filler, no corporate speak, no fake enthusiasm, no fabricated statistics.
Format: 150–300 words. Open with the hook. Line breaks every 2–3 sentences. End with ONE question or CTA.
Never: hashtag spam, emoji spam, generic praise, invented numbers, unverifiable claims (benchmark counts, accuracy percentages, guaranteed outcomes).

Only mention if directly relevant, and never as a headline claim:
- Quantis runs deterministic cash, break-even and payback calculations on explicit assumptions, with base and downside scenarios
- A free plan is available, no card required
- aiwmcquantis.com

${CLAIM_RULES}`,

  facebook: `You are writing for AIWMC Quantis on Facebook. Audience: small business owners, founders 30-55, local operators.

Format: 200–400 words. Storytelling. Open with a concrete, relatable decision situation. Explain what could go wrong and why, then how checking the assumptions helps. One clear CTA.
Paragraph breaks. No jargon. Accessible language. Brutal honesty, no AI filler.

${CLAIM_RULES}`,

  instagram: `You are writing an Instagram caption for AIWMC Quantis.
Format: Hook (1 line). Gap (2–3 lines). Value (3–5 lines). CTA (1 line). Hashtags on separate lines at the end.
Under 200 words before hashtags. Carousel captions end with "Swipe →". Brutal honesty, no AI filler.

${CLAIM_RULES}`,
};

Deno.serve(async (req) => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Admin auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRows } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin');
    if (!roleRows || roleRows.length === 0) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const postId: string | undefined = body?.postId;
    const platforms: Platform[] = Array.isArray(body?.platforms)
      ? body.platforms.filter((p: string): p is Platform =>
          (ALLOWED_PLATFORMS as readonly string[]).includes(p))
      : [];

    if (!postId || platforms.length === 0) {
      return new Response(JSON.stringify({ error: 'postId and platforms[] required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: post, error: postErr } = await admin
      .from('autoposter_posts')
      .select('*')
      .eq('id', postId)
      .maybeSingle();
    if (postErr || !post) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Never silently replace a draft someone may have edited: platforms that
    // already have content are skipped unless the caller passes overwrite.
    const overwrite = body?.overwrite === true;
    const { data: existingRows } = await admin
      .from('autoposter_post_platforms')
      .select('platform, content')
      .eq('post_id', postId);
    const hasDraft = new Set((existingRows ?? []).filter((r) => (r.content ?? '').trim()).map((r) => r.platform));

    const results: Array<{ platform: Platform; ok: boolean; skipped?: boolean; error?: string }> = [];

    for (const platform of platforms) {
      if (!overwrite && hasDraft.has(platform)) {
        results.push({ platform, ok: true, skipped: true });
        continue;
      }
      const t0 = Date.now();
      try {
        const userPrompt = `Content Brief: ${post.content_brief}
Hook: ${post.hook}
Post Type: ${post.post_type ?? 'N/A'}
CTA Direction: ${post.cta ?? 'N/A'}
Hashtags to consider (pick 5–8 most relevant): ${(post.hashtags ?? []).join(', ') || 'none'}

Generate a complete, publish-ready post for ${platform}. Return ONLY the post text, no preamble, no explanation.`;

        const { content, model } = await generateText(PLATFORM_PROMPTS[platform], userPrompt);

        const { data: upserted, error: upErr } = await admin
          .from('autoposter_post_platforms')
          .upsert(
            {
              post_id: postId,
              platform,
              content,
              best_time_mt: BEST_TIMES_MT[platform],
              status: 'pending',
              error_message: null,
            },
            { onConflict: 'post_id,platform' }
          )
          .select('id')
          .single();
        if (upErr) throw upErr;

        await admin.from('autoposter_publishing_logs').insert({
          post_platform_id: upserted!.id,
          action: 'generate',
          status: 'success',
          duration_ms: Date.now() - t0,
          response_payload: { length: content.length, model },
        });

        results.push({ platform, ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await admin.from('autoposter_publishing_logs').insert({
          action: 'generate',
          status: 'error',
          duration_ms: Date.now() - t0,
          response_payload: { platform, error: msg, post_id: postId },
        });
        results.push({ platform, ok: false, error: msg });
      }
    }

    // Bump parent status if any platform succeeded
    if (results.some((r) => r.ok && !r.skipped)) {
      await admin
        .from('autoposter_posts')
        .update({ status: 'pending' })
        .eq('id', postId)
        .eq('status', 'draft');
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
