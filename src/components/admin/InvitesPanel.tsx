import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Gift, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

function statusOf(i: InviteRow): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
  if (i.revoked_at) return { label: 'revoked', variant: 'destructive' };
  if (i.redeemed_count >= i.max_redemptions) return { label: 'redeemed', variant: 'default' };
  if (new Date(i.redeem_by).getTime() < Date.now()) return { label: 'expired', variant: 'outline' };
  return { label: 'waiting', variant: 'secondary' };
}

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—');

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

  const invitesQuery = useQuery({
    queryKey: ['plan-invites'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('plan_invites').select('*').order('created_at', { ascending: false }).limit(300);
      if (error) throw error;
      return (data ?? []) as InviteRow[];
    },
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
                    <div className="text-xs text-muted-foreground">{i.channel ?? '—'} · created {day(i.created_at)} · redeem by {day(i.redeem_by)}</div>
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
