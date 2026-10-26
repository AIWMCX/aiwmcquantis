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

/**
 * "State of Quantis" honesty page (charter 6.12-6.17, Phase 6 Public Trust
 * Foundation, 2026-08-29). Built from the same canonical sources as every
 * other surface (canonical-facts.ts) rather than restating numbers by hand
 * -- the exact drift class the accuracy audits this session closed out
 * repeatedly found. Last-verified timestamp is a literal constant, not a
 * dynamic `new Date()`, so it reflects when a human actually reviewed this
 * page's claims, not when it happened to build.
 */
const LAST_VERIFIED = 'August 30, 2026';

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
            Quantis runs a deterministic financial engine — {MONTE_CARLO_ITERATIONS_DISPLAY}-iteration Monte Carlo
            simulation across a {PIPELINE_LAYERS_LABEL} pipeline — against a grid of {BENCHMARK_COUNT_DISPLAY} benchmark
            cells covering {BENCHMARK_SECTORS} sectors ({BENCHMARK_DEFINITION}), informed by {BENCHMARK_SOURCES_DISPLAY}.
            It produces a financial verdict plus an AI-authored narrative layered on top of
            those numbers.
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
            Every dollar figure, ratio, and verdict on a Quantis report is computed by the deterministic financial engine —
            the AI narrator never invents or recomputes a number. The narrator writes prose around numbers it is
            handed. An automated integrity check (<code className="text-xs">enforceNarrativeIntegrity()</code>) compares
            the AI's narrative against the engine's own figures on every analysis and rewrites the narrative wholesale if
            it detects a mismatched dollar figure, wrong currency symbol, or a verdict (profitable/unprofitable) that
            contradicts the engine's own calculation. Two narrower failure modes — a narrative referencing the wrong time
            period, or a stale benchmark comparison — are not yet covered by that check; see Known Issues below.
          </p>
        </Section>

        <Section title="Recently fixed issues">
          <IssueList
            items={[
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
                text: 'Two narrow AI-narrative failure modes — referencing the wrong time period, or comparing against a stale benchmark cohort — are not yet covered by the automated integrity check described above. This is a deliberately deferred, accepted-risk item, not an oversight; it requires a schema change to carry period/vintage context into the check.',
              },
              {
                date: 'open',
                text: 'The Supabase Auth "leaked password protection" toggle is not yet enabled — it requires a manual action in the Supabase dashboard rather than a code or migration change, and remains outstanding.',
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
            account email, the time of the issue, and what you observed. A reported math or data discrepancy is treated
            as its own severity class, separate from general support, with response targets down to one hour for the
            most severe case — see the incident runbook referenced from Status for the full policy.
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
