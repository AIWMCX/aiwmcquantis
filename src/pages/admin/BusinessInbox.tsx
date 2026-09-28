import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CheckCircle2, Inbox, Loader2, RefreshCw, Send, XCircle } from 'lucide-react';

// Business mailboxes inside Quantis: support@ / legal@ tickets, the
// hello@ / market@ pipeline inbox, and mailbox health + outreach sending
// settings. Reads go straight to the admin-only tables (RLS); every write
// goes through the business-mail edge function.

interface Ticket {
  id: string;
  ticket_number: number;
  queue: 'support' | 'legal';
  mailbox_address: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  subject: string;
  requester_email: string;
  requester_name: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  updated_at: string;
  created_at: string;
}

interface MailMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  mailbox_address: string | null;
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  subject: string | null;
  body_text: string | null;
  message_at: string;
  route: string;
  classification: string;
  match_status: string;
  prospect_id: string | null;
  ticket_id: string | null;
  bounced_recipient: string | null;
}

interface TicketEvent {
  id: string;
  kind: string;
  body: string | null;
  created_at: string;
}

async function mail(action: string, body: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('business-mail', { body: { action, ...body } });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      const parsed = await ctx.json().catch(() => null);
      if (parsed?.error) throw new Error(parsed.error);
    }
    throw error;
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
const PRIORITY_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { urgent: 'destructive', high: 'default', normal: 'secondary', low: 'outline' };
const CLASS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { human: 'default', unsubscribe: 'destructive', bounce: 'destructive', auto_reply: 'outline', system: 'outline', outbound: 'secondary' };

export default function BusinessInbox() {
  const { isAdmin, isLoading } = useAdmin();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isLoading && !isAdmin) navigate('/app', { replace: true });
  }, [isAdmin, isLoading, navigate]);

  const [tab, setTab] = useState('support');

  const ticketsQuery = useQuery({
    queryKey: ['support-tickets'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('support_tickets').select('*').order('updated_at', { ascending: false }).limit(300);
      if (error) throw error;
      return (data ?? []) as Ticket[];
    },
    enabled: isAdmin,
    refetchInterval: 60_000,
  });

  const statusQuery = useQuery({
    queryKey: ['business-mail-status'],
    queryFn: () => mail('status'),
    enabled: isAdmin,
    staleTime: 60_000,
  });

  if (isLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const tickets = ticketsQuery.data ?? [];
  const openCount = (q: string) => tickets.filter((t) => t.queue === q && t.status === 'open').length;
  const status = statusQuery.data;
  const needsSetup = status && (!status.configured || !status.dns?.ready);

  return (
    <AppLayout title="Business Inbox">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Inbox className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Business Inbox</h1>
            <p className="text-sm text-muted-foreground">
              support@ and legal@ arrive here as tickets. hello@ and market@ feed the sales pipeline. Replies go out from the same address.
            </p>
          </div>
        </div>

        {needsSetup && (
          <Card className="p-4 border-amber-500/50 bg-amber-500/5 text-sm space-y-1">
            <p className="font-semibold">Mailbox setup is not finished</p>
            {!status.configured && <p>Zoho Mail is not connected yet, so nothing syncs. See the Mailbox &amp; sending tab.</p>}
            {status.dns && !status.dns.ready && <p>The domain's SPF/DKIM do not authorize Zoho, and DMARC is set to reject. Mail sent from these addresses can be rejected until that's fixed.</p>}
            <button className="text-primary text-xs hover:underline" onClick={() => setTab('mailbox')}>Open Mailbox &amp; sending →</button>
          </Card>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="support">Support {openCount('support') > 0 && <Badge className="ml-1">{openCount('support')}</Badge>}</TabsTrigger>
            <TabsTrigger value="legal">Legal {openCount('legal') > 0 && <Badge className="ml-1">{openCount('legal')}</Badge>}</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline inbox</TabsTrigger>
            <TabsTrigger value="mailbox">Mailbox &amp; sending</TabsTrigger>
          </TabsList>

          <TabsContent value="support" className="mt-4">
            <TicketQueue queue="support" tickets={tickets.filter((t) => t.queue === 'support')} loading={ticketsQuery.isLoading} />
          </TabsContent>
          <TabsContent value="legal" className="mt-4">
            <TicketQueue queue="legal" tickets={tickets.filter((t) => t.queue === 'legal')} loading={ticketsQuery.isLoading} />
          </TabsContent>
          <TabsContent value="pipeline" className="mt-4">
            <PipelineInbox />
          </TabsContent>
          <TabsContent value="mailbox" className="mt-4">
            <MailboxPanel status={status} loading={statusQuery.isLoading} error={statusQuery.error as Error | null} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// ── Tickets ──────────────────────────────────────────────────────────────

function TicketQueue({ queue, tickets, loading }: { queue: 'support' | 'legal'; tickets: Ticket[]; loading: boolean }) {
  const [filter, setFilter] = useState<'active' | 'resolved' | 'all'>('active');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const shown = tickets.filter((t) => (filter === 'all' ? true : filter === 'active' ? ['open', 'pending'].includes(t.status) : ['resolved', 'closed'].includes(t.status)));
  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4">
      <Card className="p-3 space-y-2 h-fit">
        <div className="flex gap-1">
          {(['active', 'resolved', 'all'] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'ghost'} onClick={() => setFilter(f)}>{f}</Button>
          ))}
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {!loading && shown.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {queue === 'legal' ? 'No legal tickets.' : 'No tickets.'} Mail to {queue}@aiwmcquantis.com appears here after the next sync (every 5 minutes).
          </p>
        )}
        <ul className="divide-y">
          {shown.map((t) => (
            <li key={t.id}>
              <button
                className={`w-full text-left py-2 px-2 rounded-md hover:bg-muted/60 ${selectedId === t.id ? 'bg-muted' : ''}`}
                onClick={() => setSelectedId(t.id)}
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium truncate">#{t.ticket_number} {t.subject}</span>
                  <Badge variant={t.status === 'open' ? 'default' : 'outline'}>{t.status}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="truncate">{t.requester_name ? `${t.requester_name} · ` : ''}{t.requester_email}</span>
                  {t.priority !== 'normal' && <Badge variant={PRIORITY_VARIANT[t.priority]} className="text-[10px]">{t.priority}</Badge>}
                  <span className="ml-auto shrink-0">{new Date(t.updated_at).toLocaleDateString()}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </Card>
      {selected ? <TicketDetail ticket={selected} /> : (
        <Card className="p-6 text-sm text-muted-foreground">Select a ticket.</Card>
      )}
    </div>
  );
}

function TicketDetail({ ticket }: { ticket: Ticket }) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const threadQuery = useQuery({
    queryKey: ['ticket-thread', ticket.id],
    queryFn: async () => {
      const [{ data: msgs, error: e1 }, { data: events, error: e2 }] = await Promise.all([
        (supabase as any).from('mail_messages').select('*').eq('ticket_id', ticket.id).order('message_at', { ascending: true }),
        (supabase as any).from('support_ticket_events').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true }),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return { messages: (msgs ?? []) as MailMessage[], events: (events ?? []) as TicketEvent[] };
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['ticket-thread', ticket.id] });
    queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
  };

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  const timeline = useMemo(() => {
    const t = threadQuery.data;
    if (!t) return [];
    return [
      ...t.messages.map((m) => ({ at: m.message_at, kind: 'message' as const, m })),
      ...t.events.map((e) => ({ at: e.created_at, kind: 'event' as const, e })),
    ].sort((a, b) => a.at.localeCompare(b.at));
  }, [threadQuery.data]);

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">#{ticket.ticket_number} {ticket.subject}</h2>
          <Badge variant={PRIORITY_VARIANT[ticket.priority]}>{ticket.priority}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          From {ticket.requester_name ? `${ticket.requester_name} <${ticket.requester_email}>` : ticket.requester_email} · to {ticket.mailbox_address} · opened {when(ticket.created_at)}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Select value={ticket.status} onValueChange={(v) => run('status', () => mail('ticket_update', { ticket_id: ticket.id, status: v }), 'Status updated')}>
            <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>{['open', 'pending', 'resolved', 'closed'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={ticket.priority} onValueChange={(v) => run('priority', () => mail('ticket_update', { ticket_id: ticket.id, priority: v }), 'Priority updated')}>
            <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>{['low', 'normal', 'high', 'urgent'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
        {threadQuery.isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {timeline.map((item) =>
          item.kind === 'message' ? (
            <div key={item.m.id} className={`rounded-md p-3 text-sm ${item.m.direction === 'outbound' ? 'bg-primary/5 ml-6' : 'bg-muted/50 mr-6'}`}>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-1">
                <span>{item.m.direction === 'outbound' ? `Sent from ${item.m.from_address}` : (item.m.from_name ? `${item.m.from_name} <${item.m.from_address}>` : item.m.from_address)}</span>
                <span>{when(item.m.message_at)}</span>
              </div>
              <pre className="whitespace-pre-wrap break-words font-sans">{item.m.body_text}</pre>
            </div>
          ) : (
            <p key={item.e.id} className="text-xs text-muted-foreground text-center">
              {item.e.kind === 'note' ? <span className="inline-block text-left bg-amber-500/10 rounded px-2 py-1 text-foreground">Internal note: {item.e.body}</span> : `${item.e.kind}: ${item.e.body ?? ''}`} · {when(item.e.created_at)}
            </p>
          ),
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`reply-${ticket.id}`}>Reply to {ticket.requester_email}</Label>
        <Textarea id={`reply-${ticket.id}`} rows={5} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write the reply. The signature and ticket number are added automatically." />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={!reply.trim() || !!busy} onClick={() => run('reply', async () => { await mail('ticket_reply', { ticket_id: ticket.id, body: reply, status_after: 'pending' }); setReply(''); }, 'Reply sent')}>
            {busy === 'reply' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />} Send
          </Button>
          <Button size="sm" variant="outline" disabled={!reply.trim() || !!busy} onClick={() => run('reply-resolve', async () => { await mail('ticket_reply', { ticket_id: ticket.id, body: reply, status_after: 'resolved' }); setReply(''); }, 'Reply sent and resolved')}>
            <CheckCircle2 className="w-4 h-4 mr-1" /> Send &amp; resolve
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`note-${ticket.id}`}>Internal note (never emailed)</Label>
        <div className="flex gap-2">
          <Input id={`note-${ticket.id}`} value={note} onChange={(e) => setNote(e.target.value)} />
          <Button size="sm" variant="outline" disabled={!note.trim() || !!busy} onClick={() => run('note', async () => { await mail('ticket_note', { ticket_id: ticket.id, body: note }); setNote(''); }, 'Note added')}>Add</Button>
        </div>
      </div>
    </Card>
  );
}

// ── Pipeline inbox (hello@, market@, prospect replies) ────────────────

function PipelineInbox() {
  const messagesQuery = useQuery({
    queryKey: ['pipeline-inbox'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('mail_messages')
        .select('*')
        .in('route', ['acquisition', 'outreach'])
        .order('message_at', { ascending: false })
        .limit(150);
      if (error) throw error;
      const rows = (data ?? []) as MailMessage[];
      const ids = Array.from(new Set(rows.map((r) => r.prospect_id).filter(Boolean)));
      const { data: ps } = ids.length
        ? await (supabase as any).from('commercial_prospects').select('id, company_name, stage, suppression_status').in('id', ids)
        : { data: [] };
      const byId = new Map(((ps ?? []) as Array<{ id: string; company_name: string; stage: string; suppression_status: string }>).map((p) => [p.id, p]));
      return rows.map((r) => ({ ...r, prospect: r.prospect_id ? byId.get(r.prospect_id) ?? null : null }));
    },
    refetchInterval: 60_000,
  });
  const [open, setOpen] = useState<string | null>(null);
  const rows = messagesQuery.data ?? [];

  return (
    <Card className="p-3">
      {messagesQuery.isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {!messagesQuery.isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Nothing yet. Replies to outreach, opt-outs, bounces and new mail to hello@ / market@ appear here. Known prospects are matched automatically; unknown senders become inbound prospects in Commercial Ops.
        </p>
      )}
      <ul className="divide-y">
        {rows.map((m) => (
          <li key={m.id} className="py-2">
            <button className="w-full text-left" onClick={() => setOpen(open === m.id ? null : m.id)}>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant={CLASS_VARIANT[m.classification] ?? 'outline'}>{m.direction === 'outbound' ? 'sent' : m.classification.replace('_', ' ')}</Badge>
                <span className="font-medium">{m.prospect?.company_name ?? (m.direction === 'outbound' ? m.to_addresses[0] : m.from_address)}</span>
                <span className="text-muted-foreground truncate max-w-[24rem]">{m.subject}</span>
                {m.match_status === 'new_inbound' && <Badge variant="secondary">new inbound lead</Badge>}
                {m.match_status === 'ambiguous' && <Badge variant="outline">matches several prospects</Badge>}
                {m.prospect && <Badge variant="outline">{m.prospect.stage}</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">{when(m.message_at)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {m.direction === 'outbound' ? `from ${m.from_address}` : `to ${m.mailbox_address ?? m.to_addresses.join(', ')}`}
                {m.bounced_recipient ? ` · bounced: ${m.bounced_recipient}` : ''}
              </p>
            </button>
            {open === m.id && <pre className="mt-2 text-sm whitespace-pre-wrap break-words font-sans bg-muted/40 rounded-md p-3">{m.body_text}</pre>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ── Mailbox health + sending settings ───────────────────────────────────

function MailboxPanel({ status, loading, error }: { status: any; loading: boolean; error: Error | null }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const s = { ...(status?.settings ?? {}), ...draft };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['business-mail-status'] });
  const run = async (key: string, fn: () => Promise<any>, ok: (r: any) => string): Promise<boolean> => {
    setBusy(key);
    try {
      const r = await fn();
      toast.success(ok(r));
      refresh();
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-inbox'] });
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
      return false;
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Loader2 className="w-5 h-5 animate-spin" />;
  if (error) return <Card className="p-4 text-sm text-destructive">Could not load mailbox status: {error.message}</Card>;
  if (!status) return null;

  const decision = status.outreach?.decision;
  const saveSettings = (patch: Record<string, unknown>) =>
    run('save', () => mail('update_settings', { patch }), () => 'Settings saved').then((ok) => { if (ok) setDraft({}); });

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Zoho Mail connection</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={!status.configured || !!busy} onClick={() => run('sync', () => mail('sync_now'), (r) => `Synced: ${r.sync?.imported ?? 0} new message(s)`)}>
              {busy === 'sync' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />} Sync now
            </Button>
          </div>
        </div>
        {status.configured ? (
          <>
            {status.accounts_error && <p className="text-sm text-destructive">{status.accounts_error}</p>}
            {(status.accounts ?? []).map((a: any) => (
              <p key={a.accountId} className="text-sm">
                <CheckCircle2 className="w-4 h-4 inline text-emerald-500 mr-1" />
                {a.primaryEmail} <span className="text-muted-foreground">· can send as {a.sendAs.join(', ')}</span>
              </p>
            ))}
            {(status.sync_state ?? []).map((r: any) => (
              <p key={`${r.account_id}-${r.folder}`} className="text-xs text-muted-foreground">
                {r.folder}: last run {when(r.last_run_at)} · last ok {when(r.last_ok_at)}{r.last_error ? ` · error: ${r.last_error}` : ''}
              </p>
            ))}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Not connected. Set the Supabase secrets ZOHO_MAIL_CLIENT_ID, ZOHO_MAIL_CLIENT_SECRET and ZOHO_MAIL_REFRESH_TOKEN (runbook: docs/execution/BUSINESS_MAILBOXES_RUNBOOK_2026-09-28.md). Sync then runs every 5 minutes.
          </p>
        )}
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="font-semibold">Domain authentication (aiwmcquantis.com)</h3>
        {(status.dns?.checks ?? []).map((c: any) => (
          <div key={c.id} className="text-sm">
            <p>
              {c.ok ? <CheckCircle2 className="w-4 h-4 inline text-emerald-500 mr-1" /> : <XCircle className="w-4 h-4 inline text-destructive mr-1" />}
              <span className="font-medium uppercase mr-1">{c.id}</span>
              <span className="text-muted-foreground break-all">{c.detail}</span>
            </p>
            {!c.ok && c.fix && <p className="text-xs ml-5 mt-0.5 bg-muted/50 rounded p-2 break-all">Fix: {c.fix}</p>}
          </div>
        ))}
        {status.dns?.error && <p className="text-sm text-destructive">DNS check failed: {status.dns.error}</p>}
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="font-semibold">Mailboxes and routing</h3>
        {(status.mailboxes ?? []).map((m: any) => (
          <div key={m.address} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium w-64">{m.address}</span>
            <Badge variant="outline">{m.pipeline === 'ticketing' ? `${m.queue} tickets` : 'sales pipeline'}</Badge>
            {m.can_send && <Badge variant="secondary">replies from here</Badge>}
            <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              active
              <Switch checked={m.active} onCheckedChange={(v) => run('mb', () => mail('update_mailbox', { address: m.address, active: v }), () => 'Mailbox updated')} />
            </label>
          </div>
        ))}
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">Outreach sending</h3>
          <label className="flex items-center gap-2 text-sm">
            Sending {status.settings?.outreach_enabled ? 'on' : 'off'}
            <Switch
              checked={!!status.settings?.outreach_enabled}
              disabled={!!busy}
              onCheckedChange={(v) => saveSettings({ outreach_enabled: v })}
            />
          </label>
        </div>
        <p className="text-sm">
          {decision?.ok
            ? <span className="text-emerald-600">Ready: the next queued message goes out within 5 minutes.</span>
            : <span className="text-muted-foreground">Not sending now: {decision?.detail}.</span>}
          {' '}<span className="text-muted-foreground">Today {status.outreach?.sentToday ?? 0}/{decision?.cap ?? '—'} · queued {status.outreach?.queued ?? 0}</span>
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Send from" value={String(s.outreach_from ?? '')} onChange={(v) => setDraft({ ...draft, outreach_from: v })} />
          <Field label="Daily cap" type="number" value={String(s.daily_cap ?? '')} onChange={(v) => setDraft({ ...draft, daily_cap: Number(v) })} />
          <Field label="Min minutes between sends" type="number" value={String(s.min_gap_minutes ?? '')} onChange={(v) => setDraft({ ...draft, min_gap_minutes: Number(v) })} />
          <Field label="Timezone" value={String(s.send_timezone ?? '')} onChange={(v) => setDraft({ ...draft, send_timezone: v })} />
          <Field label="Start hour" type="number" value={String(s.send_start_hour ?? '')} onChange={(v) => setDraft({ ...draft, send_start_hour: Number(v) })} />
          <Field label="End hour" type="number" value={String(s.send_end_hour ?? '')} onChange={(v) => setDraft({ ...draft, send_end_hour: Number(v) })} />
          <Field label="Warm-up start (YYYY-MM-DD)" value={String(s.warmup_start ?? '')} onChange={(v) => setDraft({ ...draft, warmup_start: v || null })} />
          <Field label="Warm-up: day-1 cap" type="number" value={String(s.warmup_base ?? '')} onChange={(v) => setDraft({ ...draft, warmup_base: Number(v) })} />
          <Field label="Warm-up: + per day" type="number" value={String(s.warmup_step ?? '')} onChange={(v) => setDraft({ ...draft, warmup_step: Number(v) })} />
          <Field label="DKIM selector" value={String(s.dkim_selector ?? '')} onChange={(v) => setDraft({ ...draft, dkim_selector: v })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={!!s.support_auto_ack} onCheckedChange={(v) => setDraft({ ...draft, support_auto_ack: v })} />
          Auto-acknowledge new support@ tickets (never for legal, auto-replies or system mail)
        </label>
        <div className="flex gap-2">
          <Button size="sm" disabled={Object.keys(draft).length === 0 || !!busy} onClick={() => saveSettings(draft)}>Save settings</Button>
          {Object.keys(draft).length > 0 && <Button size="sm" variant="ghost" onClick={() => setDraft({})}>Discard</Button>}
        </div>
        <p className="text-xs text-muted-foreground">
          Only messages you approved in Commercial Ops and then queued are sent, one at a time, inside the window above. Before every send the system re-checks: suppression list, opt-outs, bounces, a reply from the prospect (which stops the sequence), duplicate addresses contacted in the last 30 days, and the campaign's daily limit.
        </p>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-8" />
    </div>
  );
}
