// AIWMC Quantis — Content Studio (admin-only)
// ---------------------------------------------------------------------------
// Generates viral, human-natural, platform-optimized social posts using
// Lovable AI Gateway. Admin-only (verified via JWT + has_role).
//
// Returns one variant per requested platform, plus optional image prompts.
// Persists to `content_studio_generations` when save=true.
// ---------------------------------------------------------------------------
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

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
    'Write like a senior founder who has shipped real products — specific numbers, real anecdotes, contrarian when warranted.',
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
    '- No fabricated stats. If you cite a number, make it directional (e.g. "most", "in our last 30-day cohort").',
    '- If the topic touches finance, end with a faint, single-line disclaimer ONLY on long-form (LinkedIn/Reddit/Facebook): "Not financial advice."',
  ].filter(Boolean).join('\n');
}

async function callGateway(model: string, system: string, user: string) {
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.85,
    }),
  });
  if (res.status === 429) throw new Error('RATE_LIMIT: AI gateway rate-limited. Try again in a moment.');
  if (res.status === 402) throw new Error('CREDITS: AI credits exhausted. Add credits in workspace settings.');
  if (!res.ok) throw new Error(`Gateway ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty model response');
  try { return JSON.parse(content); } catch { throw new Error('Model returned non-JSON content'); }
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

    // Admin check (allowlist OR role)
    const supaSvc = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await supaSvc
      .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!roleRow) return j({ error: 'Admin only' }, 403);

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

    const model = String(body.model ?? 'google/gemini-3-flash-preview');
    const system = buildSystemPrompt(opts);
    const userPrompt = buildUserPrompt({
      topic,
      angle: String(body.angle ?? ''),
      cta: String(body.cta ?? ''),
      length: String(body.length ?? ''),
      platforms,
    });

    const t0 = Date.now();
    const result = await callGateway(model, system, userPrompt);
    const elapsed_ms = Date.now() - t0;

    const variants = result?.variants ?? {};
    if (body.save !== false) {
      await supaSvc.from('content_studio_generations').insert({
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
        model,
        variants,
        meta: { elapsed_ms },
      });
    }

    return j({ ok: true, variants, model, elapsed_ms });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.startsWith('RATE_LIMIT') ? 429 : msg.startsWith('CREDITS') ? 402 : 500;
    return j({ error: msg }, status);
  }
});
