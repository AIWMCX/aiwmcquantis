import { Link } from 'react-router-dom';
import { Sparkles, Shield, Zap, Bug } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard, SectionHeader } from '@/components/ui/glass-card';

type ChangeType = 'feature' | 'security' | 'improvement' | 'fix';

interface ChangeEntry {
  date: string;
  version: string;
  title: string;
  type: ChangeType;
  changes: string[];
}

const CHANGELOG: ChangeEntry[] = [
  {
    date: 'October 25, 2026',
    version: '2.8.0',
    title: 'Sources, numbers and inputs you can check',
    type: 'fix',
    changes: [
      'Benchmark citations now say "Quantis modeled benchmark". They previously named third-party research firms with sample sizes we could not back; the benchmark grid is modeled, as the Methodology page explains.',
      '"Why These Numbers?" now shows the rent multiplier for your own metro (or "US average" when there is no match) and only values your report actually has. It previously showed a single fixed multiplier, credited to a data vendor we do not license, for every location.',
      'The result header no longer shows a fixed run time or a fixed AI-agreement score; both appear only when measured.',
      'Location coverage is stated as it is: 15 US metros plus a US-average baseline.',
      'A city typed into the location box is no longer saved as "GlobalColumbus, OH", and a "City, ST" written in the one-line idea is used for calibration.',
      'Hiring decisions typed on the homepage now open the hiring model, which compares cash with and without the hire, instead of being analysed as a new business.',
    ],
  },
  {
    date: 'October 24, 2026',
    version: '2.7.0',
    title: 'Monte Carlo on every report, saved free runs, sample Decision Memo',
    type: 'feature',
    changes: [
      'Every report now shows a monthly profit range (low, typical, high) from 1,000 simulated months, with its assumptions printed next to it.',
      'Free runs made before signing in are now saved and become yours when you create an account.',
      'A sample Decision Memo shows exactly what the Founder Decision Review delivers, worked through on a fictional business.',
      'You can ask a question before paying for a review, and results link to the review once.',
      'The consultant and do-it-yourself price comparisons are labelled as illustrative ranges.',
    ],
  },
  {
    date: 'August 27, 2026',
    version: '2.6.0',
    title: 'Benchmark reconciliation + export safeguards',
    type: 'fix',
    changes: [
      'Fixed a case where the "Beat/Miss" industry comparison card could cite a different benchmark number than the same report\'s PDF and validation panels for the same metric. All three now always agree, sourced from the same real benchmark dataset — no more silently disagreeing "facts" in one report.',
      'Fixed a case where external validation could show a confident "Validated" badge with zero real outside data behind it. It now clearly shows "Estimated" instead whenever there was nothing real to validate against.',
      'Exporting a report that failed an internal consistency check now requires an explicit confirmation before download, instead of silently allowing a normal-looking export.',
      'Published a formal security-disclosure policy (security.txt) so security researchers have a documented, direct way to report issues.',
      'The financial-integrity check introduced on August 25 now runs automatically on a recurring schedule against every analysis, not just as a one-time sweep.',
    ],
  },
  {
    date: 'August 25, 2026',
    version: '2.5.0',
    title: 'Financial-integrity gate + validation badge fix',
    type: 'fix',
    changes: [
      'Added a runtime check that operating profit can never exceed gross profit, or gross profit exceed revenue, in any scenario. A report that violates this is now flagged for review instead of shipping a clean verdict — this closes a real gap where a report could show a confident "Viable" verdict alongside internally-contradictory numbers.',
      'Fixed a bug in external validation (RVCE): a value outside the displayed benchmark range could still show a green "Validated" badge, because the pass/fail decision was based on a separate statistical score rather than the range shown to the user. Validation now requires the value to genuinely fall within the displayed range.',
      'PDF exports now show the true page count (previously the printed "Page X of Y" could be wrong when a section ran long), and a report generated without full AI narration is now clearly labeled as such rather than looking identical to a fully narrated one.',
      '5 historical analyses generated before this fix were found to violate the new financial-integrity check and have been flagged for review.',
    ],
  },
  {
    date: 'April 20, 2026',
    version: '2.4.0',
    title: 'Tier-Gating & Compute Leakage Hardening',
    type: 'security',
    changes: [
      'Server-side enforcement of Free tier limits — Free users can no longer trigger Monte Carlo simulations or 36-month projections by crafting API requests.',
      'Added 3-layer compute-leakage prevention: depth coercion at input, scenario cap at compute, response sanitization at output.',
      'Atomic, race-safe quota consumption (no more counter exploits via parallel multi-tab submits).',
      'Subscription resolution now respects trial expiry — expired trials fail closed to Free.',
      'New observability table: every entitlement denial logged for abuse-signal review.',
    ],
  },
  {
    date: 'April 18, 2026',
    version: '2.3.0',
    title: 'Trust Pages & SEO Foundation',
    type: 'feature',
    changes: [
      'Public Status page with real-time database/auth health checks (auto-refresh every 60s).',
      'Security posture page documenting encryption, RLS, anomaly detection, and 8-layer AI safety (incl. RVCE).',
      'Plain-English 14-day refund policy with explicit Pro Annual handling.',
      'Per-route SEO meta tags via react-helmet-async — Googlebot now sees proper title/description/OpenGraph on every page.',
    ],
  },
  {
    date: 'April 15, 2026',
    version: '2.2.0',
    title: 'Pro tier launch + annual billing',
    type: 'feature',
    changes: [
      'Pro tier launched at $49/mo (or $492/yr — saves $96) with 14-day trial. Includes white-label PDF, API access, TAM/SAM/SOM, 5-year model, and pitch-deck data package.',
      'Annual billing added for Plus ($168/yr — saves $36) and Pro ($492/yr).',
      'Plus pricing held at $17/mo. Existing Plus subscribers remain at $17 — no auto-reprice.',
      'Trial reminder email at day 11 of any 14-day trial.',
    ],
  },
  {
    date: 'April 1, 2026',
    version: '2.1.0',
    title: 'Quantis 2.0 Precision Engine',
    type: 'improvement',
    changes: [
      'Floating-point drift eliminated via decimal.js across all financial calculations.',
      'New 8-rule reconciliation engine catches narrative-vs-numbers contradictions.',
      'Bottom-up labor staffing model — corrects user-supplied OpEx that mismatches industry payroll norms.',
      'Industry classification expanded with 200+ keyword detectors (notably better SaaS vs. service business disambiguation).',
    ],
  },
  {
    date: 'March 25, 2026',
    version: '2.0.0',
    title: 'Multi-Model Consensus & Forensic Suite',
    type: 'feature',
    changes: [
      'Parallel calls to GPT-5-mini and Gemini 3 Flash with consensus scoring.',
      'Pre-Mortem Stress Test launched: churn shocks, cost spikes, customer concentration scenarios.',
      'Invoice & Capacity Check: "Should you accept this client?" cash-flow analyzer.',
      'Document Studio with 10 branded templates auto-populated from your analysis.',
    ],
  },
];

const TYPE_META: Record<ChangeType, { label: string; icon: typeof Sparkles; color: string }> = {
  feature: { label: 'New', icon: Sparkles, color: 'var(--aiwmc-grad-cyan)' },
  security: { label: 'Security', icon: Shield, color: '#4ade80' },
  improvement: { label: 'Improved', icon: Zap, color: 'var(--aiwmc-grad-violet)' },
  fix: { label: 'Fix', icon: Bug, color: '#facc15' },
};

const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

export default function ChangelogPage() {
  return (
    <PublicPageShell backTo={{ href: '/', label: 'Back to home' }} maxWidth="sm">
      <PageMeta
        title="Changelog"
        description="Public release notes for AIWMC Quantis: every shipped feature, security improvement, and bug fix, dated and versioned."
        path="/changelog"
      />

      <section aria-labelledby="changelog-hero-heading" className="aiwmc-section-wash py-10 md:py-14">
        <SectionHeader
          title="What's new"
          subtitle="Every feature, security improvement, and bug fix we ship — dated, versioned, and explained."
        />
      </section>

      <div className="space-y-6 py-4">
        {CHANGELOG.map((entry, i) => {
          const meta = TYPE_META[entry.type];
          const Icon = meta.icon;
          return (
            <GlassCard
              key={entry.version}
              glow={entry.type === 'security' ? 'cyan' : entry.type === 'feature' ? 'brand' : 'violet'}
              revealDelay={i * 40}
              className="p-6"
            >
              <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
                <span className="text-muted-foreground">{entry.date}</span>
                <span className="text-muted-foreground">·</span>
                <code className="px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(148,163,255,0.10)', color: 'hsl(var(--foreground))' }}>
                  v{entry.version}
                </code>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                  style={{ ...MONO, color: meta.color, background: 'rgba(148,163,255,0.08)', border: '1px solid rgba(148,163,255,0.16)' }}
                >
                  <Icon className="w-3 h-3" /> {meta.label}
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>{entry.title}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {entry.changes.map((change, ci) => (
                  <li key={ci} className="flex gap-2">
                    <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full" style={{ background: 'var(--aiwmc-grad-cyan)' }} />
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          );
        })}
      </div>

      <GlassCard glow="brand" className="mt-6 mb-8 p-6 text-center">
        <h3 className="text-base font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>Want to be notified of new releases?</h3>
        <p className="text-sm text-muted-foreground mb-3">
          We send a brief email when we ship anything notable. Maximum once a week, often less.
        </p>
        <Link to="/" className="inline-block text-sm font-medium hover:underline" style={{ color: 'var(--aiwmc-grad-cyan)' }}>
          Subscribe via the lead magnet on the homepage →
        </Link>
      </GlassCard>
    </PublicPageShell>
  );
}
