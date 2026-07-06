import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Shield, Zap, Bug } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import { Footer } from '@/components/layout/Footer';

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
  feature: { label: 'New', icon: Sparkles, color: 'text-primary bg-primary/10 border-primary/30' },
  security: { label: 'Security', icon: Shield, color: 'text-green-600 bg-green-500/10 border-green-500/30' },
  improvement: { label: 'Improved', icon: Zap, color: 'text-blue-600 bg-blue-500/10 border-blue-500/30' },
  fix: { label: 'Fix', icon: Bug, color: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/30' },
};

export default function ChangelogPage() {
  return (
    <>
      <PageMeta
        title="Changelog"
        description="Public release notes for AIWMC Quantis: every shipped feature, security improvement, and bug fix, dated and versioned."
        path="/changelog"
      />
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="container max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold">Changelog</h1>
          </div>
        </header>

        <main className="container max-w-3xl mx-auto px-4 py-12">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">What's New</h2>
            <p className="text-muted-foreground">
              Every feature, security improvement, and bug fix we ship — dated, versioned, and explained.
            </p>
          </div>

          <div className="space-y-10">
            {CHANGELOG.map((entry) => {
              const meta = TYPE_META[entry.type];
              const Icon = meta.icon;
              return (
                <article key={entry.version} className="relative pl-6 border-l-2 border-border">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-background border-2 border-primary" />
                  <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                    <span className="text-muted-foreground">{entry.date}</span>
                    <span className="text-muted-foreground">·</span>
                    <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono">v{entry.version}</code>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${meta.color}`}
                    >
                      <Icon className="w-3 h-3" />
                      {meta.label}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{entry.title}</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {entry.changes.map((change, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-primary mt-1.5 shrink-0 w-1 h-1 rounded-full bg-current" />
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>

          <section className="mt-16 p-6 rounded-2xl border border-border bg-muted/20 text-center">
            <h3 className="text-base font-semibold mb-2">Want to be notified of new releases?</h3>
            <p className="text-sm text-muted-foreground mb-3">
              We send a brief email when we ship anything notable. Maximum once a week, often less.
            </p>
            <Link
              to="/"
              className="inline-block text-sm text-primary hover:underline font-medium"
            >
              Subscribe via the lead magnet on the homepage →
            </Link>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
}
