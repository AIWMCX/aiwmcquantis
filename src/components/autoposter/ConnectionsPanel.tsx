import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, AlertTriangle, Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type Provider = 'linkedin' | 'twitter';

/** Each provider's edge function exposes the same admin-JWT POST API: { action: 'status' | 'start' }. */
const PROVIDERS: Record<Provider, {
  fn: string;
  title: string;
  blurb: string;
  idLabel: string;
  keys: [string, string];
  appName: string;
  buttonClass: string;
  note?: string;
}> = {
  linkedin: {
    fn: 'oauth-linkedin-callback',
    title: 'LinkedIn',
    blurb: 'Lets Autoposter publish approved posts to your LinkedIn profile. You sign in on LinkedIn; Quantis never sees your password.',
    idLabel: 'Member ID',
    keys: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
    appName: 'LinkedIn app',
    buttonClass: 'bg-[#0A66C2] text-white hover:bg-[#0A66C2]/90',
  },
  twitter: {
    fn: 'oauth-twitter-callback',
    title: 'X',
    blurb: 'Saves an X sign-in for Autoposter. Publishing to X is not built yet, so connecting only stores the account. You sign in on X; Quantis never sees your password.',
    idLabel: 'User ID',
    keys: ['TWITTER_CLIENT_ID', 'TWITTER_CLIENT_SECRET'],
    appName: 'X app',
    buttonClass: 'bg-black text-white hover:bg-black/80',
    note: 'X ends on its own confirmation page. Come back to this page afterwards to see the new status.',
  },
};

interface ConnectionStatus {
  configured: boolean;
  redirect_uri: string;
  connected: boolean;
  account_id: string | null;
  token_expires: string | null;
  last_tested: string | null;
  has_refresh_token: boolean;
}

async function callFn<T>(provider: Provider, action: 'status' | 'start'): Promise<T> {
  const { data, error } = await supabase.functions.invoke(PROVIDERS[provider].fn, { body: { action } });
  if (error) {
    // supabase-js wraps non-2xx responses; surface the function's own message.
    const ctx = (error as { context?: Response }).context;
    const detail = ctx ? await ctx.json().catch(() => null) : null;
    throw new Error(detail?.error ?? error.message);
  }
  return data as T;
}

/** LinkedIn's error_description arrives HTML-encoded (e.g. &quot;openid&quot;). Decode as text only. */
function decodeEntities(text: string) {
  const el = document.createElement('textarea');
  el.innerHTML = text;
  return el.value;
}

function fmt(ts: string | null) {
  return ts ? new Date(ts).toLocaleString('en-US') : '—';
}

/** Autoposter → Connections: connect LinkedIn and X via OAuth and show their state. */
export function ConnectionsPanel() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

  // Result of the LinkedIn round trip (?linkedin=connected|error).
  useEffect(() => {
    const r = params.get('linkedin');
    if (!r) return;
    setBanner(r === 'connected'
      ? { ok: true, text: `LinkedIn connected${params.get('name') ? ` as ${params.get('name')}` : ''}.` }
      : { ok: false, text: `LinkedIn connection failed: ${decodeEntities(params.get('reason') ?? 'unknown error')}` });
    qc.invalidateQueries({ queryKey: ['autoposter', 'linkedin-status'] });
    const next = new URLSearchParams(params);
    ['linkedin', 'name', 'reason'].forEach((k) => next.delete(k));
    setParams(next, { replace: true });
  }, [params, setParams, qc]);

  return (
    <div className="space-y-4">
      {banner && (
        <div role="status" className={`flex items-start gap-2 rounded-md border p-3 text-sm ${banner.ok ? 'border-emerald-500/40 text-emerald-300' : 'border-red-500/40 text-red-300'}`}>
          {banner.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-4 w-4" aria-hidden="true" />}
          {banner.text}
        </div>
      )}
      <ProviderCard provider="linkedin" />
      <ProviderCard provider="twitter" />
    </div>
  );
}

function ProviderCard({ provider }: { provider: Provider }) {
  const p = PROVIDERS[provider];
  const headingId = `${provider}-conn`;

  const status = useQuery({
    queryKey: ['autoposter', `${provider}-status`],
    queryFn: () => callFn<ConnectionStatus>(provider, 'status'),
  });

  const start = useMutation({
    mutationFn: () => callFn<{ url: string }>(provider, 'start'),
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
  });

  const s = status.data;
  const expired = s?.token_expires ? new Date(s.token_expires).getTime() < Date.now() : false;

  return (
    <section aria-labelledby={headingId} className="rounded-lg border border-[var(--q-border-subtle)] bg-[var(--q-bg-elevated)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id={headingId} className="text-base font-semibold">{p.title}</h2>
          <p className="mt-1 text-xs text-[var(--q-text-secondary)]">{p.blurb}</p>
        </div>
        {status.isLoading ? (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--q-text-secondary)]"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Checking…</span>
        ) : s?.connected && !expired ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 px-2 py-0.5 text-xs text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />Connected</span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 px-2 py-0.5 text-xs text-amber-400"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />{expired ? 'Token expired' : 'Not connected'}</span>
        )}
      </div>

      {status.isError && (
        <p role="alert" className="mt-3 text-xs text-red-300">Could not load status: {(status.error as Error).message}</p>
      )}

      {s && (
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
          <div><dt className="text-[var(--q-text-secondary)]">{p.idLabel}</dt><dd className="font-mono">{s.account_id ?? '—'}</dd></div>
          <div><dt className="text-[var(--q-text-secondary)]">Access expires</dt><dd>{fmt(s.token_expires)}</dd></div>
          <div><dt className="text-[var(--q-text-secondary)]">Last connected</dt><dd>{fmt(s.last_tested)}</dd></div>
          <div><dt className="text-[var(--q-text-secondary)]">Auto-renewal</dt><dd>{s.has_refresh_token ? 'Yes' : 'No — reconnect when it expires'}</dd></div>
        </dl>
      )}

      {s && !s.configured && (
        <div className="mt-4 rounded-md border border-amber-500/40 p-3 text-xs text-amber-300">
          The {p.appName} keys aren't set yet. In Supabase → Edge Functions → Secrets add <code>{p.keys[0]}</code> and{' '}
          <code>{p.keys[1]}</code>, and in your {p.appName} add this redirect URL:
          <code className="mt-1 block break-all">{s.redirect_uri}</code>
        </div>
      )}

      {start.isError && (
        <p role="alert" className="mt-3 text-xs text-red-300">{(start.error as Error).message}</p>
      )}

      <div className="mt-5">
        <Button
          onClick={() => start.mutate()}
          disabled={start.isPending || !s?.configured}
          className={p.buttonClass}
        >
          {start.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Link2 className="mr-2 h-4 w-4" aria-hidden="true" />}
          {s?.connected ? `Reconnect ${p.title}` : `Connect ${p.title}`}
        </Button>
        {p.note && <p className="mt-2 text-xs text-[var(--q-text-secondary)]">{p.note}</p>}
      </div>
    </section>
  );
}
