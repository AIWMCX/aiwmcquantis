import { Link } from 'react-router-dom';
import { PageMeta } from '@/components/seo/PageMeta';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard } from '@/components/ui/glass-card';
import {
  BENCHMARK_COUNT_DISPLAY,
  BENCHMARK_SECTORS,
  BENCHMARK_SOURCES_DISPLAY,
  BENCHMARK_DEFINITION,
  MONTE_CARLO_ITERATIONS_DISPLAY,
  PIPELINE_LAYERS_LABEL,
} from '@/config/canonical-facts';
import { PROFIT_RANGE_ASSUMPTIONS } from '@/lib/profit-range';

const pct = (x: number) => `${Math.round(x * 100)}%`;
const R = PROFIT_RANGE_ASSUMPTIONS;

/**
 * "State of Quantis" honesty page (charter 6.12-6.17, Phase 6 Public Trust
 * Foundation, 2026-08-29). Built from the same canonical sources as every
 * other surface (canonical-facts.ts) rather than restating numbers by hand
 * -- the exact drift class the accuracy audits this session closed out
 * repeatedly found. Last-verified timestamp is a literal constant, not a
 * dynamic `new Date()`, so it reflects when a human actually reviewed this
 * page's claims, not when it happened to build.
 */
const LAST_VERIFIED = 'October 28, 2026';

export default function StateOfQuantis() {
  return (
    <PublicPageShell backTo={{ href: '/', label: 'Back to home' }} maxWidth="lg">
      <PageMeta
        title="State of Quantis"
        description="An honest account of what AIWMC Quantis does, what it does not guarantee, and where the deterministic engine ends and AI narration begins."
        path="/state-of-quantis"
      />

      <div className="pt-8 space-y-8 pb-8">
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>State of Quantis</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Last verified {LAST_VERIFIED}. This page is built from the same underlying facts as the rest of the product —
            see <Link to="/methodology" className="underline">Methodology</Link> and <Link to="/status" className="underline">Status</Link> for
            the primary sources.
          </p>
        </header>

        <Section title="What Quantis does">
          <p className="text-sm text-muted-foreground">
            Quantis runs a deterministic financial engine through a {PIPELINE_LAYERS_LABEL} pipeline, filling missing
            inputs from a grid of {BENCHMARK_COUNT_DISPLAY} benchmark cells covering {BENCHMARK_SECTORS} sectors
            ({BENCHMARK_DEFINITION}), informed by {BENCHMARK_SOURCES_DISPLAY}. Each report also runs{' '}
            {MONTE_CARLO_ITERATIONS_DISPLAY} modeled months around the base case, varying revenue
            ({pct(R.revenue.min)}–{pct(R.revenue.max)}) and costs ({pct(R.costs.min)}–{pct(R.costs.max)}), and shows the
            resulting monthly profit range. It produces a financial verdict plus an AI-authored narrative layered on top
            of those numbers.
          </p>
        </Section>

        <Section title="What Quantis does not guarantee">
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>Quantis does not guarantee any business outcome. It models plausible ranges against comparable-business
              benchmarks — it does not predict what will actually happen to your specific business.</li>
            <li>The benchmark corpus is informed by, but not a verified 1:1 statistical derivation of, the named public
              datasets — see Methodology for the precise wording and why.</li>
            <li>AI-generated commentary is not independently guaranteed to match the underlying numbers on every run.
              A same-day production bug fixed 2026-08-29 (below) is a concrete example of that boundary being tested and
              caught, not a hypothetical.</li>
          </ul>
        </Section>

        <Section title="Where the deterministic engine ends and AI narration begins">
          <p className="text-sm text-muted-foreground">
            The dollar figures, ratios and verdict on a Quantis report are computed by the deterministic financial
            engine; the AI narrator is handed those numbers and writes prose around them. An automated integrity check
            (<code className="text-xs">enforceNarrativeIntegrity()</code>) compares the AI-written executive summary with
            the engine's figures on every analysis. If the summary contains a dollar figure the engine did not produce,
            a wrong currency symbol, or a verdict that contradicts the calculation, the summary is replaced with one
            built only from the engine's figures, and the report says so. The check covers the executive summary, not
            every sentence of the narrative; see Known Issues below.
          </p>
        </Section>

        <Section title="Recently fixed issues">
          <IssueList
            items={[
              {
                date: '2026-10-27',
                text: 'A report could call an implausibly high LTV:CAC ratio (for example 79x) "healthy". Above 20x the report now says acquisition cost is likely understated and should be checked.',
              },
              {
                date: '2026-10-24',
                text: `The ${MONTE_CARLO_ITERATIONS_DISPLAY}-iteration Monte Carlo described on the site was not actually running on reports. It now runs on every report and shows a seeded monthly profit range. Copy that described capabilities the product did not have was removed the same week.`,
              },
              {
                date: '2026-10-23',
                text: 'Analyses run without an account were not being saved, so they could not be claimed after signing up. They are now saved and claimable.',
              },
              {
                date: '2026-08-29',
                text: 'A PDF export disclosure flag read the wrong field path and never displayed the "AI narrative generation degraded" notice on any export since it shipped, even when the AI narrative had in fact fallen back to a deterministic-only summary. The underlying calculations were never affected — this was a disclosure-accuracy bug, not a math bug. Found during independent re-verification, fixed and deployed the same day.',
              },
              {
                date: '2026-08-24',
                text: 'The AI narrative provider intermittently returned unavailable (DAHL_UNAVAILABLE), causing some analyses to fall back to a deterministic-only narrative. Two-phase call telemetry was added to catch this class of failure earlier next time.',
              },
              {
                date: '2026-07-02',
                text: 'A Stripe webhook signing-secret mismatch caused webhook events to be rejected, delaying subscription sync for affected accounts. Pricing and entitlement logic itself was verified unaffected.',
              },
            ]}
          />
        </Section>

        <Section title="Known issues">
          <IssueList
            items={[
              {
                date: 'open',
                text: 'The integrity check above is strict: it often replaces the AI summary because the summary quotes a derived figure (for example gross profit) that the check does not yet recognise. The replacement is correct but plainer. A context-aware check is planned.',
              },
              {
                date: 'open',
                text: 'Two narrow AI-narrative failure modes — referencing the wrong time period, or comparing against a stale benchmark cohort — are not yet covered by the automated integrity check described above. This is a deliberately deferred, accepted-risk item, not an oversight; it requires a schema change to carry period/vintage context into the check.',
              },
              {
                date: 'open',
                text: 'The Supabase Auth "leaked password protection" toggle was not enabled at our last check of the dashboard (August 30, 2026). It is a manual dashboard action, not a code change.',
              },
            ]}
          />
        </Section>

        <Section title="Reliability history">
          <p className="text-sm text-muted-foreground">
            Live component-by-component status and the full incident log are on the{' '}
            <Link to="/status" className="underline">Status page</Link>, computed from real health signals rather than a
            manually maintained "all systems operational" banner.
          </p>
        </Section>

        <Section title="Data handling">
          <p className="text-sm text-muted-foreground">
            Business inputs you submit are used to generate your analysis and are not sold to third parties. Full detail
            is in the <Link to="/privacy" className="underline">Privacy Policy</Link>; security posture (RLS, encryption,
            audit logging) is on the <Link to="/security" className="underline">Security page</Link>.
          </p>
        </Section>

        <Section title="Support and escalation">
          <p className="text-sm text-muted-foreground">
            Email <a href="mailto:support@aiwmcquantis.com" className="underline">support@aiwmcquantis.com</a> with your
            account email, the time of the issue, and what you observed. A reported math or data discrepancy is handled
            ahead of general support questions.
          </p>
        </Section>

        <p className="text-xs text-muted-foreground text-center pt-4">
          Found something on this page that's stale or wrong? Email{' '}
          <a href="mailto:support@aiwmcquantis.com" className="underline">support@aiwmcquantis.com</a> — this page is
          meant to be corrected quickly, not defended.
        </p>
      </div>
    </PublicPageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <GlassCard reveal={false} className="p-6">
      <h2 className="text-lg font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>{title}</h2>
      {children}
    </GlassCard>
  );
}

function IssueList({ items }: { items: { date: string; text: string }[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="text-sm">
          <span className="text-xs font-mono text-muted-foreground">{item.date}</span>
          <p className="text-muted-foreground mt-0.5">{item.text}</p>
        </div>
      ))}
    </div>
  );
}
