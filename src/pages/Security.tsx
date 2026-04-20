import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Lock, Database, Eye, AlertTriangle, FileCheck } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import { Footer } from '@/components/layout/Footer';

export default function SecurityPage() {
  return (
    <>
      <PageMeta
        title="Security Posture"
        description="How AIWMC Quantis protects your business data: encryption, RLS, GDPR, anomaly detection, vulnerability disclosure, and audit policy."
        path="/security"
      />
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold">Security & Trust</h1>
          </div>
        </header>

        <main className="container max-w-4xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Security Posture</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              You upload financial documents. We treat them with the rigor that demands. Below is exactly
              what we do — concrete, verifiable, no marketing language.
            </p>
          </div>

          <div className="space-y-6">
            <Section icon={Lock} title="Encryption">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• <strong className="text-foreground">In transit:</strong> TLS 1.3 enforced on all endpoints (HSTS preload).</li>
                <li>• <strong className="text-foreground">At rest:</strong> AES-256 encryption on all database storage and object storage (managed by Supabase / AWS).</li>
                <li>• <strong className="text-foreground">Sensitive fields:</strong> phone numbers and billing identifiers are stored encrypted at the column level.</li>
                <li>• <strong className="text-foreground">Documents you upload:</strong> processed in-memory in our edge functions; not retained beyond the analysis lifecycle unless you explicitly save them.</li>
              </ul>
            </Section>

            <Section icon={Database} title="Data isolation (Row-Level Security)">
              <p className="text-sm text-muted-foreground mb-3">
                Every row in our database carries a <code className="px-1 py-0.5 rounded bg-muted text-xs">user_id</code>.
                Postgres Row-Level Security policies enforce that <strong>no authenticated user can ever read or
                write another user's data</strong> — at the database layer, not just in application code.
              </p>
              <p className="text-sm text-muted-foreground">
                Admin access is restricted to a single founder account, gated by a database-level role check
                (not a client-side flag), and every admin read is logged.
              </p>
            </Section>

            <Section icon={Eye} title="Privacy & PII handling">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Anonymous analyses are tracked by <strong className="text-foreground">hashed</strong> device fingerprints, IP addresses, and idea content — never raw values.</li>
                <li>• Email addresses for lead capture are encrypted before storage; we hold a hash for deduplication.</li>
                <li>• You can request export or deletion of your data at any time by emailing <a href="mailto:privacy@aiwmcquantis.com" className="text-primary hover:underline">privacy@aiwmcquantis.com</a>.</li>
                <li>• See our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for full GDPR/CCPA disclosures.</li>
              </ul>
            </Section>

            <Section icon={AlertTriangle} title="Anomaly detection & abuse prevention">
              <p className="text-sm text-muted-foreground mb-3">
                A database trigger flags accounts that exceed 50 analyses per hour as automated abuse and
                quarantines their writes. Anonymous endpoints rate-limit by device, fingerprint, and hashed
                IP. AI cost limits cap per-request spend to prevent prompt-injection-driven cost attacks.
              </p>
              <p className="text-sm text-muted-foreground">
                Every entitlement denial (a Free user trying to access a paid feature) is logged for review.
              </p>
            </Section>

            <Section icon={FileCheck} title="AI safety & output validation">
              <p className="text-sm text-muted-foreground mb-3">
                Our analysis engine runs through a <strong className="text-foreground">7-layer safety architecture</strong>:
                input sanitization, prompt-injection detection, output schema validation, financial sanity
                checks (the Anti-BS layer), reconciliation rules, dual-AI consensus scoring, and a deterministic
                fallback engine if any AI provider returns unsafe output.
              </p>
              <p className="text-sm text-muted-foreground">
                Numbers in your reports are computed with <code className="px-1 py-0.5 rounded bg-muted text-xs">decimal.js</code> to
                eliminate floating-point drift, and every benchmark used is tagged with its source, sample
                size, and confidence score.
              </p>
            </Section>
          </div>

          <section className="mt-12 p-6 rounded-2xl border border-primary/30 bg-primary/5">
            <h3 className="text-lg font-semibold mb-2">Vulnerability Disclosure</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Found a security issue? Email{' '}
              <a href="mailto:security@aiwmcquantis.com" className="text-primary hover:underline font-medium">
                security@aiwmcquantis.com
              </a>{' '}
              with reproduction steps. We commit to a first response within 72 hours and will publicly credit
              good-faith reporters (with permission). Please do not test against other users' accounts.
            </p>
            <p className="text-xs text-muted-foreground">
              We do not yet operate a paid bug bounty, but credible findings receive Pro account credit.
            </p>
          </section>

          <section className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/status" className="hover:text-foreground hover:underline">
              System status
            </Link>{' '}
            ·{' '}
            <Link to="/privacy" className="hover:text-foreground hover:underline">
              Privacy policy
            </Link>{' '}
            ·{' '}
            <Link to="/terms" className="hover:text-foreground hover:underline">
              Terms
            </Link>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Lock;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-6 rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}
