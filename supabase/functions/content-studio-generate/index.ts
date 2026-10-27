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
import { generateImageWithRetry, ImageGenError, resolveImageProvider } from '../_shared/image-gen.ts';
import { renderHeadlineCard, renderFinancialChartCard } from '../_shared/template-card.ts';
import { selectVisualMode, validateVisualSpec, VisualSpecError, type VisualSpec } from '../_shared/visual-spec.ts';
import { MARKETING_DOCTRINE, DOCTRINE_NOTES_INSTRUCTION } from '../_shared/marketing-doctrine.ts';

/** Fixed, brief-specified footer for financial_chart cards -- never model-
 *  supplied, matching how the legacy card's brandTagline is already a
 *  server-side constant, not something the LLM writes. */
const FINANCIAL_CHART_FOOTER = 'AIWMC QUANTIS | Model the decision before you fund it.';

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
    MARKETING_DOCTRINE,
    '',
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
    DOCTRINE_NOTES_INSTRUCTION,
    'Output MUST be valid JSON only — no preface, no markdown fences, no commentary.',
  ].join('\n');
}

function buildUserPrompt(opts: {
  topic: string; angle: string; cta: string; length: string; platforms: Platform[];
  visualMode: 'financial_chart' | 'editorial_headline';
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
    '      "image_prompt": "1-sentence visual SCENE brief grounded in the actual post content -- a concrete real-world moment, object, or setting the post describes (e.g. \'a founder reviewing a spreadsheet with red variance highlights at a cluttered desk\'), else empty string. Never a generic tech/AI cliche (no glowing brains, circuit patterns, abstract data streams, robot hands, floating holograms). Never include any text, numbers, charts, or logos in the description -- those are rendered separately.",',
    '      "card_headline": "a punchy 4-9 word headline for a text-first title card, in the post\'s own words -- the single sharpest claim or lesson from THIS post, not a generic label. Example: \'SMALL MISSES DON\'T STAY SMALL\'.",',
    '      "card_subtitle": "one supporting sentence under the headline, under 90 characters, that adds the specific mechanism or consequence -- not a restatement of the headline.",',
    '      "char_count": <integer>,',
    '      "notes": "hook type, funnel stage and the three principles used (format below)"',
    '    }',
    '  },',
    '  "card_chart": null OR { "x_axis_label": "e.g. NUMBER OF CUSTOMERS", "series_label": "e.g. COSTS", "steps": [{"threshold": <number>, "annotation": "short label"}, ...] } -- ONLY populate this if the post ITSELF explicitly states a sequence of specific numeric thresholds with what happens at each one (e.g. the post literally says "at 30 customers we hired a supervisor, at 75 we bought a new system"). Never invent, estimate, round, or infer thresholds that are not explicitly stated in the post text. Minimum 2 steps, maximum 5. If the post has no such explicit numeric sequence, this MUST be null -- do not force a chart onto a post that does not contain one.',
    '  "card_callout": null OR { "title": "the specific named concept/mechanism this post is about, 2-4 words", "body": "1 sentence plainly defining that concept, grounded in what the post actually says" } -- ONLY populate if the post centers on one specific, nameable concept (e.g. "step-fixed costs", "collection lag"). If the post is just a story or list without one central named concept, this MUST be null.',
    opts.visualMode === 'financial_chart' ? [
      '  "visual_spec_hint": null OR {',
      '    "headline": "max 7 words, ALL CAPS not required, the single sharpest claim",',
      '    "subhead": "max 22 words, one supporting sentence",',
      '    "sourceStatus": "illustrative" | "product_verified" | "externally_cited" -- use "illustrative" unless the post cites a real, verifiable external source,',
      '    "illustrativeNote": "Illustrative example. Actual thresholds depend on your business." -- REQUIRED verbatim when sourceStatus is illustrative,',
      '    "chart": {',
      '      "type": "two_thresholds" | "two_lines" | "three_scenarios",',
      '      "xAxisLabel": "e.g. Time (months)",',
      '      "yAxisLabel": "e.g. Amount ($)",',
      '      "series": [ { "label": "e.g. Monthly operating profit", "color": "cyan" | "amber" | "muted", "points": [{"x": <number>, "y": <number>}, ...] }, ... ] -- exactly 2 series for two_thresholds/two_lines, exactly 3 for three_scenarios. Points are ILLUSTRATIVE shape only (a believable curve for the concept), never claimed as real measured data.',
      '      "markers": [ { "x": <number>, "label": "SHORT LABEL", "description": "one clause", "color": "cyan" | "amber" }, ... ] -- optional, max 6, only for two_thresholds (e.g. BREAK-EVEN / PAYBACK)',
      '    }',
      '  } -- This is a FINANCIAL topic (break-even, payback, revenue, cash, cost, retention, acquisition, capacity, scenario, runway, contribution margin, churn, pricing). Populate this so the post gets an illustrative deterministic chart instead of a generic headline card. Never claim the chart shape is real measured data -- it illustrates the CONCEPT the post describes, hence sourceStatus "illustrative" and the required note. If you cannot construct a sensible chart for this topic, use null and a headline card will be used instead.',
    ].join('\n') : '',
    '}',
    '',
    'Rules:',
    '- Each variant must be genuinely rewritten for its platform, not a near-copy.',
    '- Never repeat the same opening line across platforms.',
    '- No fabricated statistics or disguised quantitative claims such as "most" or "our last 30-day cohort" without supplied evidence. Use a clearly labeled illustrative example or omit the claim.',
    '- If the topic touches finance, end with a faint, single-line disclaimer ONLY on long-form (LinkedIn/Reddit/Facebook): "Not financial advice."',
    '- card_chart and card_callout are usually null. Only populate them when the post genuinely, explicitly supports them -- a wrong or invented chart is worse than no chart.',
    '- Never write: "deterministic engine", "audit-grade", "predictive accuracy", "guaranteed", "90% of businesses fail", any specific processing-time claim (e.g. "60 seconds", "90 seconds"), invented benchmark counts, invented user results/testimonials, or an unsupported specific time range (e.g. "12-24 months apart") unless the post input itself states it.',
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

    // Founder-only: full admin role (jeltovbogdan@gmail.com and aliases).
    const supaSvc = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRows } = await supaSvc
      .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin');
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

    // Visual format (Quantis Visual System brief SD): 'auto' (default) uses
    // the topic-keyword classifier; an explicit choice from the UI's
    // Visual format selector overrides it. product_proof never asks the
    // model for a chart hint -- it needs a real, human-supplied screenshot,
    // not model-generated chart data (see visual-spec.ts's own rule that
    // product_proof can never be auto-selected).
    const requestedFormat = String(body.visual_format ?? 'auto');
    const promptVisualMode: 'financial_chart' | 'editorial_headline' =
      requestedFormat === 'financial_chart' ? 'financial_chart'
      : requestedFormat === 'editorial_headline' || requestedFormat === 'product_proof' ? 'editorial_headline'
      : selectVisualMode(topic);

    const system = buildSystemPrompt(opts);
    const userPrompt = buildUserPrompt({
      topic,
      angle: String(body.angle ?? ''),
      cta: String(body.cta ?? ''),
      length: String(body.length ?? ''),
      platforms,
      visualMode: promptVisualMode,
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

    const parsed = extractJson(rawContent) as {
      variants?: unknown;
      card_chart?: { x_axis_label?: string; series_label?: string; steps?: Array<{ threshold?: number; annotation?: string }> } | null;
      card_callout?: { title?: string; body?: string } | null;
      visual_spec_hint?: unknown;
    } | null;
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
    void supaSvc.from('ai_calls').insert({
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

    // Image generation (Step C, 2026-09-11 spec): best-effort, never blocks
    // caption generation. Uses the first non-empty image_prompt across
    // variants, preferring Instagram (image-first platform) then LinkedIn.
    let imageResult: { url: string; storagePath: string; provider: string } | null = null;
    let imageError: string | null = null;
    const variantsRecord = variants as Record<string, { image_prompt?: string }>;
    const chosenPrompt =
      variantsRecord.instagram?.image_prompt ||
      variantsRecord.linkedin?.image_prompt ||
      Object.values(variantsRecord).map((v) => v?.image_prompt).find((p) => p && p.trim());

    if (chosenPrompt) {
      const imageProvider = resolveImageProvider();
      if (!imageProvider) {
        imageError = 'No image provider configured. Set HUGGINGFACE_API_TOKEN in Supabase secrets.';
      } else {
        try {
          // CORRECTED 2026-09-20 (Quantis Visual System brief SC): the
          // previous version of this prompt explicitly invited a
          // photographic human subject in the scene -- a direct cause of
          // the reported "irrelevant AI image of a sad man with a pixel
          // robot" bug. FLUX is background-only now: a low-detail navy
          // paper-grain / abstract financial texture, never a photographic
          // subject, and never asked to draw text/charts/logos/UI (those
          // are the deterministic renderer's job -- see template-card.ts).
          // Brand style is enforced here, server-side, deterministically --
          // never left to the LLM's one-sentence brief alone.
          const styledPrompt = `Abstract background texture only, subtly inspired by: ${chosenPrompt}. Deep midnight navy near-black base (#0b0f1a range), fine paper grain, soft low-contrast abstract financial field -- faint ledger-line or grid texture, subtle light gradients. No people, no faces, no hands, no robots, no mascots, no characters, no animals. No text, no numbers, no letters, no charts, no graphs, no axes, no logos, no watermarks, no UI elements, no app screenshots, no icons, no QR codes. No illustration or cartoon style, no photorealistic subjects. No generic AI-art tropes: no glowing abstract data streams, no circuit-board patterns, no floating holograms, no neon gradients, no cyberpunk. Purely atmospheric background texture, nothing depicted.`;
          const image = await generateImageWithRetry(imageProvider, styledPrompt);
          const ext = image.contentType.includes('jpeg') ? 'jpg' : image.contentType.includes('webp') ? 'webp' : 'png';
          const storagePath = `content-studio/${crypto.randomUUID()}.${ext}`;
          const { error: uploadError } = await supaSvc.storage
            .from('content-assets')
            .upload(storagePath, image.bytes, { contentType: image.contentType, upsert: false });
          if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);
          const { data: signedData, error: signError } = await supaSvc.storage
            .from('content-assets')
            .createSignedUrl(storagePath, 86400);
          if (signError || !signedData?.signedUrl) throw new Error(`Signed URL failed: ${signError?.message ?? 'no URL returned'}`);
          imageResult = { url: signedData.signedUrl, storagePath, provider: imageProvider.name };
        } catch (e) {
          imageError = e instanceof ImageGenError ? e.message : (e instanceof Error ? e.message : String(e));
        }
      }
    }

    // Headline card (deterministic, no LLM/diffusion involved in rendering
    // the actual pixels): a text-first title card matching the founder's
    // reference asset style. Exact typography and brand mark, never
    // hallucinated -- see template-card.ts docblock for why this is a
    // separate deterministic renderer rather than a bigger diffusion prompt.
    let cardResult: { url: string; storagePath: string } | null = null;
    let cardError: string | null = null;
    const cardVariant = (variantsRecord as Record<string, { card_headline?: string; card_subtitle?: string }>).linkedin
      ?? Object.values(variantsRecord as Record<string, { card_headline?: string; card_subtitle?: string }>)[0];
    const cardHeadline = cardVariant?.card_headline?.trim();

    // Strict validation of the LLM-supplied chart/callout -- never render
    // malformed or partially-invented data. Any field missing or wrong
    // type discards the whole chart/callout rather than guessing a
    // fallback value, since a guessed number is exactly the fabrication
    // risk this feature exists to avoid.
    const rawChart = parsed.card_chart;
    const validSteps = rawChart?.steps?.filter(
      (s): s is { threshold: number; annotation: string } =>
        typeof s?.threshold === 'number' && Number.isFinite(s.threshold) &&
        typeof s?.annotation === 'string' && s.annotation.trim().length > 0,
    ) ?? [];
    const chartInput = (
      rawChart &&
      typeof rawChart.x_axis_label === 'string' && rawChart.x_axis_label.trim() &&
      typeof rawChart.series_label === 'string' && rawChart.series_label.trim() &&
      validSteps.length >= 2 && validSteps.length <= 5
    )
      ? {
          xAxisLabel: rawChart.x_axis_label.trim(),
          seriesLabel: rawChart.series_label.trim(),
          steps: validSteps.slice(0, 5).sort((a, b) => a.threshold - b.threshold),
        }
      : undefined;

    const rawCallout = parsed.card_callout;
    const calloutInput = (
      rawCallout &&
      typeof rawCallout.title === 'string' && rawCallout.title.trim() &&
      typeof rawCallout.body === 'string' && rawCallout.body.trim()
    )
      ? { title: rawCallout.title.trim(), body: rawCallout.body.trim() }
      : undefined;

    // financial_chart path (Quantis Visual System, part 3): attempted first
    // when the model returned a visual_spec_hint AND the topic classifies
    // (or was explicitly requested) as financial_chart. Validated through
    // the same VisualSpecError-throwing validator the acceptance test
    // exercises directly (visual-spec.test.ts) -- on ANY validation failure,
    // this falls through to the existing headline-card path below rather
    // than failing the whole generation, matching the spec's own S5 rule
    // ("on VisualSpecError, fall back to today's existing behavior").
    let visualModeUsed: VisualSpec['mode'] | null = null;
    let sourceStatusUsed: VisualSpec['sourceStatus'] | null = null;
    if (promptVisualMode === 'financial_chart' && parsed.visual_spec_hint) {
      try {
        const hint = parsed.visual_spec_hint as Record<string, unknown>;
        const candidate = {
          mode: 'financial_chart' as const,
          topic,
          headline: hint.headline,
          subhead: hint.subhead,
          sourceStatus: hint.sourceStatus ?? 'illustrative',
          chart: hint.chart,
          footer: FINANCIAL_CHART_FOOTER,
          illustrativeNote: hint.illustrativeNote,
          cta: body.cta ? String(body.cta) : undefined,
        };
        const spec = validateVisualSpec(candidate);
        if (spec.chart) {
          const card = await renderFinancialChartCard({
            headline: spec.headline,
            subhead: spec.subhead,
            chart: spec.chart,
            illustrativeNote: spec.illustrativeNote ?? 'Illustrative example. Actual thresholds depend on your business.',
            footer: spec.footer,
            cta: spec.cta,
          });
          const storagePath = `content-studio/${crypto.randomUUID()}-chart.png`;
          const { error: uploadError } = await supaSvc.storage
            .from('content-assets')
            .upload(storagePath, card.bytes, { contentType: card.contentType, upsert: false });
          if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);
          const { data: signedData, error: signError } = await supaSvc.storage
            .from('content-assets')
            .createSignedUrl(storagePath, 86400);
          if (signError || !signedData?.signedUrl) throw new Error(`Signed URL failed: ${signError?.message ?? 'no URL returned'}`);
          cardResult = { url: signedData.signedUrl, storagePath };
          visualModeUsed = 'financial_chart';
          sourceStatusUsed = spec.sourceStatus;
        }
      } catch (e) {
        // Swallowed deliberately -- an invalid/malformed visual_spec_hint
        // (VisualSpecError) or a render failure both fall through to the
        // legacy headline-card path below, never to a hard error. Recorded
        // in cardError only if the legacy path ALSO fails, so a successful
        // fallback doesn't look like an error in the response.
        cardError = e instanceof VisualSpecError
          ? `visual_spec_hint invalid (${e.field}): ${e.message} -- used headline card instead`
          : (e instanceof Error ? e.message : String(e));
      }
    }

    if (!cardResult && cardHeadline) {
      const financialChartError = cardError; // preserved only if this fallback also fails
      cardError = null;
      try {
        const card = await renderHeadlineCard({
          headline: cardHeadline,
          subtitle: cardVariant?.card_subtitle?.trim(),
          chart: chartInput,
          callout: calloutInput,
          brandTagline: 'Model the assumptions behind the decision.',
        });
        const storagePath = `content-studio/${crypto.randomUUID()}-card.png`;
        const { error: uploadError } = await supaSvc.storage
          .from('content-assets')
          .upload(storagePath, card.bytes, { contentType: card.contentType, upsert: false });
        if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);
        const { data: signedData, error: signError } = await supaSvc.storage
          .from('content-assets')
          .createSignedUrl(storagePath, 86400);
        if (signError || !signedData?.signedUrl) throw new Error(`Signed URL failed: ${signError?.message ?? 'no URL returned'}`);
        cardResult = { url: signedData.signedUrl, storagePath };
      } catch (e) {
        const legacyError = e instanceof Error ? e.message : String(e);
        cardError = financialChartError ? `${financialChartError}; headline card also failed: ${legacyError}` : legacyError;
      }
    }

    let saveError: string | null = null;
    if (body.save !== false) {
      const { error: insertError } = await supaSvc.from('content_studio_generations').insert({
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
        meta: {
          elapsed_ms,
          image: imageResult
            ? { storage_path: imageResult.storagePath, provider: imageResult.provider }
            : null,
          image_error: imageError,
          card: cardResult ? { storage_path: cardResult.storagePath } : null,
          card_error: cardError,
          visual_mode: visualModeUsed,
          source_status: sourceStatusUsed,
        },
      });
      if (insertError) saveError = insertError.message;
    }

    return j({
      ok: true,
      variants,
      model: modelUsed,
      elapsed_ms,
      image_url: imageResult?.url ?? null,
      image_error: imageError,
      card_image_url: cardResult?.url ?? null,
      card_error: cardError,
      // Quantis Visual System (2026-09-20): null when the legacy headline-
      // card path was used (or no card at all) -- UI falls back to its
      // existing "Generated Image"-style labeling in that case.
      visual_mode: visualModeUsed,
      source_status: sourceStatusUsed,
      save_error: saveError,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return j({ error: msg }, 500);
  }
});
