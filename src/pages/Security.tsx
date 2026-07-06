import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Database, Eye, AlertTriangle, FileCheck } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard, SectionHeader } from '@/components/ui/glass-card';

export default function SecurityPage() {
  return (
    <PublicPageShell backTo={{ href: '/', label: 'Back to home' }} maxWidth="md">
      <PageMeta
        title="Security Posture"
        description="How AIWMC Quantis protects your business data: encryption, RLS, GDPR, anomaly detection, vulnerability disclosure, and audit policy."
        path="/security"
      />

      <section aria-labelledby="security-hero-heading" className="aiwmc-section-wash py-10 md:py-14">
        <div className="flex justify-center mb-4">
          <ShieldCheck className="w-14 h-14" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
        </div>
        <SectionHeader
          title="Security posture"
          subtitle="You upload financial documents. We treat them with the rigor that demands. Below is exactly what we do — concrete, verifiable, no marketing language."
        />
      </section>

      <div className="space-y-4">
        <Section icon={Lock} glow="cyan" title="Encryption">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• <strong style={{ color: 'hsl(var(--foreground))' }}>In transit:</strong> TLS 1.3 enforced on all endpoints (HSTS preload).</li>
            <li>• <strong style={{ color: 'hsl(var(--foreground))' }}>At rest:</strong> AES-256 encryption on all database storage and object storage (managed by Supabase / AWS).</li>
            <li>• <strong style={{ color: 'hsl(var(--foreground))' }}>Sensitive fields:</strong> phone numbers and billing identifiers are stored encrypted at the column level.</li>
            <li>• <strong style={{ color: 'hsl(var(--foreground))' }}>Documents you upload:</strong> processed in-memory in our edge functions; not retained beyond the analysis lifecycle unless you explicitly save them.</li>
          </ul>
        </Section>

        <Section icon={Database} glow="violet" title="Data isolation (Row-Level Security)">
          <p className="text-sm text-muted-foreground mb-3">
            Every row in our database carries a <code className="px-1 py-0.5 rounded bg-muted text-xs">user_id</code>.
            Postgres Row-Level Security policies enforce that <strong style={{ color: 'hsl(var(--foreground))' }}>no authenticated user can ever read or
            write another user's data</strong> — at the database layer, not just in application code.
          </p>
          <p className="text-sm text-muted-foreground">
            Admin access is restricted to a single founder account, gated by a database-level role check
            (not a client-side flag), and every admin read is logged.
          </p>
        </Section>

        <Section icon={Eye} glow="cyan" title="Privacy & PII handling">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Anonymous analyses are tracked by <strong style={{ color: 'hsl(var(--foreground))' }}>hashed</strong> device fingerprints, IP addresses, and idea content — never raw values.</li>
            <li>• Email addresses for lead capture are encrypted before storage; we hold a hash for deduplication.</li>
            <li>• You can request export or deletion of your data at any time by emailing <a href="mailto:privacy@aiwmcquantis.com" className="hover:underline" style={{ color: 'var(--aiwmc-grad-cyan)' }}>privacy@aiwmcquantis.com</a>.</li>
            <li>• See our <Link to="/privacy" className="hover:underline" style={{ color: 'var(--aiwmc-grad-cyan)' }}>Privacy Policy</Link> for full GDPR/CCPA disclosures.</li>
          </ul>
        </Section>

        <Section icon={AlertTriangle} glow="brand" title="Anomaly detection & abuse prevention">
          <p className="text-sm text-muted-foreground mb-3">
            A database trigger flags accounts that exceed 50 analyses per hour as automated abuse and
            quarantines their writes. Anonymous endpoints rate-limit by device, fingerprint, and hashed
            IP. AI cost limits cap per-request spend to prevent prompt-injection-driven cost attacks.
          </p>
          <p className="text-sm text-muted-foreground">
            Every entitlement denial (a Free user trying to access a paid feature) is logged for review.
          </p>
        </Section>

        <Section icon={FileCheck} glow="violet" title="AI safety & output validation">
          <p className="text-sm text-muted-foreground mb-3">
            Our analysis engine runs through an <strong style={{ color: 'hsl(var(--foreground))' }}>8-layer safety architecture (incl. RVCE)</strong>:
            input sanitization, prompt-injection detection, output schema validation, financial sanity
            checks (the Anti-BS layer), reconciliation rules, multi-model consensus scoring, RVCE cross-validation,
            and a deterministic fallback engine if any AI provider returns unsafe output.
          </p>
          <p className="text-sm text-muted-foreground">
            Numbers in your reports are computed with <code className="px-1 py-0.5 rounded bg-muted text-xs">decimal.js</code> to
            eliminate floating-point drift, and every benchmark used is tagged with its source, sample
            size, and confidence score.
          </p>
        </Section>
      </div>

      <GlassCard glow="cyan" className="mt-8 p-6">
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>Vulnerability Disclosure</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Found a security issue? Email{' '}
          <a href="mailto:security@aiwmcquantis.com" className="font-medium hover:underline" style={{ color: 'var(--aiwmc-grad-cyan)' }}>
            security@aiwmcquantis.com
          </a>{' '}
          with reproduction steps. We commit to a first response within 72 hours and will publicly credit
          good-faith reporters (with permission). Please do not test against other users' accounts.
        </p>
        <p className="text-xs text-muted-foreground">
          We do not yet operate a paid bug bounty, but credible findings receive Pro account credit.
        </p>
      </GlassCard>

      <section className="mt-6 mb-8 text-center text-xs text-muted-foreground">
        <Link to="/status" className="hover:text-foreground hover:underline">System status</Link>{' '}
        ·{' '}
        <Link to="/privacy" className="hover:text-foreground hover:underline">Privacy policy</Link>{' '}
        ·{' '}
        <Link to="/terms" className="hover:text-foreground hover:underline">Terms</Link>
      </section>
    </PublicPageShell>
  );
}

function Section({
  icon: Icon,
  glow,
  title,
  children,
}: {
  icon: typeof Lock;
  glow: 'cyan' | 'violet' | 'brand';
  title: string;
  children: React.ReactNode;
}) {
  return (
    <GlassCard glow={glow} className="p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(148,163,255,0.10)' }}>
          <Icon className="w-5 h-5" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
        </div>
        <h3 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{title}</h3>
      </div>
      {children}
    </GlassCard>
  );
}
