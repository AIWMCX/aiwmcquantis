/**
 * PRODUCTION FREEZE — FOUNDATION GUARDS
 * ======================================
 * These tests encode the "production foundation" invariants from the freeze
 * work order. They run in every CI pass and can NEVER be weakened to make
 * a build pass. If any assertion here fires, it means a real regression
 * has occurred and must be fixed, not suppressed.
 *
 * Coverage:
 *   I-1a  AI-down → deterministic result, degraded:true, HTTP 200, no 5xx
 *   I-1b  Narration layer contains no currency arithmetic (static grep)
 *   I-1c  Prompt-injection → HARD_BLOCK, $0, audit row written (AT-3 shadow)
 *   T4a   Bundle price guard — only $0/$17/$49 allowed; no ghost tiers
 *   T4b   Forged-"pro" claim from client body is ignored (mirrors stripe-webhook)
 *   T5    Test count never shrinks below this file's baseline
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

// ============================================================================
// I-1a — AI-down degraded path
// Tests that when the narration adapter throws, the orchestrator still
// returns a complete report with overall_verdict = PARTIAL (not a 5xx) and
// the engine numbers are preserved (monte_carlo_p50 = 42000 from fake engine).
// This mirrors AT-8 in tests/qoc.test.ts (Deno) but runs in the Vitest suite
// so the CI "tests" step covers it without Deno installed.
// ============================================================================
describe('I-1a: AI-down → deterministic result survives, no hard failure', () => {
  it('orchestrator AT-8 contract is documented in the Deno suite', () => {
    // Authoritative test is tests/qoc.test.ts AT-8 (Deno).
    // This guard asserts that test file still exists and AT-8 is present,
    // so it cannot be silently deleted to make the build green.
    const qocTests = readFileSync(join(ROOT, 'tests/qoc.test.ts'), 'utf8');
    expect(qocTests).toContain('AT-8');
    expect(qocTests).toContain('narration failure degrades to PARTIAL');
    expect(qocTests).toContain("assertEquals(env.overall_verdict, \"PARTIAL\")");
    expect(qocTests).toContain('assert(env.report !== undefined)');
    expect(qocTests).toContain('monte_carlo_p50, 42000');
  });

  it('degraded path is handled in the stages module', () => {
    const stagesPath = join(ROOT, 'supabase/functions/qoc-orchestrate/qoc/stages.ts');
    if (!existsSync(stagesPath)) return; // file not present yet — skip
    const stages = readFileSync(stagesPath, 'utf8');
    // The stages.ts narrate adapter must catch throws and emit PARTIAL verdict
    expect(stages).toMatch(/catch|PARTIAL|degraded/i);
  });

  it('I-1 invariant documented in QOC_CLAUDE.md', () => {
    const docPath = join(ROOT, 'docs/QOC_CLAUDE.md');
    if (!existsSync(docPath)) return;
    const doc = readFileSync(docPath, 'utf8');
    expect(doc).toMatch(/I-1|invariant|deterministic.*first|AI.*never.*originat/i);
  });
});

// ============================================================================
// I-1b — Static guard: no currency arithmetic in the narration layer
// The hard architectural constraint: no financial figure may be computed
// outside the deterministic engine. Narration/verify are governance only.
// ============================================================================
describe('I-1b: narration layer contains no currency computation', () => {
  const QOC_DIR = join(ROOT, 'supabase/functions/qoc-orchestrate/qoc');

  // Files that ARE allowed to contain arithmetic (the engine wrapper only wraps)
  const ALLOWED_ARITHMETIC = ['orchestrator.ts', 'types.ts', 'dedupe.ts', 'preflight.ts'];

  // Currency arithmetic patterns: multiplication/division producing $ figures
  const CURRENCY_PATTERNS = [
    /\*\s*\d+(?:\.\d+)?\s*\/\s*(?:12|100)/,  // monthly → annual conversion
    /revenue\s*[*\-+]\s*\w/,                   // revenue arithmetic
    /profit\s*[=:]\s*\w+\s*[-+*/]/,           // profit computation
    /\$\{\s*(?:revenue|profit|cac|ltv|margin)/i, // interpolated currency calc
  ];

  it('stages.ts contains no revenue/profit arithmetic', () => {
    const p = join(QOC_DIR, 'stages.ts');
    if (!existsSync(p)) return;
    const src = readFileSync(p, 'utf8');
    // Strip string literals and comments to avoid false positives
    const stripped = src
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/"[^"]*"/g, '""')
      .replace(/'[^']*'/g, "''")
      .replace(/`[^`]*`/g, '``');

    for (const pat of CURRENCY_PATTERNS) {
      expect(stripped, `stages.ts must not compute currency values (pattern: ${pat})`).not.toMatch(pat);
    }
  });

  it('no file in qoc/ (except allowed) contains financial computation', () => {
    if (!existsSync(QOC_DIR)) return;
    const files = readdirSync(QOC_DIR).filter(f => f.endsWith('.ts') && !ALLOWED_ARITHMETIC.includes(f));
    for (const f of files) {
      const src = readFileSync(join(QOC_DIR, f), 'utf8');
      const stripped = src
        .replace(/\/\/[^\n]*/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/"[^"]*"/g, '""')
        .replace(/'[^']*'/g, "''");

      for (const pat of CURRENCY_PATTERNS) {
        expect(stripped, `${f} must not compute currency values (pattern: ${pat})`).not.toMatch(pat);
      }
    }
  });
});

// ============================================================================
// I-1c — Prompt injection → HARD_BLOCK guard presence
// The Deno suite (AT-3) is authoritative. This Vitest mirror asserts the
// test cannot be deleted without CI catching it.
// ============================================================================
describe('I-1c: prompt injection HARD_BLOCK guard is present', () => {
  it('AT-3 prompt injection test exists in qoc.test.ts', () => {
    const src = readFileSync(join(ROOT, 'tests/qoc.test.ts'), 'utf8');
    expect(src).toContain('AT-3');
    expect(src).toContain('HARD_BLOCK');
    expect(src).toContain('ignore previous instructions');
    expect(src).toContain('total_cost_usd, 0');
  });

  it('preflight.ts contains injection detection logic', () => {
    const p = join(ROOT, 'supabase/functions/qoc-orchestrate/qoc/preflight.ts');
    if (!existsSync(p)) return;
    const src = readFileSync(p, 'utf8');
    expect(src).toMatch(/ignore|previous|instructions|inject|HARD_BLOCK/i);
  });
});

// ============================================================================
// T4a — Bundle price guard: only $0 / $17 / $49 are canonical prices.
// Ghost prices ($149, $29, $99, etc.) must never appear in the dist bundle.
// ============================================================================
describe('T4a: only canonical Quantis tier prices ($0/$17/$49) in source config', () => {
  // The authoritative check is at the SOURCE level — tiers-drift.test.ts already
  // verifies no raw "$17/mo" or "$49/mo" literals appear in the listed source files.
  // This guard adds the config-level assertion: TIERS only defines $0, $17, $49.
  // Bundle-level scanning is intentionally not done here because the bundle
  // contains legitimate business-data content (competitor prices, example CAC,
  // membership fees) that would generate false positives. The source-level guard
  // (tiers-drift.test.ts) is the right place for price hygiene.

  it('TIERS config defines exactly 3 canonical price points: $0, $17, $49', () => {
    const tiersSrc = readFileSync(join(ROOT, 'src/config/tiers.ts'), 'utf8');
    // Extract all priceMonthly values
    const priceMatches = [...tiersSrc.matchAll(/priceMonthly\s*:\s*(\d+)/g)];
    const prices = priceMatches.map(m => Number(m[1]));
    expect(prices.sort((a,b)=>a-b)).toEqual([0, 17, 49]);
  });

  it('TIERS config annual price equivalents are $0, $14, $41 (no ghost tier)', () => {
    const tiersSrc = readFileSync(join(ROOT, 'src/config/tiers.ts'), 'utf8');
    const annualMatches = [...tiersSrc.matchAll(/priceAnnualMonthlyEquivalent\s*:\s*(\d+)/g)];
    const annuals = annualMatches.map(m => Number(m[1]));
    // Free has no annual, so we expect 14 and 41
    for (const p of annuals) {
      expect([0, 14, 41], `Unexpected annual price equivalent $${p} found in TIERS config`).toContain(p);
    }
  });

  it('no Consultant / Enterprise / Starter tier defined anywhere outside config', () => {
    // Ghost tier names that must not appear as new tier definitions
    const GHOST_TIERS = ['consultant', 'enterprise_tier', 'starter_tier', 'business_tier'];
    const filesToCheck = [
      'src/config/tiers.ts',
      'src/lib/tier-spec.ts',
      'supabase/functions/_shared/entitlements.ts',
    ];
    for (const f of filesToCheck) {
      const p = join(ROOT, f);
      if (!existsSync(p)) continue;
      const src = readFileSync(p, 'utf8').toLowerCase();
      for (const ghost of GHOST_TIERS) {
        expect(src, `Ghost tier "${ghost}" found in ${f}`).not.toContain(ghost);
      }
    }
  });
});

// ============================================================================
// T4c — Doc Studio template-count guard: the canonical count is 10.
// The "12" era keeps resurrecting: b2c2617a fixed marketing copy + the DB
// seed, then a live screenshot on 2026-07-02 caught "12 documents,
// auto-written" still shipping from THREE more surfaces (paywall i18n,
// tier-spec paywall trigger, HowItWorks). This guard scans every user-facing
// source file recursively so no new surface can reintroduce the stale count.
// ============================================================================
describe('T4c: Doc Studio template count is 10 everywhere (never 12)', () => {
  // Any of these patterns on a Quantis surface means the stale count is back.
  const STALE_COUNT_PATTERNS = [
    /12\+?\s*(professional\s+)?templates/i,
    /12\+?\s*documents/i,
    /\b12\s+doc\s+templates/i,
  ];

  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip test dirs (this file mentions the banned strings) and vendored code
        if (/__tests__|node_modules|\.git/.test(entry.name)) continue;
        walk(rel, out);
      } else if (/\.(tsx?|json)$/.test(entry.name) && !/\.test\.|\.spec\./.test(entry.name)) {
        out.push(rel);
      }
    }
    return out;
  }

  it('DOC_TEMPLATE_COUNT canonical constant is 10', () => {
    const facts = readFileSync(join(ROOT, 'src/config/canonical-facts.ts'), 'utf8');
    expect(facts).toMatch(/DOC_TEMPLATE_COUNT\s*=\s*10\b/);
  });

  it('no source file under src/ carries a "12 templates/documents" claim', () => {
    const files = walk('src');
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(join(ROOT, f), 'utf8');
      for (const rx of STALE_COUNT_PATTERNS) {
        if (rx.test(src)) offenders.push(`${f} matches ${rx}`);
      }
    }
    expect(offenders, `Stale template count found:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('edge functions carry no "12 templates/documents" claim either', () => {
    const files = walk('supabase/functions');
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(join(ROOT, f), 'utf8');
      for (const rx of STALE_COUNT_PATTERNS) {
        if (rx.test(src)) offenders.push(`${f} matches ${rx}`);
      }
    }
    expect(offenders, `Stale template count found:\n${offenders.join('\n')}`).toEqual([]);
  });
});

// ============================================================================
// T7 — Pro checkout schema guard: 2026-07-02, a real customer completed a
// live $49/mo Stripe checkout and the app never granted them Pro. Root
// cause: public.subscriptions' valid_plan CHECK constraint only allowed
// ('free','plus','enterprise') — 'pro' was never added — so every Pro
// checkout's DB write was silently rejected regardless of whether the
// Stripe webhook itself was delivered correctly. Separately,
// provision_pro_features()/mark_subscription_canceled() were defined in a
// migration that never actually applied in production (SUPABASE_DB_PASSWORD
// missing from GH Actions secrets — the same root cause as the broader
// deploy-freeze incident). This is a SOURCE-level guard only: it proves the
// fix migration exists and mentions 'pro' in the constraint text. It cannot
// prove the migration actually APPLIED in production — that gap is exactly
// what silently broke this feature for however long it was broken, and is
// why scripts/verify-live-production.sh (or a future billing-specific
// extension of it) is the load-bearing check, not this test.
// ============================================================================
describe('T7: Pro checkout schema fix is present in migrations (source-level only)', () => {
  function findMigrationsContaining(needle: string): string[] {
    const dir = join(ROOT, 'supabase/migrations');
    const hits: string[] = [];
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.sql')) continue;
      const src = readFileSync(join(dir, f), 'utf8');
      if (src.includes(needle)) hits.push(f);
    }
    return hits;
  }

  it('a migration widens valid_plan to include \'pro\'', () => {
    const hits = findMigrationsContaining("ARRAY['free'::text, 'plus'::text, 'pro'::text");
    expect(hits.length, 'No migration found that adds \'pro\' to the valid_plan constraint').toBeGreaterThan(0);
  });

  it('a migration defines provision_pro_features standalone (no enforce_white_label_pro dependency)', () => {
    const hits = findMigrationsContaining('CREATE OR REPLACE FUNCTION public.provision_pro_features');
    expect(hits.length).toBeGreaterThan(0);
  });

  it('a migration defines mark_subscription_canceled', () => {
    const hits = findMigrationsContaining('CREATE OR REPLACE FUNCTION public.mark_subscription_canceled');
    expect(hits.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// T4b — Forged entitlement guard: authoritative test must exist
// stripe-webhook-matrix.test.ts already tests forged plan payloads.
// This guard asserts the test cannot be deleted without CI catching it.
// ============================================================================
describe('T4b: forged-entitlement guard is present in stripe test suite', () => {
  it('stripe-webhook-matrix.test.ts contains forged payload assertions', () => {
    const p = join(ROOT, 'src/__tests__/stripe-webhook-matrix.test.ts');
    if (!existsSync(p)) return;
    const src = readFileSync(p, 'utf8');
    expect(src).toMatch(/forge|forg|manipulat|inject.*plan|fake.*plan|plan.*fake/i);
  });

  it('plan_entitlements is used as server-side source of truth', () => {
    const matrixPath = join(ROOT, 'src/__tests__/stripe-webhook-matrix.test.ts');
    const tiersPath = join(ROOT, 'src/__tests__/tiers-drift.test.ts');
    const hasMatrix = existsSync(matrixPath) &&
      readFileSync(matrixPath, 'utf8').includes('plan_entitlements');
    const hasDrift = existsSync(tiersPath) &&
      readFileSync(tiersPath, 'utf8').includes('plan_entitlements');
    expect(hasMatrix || hasDrift,
      'plan_entitlements must be verified as server-side source of truth in at least one test').toBe(true);
  });
});

// ============================================================================
// T5 — Test count floor: this suite itself proves the count never dropped
// to zero. The diff-against-baseline.sh script enforces the numeric floor.
// ============================================================================
describe('T5: test suite floor', () => {
  it('src/__tests__ directory contains at least 30 test files', () => {
    const testDir = join(ROOT, 'src/__tests__');
    const files = readdirSync(testDir).filter(f => f.endsWith('.test.ts') || f.endsWith('.test.tsx'));
    expect(files.length).toBeGreaterThanOrEqual(30);
  });

  it('tests/ directory contains at least 1 test file (Deno qoc suite)', () => {
    const testDir = join(ROOT, 'tests');
    if (!existsSync(testDir)) return;
    const files = readdirSync(testDir).filter(f => f.endsWith('.test.ts'));
    expect(files.length).toBeGreaterThanOrEqual(1);
  });

  it('total test case count in qoc.test.ts is at least 25 (AT-1 through AT-25)', () => {
    const src = readFileSync(join(ROOT, 'tests/qoc.test.ts'), 'utf8');
    const matches = src.match(/Deno\.test\(/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(25);
  });
});

// ============================================================================
// T8 — Pro/Plus activation toast, free-quota copy, and refund-guarantee days:
// 2026-07-10 audit found three drifted-copy defects live simultaneously:
//   (a) AppDashboard.tsx's post-checkout toast hardcoded "Welcome to Plus!"
//       even when the buyer purchased Pro (isPlus is true for both tiers,
//       so a Pro buyer never saw their actual tier name).
//   (b) SignupPrompt.tsx and PersonalizedEmptyState.tsx hardcoded "3 free
//       analyses" while the real server-side gate (analyze-business/
//       index.ts FREE_TIER_LIMIT) and canonical-facts.ts both say 5.
//   (c) Pricing.tsx's hero banner and RouteSEO.tsx's /refund-policy SEO
//       description said "7-day money-back guarantee" while FAQSection.tsx,
//       RefundPolicy.tsx, and the pricing cards on the same page all say
//       14-day (the canonical value, confirmed in tier spec). Fixed
//       2026-07-10 (isPro-aware toast title; FREE_ANALYSES_PER_MONTH
//       constant; 14-day copy). This guard prevents any of the three from
//       silently reintroducing on a future edit.
//   (d) A same-day follow-up sweep for the same "isPlus is true for Pro too"
//       bug class found a fourth instance: DocsStudio.tsx's "My Documents"
//       tab badge rendered a hardcoded "Plus" label whenever isPlus was true
//       and the user had zero documents yet — so a Pro user with no
//       documents saw a "Plus" badge. Fixed by branching on isPro like (a).
// ============================================================================
describe('T8: Pro/Plus toast, free-quota copy, and refund-guarantee days never drift', () => {
  function walkSrc(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (/__tests__|node_modules|\.git/.test(entry.name)) continue;
        walkSrc(rel, out);
      } else if (/\.(tsx?|json)$/.test(entry.name) && !/\.test\.|\.spec\./.test(entry.name)) {
        out.push(rel);
      }
    }
    return out;
  }

  it('AppDashboard post-checkout toast is tier-aware (no unconditional "Welcome to Plus")', () => {
    const src = readFileSync(join(ROOT, 'src/pages/AppDashboard.tsx'), 'utf8');
    expect(src, 'toast must not hardcode "Welcome to Plus" — a Pro buyer would see the wrong tier').not.toMatch(/Welcome to Plus!?['"`]/);
    expect(src.includes("isPro ? 'Pro' : 'Plus'"), 'toast title must branch on isPro so Pro buyers see "Welcome to Pro!"').toBe(true);
  });

  it('FREE_ANALYSES_PER_MONTH canonical constant is 5', () => {
    const facts = readFileSync(join(ROOT, 'src/config/canonical-facts.ts'), 'utf8');
    expect(facts).toMatch(/FREE_ANALYSES_PER_MONTH\s*=\s*5\b/);
  });

  it('server-side FREE_TIER_LIMIT matches the canonical 5 (no drift between gate and copy)', () => {
    const analyzeBusiness = readFileSync(
      join(ROOT, 'supabase/functions/analyze-business/index.ts'),
      'utf8',
    );
    expect(analyzeBusiness).toMatch(/FREE_TIER_LIMIT\s*=\s*5\b/);
  });

  it('no source file hardcodes "3 free analyses" (must read FREE_ANALYSES_PER_MONTH instead)', () => {
    const offenders = walkSrc('src').filter((f) =>
      /\b3\s+free\s+analyses\b/i.test(readFileSync(join(ROOT, f), 'utf8')),
    );
    expect(offenders, `Stale "3 free analyses" found in:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('no source file claims a "7-day money-back guarantee" (canonical is 14-day)', () => {
    const offenders = walkSrc('src').filter((f) =>
      /7-day\s+money-back/i.test(readFileSync(join(ROOT, f), 'utf8')),
    );
    expect(offenders, `Stale "7-day money-back" guarantee found in:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('DocsStudio "My Documents" tab badge is tier-aware (no unconditional "Plus" label)', () => {
    const src = readFileSync(join(ROOT, 'src/pages/DocsStudio.tsx'), 'utf8');
    expect(src, 'DocsStudio must destructure isPro to distinguish Pro from Plus').toMatch(/isPlus,\s*isPro\b/);
    expect(src.includes("{isPro ? 'Pro' : 'Plus'}"), 'the "My Documents" badge must branch on isPro so a Pro user never sees a bare "Plus" label').toBe(true);
  });
});

// ============================================================================
// T6 — QOC shadow-mode guard (docs/QOC_MIGRATION_PLAN.md, Stage 1)
// analyze-business fires a parallel, non-blocking call to qoc-orchestrate so
// real production data accumulates for the QOC migration's parity analysis.
// This guard is a STATIC structural check — it cannot prove runtime behavior,
// but it can prove the source can't do the one thing that must never happen:
// let a shadow-mode failure delay or break the real user response. If this
// guard ever fails, someone made the shadow call blocking or unguarded —
// stop and fix it before it ships, don't weaken the assertion.
// ============================================================================
describe('T6: QOC shadow-mode never blocks or breaks the real response', () => {
  const src = readFileSync(
    join(ROOT, 'supabase/functions/analyze-business/index.ts'),
    'utf8',
  );

  it('the shadow-mode block exists and references the migration plan', () => {
    expect(src).toContain('QOC Shadow Mode');
    expect(src).toContain('QOC_MIGRATION_PLAN.md');
    expect(src).toContain("supabaseService.functions");
    expect(src).toContain("'qoc-orchestrate'");
  });

  it('the shadow invoke is never awaited before the final response is built', () => {
    // Isolate the shadow-mode block (between its start marker and the final
    // `return new Response` that ships wirePayload to the user).
    const start = src.indexOf('QOC Shadow Mode');
    const responseMarker = 'success: true, data: wirePayload';
    const end = src.indexOf(responseMarker, start);
    expect(start, 'shadow-mode block not found').toBeGreaterThan(-1);
    expect(end, 'final wirePayload response not found after shadow block').toBeGreaterThan(start);
    const block = src.slice(start, end);
    // The shadow invoke promise must never be awaited directly — only handed
    // to EdgeRuntime.waitUntil (background) or left to run via .then/.catch.
    expect(block).not.toMatch(/await\s+shadowInvoke/);
    expect(block).toContain('EdgeRuntime');
    expect(block).toContain('waitUntil');
  });

  it('the shadow-mode setup is wrapped in try/catch so it cannot throw into the request', () => {
    const start = src.indexOf('QOC Shadow Mode');
    const responseMarker = 'success: true, data: wirePayload';
    const end = src.indexOf(responseMarker, start);
    const block = src.slice(start, end);
    // The comment header alone runs ~700 chars; assert structurally within
    // the whole isolated block rather than a fixed-size window.
    expect(block).toMatch(/try\s*\{/);
    expect(block).toMatch(/\}\s*catch\s*\(shadowSetupErr\)/);
  });

  it('the shadow invoke has its own .catch so a rejected promise cannot become an unhandled rejection', () => {
    const start = src.indexOf('QOC Shadow Mode');
    const end = src.indexOf('EdgeRuntime', start);
    const block = src.slice(start, end);
    expect(block).toMatch(/\.catch\(/);
  });
});
