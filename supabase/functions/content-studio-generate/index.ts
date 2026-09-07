// AIWMC Quantis — Content Studio (admin-only)
// ---------------------------------------------------------------------------
// Generates viral, human-natural, platform-optimized social posts.
//
// Provider priority: DeepSeek (free-tier, primary) -> Anthropic (hard
// fallback, only if DeepSeek fails AND ANTHROPIC_API_KEY is set) -> Lovable
// AI Gateway (legacy, last resort, only if neither of the above is
// configured). This was previously hardcoded to Lovable-only — the one
// generation path in the repo not already DeepSeek-first (analyze-business
// and ai-narrator both prioritize DeepSeek via _shared/llm-call.ts).
//
// Deliberately self-contained rather than importing _shared/llm-call.ts:
// that module also pulls in tier-spec.ts/prompts.ts (~900 lines) built for
// the tiered customer-analysis flow, which this admin tool doesn't need.
//
// To add a new free-tier provider (e.g. GLM/Zhipu) tomorrow: add its base
// URL + key lookup to PROVIDERS below, ahead of 'lovable' — same shape,
// same fetch pattern, no other changes needed.
// ---------------------------------------------------------------------------
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface Provider {
  name: string;
  url: string;
  apiKey: string;
  /** Model name to send. Provider-native model names don't transfer across
   *  providers (e.g. "gpt-5" is meaningless to DeepSeek), so each provider
   *  gets its own default rather than passing the frontend's choice through. */
  defaultModel: string;
}

function resolveProvider(): Provider | null {
  const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (deepseekKey) {
    return { name: 'deepseek', url: 'https://api.deepseek.com/v1/chat/completions', apiKey: deepseekKey, defaultModel: 'deepseek-v4-flash' };
  }
  // GLM/Zhipu slot — add here tomorrow:
  // const glmKey = Deno.env.get('GLM_API_KEY');
  // if (glmKey) return { name: 'glm', url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', apiKey: glmKey, defaultModel: 'glm-4-flash' };
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (anthropicKey) {
    return { name: 'anthropic', url: 'https://api.anthropic.com/v1/messages', apiKey: anthropicKey, defaultModel: 'claude-haiku-4-5-20251001' };
  }
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (lovableKey) {
    return { name: 'lovable', url: 'https://ai.gateway.lovable.dev/v1/chat/completions', apiKey: lovableKey, defaultModel: 'google/gemini-3-flash-preview' };
  }
  return null;
}

const PLATFORMS = ['linkedin', 'twitter', 'facebook', 'instagram', 'threads', 'reddit'] as const;
type Platform = typeof PLATFORMS[number];

const PLATFORM_GUIDE: Record<Platform, string> = {
  linkedin:
    'LinkedIn: 1300–1800 chars. Opens with a sharp 1-line hook that breaks scroll. Short paragraphs (1–2 sentences). White space matters. Storytelling first, insight second. End with a thoughtful question. No "🚀". Use line breaks, not walls of text. Hashtags: 3–5 niche tags at the very end.',
  twitter:
    'X/Twitter: a single post ≤ 270 chars OR a thread of 5–9 tweets. If thread, number each tweet "1/", "2/"... First tweet is a punchy hook with a concrete claim or contrarian take. No fluff, no "thread 🧵" cliché. Hashtags: 0–1 only.',
  facebook:
    'Facebook: 80–200 words. Conversational, story-driven, slightly warmer than LinkedIn. First line is a relatable hook. End with a question or simple CTA. Hashtags: 0–2.',
  instagram:
    'Instagram caption: 125–220 words. Visual-first thinking — assume the image carries 50% of the message. Hook in line 1 (before the "...more" cutoff). Line breaks between paragraphs using a single emoji or "—" separator. Hashtags: 8–15 mixed (broad + niche + branded) on a separate line at the end.',
  threads:
    'Threads: ≤ 500 chars. Casual, direct, fast. Reads like a smart friend texting. No corporate tone. No hashtags. One emoji max.',
  reddit:
    'Reddit: long-form, 200–500 words. NO marketing voice. First person, honest, useful. Title is a clear declarative sentence with a number or specific outcome. Body explains the lesson/story with concrete details and admits trade-offs. End with a real question to the community. No hashtags, no emojis, no CTA links.',
};

function buildSystemPrompt(opts: {
  tone: string; audience: string; emoji: boolean; hashtags: boolean; language: string;
}) {
  return [
    'You are the Head of Content for AIWMC Quantis — a deterministic business-analysis SaaS (aiwmcquantis.com).',
    'Brand voice: brutally honest, evidence-first, no AI filler, no buzzwords like "leverage", "synergy", "unlock", "game-changer".',
    'Write for founders, fractional CFOs, and consultants. Use specific examples only when supported by the supplied evidence; label hypothetical examples as illustrative.',
    'Never invent customers, first-person anecdotes, testimonials, cohorts, savings, conversion gains, performance guarantees, or product capabilities. Missing evidence stays unknown.',
    'Quantis is decision support: modeled scenarios do not prove what will happen. Distinguish operating break-even, cash timing, and capital payback.',
    'Every post must pass three tests: (1) Would a skeptical reader stop scrolling? (2) Is there a concrete insight a competitor couldn\'t copy in one line? (3) Does it sound human, not GPT?',
    `Tone: ${opts.tone || 'confident, candid, useful'}.`,
    `Primary audience: ${opts.audience || 'technical founders, indie hackers, early-stage operators'}.`,
    `Language: ${opts.language}.`,
    opts.emoji ? 'Emojis: allowed, sparingly (0–2 per post, never decorative).' : 'Emojis: forbidden.',
    opts.hashtags ? 'Hashtags: per platform rules below.' : 'Hashtags: none.',
    'Forbidden: "In today\'s fast-paced world", "Are you tired of", "Look no further", "🚀", "💡", "✨", em-dash spam, ChatGPT cadence.',
    'Output MUST be valid JSON only — no preface, no markdown fences, no commentary.',
  ].join('\n');
}

function buildUserPrompt(opts: {
  topic: string; angle: string; cta: string; length: string; platforms: Platform[];
}) {
  const guides = opts.platforms.map((p) => `- ${p}: ${PLATFORM_GUIDE[p]}`).join('\n');
  return [
    `TOPIC: ${opts.topic}`,
    opts.angle ? `ANGLE / HOOK DIRECTION: ${opts.angle}` : '',
    opts.cta ? `CTA: ${opts.cta}` : 'CTA: optional, soft, and only if it fits the platform.',
    `LENGTH PREFERENCE: ${opts.length || 'platform-native (see rules)'}`,
    '',
    'PLATFORMS TO PRODUCE (one variant each, rewritten — not translated):',
    guides,
    '',
    'Return JSON in EXACTLY this shape:',
    '{',
    '  "variants": {',
    '    "<platform>": {',
    '      "hook": "first-line hook (≤140 chars)",',
    '      "body": "full post body, ready to paste, with line breaks as \\n",',
    '      "hashtags": ["#tag1","#tag2"],',
    '      "image_prompt": "1-sentence visual brief if the platform benefits from an image, else empty string",',
    '      "char_count": <integer>,',
    '      "notes": "1 short reason this will perform"',
    '    }',
    '  }',
    '}',
    '',
    'Rules:',
    '- Each variant must be genuinely rewritten for its platform, not a near-copy.',
    '- Never repeat the same opening line across platforms.',
    '- No fabricated statistics or disguised quantitative claims such as "most" or "our last 30-day cohort" without supplied evidence. Use a clearly labeled illustrative example or omit the claim.',
    '- If the topic touches finance, end with a faint, single-line disclaimer ONLY on long-form (LinkedIn/Reddit/Facebook): "Not financial advice."',
  ].filter(Boolean).join('\n');
}

function extractJson(text: string): unknown | null {
  if (!text) return null;
  const cleaned = text.replace(/```json\s*|```\s*/g, '').trim();
  try { return JSON.parse(cleaned); } catch { /* fall through */ }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { /* fall through */ }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const j = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    // Auth
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return j({ error: 'Unauthorized' }, 401);
    const supaUser = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes } = await supaUser.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return j({ error: 'Unauthorized' }, 401);

    // Admin check: full admin OR the scoped content_admin role
    // (AIWMCSRM@gmail.com / jjbalaganvasya@gmail.com)
    const supaSvc = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRows } = await supaSvc
      .from('user_roles').select('role').eq('user_id', user.id).in('role', ['admin', 'content_admin']);
    if (!roleRows || roleRows.length === 0) return j({ error: 'Admin only' }, 403);

    const body = await req.json().catch(() => ({}));
    const topic = String(body.topic ?? '').trim();
    if (!topic) return j({ error: 'topic is required' }, 400);

    const platforms: Platform[] = Array.isArray(body.platforms) && body.platforms.length
      ? body.platforms.filter((p: string) => (PLATFORMS as readonly string[]).includes(p))
      : [...PLATFORMS];

    const opts = {
      tone: String(body.tone ?? 'confident, candid, useful'),
      audience: String(body.audience ?? 'technical founders and operators'),
      emoji: body.emoji_enabled !== false,
      hashtags: body.hashtags_enabled !== false,
      language: String(body.language ?? 'en'),
    };

    const provider = resolveProvider();
    if (!provider) {
      return j({ error: 'No AI provider configured. Set DEEPSEEK_API_KEY in Supabase secrets.' }, 500);
    }

    const system = buildSystemPrompt(opts);
    const userPrompt = buildUserPrompt({
      topic,
      angle: String(body.angle ?? ''),
      cta: String(body.cta ?? ''),
      length: String(body.length ?? ''),
      platforms,
    });

    const t0 = Date.now();
    let rawContent: string;
    let usageInputTokens = 0;
    let usageOutputTokens = 0;
    try {
      if (provider.name === 'anthropic') {
        const res = await fetch(provider.url, {
          method: 'POST',
          headers: {
            'x-api-key': provider.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: provider.defaultModel,
            max_tokens: 2048,
            system: `${system}\n\nRespond with ONLY a single valid JSON object. No markdown, no commentary, no code fences.`,
            messages: [{ role: 'user', content: userPrompt }],
            temperature: 0.85,
          }),
        });
        if (!res.ok) return j({ error: `${provider.name} ${res.status}: ${(await res.text()).slice(0, 300)}` }, 502);
        const data = await res.json();
        const parts = (data?.content as Array<{ type: string; text?: string }> | undefined) ?? [];
        rawContent = parts.filter((p) => p.type === 'text').map((p) => p.text ?? '').join('');
        usageInputTokens = data?.usage?.input_tokens ?? 0;
        usageOutputTokens = data?.usage?.output_tokens ?? 0;
      } else {
        // OpenAI-compatible shape (DeepSeek, GLM, Lovable gateway).
        const res = await fetch(provider.url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: provider.defaultModel,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.85,
            response_format: { type: 'json_object' },
          }),
        });
        if (res.status === 429) return j({ error: `${provider.name} rate-limited. Try again in a moment.` }, 429);
        if (!res.ok) return j({ error: `${provider.name} ${res.status}: ${(await res.text()).slice(0, 300)}` }, 502);
        const data = await res.json();
        rawContent = data?.choices?.[0]?.message?.content ?? '';
        usageInputTokens = data?.usage?.prompt_tokens ?? 0;
        usageOutputTokens = data?.usage?.completion_tokens ?? 0;
      }
    } catch (e) {
      return j({ error: `${provider.name} unreachable: ${e instanceof Error ? e.message : String(e)}` }, 502);
    }
    const elapsed_ms = Date.now() - t0;

    const parsed = extractJson(rawContent) as { variants?: unknown } | null;
    if (!parsed) {
      return j({ error: 'Model returned invalid JSON. Try a shorter topic or fewer platforms.' }, 502);
    }

    const variants = parsed.variants ?? {};
    const modelUsed = `${provider.name}:${provider.defaultModel}`;

    // Best-effort cost/provider telemetry — never blocks generation on failure.
    //
    // Domain 18 audit (2026-07-25, P0-28): this insert previously omitted
    // input_tokens/output_tokens/cost_usd entirely (DB defaults filled in
    // 0/0/0.000000 for every row), even though the provider responses above
    // already return real usage data -- it was simply never read. Same rate
    // table as _shared/llm-call.ts's COST_PRICING (not imported directly;
    // this file is deliberately self-contained, see docblock above) --
    // publicly published provider rates, not independently reconfirmed this
    // session; verify before relying on this for financial reporting.
    const rate = provider.name === 'deepseek' ? { in: 0.27, out: 1.10 } : { in: 15, out: 75 };
    const costUsd = Math.round(
      ((usageInputTokens / 1_000_000) * rate.in + (usageOutputTokens / 1_000_000) * rate.out) * 1_000_000,
    ) / 1_000_000;
    await supaSvc.from('ai_calls').insert({
      user_id: user.id,
      task: 'content-studio-generate',
      provider: provider.name === 'lovable' ? 'lovable_gateway' : provider.name,
      model: modelUsed,
      input_tokens: usageInputTokens,
      output_tokens: usageOutputTokens,
      cost_usd: costUsd,
      latency_ms: Math.round(elapsed_ms),
      ok: true,
    }).then(undefined, () => {});

    if (body.save !== false) {
      const { error: saveError } = await supaSvc.from('content_studio_generations').insert({
        created_by: user.id,
        topic,
        angle: body.angle ?? null,
        tone: opts.tone,
        audience: opts.audience,
        cta: body.cta ?? null,
        platforms,
        length: body.length ?? null,
        hashtags_enabled: opts.hashtags,
        emoji_enabled: opts.emoji,
        language: opts.language,
        model: modelUsed,
        variants,
        meta: { elapsed_ms, prompt_version: 'quantis-content-truth-2026-09-07' },
      });
      if (saveError) return j({ error: 'Content was generated but could not be saved. Retry saving before leaving this page.', variants, model: modelUsed }, 500);
    }

    return j({ ok: true, variants, model: modelUsed, elapsed_ms });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return j({ error: msg }, 500);
  }
});
