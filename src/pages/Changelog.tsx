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
