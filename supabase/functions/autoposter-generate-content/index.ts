import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';


import { maybeHealthResponse } from '../_shared/health.ts';
const FUNCTION_NAME = 'autoposter-generate-content';
const FUNCTION_VERSION = '1.0.0';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
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
const PLATFORM_PROMPTS: Record<Platform, string> = {
  linkedin: `You are writing for AIWMC Quantis on LinkedIn. Audience: founders, early-stage operators, B2B professionals.

Brand voice: Honest, transparent, founder-authentic. Brutal honesty, no AI filler, no corporate speak, no fake enthusiasm, no fabricated statistics.
Format: 150–300 words. Open with the hook. Line breaks every 2–3 sentences. End with ONE question or CTA.
Never: hashtag spam, emoji spam, generic praise, invented numbers, unverifiable claims (benchmark counts, accuracy percentages, guaranteed outcomes).

Only mention if directly relevant, and never as a headline claim:
- Quantis runs a deterministic financial engine plus Monte Carlo scenario analysis (pessimistic/base/optimistic)
- Free tier available, no card required
- Plus tier: $17/month
- aiwmcquantis.com`,

  facebook: `You are writing for AIWMC Quantis on Facebook. Audience: small business owners, founders 30-55, local operators.

Format: 200–400 words. Storytelling. Open with the fear hook or human story. Build tension. Resolve with Quantis. Strong CTA.
Paragraph breaks. No jargon. Accessible language. Brutal honesty, no AI filler.`,

  instagram: `You are writing an Instagram caption for AIWMC Quantis.
Format: Hook (1 line). Gap (2–3 lines). Value (3–5 lines). CTA (1 line). Hashtags on separate lines at the end.
Under 200 words before hashtags. Carousel captions end with "Swipe →". Brutal honesty, no AI filler.`,
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

    const results: Array<{ platform: Platform; ok: boolean; error?: string }> = [];

    for (const platform of platforms) {
      const t0 = Date.now();
      try {
        const userPrompt = `Content Brief: ${post.content_brief}
Hook: ${post.hook}
Post Type: ${post.post_type ?? 'N/A'}
CTA Direction: ${post.cta ?? 'N/A'}
Hashtags to consider (pick 5–8 most relevant): ${(post.hashtags ?? []).join(', ') || 'none'}

Generate a complete, publish-ready post for ${platform}. Return ONLY the post text, no preamble, no explanation.`;

        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5',
            max_tokens: 1024,
            system: PLATFORM_PROMPTS[platform],
            messages: [{ role: 'user', content: userPrompt }],
          }),
        });

        if (!claudeRes.ok) {
          const errText = await claudeRes.text();
          throw new Error(`Claude ${claudeRes.status}: ${errText.slice(0, 300)}`);
        }
        const claudeData = await claudeRes.json();
        const content: string = claudeData?.content?.[0]?.text ?? '';
        if (!content) throw new Error('Empty Claude response');

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
          response_payload: { length: content.length, model: 'claude-haiku-4-5' },
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
    if (results.some((r) => r.ok)) {
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
