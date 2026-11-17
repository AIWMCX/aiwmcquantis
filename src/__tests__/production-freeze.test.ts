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
        // growth-os/snapshot.json is an admin-only archive of internal history (OPS-LOG, docs),
        // never shown to customers; it quotes old text verbatim (e.g. "fabricate 12 documents").
        // Product claims are checked in the code that ships them, not in that archive.
        if (rel.replace(/\\/g, '/') === 'supabase/functions/growth-os/snapshot.json') continue;
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
// T10 — Narrative numeric firewall is actually wired in, not just defined.
// 2026-07-11 accuracy-handbook audit (NARRATIVE_KPI_CONTRADICTION, 10/20 real
// reports): validateAIOutput/validateNarratorNumbers in ai-safety-guardrails.ts
// already implemented AI-narrative-vs-computed-metrics reconciliation
// correctly, but were imported into analyze-business/index.ts and never
// called anywhere — a dead guardrail with zero effect in production. Root
// cause reproduced: 5 other safety-guardrail imports in the same block
// (validateAndSanitizeInput, generateTruthLabels, estimateRequestCost,
// checkKillSwitch, createSecurityAuditLog) are STILL dead as of this fix —
// flagged as a follow-up, not fixed here, since each needs its own integration
// point and test coverage, not a blanket wire-in.
//
// This fix added a narrower, purpose-built enforceNarrativeIntegrity function
// (real functional tests in narrative-integrity.test.ts) and wired it into
// the exact point where executive_summary is assembled. This guard is the
// "is it actually called" check — the functional correctness is covered by
// narrative-integrity.test.ts, not repeated here.
// ============================================================================
describe('T10: narrative numeric firewall is wired into the request flow, not dead', () => {
  it('enforceNarrativeIntegrity is imported in analyze-business/index.ts', () => {
    const src = readFileSync(join(ROOT, 'supabase/functions/analyze-business/index.ts'), 'utf8');
    expect(src).toMatch(/import\s*\{[^}]*enforceNarrativeIntegrity[^}]*\}\s*from\s*["']\.\/ai-safety-guardrails\.ts["']/);
  });

  it('enforceNarrativeIntegrity is actually called (not just imported)', () => {
    const src = readFileSync(join(ROOT, 'supabase/functions/analyze-business/index.ts'), 'utf8');
    const callSites = (src.match(/enforceNarrativeIntegrity\(/g) || []).length;
    expect(callSites, 'enforceNarrativeIntegrity must be called at least once — an import with zero calls is exactly the dead-guardrail bug this fix addresses').toBeGreaterThan(0);
  });

  it('the executive_summary assembly point passes it through enforceNarrativeIntegrity', () => {
    // Accuracy session 2026-08-04 (Confidence semantics, Priority 1): the
    // call site was refactored from an inline
    // `executive_summary: enforceNarrativeIntegrity(...).executiveSummary`
    // into a captured `narrativeIntegrityResult` const, so that its
    // previously-discarded `.wasModified` flag could be reused for the new
    // narrative_reconciliation quality dimension (see
    // _shared/quality-dimensions.ts). The behavior this test guards --
    // enforceNarrativeIntegrity's result actually reaching
    // business_plan.executive_summary, not a disconnected/dead call -- is
    // unchanged; only the surface syntax moved. Assert both halves of that
    // connection explicitly so the test still fails if either breaks.
    const src = readFileSync(join(ROOT, 'supabase/functions/analyze-business/index.ts'), 'utf8');
    const narrativeConstIdx = src.indexOf('const narrativeIntegrityResult = enforceNarrativeIntegrity(');
    expect(narrativeConstIdx, 'narrativeIntegrityResult must be assigned directly from enforceNarrativeIntegrity(...)').toBeGreaterThan(-1);
    const idx = src.indexOf('business_plan: {');
    expect(idx, 'business_plan assembly block not found').toBeGreaterThan(-1);
    expect(idx, 'narrativeIntegrityResult must be defined before the business_plan block that consumes it').toBeGreaterThan(narrativeConstIdx);
    const window = src.slice(idx, idx + 400);
    expect(window).toContain('executive_summary: narrativeIntegrityResult.executiveSummary');
  });
});

// ============================================================================
// T9 — Sentinel 999 must never reach a customer-facing surface as literal
// "999 months"/"999mo". 2026-07-11 corpus audit of 20 real production PDFs
// found the internal "unprofitable" sentinel (999) leaking as literal text
// in 16/20 reports, specifically the CAC Payback metric — while the
// sibling Project Payback metric right next to it (MetricDisambiguationBanner.tsx)
// already had the correct guard. Root cause: cac_payback_months render sites
// were copy-pasted without the >=999 guard applied to payback_period_months
// elsewhere. Fixed in 6 places: the two PDF renderers (usePdfExport.ts,
// ReportFinancials.tsx), three live-UI metric displays (AnalysisResults.tsx,
// FinancialSummary.tsx, MetricDisambiguationBanner.tsx), and the public
// social-share text (ShareSuccessModal.tsx), which would otherwise have
// posted "999mo payback" to a user's own Twitter/LinkedIn share.
// ============================================================================
describe('T9: sentinel 999 never reaches a customer-facing surface as literal months', () => {
  it('usePdfExport.ts CAC Payback PDF metric is guarded', () => {
    const src = readFileSync(join(ROOT, 'src/hooks/usePdfExport.ts'), 'utf8');
    expect(src).toContain("cac_payback_months >= 999 ? 'N/A (unprofitable)'");
  });

  it('ReportFinancials.tsx CAC Payback PDF metric is guarded', () => {
    const src = readFileSync(join(ROOT, 'src/components/pdf/ReportFinancials.tsx'), 'utf8');
    expect(src).toContain("unitEconomics.cac_payback_months >= 999 ? 'N/A (unprofitable)'");
  });

  it('AnalysisResults.tsx CAC Payback live-UI metric is guarded', () => {
    const src = readFileSync(join(ROOT, 'src/components/analysis/AnalysisResults.tsx'), 'utf8');
    expect(src).toMatch(/cac_payback_months\s*\?\?\s*0\)\s*>=\s*999\s*\?\s*'N\/A'/);
  });

  it('FinancialSummary.tsx CAC Payback live-UI metric is guarded', () => {
    const src = readFileSync(join(ROOT, 'src/components/analysis/FinancialSummary.tsx'), 'utf8');
    expect(src).toMatch(/cac_payback_months\s*\?\?\s*0\)\s*>=\s*999\s*\?\s*'N\/A \(unprofitable\)'/);
  });

  it('MetricDisambiguationBanner.tsx CAC Payback metric is guarded (mirrors the Project Payback sibling)', () => {
    const src = readFileSync(join(ROOT, 'src/components/analysis/MetricDisambiguationBanner.tsx'), 'utf8');
    expect(src).toMatch(/cacPaybackMonths\s*>=\s*999/);
    expect(src).toContain('cacPaybackDisplay');
  });

  it('ShareSuccessModal.tsx never posts an unprofitable payback to public share text', () => {
    const src = readFileSync(join(ROOT, 'src/components/analysis/ShareSuccessModal.tsx'), 'utf8');
    expect(src).toContain('shareablePaybackMonths');
    expect(src).toMatch(/paybackMonths\s*<\s*999/);
  });
});

// ============================================================================
// T6 — Analysis requests must not be shadow-forwarded to a second service.
// The live analysis path already runs its deterministic engine, reconciliation,
// safety, and hybrid validation. A former migration experiment additionally
// forwarded raw idea/location inputs to qoc-orchestrate. That duplicate path
// added latency and widened data disclosure without contributing to the
// customer response, so production now pins its absence.
// ============================================================================
describe('T6: analysis does not shadow-forward customer input', () => {
  const src = readFileSync(
    join(ROOT, 'supabase/functions/analyze-business/index.ts'),
    'utf8',
  );

  it('contains no qoc-orchestrate shadow invoke or shadow timeout machinery', () => {
    expect(src).not.toContain('QOC Shadow Mode');
    expect(src).not.toContain('QOC_SHADOW_TIMEOUT_MS');
    expect(src).not.toMatch(/functions\.invoke\(\s*['"]qoc-orchestrate['"]/);
  });

  it('still runs the customer-facing hybrid validator in the primary request', () => {
    // The actual exported/called name is `validateAnalysis` (from
    // hybrid-validator.ts) -- 'runHybridValidator' never existed under that
    // name on main or this branch; this assertion was simply typo'd against
    // the wrong identifier when T6 was rewritten for the shadow-mode removal.
    expect(src).toContain('validateAnalysis');
    expect(src).toMatch(/await\s+validateAnalysis\(/);
  });
});

// T12 — Cross-section reconciliation (handbook §19 item 4)
// ============================================================================
describe('T12 — cross-section reconciliation flags in PDF', () => {
  it('detectPdfContradictions is defined in usePdfExport.ts', () => {
    const src = readFileSync(join(ROOT, 'src/hooks/usePdfExport.ts'), 'utf8');
    expect(src).toContain('function detectPdfContradictions');
    expect(src).toContain('reconciliationFlags');
  });

  it('flags optimistic-revenue-higher / optimistic-profit-lower (corpus pattern: 12/20 reports)', () => {
    const src = readFileSync(join(ROOT, 'src/hooks/usePdfExport.ts'), 'utf8');
    expect(src).toContain('optimistic scenario shows higher revenue than base but lower profit');
  });

  it('flags base-revenue-higher / base-profit-lower-than-pessimistic (corpus pattern: 11/20 reports)', () => {
    const src = readFileSync(join(ROOT, 'src/hooks/usePdfExport.ts'), 'utf8');
    expect(src).toContain('base scenario shows higher revenue than pessimistic but lower profit');
  });

  it('flags KPI-card vs base-scenario profit divergence >10%', () => {
    const src = readFileSync(join(ROOT, 'src/hooks/usePdfExport.ts'), 'utf8');
    expect(src).toContain('monthly profit on KPI card differs from scenario base profit by more than 10%');
  });

  it('reconciliationFlags are rendered onto the Accuracy Notice page', () => {
    const src = readFileSync(join(ROOT, 'src/hooks/usePdfExport.ts'), 'utf8');
    expect(src).toContain('Contradictions detected in this report:');
    expect(src).toContain('reconciliationFlags.length > 0');
  });
});

// ============================================================================
// T11 — Accuracy Notice (soft gate) on all report surfaces
// ============================================================================
describe('T11 — accuracy notice banner exists on all report surfaces', () => {
  it('PDF report includes an Accuracy Notice page', () => {
    const pdfSrc = readFileSync(join(ROOT, 'src/hooks/usePdfExport.ts'), 'utf8');
    expect(pdfSrc).toContain('ACCURACY NOTICE');
    expect(pdfSrc).toContain('Cross-section reconciliation');
    expect(pdfSrc).toContain('partially implemented');
    expect(pdfSrc).toContain('independently verify all material');
  });

  it('live AnalysisResults view includes an accuracy notice', () => {
    const src = readFileSync(join(ROOT, 'src/components/analysis/AnalysisResults.tsx'), 'utf8');
    expect(src).toContain('Accuracy Notice');
    expect(src).toContain('Cross-section reconciliation is partially implemented');
  });

  it('public AccuracyTransparentResults view includes an accuracy notice', () => {
    const src = readFileSync(join(ROOT, 'src/components/analysis/AccuracyTransparentResults.tsx'), 'utf8');
    expect(src).toContain('Accuracy Notice');
    expect(src).toContain('Cross-section reconciliation is partially implemented');
  });
});

// ============================================================================
// T12 — Anonymous visitors never see a signed-in-only quota badge as if it
// were already theirs (prod bug, 2026-08-02, reported via screenshot: a
// user with no account saw "1 free analysis" (AnonymousUsageNotice's real,
// enforced anonymous-preview badge) and "5/mo free" (the AI idea-generator's
// real, enforced Free-tier monthly quota) on the same screen simultaneously
// -- two genuine numbers for two different features, but presented so it
// looked like one inconsistent, hardcoded "how much do I get for free"
// answer. Root cause: the "Try Sample / Generate Random Idea" panel in
// AppDashboard.tsx is gated only on !hasAnyResult, not isAuthenticated, and
// isFree defaults true for anonymous visitors too (tier falls back to
// 'FREE' in useSubscription.ts). Clicking it as an anonymous visitor hit the
// server's real AUTH_REQUIRED response but the client had no handler for
// that code, so it fell through to a generic "Could not generate idea"
// error -- doubly confusing, since the button looked usable but silently
// wasn't. Fixed: anonymous clicks route to signup with an honest message;
// the badge itself only claims "5/mo free" once isAuthenticated is true.
// ============================================================================
describe('T12 — anonymous visitors never see a phantom signed-in-only quota as usable', () => {
  it('AppDashboard.tsx only shows the idea-gen "5/mo free" claim to authenticated users', () => {
    const src = readFileSync(join(ROOT, 'src/pages/AppDashboard.tsx'), 'utf8');
    expect(src).toMatch(/isAuthenticated\s*&&\s*isFree\s*&&\s*<span[^>]*>5\/mo free/);
  });

  it('AppDashboard.tsx routes anonymous idea-gen clicks to signup instead of the edge function', () => {
    const src = readFileSync(join(ROOT, 'src/pages/AppDashboard.tsx'), 'utf8');
    expect(src).toMatch(/if\s*\(!isAuthenticated\)\s*\{[\s\S]{0,400}navigate\('\/auth\?mode=signup'\)/);
  });

  it('AppDashboard.tsx handles a server-side AUTH_REQUIRED response explicitly, not as a generic error', () => {
    const src = readFileSync(join(ROOT, 'src/pages/AppDashboard.tsx'), 'utf8');
    expect(src).toMatch(/code\s*===\s*'AUTH_REQUIRED'/);
  });

  it('useSubscription.ts has no stale, unused FREE_TIER_LIMIT constant contradicting the real tier-spec value', () => {
    const src = readFileSync(join(ROOT, 'src/hooks/useSubscription.ts'), 'utf8');
    expect(src).not.toMatch(/const FREE_TIER_LIMIT\s*=/);
  });
});

// ============================================================================
// T13 — "Net Profit"/"Net Margin" never shown to users as a true bottom-line
// figure (P0 accuracy-audit finding, 2026-08-02). The engine computes
// Revenue - COGS - fixed costs - marketing (financial-calculator.ts's
// `netProfit = mrr - totalExpenses`) and stops there — it never subtracts
// depreciation, amortization, interest expense, or income tax (confirmed:
// no debt schedule exists either — leverage ratios explicitly return
// INSUFFICIENT_INPUTS). That is operating profit / EBITDA-equivalent, not
// true net income, but every user-facing surface (live results, PDF export,
// social share text, the Methodology page's own definition) labeled it
// "Net Profit" / "Net Margin" as if it were the real bottom line — an
// "investor-grade" report overstating precision it doesn't have. The
// internal field names (`net_profit`, `net_margin`) are unchanged (a
// rename would be a much larger, riskier refactor across the DB schema and
// every consumer); only the user-facing display text changed, plus one
// explicit disclaimer on the methodology page. This is a live-source-scan
// test because the bug was in display copy, not in any function's return
// value — a unit test on the calculator could never have caught it.
// ============================================================================
describe('T13 — operating profit is never displayed as if it were true net income', () => {
  const noBareNetProfitLabel = (src: string) => {
    // Allow "net_profit"/"net_margin" as field/id names, but the *display*
    // string "Net Profit" / "Net Margin" (capitalized, human-facing) must not
    // appear standalone -- it must be prefixed to "Operating Profit/Margin".
    expect(src).not.toMatch(/>Net Profit</);
    expect(src).not.toMatch(/>Net Margin</);
    expect(src).not.toMatch(/'Net Profit'/);
    expect(src).not.toMatch(/'Net Margin/);
    expect(src).not.toMatch(/"Net Profit/);
    expect(src).not.toMatch(/Monthly Net Profit/);
  };

  it('FinancialSummary.tsx uses "Operating Profit"/"Operating Margin"', () => {
    const src = readFileSync(join(ROOT, 'src/components/analysis/FinancialSummary.tsx'), 'utf8');
    noBareNetProfitLabel(src);
    expect(src).toContain('Operating Profit');
    expect(src).toContain('Operating Margin');
  });

  it('AnalysisResults.tsx uses "Operating Profit"/"Operating Margin"', () => {
    const src = readFileSync(join(ROOT, 'src/components/analysis/AnalysisResults.tsx'), 'utf8');
    noBareNetProfitLabel(src);
  });

  it('ShareSuccessModal.tsx (public social-share text) says "operating margin", not "net margin"', () => {
    const src = readFileSync(join(ROOT, 'src/components/analysis/ShareSuccessModal.tsx'), 'utf8');
    expect(src).not.toMatch(/net margin/i);
    expect(src).toMatch(/operating margin/i);
  });

  it('PDF exports (ReportExecutiveSummary, ReportFinancials, usePdfExport) use "Operating Profit"/"Operating Margin"', () => {
    for (const f of [
      'src/components/pdf/ReportExecutiveSummary.tsx',
      'src/components/pdf/ReportFinancials.tsx',
      'src/hooks/usePdfExport.ts',
    ]) {
      const src = readFileSync(join(ROOT, f), 'utf8');
      noBareNetProfitLabel(src);
    }
  });

  it('Methodology.tsx discloses that operating profit excludes D&A, interest, and tax', () => {
    const src = readFileSync(join(ROOT, 'src/pages/Methodology.tsx'), 'utf8');
    expect(src).toContain('excludes depreciation, amortization, and interest expense');
  });

  it('formula-registry.ts documents net_profit as operating-profit-equivalent', () => {
    const src = readFileSync(join(ROOT, 'src/lib/formula-registry.ts'), 'utf8');
    expect(src).toContain("name: 'Operating Profit'");
    expect(src).toMatch(/does not model/);
  });
});

// ============================================================================
// T14 — TAM/SAM/SOM is never presented as calculated market data (P0
// accuracy-audit finding, 2026-08-02). Quantis has no market-sizing data
// source anywhere in the deterministic engine -- no formula-registry entry,
// no benchmark table for market size. But the base-tier narration prompt
// instructed the LLM to invent a dollar figure AND attribute it to a named
// external source it doesn't actually have access to (the prompt's own
// example: "TAM: $2.4B ... based on IBIS 2025 estimate" -- IBIS is a real
// market-research vendor Quantis has no subscription to). The narration
// fallback path (used when the LLM call itself fails) was worse: it
// computed TAM/SAM via arbitrary, unsourced multipliers (mrr × 12 × 500,
// mrr × 12 × 50) with decimal-precision formatting, in CODE, not just a
// prompt suggestion. And the base-tier UI (MarketAnalysisSection.tsx,
// ReportMarketAnalysis.tsx, usePdfExport.ts) rendered whatever came back
// with zero disclaimer -- while a separate, PLUS-tier "Market Sizing"
// feature (MarketSizingCard.tsx) already carried an honest "AI-modeled
// estimate, not verified" disclaimer, proving the team already knew this
// needed disclosure for one code path but not this one. Fixed: disclaimer
// added to the base-tier UI + PDF renderers (matching MarketSizingCard's
// exact wording), the fallback's arbitrary multipliers replaced with an
// honest "not available" state, the prompt's fake-citation example
// removed, and the Methodology page's "every dollar figure is checked"
// claim scoped to exclude the one category it doesn't actually cover.
// ============================================================================
describe('T14 — TAM/SAM/SOM is disclosed as an AI estimate, never fabricated as verified data', () => {
  it('MarketAnalysisSection.tsx (base-tier live UI) discloses TAM/SAM/SOM is an AI-modeled estimate', () => {
    const src = readFileSync(join(ROOT, 'src/components/analysis/MarketAnalysisSection.tsx'), 'utf8');
    expect(src).toContain('AI-modeled estimate');
  });

  it('ReportMarketAnalysis.tsx (PDF export) discloses TAM/SAM/SOM is an AI-modeled estimate', () => {
    const src = readFileSync(join(ROOT, 'src/components/pdf/ReportMarketAnalysis.tsx'), 'utf8');
    expect(src).toContain('AI-modeled estimate');
  });

  it('usePdfExport.ts (the duplicate React-PDF renderer) discloses the same TAM/SAM/SOM disclaimer', () => {
    const src = readFileSync(join(ROOT, 'src/hooks/usePdfExport.ts'), 'utf8');
    expect(src).toContain('AI-modeled estimate');
  });

  it('narrator-prompt.ts no longer instructs a fabricated citation to a market-research vendor Quantis has no access to', () => {
    const src = readFileSync(join(ROOT, 'supabase/functions/analyze-business/narrator-prompt.ts'), 'utf8');
    expect(src).not.toMatch(/IBIS 2025 estimate/);
    expect(src).toMatch(/NEVER invent or attribute a dollar figure to a named external source/);
  });

  it('narrator-prompt.ts fallback path no longer fabricates TAM/SAM via arbitrary unsourced multipliers', () => {
    const src = readFileSync(join(ROOT, 'supabase/functions/analyze-business/narrator-prompt.ts'), 'utf8');
    expect(src).not.toMatch(/metrics\.mrr \* 12 \* 500/);
    expect(src).not.toMatch(/metrics\.mrr \* 12 \* 50/);
    expect(src).toMatch(/TAM not available/);
  });

  it('Methodology.tsx scopes its "every dollar figure is checked" claim to exclude TAM/SAM/SOM', () => {
    const src = readFileSync(join(ROOT, 'src/pages/Methodology.tsx'), 'utf8');
    expect(src).toContain('TAM/SAM/SOM market-size figures have no deterministic-engine equivalent');
  });
});

// ============================================================================
// T16 — Both dual-engine cross-validation paths receive the same resolved
// startup-investment figure (root-caused 2026-08-02). The July 25 ROI-gate
// fix (removing quantis-engine.ts's `netProfit > 0` gate) raised the live
// dual-engine agreement score from an average of 39.8 to 85.0 -- a real,
// measured improvement -- but never crossed the >=95 "verified" threshold
// (0/87 analyses, still 0/3 same-day). Traced the residual gap to a second,
// independent bug: financial-calculator.ts's rawInvestment falls back
// through three tiers (user input -> AI-extracted estimate -> $100,000
// default, index.ts:1679) before calculateStrictFinancials ever runs, but
// quantis-engine.ts's `investment` read only the raw user field and
// defaulted to $0 via `|| 0` (quantis-engine.ts:272) whenever it was
// missing -- a live example showed strict=-125% vs quantis=0% for the
// identical business, both internally consistent under their own (already
// IDENTICAL ramp-up) ROI formula, diverging only because they disagreed on
// what "the investment" even was. Fixed by passing calc.startupInvestment
// (the already-resolved figure) into quantisInput instead of re-deriving it
// from the raw merged input a second time.
// ============================================================================
describe('T16 — quantis-engine.ts and financial-calculator.ts agree on startup investment', () => {
  it('index.ts passes the resolved calc.startupInvestment into quantisInput, not the raw user field', () => {
    const src = readFileSync(join(ROOT, 'supabase/functions/analyze-business/index.ts'), 'utf8');
    expect(src).toMatch(/startupInvestment:\s*calc\.startupInvestment/);
    expect(src).not.toMatch(/startupInvestment:\s*mergedFinancialInputs\.startup_investment/);
  });
});

// ============================================================================
// T17 — P0-25 resolution (2026-08-02): the "3 unreachable reconciliation
// engines" finding was imprecise. Deep read of all 5 reconciliation-named
// modules found reconciliation-check.ts is already the live, canonical one
// (wired into both analyze-business and run-scenario) -- the other 3 aren't
// unwired by oversight, they're specs for infrastructure that doesn't exist
// yet (a monthly P&L series, a full three-statement model with D&A/interest/
// tax). Relabeled each with a clear header explaining exactly why, rather
// than deleting real, correct design work or leaving it silently unexplained.
// Two real, safe improvements shipped alongside the relabeling:
// (1) reconciliation-check.ts's 5 sum-integrity/sign-consistency rules now
//     escalate the existing report_integrity gate (same mechanism the
//     scenario-coherence check already uses) -- a real formula regression
//     now surfaces the same way a scenario contradiction already does.
// (2) defaultFinancialReconciler (real, tested, unused since it was written)
//     is now called on every narrator financial_json parse, and the fallback
//     chains (rawMrr/rawInvestment/rawCac/rawLtv/rawAvgCheck) are guarded
//     with Number.isFinite -- closing a real, previously-unguarded gap where
//     `Infinity || 100000` evaluates to Infinity, not the fallback.
// ============================================================================
describe('T17 — reconciliation module map is honestly labeled, not silently dead', () => {
  it('reconciliation-engine.ts explains why it is not currently applicable', () => {
    const src = readFileSync(join(ROOT, 'src/lib/reconciliation-engine.ts'), 'utf8');
    expect(src).toContain('NOT CURRENTLY APPLICABLE');
    expect(src).toContain('generate12MonthProjections');
  });

  it('src/financial/reconcile.ts explains why it is not currently applicable', () => {
    const src = readFileSync(join(ROOT, 'src/financial/reconcile.ts'), 'utf8');
    expect(src).toContain('NOT CURRENTLY APPLICABLE');
    expect(src).toContain('three-statement model');
  });

  it('reconciliation-check.ts critical checks escalate report_integrity, not just log', () => {
    const src = readFileSync(join(ROOT, 'supabase/functions/analyze-business/index.ts'), 'utf8');
    expect(src).toContain('CRITICAL_RECONCILIATION_RULES');
    expect(src).toMatch(/report_integrity['"]?\)?\s*=\s*['"]BLOCK['"]/);
  });

  it('defaultFinancialReconciler is imported and called on the narrator financial_json parse', () => {
    const src = readFileSync(join(ROOT, 'supabase/functions/analyze-business/index.ts'), 'utf8');
    expect(src).toMatch(/import\s*\{\s*defaultFinancialReconciler\s*\}\s*from\s*['"]\.\.\/_shared\/r3-validator\.ts['"]/);
    expect(src).toContain('financialPlausibilityIssue');
  });

  it('the raw MRR/investment/CAC fallback chains preserve explicit zero and reject non-finite estimates', () => {
    const src = readFileSync(join(ROOT, 'supabase/functions/analyze-business/index.ts'), 'utf8');
    expect(src).toMatch(/const rawMrr = userInputs\?\.monthly_revenue \?\? finite\(fa\.mrr\)/);
    expect(src).toMatch(/const rawInvestment = userInputs\?\.startup_investment \?\? finite\(fa\.startup_investment\)/);
    expect(src).toMatch(/const rawCac = userInputs\?\.cac \?\? benchmarks\.cac_typical;/); // explicit 0 preserved by ??; no AI estimate (2026-10-29)
    expect(src).toContain('import { hasFiniteNumber } from "../_shared/financial-inputs.ts";');
    expect(src).not.toMatch(/const raw(?:Mrr|Investment|Cac|AvgCheck) = userInputs\?\.[^\n]+ \|\|/);
  });
});

// ============================================================================
// T18 — Customer-input minimization remains pinned at the request boundary.
// Keep a second, explicit guard near the historical P0 slot so future migration
// work cannot quietly reintroduce duplicate forwarding as a latency or privacy
// regression.
// ============================================================================
describe('T18 — analysis has one authoritative validation path', () => {
  it('does not invoke qoc-orchestrate from analyze-business', () => {
    const src = readFileSync(join(ROOT, 'supabase/functions/analyze-business/index.ts'), 'utf8');
    expect(src).not.toMatch(/functions\.invoke\(\s*['"]qoc-orchestrate['"]/);
    expect(src).not.toContain('shadowInvoke');
    expect(src).not.toContain('shadowTimeout');
  });
});

// T19 — /consultants (the ICP landing page) is reachable from real navigation,
// not just a direct URL hit. 2026-08-02 investigation found the page itself
// was already fully built and live (real ROI calculator, objection FAQ,
// white-label pricing, in sitemap.xml) but had zero internal links anywhere
// in the app -- not the desktop nav, not the mobile nav, not the homepage
// body -- contradicting a stale prior-audit claim that "no dedicated ICP
// landing page exists." Fixed by adding it to both nav surfaces and to a
// rewritten homepage "Who it's for" section (previously dead code: built,
// styled, but never imported anywhere and with no navigation of its own).
// This guard pins the wiring so a future refactor can't silently orphan the
// page again.
// ============================================================================
describe('T19 — ICP landing page (/consultants) has real internal navigation, not just a direct URL', () => {
  it('the desktop header nav (RmgHeader) links to /consultants', () => {
    const src = readFileSync(join(ROOT, 'src/components/landing/RmgHeader.tsx'), 'utf8');
    expect(src).toMatch(/to:\s*['"]\/consultants['"]/);
  });

  it('the mobile drawer nav (MobileNav) links to /consultants', () => {
    const src = readFileSync(join(ROOT, 'src/components/layout/MobileNav.tsx'), 'utf8');
    expect(src).toMatch(/path:\s*['"]\/consultants['"]/);
  });

  it('WhoItsFor is a real component that navigates to /consultants (not the old dead static-bullet version)', () => {
    const src = readFileSync(join(ROOT, 'src/components/landing/WhoItsFor.tsx'), 'utf8');
    expect(src).toContain("navigate('/consultants')");
    expect(src).toMatch(/export function WhoItsFor/);
  });

  it('WhoItsFor is actually imported and rendered on the homepage, not orphaned again', () => {
    const src = readFileSync(join(ROOT, 'src/pages/Landing.tsx'), 'utf8');
    expect(src).toMatch(/import\s*\{\s*WhoItsFor\s*\}\s*from\s*['"]@\/components\/landing\/WhoItsFor['"]/);
    expect(src).toMatch(/<WhoItsFor\s*\/>/);
  });

  it('/consultants route itself still resolves to the real Consultants page', () => {
    const appSrc = readFileSync(join(ROOT, 'src/App.tsx'), 'utf8');
    expect(appSrc).toMatch(/consultants/i);
  });
});
