import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAdmin } from '@/hooks/useAdmin';
import { isEnabled } from '@/lib/flags';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Handshake, CheckCircle2, XCircle, Copy, Mail, Send, Upload, Sparkles } from 'lucide-react';
import { parseProspectCsv, sequenceDue, SEQUENCE_DAYS } from '@/lib/commercial-ops';

// Loose row shapes -- the generated Supabase types haven't been regenerated
// for the commercial tables yet (same situation useFirstExperienceDemoState.ts
// hit for its own new table), so table access below is cast through
// `(supabase as any)`, matching that established workaround.

interface Prospect {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_role: string | null;
  contact_channel: string | null;
  segment: string | null;
  stage: string;
  suppression_status: string;
  campaign_id: string | null;
  batch_id: string | null;
  observed_signals: string[] | null;
  created_at: string;
}

interface Followup {
  id: string;
  prospect_id: string;
  kind: 'first_touch' | 'followup';
  sequence_step: number | null;
  subject: string | null;
  stage_context: string | null;
  draft: string;
  status: 'draft' | 'approved' | 'rejected' | 'sent';
  batch_id: string | null;
  sent_at: string | null;
  created_at: string;
}

interface Campaign {
  id: string;
  name: string;
  segment: string | null;
  sender_identity: string | null;
  daily_limit: number | null;
  status: string;
  created_at: string;
}

interface Batch {
  id: string;
  campaign_id: string;
  batch_number: number;
  scheduled_date: string | null;
  lead_count: number;
  approved_count: number;
  sent_count: number;
  reply_count: number;
  positive_reply_count: number;
  meeting_count: number;
  status: string;
}

interface Foundation {
  version: number;
  product_name: string;
  product_description: string;
  target_segments: string[];
  approved_claims: string[];
  prohibited_claims: string[];
}

const FUNNEL_STAGES = [
  'discovered', 'contacted', 'replied', 'qualified', 'call_planned', 'call_completed',
  'demo_offered', 'free_analysis_started', 'offer_presented', 'checkout_started',
  'won', 'lost', 'not_fit',
];

const REPLY_CLASSES = ['positive', 'neutral', 'objection', 'negative', 'unsubscribe', 'bounce'];

const STAGE_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  won: 'default',
  lost: 'destructive',
  not_fit: 'destructive',
};

async function invoke(action: string, body: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('commercial-workflow', { body: { action, ...body } });
  if (error) {
    // supabase-js wraps non-2xx bodies; surface the function's own message.
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      const parsed = await ctx.json().catch(() => null);
      if (parsed?.detail || parsed?.error) throw new Error(parsed.detail ?? parsed.error);
    }
    throw error;
  }
  if ((data as any)?.error && (data as any)?.success !== true) throw new Error((data as any).detail ?? (data as any).error);
  return data as any;
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error('Copy failed -- select the text manually');
  }
}

function emailOf(channel: string | null): string | null {
  if (!channel) return null;
  const m = channel.match(/[^\s:]+@[^\s]+/);
  return m ? m[0] : null;
}

export default function CommercialOps() {
  const { isAdmin, isLoading } = useAdmin();
  const canAccess = isAdmin && isEnabled('commercial_workflow');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoading && !canAccess) navigate('/app', { replace: true });
  }, [canAccess, isLoading, navigate]);

  const foundationQuery = useQuery({
    queryKey: ['commercial-foundation'],
    queryFn: async () => (await invoke('get_foundation')).foundation as Foundation,
    enabled: canAccess,
  });

  const prospectsQuery = useQuery({
    queryKey: ['commercial-prospects'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('commercial_prospects')
        .select('id, company_name, contact_name, contact_role, contact_channel, segment, stage, suppression_status, campaign_id, batch_id, observed_signals, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Prospect[];
    },
    enabled: canAccess,
  });

  const followupsQuery = useQuery({
    queryKey: ['commercial-followups'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('commercial_followups')
        .select('id, prospect_id, kind, sequence_step, subject, stage_context, draft, status, batch_id, sent_at, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Followup[];
    },
    enabled: canAccess,
  });

  const campaignsQuery = useQuery({
    queryKey: ['commercial-campaigns'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('commercial_campaigns').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Campaign[];
    },
    enabled: canAccess,
  });

  const batchesQuery = useQuery({
    queryKey: ['commercial-batches'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('commercial_batches').select('*').order('batch_number', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Batch[];
    },
    enabled: canAccess,
  });

  const [tab, setTab] = useState('today');
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [newProspectOpen, setNewProspectOpen] = useState(false);

  const refreshAll = () => {
    for (const k of ['commercial-prospects', 'commercial-followups', 'commercial-campaigns', 'commercial-batches']) {
      queryClient.invalidateQueries({ queryKey: [k] });
    }
  };

  const prospects = prospectsQuery.data ?? [];
  const followups = followupsQuery.data ?? [];
  const prospectById = useMemo(() => new Map(prospects.map((p) => [p.id, p])), [prospects]);
  const drafts = followups.filter((f) => f.status === 'draft');
  const ready = followups.filter((f) => f.status === 'approved');
  const sent = followups.filter((f) => f.status === 'sent');
  const dueFollowups = useMemo(() => sequenceDue(prospects, followups), [prospects, followups]);

  if (isLoading || !canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const campaigns = campaignsQuery.data ?? [];
  const batches = batchesQuery.data ?? [];
  const discoveredNoDraft = prospects.filter(
    (p) => p.stage === 'discovered' && p.suppression_status === 'active' && !followups.some((f) => f.prospect_id === p.id && f.kind === 'first_touch' && f.status !== 'rejected'),
  );

  const steps: Array<{ label: string; done: boolean; detail: string; tab: string }> = [
    { label: 'Campaign with sender identity', done: campaigns.length > 0, detail: `${campaigns.length} campaign(s)`, tab: 'campaigns' },
    { label: 'Leads imported into a batch (with signals)', done: prospects.some((p) => p.batch_id), detail: `${prospects.filter((p) => p.batch_id).length} lead(s) in batches`, tab: 'campaigns' },
    { label: 'First-touch drafts generated', done: followups.some((f) => f.kind === 'first_touch'), detail: `${discoveredNoDraft.length} lead(s) still need a draft`, tab: 'campaigns' },
    { label: 'Drafts reviewed and approved', done: drafts.length === 0 && ready.length + sent.length > 0, detail: `${drafts.length} waiting for review`, tab: 'review' },
    { label: 'Sent by you, then marked sent', done: sent.length > 0 && ready.length === 0, detail: `${ready.length} ready to send · ${sent.length} sent`, tab: 'ready' },
    { label: 'Replies recorded, follow-ups drafted when due', done: dueFollowups.length === 0 && sent.length > 0, detail: `${dueFollowups.length} follow-up(s) due`, tab: 'sent' },
  ];

  return (
    <AppLayout title="Commercial Ops">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Handshake className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Commercial Ops</h1>
            <p className="text-sm text-muted-foreground">
              AI researches and drafts from the canonical foundation. You approve, you send, you record the reply. Nothing leaves without you.
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns &amp; import</TabsTrigger>
            <TabsTrigger value="review">
              Review {drafts.length > 0 && <Badge variant="secondary" className="ml-1">{drafts.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="ready">
              Ready to send {ready.length > 0 && <Badge className="ml-1">{ready.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="sent">
              Sent &amp; replies {dueFollowups.length > 0 && <Badge variant="secondary" className="ml-1">{dueFollowups.length} due</Badge>}
            </TabsTrigger>
            <TabsTrigger value="prospects">Prospects ({prospects.length})</TabsTrigger>
            <TabsTrigger value="foundation">Foundation</TabsTrigger>
          </TabsList>

          {/* ── Today ─────────────────────────────────────────────── */}
          <TabsContent value="today" className="space-y-4 mt-4">
            <Card className="p-5 space-y-3">
              <h2 className="font-semibold">Outbound checklist</h2>
              <ol className="space-y-2">
                {steps.map((s, i) => (
                  <li key={s.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2">
                      {s.done ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <span className="w-4 h-4 rounded-full border border-muted-foreground/40 inline-block text-[10px] text-center leading-4">{i + 1}</span>}
                      <span className={s.done ? 'text-muted-foreground' : ''}>{s.label}</span>
                    </span>
                    <button className="text-xs text-primary hover:underline" onClick={() => setTab(s.tab)}>{s.detail} →</button>
                  </li>
                ))}
              </ol>
            </Card>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Waiting review" value={drafts.length} />
              <Stat label="Ready to send" value={ready.length} />
              <Stat label="Sent" value={sent.length} />
              <Stat label="Replied or further" value={prospects.filter((p) => !['discovered', 'contacted'].includes(p.stage)).length} />
            </div>
            <Card className="p-4 text-sm text-muted-foreground space-y-1">
              <p><strong className="text-foreground">Rules the system enforces:</strong> suppression (unsubscribed, bounced, do-not-contact, duplicate, contacted in the last 30 days, open opportunity) runs before any draft. No recorded signal means no draft. Every draft is checked against the prohibited-claims registry, fake-urgency and invented-proof patterns, and the real price list. No links in a first touch. The opt-out line and your signature are added by code.</p>
              <p>Cadence: first touch day 0, then step 2 on day {SEQUENCE_DAYS[2]}, step 3 on day {SEQUENCE_DAYS[3]}, step 4 on day {SEQUENCE_DAYS[4]}. A reply stops the sequence.</p>
            </Card>
          </TabsContent>

          {/* ── Campaigns & import ────────────────────────────────── */}
          <TabsContent value="campaigns" className="mt-4 space-y-4">
            <NewCampaignForm onCreated={refreshAll} />
            {campaigns.map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                batches={batches.filter((b) => b.campaign_id === c.id)}
                prospects={prospects}
                followups={followups}
                onChanged={refreshAll}
              />
            ))}
            {campaigns.length === 0 && (
              <p className="text-sm text-muted-foreground">Create a campaign first. Its sender identity is appended to every email in it.</p>
            )}
          </TabsContent>

          {/* ── Review ────────────────────────────────────────────── */}
          <TabsContent value="review" className="mt-4 space-y-3">
            {drafts.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nothing to review.</p>}
            {drafts.map((f) => (
              <MessageCard key={f.id} followup={f} prospect={prospectById.get(f.prospect_id)}>
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      await invoke('approve_followup', { followup_id: f.id });
                      toast.success('Approved -- moved to Ready to send');
                      refreshAll();
                    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to approve'); }
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await invoke('reject_followup', { followup_id: f.id });
                      toast.success('Rejected');
                      refreshAll();
                    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to reject'); }
                  }}
                >
                  <XCircle className="w-4 h-4 mr-1" /> Reject
                </Button>
              </MessageCard>
            ))}
          </TabsContent>

          {/* ── Ready to send ─────────────────────────────────────── */}
          <TabsContent value="ready" className="mt-4 space-y-3">
            {ready.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nothing approved yet.</p>}
            {ready.map((f) => {
              const p = prospectById.get(f.prospect_id);
              const to = emailOf(p?.contact_channel ?? null);
              const subject = f.subject ?? 'Following up';
              return (
                <MessageCard key={f.id} followup={f} prospect={p}>
                  <Button size="sm" variant="outline" onClick={() => copy(subject, 'Subject')}><Copy className="w-4 h-4 mr-1" /> Subject</Button>
                  <Button size="sm" variant="outline" onClick={() => copy(f.draft, 'Body')}><Copy className="w-4 h-4 mr-1" /> Body</Button>
                  {to && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(f.draft)}`}>
                        <Mail className="w-4 h-4 mr-1" /> Open in mail
                      </a>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        await invoke('mark_sent', { followup_id: f.id });
                        toast.success('Marked sent');
                        refreshAll();
                      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
                    }}
                  >
                    <Send className="w-4 h-4 mr-1" /> I sent it
                  </Button>
                </MessageCard>
              );
            })}
          </TabsContent>

          {/* ── Sent & replies ────────────────────────────────────── */}
          <TabsContent value="sent" className="mt-4 space-y-4">
            {dueFollowups.length > 0 && (
              <Card className="p-4 space-y-2">
                <h3 className="text-sm font-semibold">Follow-ups due</h3>
                {dueFollowups.map((d) => (
                  <div key={d.prospect.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>{d.prospect.company_name} <span className="text-muted-foreground">· step {d.step}, day {d.day}</span></span>
                    <DraftStepButton prospectId={d.prospect.id} step={d.step} onDone={refreshAll} />
                  </div>
                ))}
              </Card>
            )}
            <Card className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Step</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Record reply</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sent.map((f) => {
                    const p = prospectById.get(f.prospect_id);
                    return (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{p?.company_name ?? '—'}</TableCell>
                        <TableCell>{f.sequence_step ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{f.sent_at ? new Date(f.sent_at).toLocaleDateString() : '—'}</TableCell>
                        <TableCell><Badge variant={STAGE_BADGE_VARIANT[p?.stage ?? ''] ?? 'outline'}>{p?.stage ?? '—'}</Badge></TableCell>
                        <TableCell>{p && p.stage === 'contacted' ? <ReplyRecorder prospectId={p.id} onDone={refreshAll} /> : null}</TableCell>
                      </TableRow>
                    );
                  })}
                  {sent.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nothing sent yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* ── Prospects ─────────────────────────────────────────── */}
          <TabsContent value="prospects" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Dialog open={newProspectOpen} onOpenChange={setNewProspectOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">New prospect</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New prospect</DialogTitle></DialogHeader>
                  <NewProspectForm
                    onCreated={() => {
                      setNewProspectOpen(false);
                      refreshAll();
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
            <Card className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Signals</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prospects.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.company_name}
                        {p.suppression_status !== 'active' && <Badge variant="destructive" className="ml-2">{p.suppression_status}</Badge>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.segment ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{(p.observed_signals ?? []).length}</TableCell>
                      <TableCell><Badge variant={STAGE_BADGE_VARIANT[p.stage] ?? 'outline'}>{p.stage}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setSelectedProspect(p)}>Open</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {prospects.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No prospects yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* ── Foundation ────────────────────────────────────────── */}
          <TabsContent value="foundation" className="mt-4">
            {foundationQuery.isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : foundationQuery.data ? (
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{foundationQuery.data.product_name}</h2>
                  <Badge variant="outline">v{foundationQuery.data.version}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{foundationQuery.data.product_description}</p>
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Target segments</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {foundationQuery.data.target_segments.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                  </div>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Approved claims</Label>
                  <ul className="text-sm list-disc list-inside mt-1">
                    {foundationQuery.data.approved_claims.map((c) => <li key={c}>{c}</li>)}
                  </ul>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wide text-destructive">Prohibited claims (blocked in every draft)</Label>
                  <ul className="text-sm list-disc list-inside mt-1 text-muted-foreground">
                    {foundationQuery.data.prohibited_claims.map((c) => <li key={c}>{c}</li>)}
                  </ul>
                </div>
              </Card>
            ) : (
              <p className="text-sm text-destructive">
                Failed to load foundation{foundationQuery.error instanceof Error ? `: ${foundationQuery.error.message}` : '.'}
              </p>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={!!selectedProspect} onOpenChange={(open) => !open && setSelectedProspect(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {selectedProspect && (
              <ProspectWorkspace
                prospect={selectedProspect}
                onStageChanged={(updated) => {
                  setSelectedProspect(updated);
                  refreshAll();
                }}
                onFollowupDrafted={refreshAll}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}

function MessageCard({ followup, prospect, children }: { followup: Followup; prospect?: Prospect; children: ReactNode }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <span className="font-semibold">{prospect?.company_name ?? 'Unknown prospect'}</span>
          {prospect?.contact_name && <span className="text-muted-foreground"> · {prospect.contact_name}{prospect.contact_role ? `, ${prospect.contact_role}` : ''}</span>}
          {prospect?.contact_channel && <span className="text-muted-foreground"> · {prospect.contact_channel}</span>}
        </div>
        <Badge variant="outline">{followup.kind === 'first_touch' ? 'First touch' : `Follow-up${followup.sequence_step ? ` · step ${followup.sequence_step}` : ''}`}</Badge>
      </div>
      {followup.subject && <p className="text-sm"><span className="text-muted-foreground">Subject:</span> {followup.subject}</p>}
      <pre className="text-sm whitespace-pre-wrap break-words font-sans bg-muted/40 rounded-md p-3">{followup.draft}</pre>
      {followup.stage_context && followup.kind === 'first_touch' && (
        <p className="text-xs text-muted-foreground">{followup.stage_context}</p>
      )}
      {(prospect?.observed_signals ?? []).length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Evidence used ({prospect!.observed_signals!.length} signal(s))</summary>
          <ul className="list-disc list-inside mt-1">{prospect!.observed_signals!.map((s) => <li key={s}>{s}</li>)}</ul>
        </details>
      )}
      <div className="flex flex-wrap gap-2">{children}</div>
    </Card>
  );
}

function NewCampaignForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [segment, setSegment] = useState('fractional CFOs');
  const [sender, setSender] = useState('');
  const [dailyLimit, setDailyLimit] = useState('20');
  const [saving, setSaving] = useState(false);
  return (
    <Card className="p-4 space-y-3">
      <h3 className="text-sm font-semibold">New campaign</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><Label className="text-xs">Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Fractional CFOs -- Sept wave 1" /></div>
        <div><Label className="text-xs">Segment</Label><Input value={segment} onChange={(e) => setSegment(e.target.value)} /></div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Sender identity (signature appended to every email)</Label>
          <Textarea rows={2} value={sender} onChange={(e) => setSender(e.target.value)} placeholder={'Bogdan\nFounder, AIWMC Quantis'} />
        </div>
        <div><Label className="text-xs">Daily send limit</Label><Input type="number" min={1} value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} /></div>
      </div>
      <Button
        size="sm"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          try {
            const { campaign } = await invoke('create_campaign', { name, segment, sender_identity: sender, daily_limit: Number(dailyLimit) || null });
            await invoke('create_batch', { campaign_id: campaign.id, scheduled_date: new Date().toISOString().slice(0, 10) });
            toast.success('Campaign and batch 1 created');
            setName('');
            onCreated();
          } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } finally { setSaving(false); }
        }}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create campaign'}
      </Button>
    </Card>
  );
}

function CampaignCard({
  campaign, batches, prospects, followups, onChanged,
}: { campaign: Campaign; batches: Batch[]; prospects: Prospect[]; followups: Followup[]; onChanged: () => void }) {
  const [csv, setCsv] = useState('');
  const [batchId, setBatchId] = useState<string>(batches[batches.length - 1]?.id ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [lastReport, setLastReport] = useState<string | null>(null);
  useEffect(() => {
    if (!batchId && batches.length > 0) setBatchId(batches[batches.length - 1].id);
  }, [batches, batchId]);
  const parsed = useMemo(() => (csv.trim() ? parseProspectCsv(csv) : null), [csv]);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">{campaign.name}</h3>
          <p className="text-xs text-muted-foreground">{campaign.segment ?? 'no segment'} · limit {campaign.daily_limit ?? '—'}/day · {campaign.status}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={busy === 'batch'}
          onClick={async () => {
            setBusy('batch');
            try { await invoke('create_batch', { campaign_id: campaign.id }); onChanged(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(null); }
          }}
        >
          New batch
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead>Need draft</TableHead>
              <TableHead>Approved</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Replies</TableHead>
              <TableHead>Meetings</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((b) => {
              const needDraft = prospects.filter(
                (p) => p.batch_id === b.id && p.stage === 'discovered' && p.suppression_status === 'active' &&
                  !followups.some((f) => f.prospect_id === p.id && f.kind === 'first_touch' && f.status !== 'rejected'),
              ).length;
              return (
                <TableRow key={b.id}>
                  <TableCell>#{b.batch_number}</TableCell>
                  <TableCell>{b.lead_count}</TableCell>
                  <TableCell>{needDraft}</TableCell>
                  <TableCell>{b.approved_count}</TableCell>
                  <TableCell>{b.sent_count}</TableCell>
                  <TableCell>{b.reply_count} ({b.positive_reply_count}+)</TableCell>
                  <TableCell>{b.meeting_count}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={needDraft === 0 || busy === `draft-${b.id}`}
                      onClick={async () => {
                        setBusy(`draft-${b.id}`);
                        try {
                          const r = await invoke('draft_batch_first_touch', { batch_id: b.id, limit: 15 });
                          const counts: Record<string, number> = {};
                          for (const x of r.results as Array<{ status: string }>) counts[x.status] = (counts[x.status] ?? 0) + 1;
                          const problems = (r.results as Array<{ company_name: string; status: string; detail?: string }>)
                            .filter((x) => x.status !== 'drafted' && x.status !== 'already_drafted')
                            .map((x) => `${x.company_name}: ${x.status}${x.detail ? ` (${x.detail})` : ''}`);
                          setLastReport([`Drafted ${counts.drafted ?? 0}.`, ...problems].join('\n'));
                          toast.success(`Drafted ${counts.drafted ?? 0} first touch(es)`);
                          onChanged();
                        } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(null); }
                      }}
                    >
                      {busy === `draft-${b.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-1" /> Draft first touches</>}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">
          Import leads (paste CSV or rows from a sheet). Header row required. Columns: company_name, contact_name, contact_role, email, website, segment, signals.
          Separate multiple signals with <code>|</code>. Signals are the facts the email may reference: a post, a niche, hiring, a recent change.
        </Label>
        <Textarea
          rows={5}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={'company_name,contact_name,contact_role,email,website,segment,signals\nNorthline Advisory,Jane Doe,Fractional CFO,jane@northline.co,northline.co,fractional CFO,"Fractional CFO for 6 dental groups | Posted about rebuilding client models each quarter"'}
          className="font-mono text-xs"
        />
        {parsed && (
          <p className="text-xs text-muted-foreground">
            {parsed.rows.length} row(s) parsed · {parsed.rows.filter((r) => !r.signals).length} without signals (they will import but cannot be drafted)
            {parsed.errors.length > 0 && <span className="text-destructive"> · {parsed.errors.join('; ')}</span>}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Select value={batchId} onValueChange={setBatchId}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Batch" /></SelectTrigger>
            <SelectContent>{batches.map((b) => <SelectItem key={b.id} value={b.id}>Batch #{b.batch_number}</SelectItem>)}</SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!parsed || parsed.rows.length === 0 || !batchId || busy === 'import'}
            onClick={async () => {
              if (!parsed) return;
              setBusy('import');
              try {
                const r = await invoke('import_prospects', { campaign_id: campaign.id, batch_id: batchId, rows: parsed.rows });
                const skipped = (r.skipped as Array<{ company_name: string; reason: string }>).map((s) => `${s.company_name || '(blank)'}: ${s.reason}`);
                setLastReport([`Imported ${r.inserted}. ${r.missing_signals} without signals.`, ...skipped].join('\n'));
                toast.success(`Imported ${r.inserted}, skipped ${skipped.length}`);
                setCsv('');
                onChanged();
              } catch (e) { toast.error(e instanceof Error ? e.message : 'Import failed'); } finally { setBusy(null); }
            }}
          >
            {busy === 'import' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4 mr-1" /> Import</>}
          </Button>
        </div>
        {lastReport && <pre className="text-xs whitespace-pre-wrap bg-muted/40 rounded-md p-3">{lastReport}</pre>}
      </div>
    </Card>
  );
}

function DraftStepButton({ prospectId, step, onDone }: { prospectId: string; step: number; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await invoke('draft_followup', { prospect_id: prospectId, sequence_step: step });
          if (r.suppressed) toast.message(`Suppressed: ${r.reason_code}`);
          else toast.success(`Step ${step} drafted -- see Review`);
          onDone();
        } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
      }}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : `Draft step ${step}`}
    </Button>
  );
}

function ReplyRecorder({ prospectId, onDone }: { prospectId: string; onDone: () => void }) {
  const [cls, setCls] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <Select value={cls} onValueChange={setCls}>
        <SelectTrigger className="w-32 h-8"><SelectValue placeholder="Reply…" /></SelectTrigger>
        <SelectContent>{REPLY_CLASSES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
      </Select>
      <Button
        size="sm"
        variant="outline"
        disabled={!cls || busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await invoke('record_reply', { prospect_id: prospectId, reply_class: cls, meeting_booked: false });
            toast.success(`Recorded${r.to_stage ? ` -> ${r.to_stage}` : ''}`);
            onDone();
          } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
        }}
      >
        Save
      </Button>
    </div>
  );
}

function NewProspectForm({ onCreated }: { onCreated: () => void }) {
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactChannel, setContactChannel] = useState('');
  const [segment, setSegment] = useState('');
  const [signals, setSignals] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!companyName.trim()) { toast.error('Company name is required'); return; }
    setSaving(true);
    try {
      await invoke('create_prospect', {
        company_name: companyName,
        contact_name: contactName || null,
        contact_channel: contactChannel || null,
        segment: segment || null,
        observed_signals: signals.split('\n').map((s) => s.trim()).filter(Boolean),
      });
      toast.success('Prospect created');
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create prospect');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div><Label>Company name</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
      <div><Label>Contact name</Label><Input value={contactName} onChange={(e) => setContactName(e.target.value)} /></div>
      <div><Label>Contact channel</Label><Input placeholder="jane@company.com" value={contactChannel} onChange={(e) => setContactChannel(e.target.value)} /></div>
      <div><Label>Segment</Label><Input placeholder="fractional CFO" value={segment} onChange={(e) => setSegment(e.target.value)} /></div>
      <div><Label>Observed signals (one per line)</Label><Textarea rows={3} value={signals} onChange={(e) => setSignals(e.target.value)} /></div>
      <Button onClick={submit} disabled={saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
      </Button>
    </div>
  );
}

function ProspectWorkspace({
  prospect,
  onStageChanged,
  onFollowupDrafted,
}: {
  prospect: Prospect;
  onStageChanged: (updated: Prospect) => void;
  onFollowupDrafted: () => void;
}) {
  const [icp, setIcp] = useState(prospect.segment ?? '');
  const [prospectSummary, setProspectSummary] = useState('');
  const [objectionText, setObjectionText] = useState('');
  const [stageContext, setStageContext] = useState('');
  const [nextStage, setNextStage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ label: string; data: unknown } | null>(null);

  async function run(label: string, action: string, body: Record<string, unknown>) {
    setBusy(label);
    setLastResult(null);
    try {
      const data = await invoke(action, body);
      setLastResult({ label, data });
      toast.success(data?.suppressed ? `Suppressed: ${data.reason_code}` : `${label} generated`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Failed: ${label}`);
    } finally {
      setBusy(null);
    }
  }

  async function transitionStage() {
    if (!nextStage) return;
    setBusy('Transition');
    try {
      const data = await invoke('transition_stage', { prospect_id: prospect.id, to_stage: nextStage });
      onStageChanged(data.prospect as Prospect);
      toast.success(`Moved to ${nextStage}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Transition rejected');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {prospect.company_name}
          <Badge variant={STAGE_BADGE_VARIANT[prospect.stage] ?? 'outline'}>{prospect.stage}</Badge>
        </DialogTitle>
      </DialogHeader>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label className="text-xs">Move to stage</Label>
          <Select value={nextStage} onValueChange={setNextStage}>
            <SelectTrigger><SelectValue placeholder="Choose a stage" /></SelectTrigger>
            <SelectContent>
              {FUNNEL_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={transitionStage} disabled={!nextStage || busy === 'Transition'} size="sm">
          {busy === 'Transition' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Move'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy === 'DNC'}
          onClick={async () => {
            setBusy('DNC');
            try { await invoke('set_suppression', { prospect_id: prospect.id, suppression_status: 'do_not_contact' }); toast.success('Marked do-not-contact'); onFollowupDrafted(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(null); }
          }}
        >
          Do not contact
        </Button>
      </div>

      <div className="grid gap-4">
        <StageAction
          title="Draft first-touch email"
          busy={busy === 'First touch'}
          onRun={async () => {
            await run('First touch', 'draft_first_touch', { prospect_id: prospect.id });
            onFollowupDrafted();
          }}
        >
          <p className="text-xs text-muted-foreground">Uses the {(prospect.observed_signals ?? []).length} recorded signal(s). Result lands in Review.</p>
        </StageAction>

        <StageAction
          title="Generate offer"
          busy={busy === 'Offer'}
          onRun={() => run('Offer', 'generate_offer', { icp, prospect_id: prospect.id })}
        >
          <Label className="text-xs">Target ICP</Label>
          <Input value={icp} onChange={(e) => setIcp(e.target.value)} placeholder="fractional CFO" />
        </StageAction>

        <StageAction
          title="Prepare call brief"
          busy={busy === 'Call brief'}
          onRun={() => run('Call brief', 'prepare_call_brief', { prospect_id: prospect.id, prospect_summary: prospectSummary })}
        >
          <Label className="text-xs">Prospect summary</Label>
          <Textarea value={prospectSummary} onChange={(e) => setProspectSummary(e.target.value)} rows={2} />
        </StageAction>

        <StageAction
          title="Handle objection"
          busy={busy === 'Objection'}
          onRun={() => run('Objection', 'handle_objection', { prospect_id: prospect.id, objection_text: objectionText })}
        >
          <Label className="text-xs">Objection</Label>
          <Textarea value={objectionText} onChange={(e) => setObjectionText(e.target.value)} rows={2} />
        </StageAction>

        <StageAction
          title="Draft custom follow-up"
          busy={busy === 'Follow-up'}
          onRun={async () => {
            await run('Follow-up', 'draft_followup', { prospect_id: prospect.id, stage_context: stageContext });
            onFollowupDrafted();
          }}
        >
          <Label className="text-xs">Context (what happened, what you want next)</Label>
          <Textarea value={stageContext} onChange={(e) => setStageContext(e.target.value)} rows={2} />
        </StageAction>
      </div>

      {lastResult && (
        <Card className="p-4 bg-muted/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{lastResult.label} — generated output</p>
          <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(lastResult.data, null, 2)}</pre>
        </Card>
      )}
    </div>
  );
}

function StageAction({
  title, busy, onRun, children,
}: { title: string; busy: boolean; onRun: () => void; children: ReactNode }) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button size="sm" variant="secondary" onClick={onRun} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate'}
        </Button>
      </div>
      {children}
    </Card>
  );
}
