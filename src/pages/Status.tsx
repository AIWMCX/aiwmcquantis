import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, XCircle, HelpCircle } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import { supabase } from '@/integrations/supabase/client';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard } from '@/components/ui/glass-card';

type ComponentStatus = 'operational' | 'degraded' | 'outage' | 'unmonitored';
type OverallStatus = ComponentStatus | 'checking';

interface ComponentSignal {
  key: string;
  name: string;
  description: string;
  status: ComponentStatus;
  detail: string;
  latencyMs?: number;
}

interface Incident {
  id: string;
  title: string;
  component: string;
  severity: 'minor' | 'major' | 'critical' | 'maintenance';
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'scheduled';
  detected_at: string;
  resolved_at: string | null;
  summary: string;
}

interface StatusResponse {
  status: ComponentStatus;
  checked_at: string;
  components: ComponentSignal[];
  incidents: Incident[];
}

const OVERALL_STYLE: Record<OverallStatus, React.CSSProperties> = {
  operational: { borderColor: 'rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.05)' },
  degraded: { borderColor: 'rgba(250,204,21,0.3)', background: 'rgba(250,204,21,0.05)' },
  outage: { borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.05)' },
  unmonitored: { borderColor: 'rgba(148,163,255,0.14)', background: 'rgba(148,163,255,0.04)' },
  checking: { borderColor: 'rgba(148,163,255,0.14)', background: 'rgba(148,163,255,0.04)' },
};

export default function StatusPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    runCheck();
    const interval = setInterval(runCheck, 60_000);
    return () => clearInterval(interval);
  }, []);

  async function runCheck() {
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke<StatusResponse>('system-status');
      if (fnError || !result) {
        setError(true);
        return;
      }
      setData(result);
      setError(false);
      setLastChecked(new Date());
    } catch {
      setError(true);
    }
  }

  const overall: OverallStatus = error ? 'outage' : data ? data.status : 'checking';

  return (
    <PublicPageShell backTo={{ href: '/', label: 'Back to home' }} maxWidth="lg">
      <PageMeta
        title="System Status"
        description="Real-time status for AIWMC Quantis services: deterministic analysis engine, AI narrative generation, authentication, database, billing, and benchmarks."
        path="/status"
      />

      <div className="pt-8">
        <div className="rounded-2xl border p-6 mb-8 flex items-center gap-4" style={OVERALL_STYLE[overall]}>
          <StatusIcon status={overall} large />
          <div>
            <div className="text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              {overall === 'operational' && 'All Monitored Systems Operational'}
              {overall === 'degraded' && 'Partial Service Degradation'}
              {overall === 'outage' && 'Active Incident'}
              {overall === 'checking' && 'Checking Systems…'}
            </div>
            {lastChecked && !error && (
              <p className="text-sm text-muted-foreground mt-1">
                Last checked: {lastChecked.toLocaleTimeString()} · auto-refreshes every 60s
              </p>
            )}
            {error && (
              <p className="text-sm text-muted-foreground mt-1">
                Could not reach the status endpoint itself — treating that as an incident, not silently hiding it.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {(data?.components ?? SKELETON).map((check, i) => (
            <GlassCard key={check.key} glow={i % 2 === 0 ? 'cyan' : 'violet'} reveal={false} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 min-w-0">
                <StatusIcon status={check.status} />
                <div className="min-w-0">
                  <div className="font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>{check.name}</div>
                  <div className="text-sm text-muted-foreground truncate">{check.description}</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground shrink-0 ml-4 text-right">
                {statusLabel(check.status)}
                {check.detail && <div className="text-xs opacity-70 max-w-[220px] truncate" title={check.detail}>{check.detail}</div>}
              </div>
            </GlassCard>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          "Unmonitored" means there is no live health signal for that component yet — it is not claimed as operational when we
          cannot actually verify it. AI Narrative Generation is tracked separately from the deterministic engine: the financial
          calculations do not depend on AI output being available.
        </p>

        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>Incident History</h2>
          {data && data.incidents.length === 0 && (
            <p className="text-sm text-muted-foreground">No incidents on record.</p>
          )}
          <div className="space-y-3">
            {(data?.incidents ?? []).map((incident) => (
              <GlassCard key={incident.id} reveal={false} className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>{incident.title}</div>
                  <SeverityBadge severity={incident.severity} incidentStatus={incident.status} />
                </div>
                <p className="text-sm text-muted-foreground mt-2">{incident.summary}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {incident.component} · Detected {new Date(incident.detected_at).toLocaleDateString()}
                  {incident.resolved_at && ` · Resolved ${new Date(incident.resolved_at).toLocaleDateString()}`}
                </p>
              </GlassCard>
            ))}
          </div>
        </section>

        <GlassCard glow="brand" className="mt-8 p-6">
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>Reporting an Issue</h2>
          <p className="text-sm text-muted-foreground mb-3">
            If you're experiencing a problem not reflected here, email{' '}
            <a href="mailto:support@aiwmcquantis.com" className="hover:underline" style={{ color: 'var(--aiwmc-grad-cyan)' }}>
              support@aiwmcquantis.com
            </a>
            . Include your account email, the time of the issue, and a screenshot of any error message.
          </p>
          <p className="text-xs text-muted-foreground">
            Response targets: Free — best effort · Plus — 24h · Pro — 24h guaranteed
          </p>
        </GlassCard>

        <section className="mt-6 mb-8 text-center text-xs text-muted-foreground">
          <Link to="/changelog" className="hover:text-foreground hover:underline">View changelog</Link>{' '}
          ·{' '}
          <Link to="/state-of-quantis" className="hover:text-foreground hover:underline">State of Quantis</Link>{' '}
          ·{' '}
          <Link to="/security" className="hover:text-foreground hover:underline">Security posture</Link>
        </section>
      </div>
    </PublicPageShell>
  );
}

const SKELETON: ComponentSignal[] = [
  { key: 'database', name: 'Database', description: 'Accounts, subscriptions, usage tracking, analysis history', status: 'unmonitored', detail: '' },
  { key: 'auth', name: 'Authentication', description: 'Sign in, sign up, session validation', status: 'unmonitored', detail: '' },
  { key: 'engine', name: 'Analysis Engine (deterministic)', description: 'Financial calculations, RVCE, invariant safety checks', status: 'unmonitored', detail: '' },
  { key: 'ai_narrative', name: 'AI Narrative Generation', description: 'AI-authored commentary layered on top of the deterministic numbers', status: 'unmonitored', detail: '' },
  { key: 'billing', name: 'Billing', description: 'Checkout, Stripe webhooks, subscription sync', status: 'unmonitored', detail: '' },
  { key: 'benchmarks', name: 'RVCE / Benchmark Corpus', description: 'Industry and location benchmark data backing comparisons', status: 'unmonitored', detail: '' },
  { key: 'reports', name: 'Report / PDF Generation', description: 'Business plan document and PDF export', status: 'unmonitored', detail: '' },
];

function StatusIcon({ status, large = false }: { status: OverallStatus; large?: boolean }) {
  const size = large ? 'w-8 h-8' : 'w-5 h-5';
  if (status === 'operational') return <CheckCircle2 className={`${size}`} style={{ color: '#4ade80' }} />;
  if (status === 'degraded') return <AlertCircle className={`${size}`} style={{ color: '#facc15' }} />;
  if (status === 'outage') return <XCircle className={`${size}`} style={{ color: '#f87171' }} />;
  if (status === 'unmonitored') return <HelpCircle className={`${size}`} style={{ color: '#94a3ff' }} />;
  return <div className={`${size} rounded-full bg-muted animate-pulse`} />;
}

function statusLabel(s: ComponentStatus): string {
  if (s === 'operational') return 'Operational';
  if (s === 'degraded') return 'Degraded';
  if (s === 'outage') return 'Outage';
  return 'Unmonitored';
}

function SeverityBadge({ severity, incidentStatus }: { severity: Incident['severity']; incidentStatus: Incident['status'] }) {
  const colors: Record<Incident['severity'], string> = {
    minor: '#94a3ff',
    major: '#facc15',
    critical: '#f87171',
    maintenance: '#4ade80',
  };
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full border shrink-0"
      style={{ color: colors[severity], borderColor: colors[severity] + '55', background: colors[severity] + '11' }}
    >
      {incidentStatus === 'resolved' ? 'Resolved' : incidentStatus} · {severity}
    </span>
  );
}
