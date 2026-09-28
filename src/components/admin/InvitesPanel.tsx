import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Gift, Layers, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { generateInviteToken, inviteUrl } from '@/lib/invites';

// "1 month of Pro, free" invite links for founder-led outreach. Each link is
// for one person; they can sign up with any email or Google and Pro turns on
// immediately (redeem_plan_invite). The table below shows what each invitee
// has actually done since (get_plan_invite_activity).

interface InviteRow {
  id: string;
  token: string;
  plan_id: string;
  duration_days: number;
  max_redemptions: number;
  redeemed_count: number;
  redeem_by: string;
  label: string;
  channel: string | null;
  revoked_at: string | null;
  created_at: string;
}

interface ActivityRow {
  invite_id: string;
  user_id: string;
  email: string | null;
  redeemed_at: string;
  period_end: string;
  last_sign_in_at: string | null;
  analyses: number;
  last_analysis_at: string | null;
  invoices: number;
  documents: number;
  plan_now: string | null;
  paid: boolean;
}

const CHANNELS = ['linkedin', 'email', 'instagram', 'facebook', 'telegram', 'whop', 'referral', 'other'];

// Commercial rule: a Pro invite link is a "claim it now" offer, not
// something that sits open for a month. Unredeemed after this window, it
// dies -- preview_plan_invite/redeem_plan_invite both refuse it as
// 'expired' server-side, for anyone, including the original recipient.
// A fresh link (single or bulk) is the only way to give that person
// another chance.
const REDEEM_WINDOW_HOURS = 24;
const redeemByFromNow = () => new Date(Date.now() + REDEEM_WINDOW_HOURS * 3600_000).toISOString();

function statusOf(i: InviteRow): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
  if (i.revoked_at) return { label: 'revoked', variant: 'destructive' };
  if (i.redeemed_count >= i.max_redemptions) return { label: 'redeemed', variant: 'default' };
  if (new Date(i.redeem_by).getTime() < Date.now()) return { label: 'expired', variant: 'outline' };
  return { label: 'waiting', variant: 'secondary' };
}

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—');
const dayTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

async function copyLink(token: string) {
  try {
    await navigator.clipboard.writeText(inviteUrl(token));
    toast.success('Invite link copied');
  } catch {
    toast.error('Copy failed — select the link manually');
  }
}

export function InvitesPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [label, setLabel] = useState('');
  const [channel, setChannel] = useState('linkedin');
  const [days, setDays] = useState('30');
  const [uses, setUses] = useState('1');
  const [busy, setBusy] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);

  // Bulk mode — a LinkedIn campaign to many people at once: one label per
  // line in, one link per label out. Same one-person-one-link contract as
  // the single form, just N rows in one insert instead of N clicks.
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkNames, setBulkNames] = useState('');
  const [bulkChannel, setBulkChannel] = useState('linkedin');
  const [bulkDays, setBulkDays] = useState('30');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ label: string; url: string }[] | null>(null);

  const invitesQuery = useQuery({
    queryKey: ['plan-invites'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('plan_invites').select('*').order('created_at', { ascending: false }).limit(300);
      if (error) throw error;
      return (data ?? []) as InviteRow[];
    },
    // Waiting/expired status changes every hour on its own with a 24h
    // redeem window, not just on user action -- keep the table live.
    refetchInterval: 60_000,
  });
  const activityQuery = useQuery({
    queryKey: ['plan-invite-activity'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_plan_invite_activity');
      if (error) throw error;
      return (data ?? []) as ActivityRow[];
    },
    refetchInterval: 60_000,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['plan-invites'] });
    queryClient.invalidateQueries({ queryKey: ['plan-invite-activity'] });
  };

  const create = async () => {
    if (!label.trim()) { toast.error('Add who the link is for (e.g. "Carlos Ruiz — LinkedIn")'); return; }
    setBusy(true);
    try {
      const token = generateInviteToken();
      const { error } = await (supabase as any).from('plan_invites').insert({
        token,
        label: label.trim(),
        channel,
        plan_id: 'pro',
        duration_days: Math.max(1, Math.min(365, Number(days) || 30)),
        max_redemptions: Math.max(1, Math.min(500, Number(uses) || 1)),
        redeem_by: redeemByFromNow(),
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      setLastLink(inviteUrl(token));
      await copyLink(token);
      setLabel('');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create the invite');
    } finally {
      setBusy(false);
    }
  };

  const bulkCreate = async () => {
    const labels = bulkNames
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (labels.length === 0) { toast.error('Paste at least one name, one per line'); return; }
    if (labels.length > 100) { toast.error('That\'s more than 100 in one batch — split it up'); return; }
    setBulkBusy(true);
    try {
      const durationDays = Math.max(1, Math.min(365, Number(bulkDays) || 30));
      const redeemBy = redeemByFromNow();
      const rows = labels.map((l) => ({
        token: generateInviteToken(),
        label: l,
        channel: bulkChannel,
        plan_id: 'pro',
        duration_days: durationDays,
        max_redemptions: 1,
        redeem_by: redeemBy,
        created_by: user?.id ?? null,
      }));
      const { error } = await (supabase as any).from('plan_invites').insert(rows);
      if (error) throw error;
      setBulkResults(rows.map((r) => ({ label: r.label, url: inviteUrl(r.token) })));
      setBulkNames('');
      refresh();
      toast.success(`${rows.length} invite links created`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create the invites');
    } finally {
      setBulkBusy(false);
    }
  };

  const copyAllBulkResults = async () => {
    if (!bulkResults) return;
    const text = bulkResults.map((r) => `${r.label}: ${r.url}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('All links copied');
    } catch {
      toast.error('Copy failed — select the list manually');
    }
  };

  const revoke = async (id: string) => {
    const { error } = await (supabase as any).from('plan_invites').update({ revoked_at: new Date().toISOString() }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Invite revoked'); refresh(); }
  };

  const invites = invitesQuery.data ?? [];
  const activity = activityQuery.data ?? [];
  const byInvite = new Map<string, ActivityRow[]>();
  for (const a of activity) byInvite.set(a.invite_id, [...(byInvite.get(a.invite_id) ?? []), a]);
  const redeemed = activity.length;
  const ran = activity.filter((a) => a.analyses > 0).length;
  const paid = activity.filter((a) => a.paid).length;

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">New Pro invite</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          One link per person. They sign up with any email or Google and Pro is active immediately: no card, nothing renews, and the plan returns to free when the month ends.
          <span className="block mt-1 text-amber-600 dark:text-amber-500">
            The link itself expires {REDEEM_WINDOW_HOURS}h after you create it — if they don't sign in by then, it's dead for everyone and you'll need to send a new one.
          </span>
        </p>
        <div className="grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs">For (name — where you met)</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Carlos Ruiz — LinkedIn" onKeyDown={(e) => { if (e.key === 'Enter') void create(); }} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Days of Pro</Label>
            <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">People</Label>
            <Input type="number" value={uses} onChange={(e) => setUses(e.target.value)} />
          </div>
          <Button onClick={create} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create & copy link'}</Button>
        </div>
        {lastLink && <p className="text-sm break-all">Copied: <span className="font-mono">{lastLink}</span></p>}
      </Card>

      <Card className="p-4 space-y-3">
        <button
          type="button"
          className="flex items-center gap-2 w-full text-left"
          onClick={() => setBulkOpen((v) => !v)}
        >
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Bulk create — a whole campaign at once</h2>
          <span className="text-xs text-muted-foreground ml-auto">{bulkOpen ? 'Hide' : 'For LinkedIn: paste 30 names, get 30 links'}</span>
        </button>
        {bulkOpen && (
          <>
            <p className="text-sm text-muted-foreground">
              One name per line — each gets its own one-person link. Every link is logged here the moment it's created, and moves to "redeemed" the moment that person signs in.
              <span className="block mt-1 text-amber-600 dark:text-amber-500">
                Every link in this batch expires {REDEEM_WINDOW_HOURS}h from now — send them out right away. Anyone who misses the window needs a fresh link, not this one again.
              </span>
            </p>
            <Textarea
              value={bulkNames}
              onChange={(e) => setBulkNames(e.target.value)}
              placeholder={'Carlos Ruiz — LinkedIn post reply\nDana Kim — LinkedIn DM\nJordan Lee — LinkedIn comment\n…'}
              rows={6}
              className="font-mono text-sm"
            />
            <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Channel</Label>
                <Select value={bulkChannel} onValueChange={setBulkChannel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Days of Pro (each)</Label>
                <Input type="number" value={bulkDays} onChange={(e) => setBulkDays(e.target.value)} />
              </div>
              <Button onClick={bulkCreate} disabled={bulkBusy}>
                {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : `Create ${bulkNames.split('\n').map((l) => l.trim()).filter(Boolean).length || ''} links`}
              </Button>
            </div>
            {bulkResults && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{bulkResults.length} links ready</p>
                  <Button size="sm" variant="outline" onClick={copyAllBulkResults} className="gap-1">
                    <Copy className="w-3.5 h-3.5" /> Copy all
                  </Button>
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1 text-xs font-mono bg-muted/40 rounded p-2">
                  {bulkResults.map((r) => (
                    <div key={r.url} className="flex items-center justify-between gap-2">
                      <span className="truncate">{r.label}</span>
                      <button
                        type="button"
                        className="text-primary hover:underline shrink-0"
                        onClick={() => { void navigator.clipboard.writeText(r.url).then(() => toast.success(`Copied: ${r.label}`)); }}
                      >
                        copy link
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Redeemed</p><p className="text-2xl font-semibold tabular-nums">{redeemed}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Ran an analysis</p><p className="text-2xl font-semibold tabular-nums">{ran}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Now paying</p><p className="text-2xl font-semibold tabular-nums">{paid}</p></Card>
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>For</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Who redeemed</TableHead>
              <TableHead>Pro until</TableHead>
              <TableHead>Activity since</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.map((i) => {
              const st = statusOf(i);
              const acts = byInvite.get(i.id) ?? [];
              return (
                <TableRow key={i.id}>
                  <TableCell>
                    <div className="font-medium">{i.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {i.channel ?? '—'} · created {day(i.created_at)} · redeem by{' '}
                      <span className={new Date(i.redeem_by).getTime() < Date.now() && i.redeemed_count < i.max_redemptions ? 'text-destructive' : ''}>
                        {dayTime(i.redeem_by)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={st.variant}>{st.label}</Badge> {i.max_redemptions > 1 && <span className="text-xs text-muted-foreground">{i.redeemed_count}/{i.max_redemptions}</span>}</TableCell>
                  <TableCell className="text-xs">
                    {acts.length === 0 ? '—' : acts.map((a) => (
                      <div key={a.user_id}>{a.email ?? a.user_id.slice(0, 8)} <span className="text-muted-foreground">· last sign-in {day(a.last_sign_in_at)}</span></div>
                    ))}
                  </TableCell>
                  <TableCell className="text-xs">{acts.length ? acts.map((a) => <div key={a.user_id}>{day(a.period_end)}{a.paid ? ' · paying' : ''}</div>) : '—'}</TableCell>
                  <TableCell className="text-xs">
                    {acts.length === 0 ? '—' : acts.map((a) => (
                      <div key={a.user_id} className={a.analyses === 0 ? 'text-amber-600' : ''}>
                        {a.analyses} analyses · {a.invoices} invoices · {a.documents} docs{a.analyses === 0 ? ' — nudge them' : ''}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => copyLink(i.token)} aria-label="Copy link"><Copy className="w-4 h-4" /></Button>
                    {!i.revoked_at && i.redeemed_count < i.max_redemptions && (
                      <Button size="sm" variant="ghost" onClick={() => revoke(i.id)}>Revoke</Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {invites.length === 0 && !invitesQuery.isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No invites yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      {(invitesQuery.error || activityQuery.error) && (
        <p className="text-sm text-destructive">Could not load invites: {((invitesQuery.error || activityQuery.error) as Error).message}</p>
      )}
    </div>
  );
}
