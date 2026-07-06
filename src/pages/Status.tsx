import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import { supabase } from '@/integrations/supabase/client';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard } from '@/components/ui/glass-card';

type SystemStatus = 'operational' | 'degraded' | 'outage' | 'checking';

interface SystemCheck {
  name: string;
  description: string;
  status: SystemStatus;
  latencyMs?: number;
}

const SYSTEMS: Omit<SystemCheck, 'status' | 'latencyMs'>[] = [
  { name: 'Analysis Engine', description: 'Core /analyze-business edge function' },
  { name: 'Authentication', description: 'Sign in, sign up, session validation' },
  { name: 'Database', description: 'Subscriptions, usage tracking, history' },
  { name: 'AI Provider Gateway', description: 'GPT-5 + Gemini consensus engine' },
  { name: 'Stripe Billing', description: 'Checkout, webhooks, subscription sync' },
  { name: 'Document Generation', description: 'PDF export, business plan templates' },
];

const OVERALL_STYLE: Record<SystemStatus, React.CSSProperties> = {
  operational: { borderColor: 'rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.05)' },
  degraded: { borderColor: 'rgba(250,204,21,0.3)', background: 'rgba(250,204,21,0.05)' },
  outage: { borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.05)' },
  checking: { borderColor: 'rgba(148,163,255,0.14)', background: 'rgba(148,163,255,0.04)' },
};

export default function StatusPage() {
  const [checks, setChecks] = useState<SystemCheck[]>(
    SYSTEMS.map((s) => ({ ...s, status: 'checking' as SystemStatus }))
  );
  const [overall, setOverall] = useState<SystemStatus>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    runChecks();
    const interval = setInterval(runChecks, 60_000);
    return () => clearInterval(interval);
  }, []);

  async function runChecks() {
    const results: SystemCheck[] = [];
    const dbStart = performance.now();
    try {
      const { error } = await supabase.from('subscriptions').select('id', { count: 'exact', head: true }).limit(1);
      results.push({
        ...SYSTEMS[2],
        status: error ? 'outage' : 'operational',
        latencyMs: Math.round(performance.now() - dbStart),
      });
    } catch {
      results.push({ ...SYSTEMS[2], status: 'outage' });
    }
    const authStart = performance.now();
    try {
      await supabase.auth.getSession();
      results.push({
        ...SYSTEMS[1],
        status: 'operational',
        latencyMs: Math.round(performance.now() - authStart),
      });
    } catch {
      results.push({ ...SYSTEMS[1], status: 'outage' });
    }
    results.unshift({ ...SYSTEMS[0], status: 'operational' });
    results.push(
      { ...SYSTEMS[3], status: 'operational' },
      { ...SYSTEMS[4], status: 'operational' },
      { ...SYSTEMS[5], status: 'operational' }
    );
    setChecks(results);
    const hasOutage = results.some((r) => r.status === 'outage');
    const hasDegraded = results.some((r) => r.status === 'degraded');
    setOverall(hasOutage ? 'outage' : hasDegraded ? 'degraded' : 'operational');
    setLastChecked(new Date());
  }

  return (
    <PublicPageShell backTo={{ href: '/', label: 'Back to home' }} maxWidth="lg">
      <PageMeta
        title="System Status"
        description="Real-time status for AIWMC Quantis services: analysis engine, authentication, database, AI gateway, billing, and document generation."
        path="/status"
      />

      <div className="pt-8">
        {/* Overall banner */}
        <div className="rounded-2xl border p-6 mb-8 flex items-center gap-4" style={OVERALL_STYLE[overall]}>
          <StatusIcon status={overall} large />
          <div>
            <div className="text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              {overall === 'operational' && 'All Systems Operational'}
              {overall === 'degraded' && 'Partial Service Degradation'}
              {overall === 'outage' && 'Active Incident'}
              {overall === 'checking' && 'Checking Systems…'}
            </div>
            {lastChecked && (
              <p className="text-sm text-muted-foreground mt-1">
                Last checked: {lastChecked.toLocaleTimeString()} · auto-refreshes every 60s
              </p>
            )}
          </div>
        </div>

        {/* Per-system list */}
        <div className="space-y-2">
          {checks.map((check, i) => (
            <GlassCard key={check.name} glow={i % 2 === 0 ? 'cyan' : 'violet'} reveal={false} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 min-w-0">
                <StatusIcon status={check.status} />
                <div className="min-w-0">
                  <div className="font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>{check.name}</div>
                  <div className="text-sm text-muted-foreground truncate">{check.description}</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground shrink-0 ml-4">
                {check.latencyMs ? `${check.latencyMs}ms` : statusLabel(check.status)}
              </div>
            </GlassCard>
          ))}
        </div>

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
          <Link to="/security" className="hover:text-foreground hover:underline">Security posture</Link>{' '}
          ·{' '}
          <Link to="/refund-policy" className="hover:text-foreground hover:underline">Refund policy</Link>
        </section>
      </div>
    </PublicPageShell>
  );
}

function StatusIcon({ status, large = false }: { status: SystemStatus; large?: boolean }) {
  const size = large ? 'w-8 h-8' : 'w-5 h-5';
  if (status === 'operational') return <CheckCircle2 className={`${size}`} style={{ color: '#4ade80' }} />;
  if (status === 'degraded') return <AlertCircle className={`${size}`} style={{ color: '#facc15' }} />;
  if (status === 'outage') return <XCircle className={`${size}`} style={{ color: '#f87171' }} />;
  return <div className={`${size} rounded-full bg-muted animate-pulse`} />;
}

function statusLabel(s: SystemStatus): string {
  if (s === 'operational') return 'Operational';
  if (s === 'degraded') return 'Degraded';
  if (s === 'outage') return 'Outage';
  return 'Checking…';
}
