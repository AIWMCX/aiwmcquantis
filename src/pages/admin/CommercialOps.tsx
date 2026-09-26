import { useEffect, useState, type ReactNode } from 'react';
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
import { Loader2, Handshake, CheckCircle2, XCircle } from 'lucide-react';

// Loose row shapes -- the generated Supabase types haven't been regenerated
// for the Phase E tables yet (same situation useFirstExperienceDemoState.ts
// hit for its own new table), so table access below is cast through
// `(supabase as any)`, matching that established workaround.

interface Prospect {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_channel: string | null;
  segment: string | null;
  stage: string;
  created_at: string;
}

interface Followup {
  id: string;
  prospect_id: string;
  draft: string;
  status: 'draft' | 'approved' | 'rejected' | 'sent';
  created_at: string;
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

const STAGE_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  won: 'default',
  lost: 'destructive',
  not_fit: 'destructive',
};

async function invoke(action: string, body: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('commercial-workflow', { body: { action, ...body } });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  if ((data as any)?.success === false) throw new Error((data as any).detail ?? (data as any).error ?? 'stage rejected the generated output');
  return data as any;
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
        .select('id, company_name, contact_name, contact_channel, segment, stage, created_at')
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
        .select('id, prospect_id, draft, status, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Followup[];
    },
    enabled: canAccess,
  });

  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [newProspectOpen, setNewProspectOpen] = useState(false);

  if (isLoading || !canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingFollowups = (followupsQuery.data ?? []).filter((f) => f.status === 'draft');

  return (
    <AppLayout title="Commercial Ops">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Handshake className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Commercial Ops</h1>
            <p className="text-sm text-muted-foreground">
              Internal-only sales workflow. AI prepares; nothing is ever sent without your explicit approval.
            </p>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="foundation">Foundation</TabsTrigger>
            <TabsTrigger value="prospects">Prospects ({prospectsQuery.data?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="followups">
              Follow-ups {pendingFollowups.length > 0 && <Badge variant="secondary" className="ml-1">{pendingFollowups.length} pending</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card className="p-5 space-y-3">
              <h2 className="font-semibold">How this works</h2>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {['INPUT', 'EVIDENCE', 'ASSUMPTIONS', 'RECOMMENDATION', 'HUMAN DECISION', 'OUTCOME'].map((step, i, arr) => (
                  <span key={step} className="flex items-center gap-2">
                    <Badge variant="outline">{step}</Badge>
                    {i < arr.length - 1 && <span className="text-muted-foreground">→</span>}
                  </span>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Every offer, call brief, and objection response is generated from the canonical foundation below and
                validated before it can be used. AI never sends outreach or marks a deal won on its own -- follow-ups
                require your explicit approval, and funnel stage changes are logged with full history.
              </p>
            </Card>
          </TabsContent>

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
                  <Label className="text-xs uppercase tracking-wide text-destructive">Prohibited claims (never used)</Label>
                  <ul className="text-sm list-disc list-inside mt-1 text-muted-foreground">
                    {foundationQuery.data.prohibited_claims.map((c) => <li key={c}>{c}</li>)}
                  </ul>
                </div>
              </Card>
            ) : (
              <p className="text-sm text-destructive">Failed to load foundation.</p>
            )}
          </TabsContent>

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
                      queryClient.invalidateQueries({ queryKey: ['commercial-prospects'] });
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
                    <TableHead>Stage</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(prospectsQuery.data ?? []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.company_name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.segment ?? '—'}</TableCell>
                      <TableCell><Badge variant={STAGE_BADGE_VARIANT[p.stage] ?? 'outline'}>{p.stage}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setSelectedProspect(p)}>Open</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(prospectsQuery.data ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No prospects yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="followups" className="mt-4">
            <Card className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Draft</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(followupsQuery.data ?? []).map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="max-w-md whitespace-pre-wrap text-sm">{f.draft}</TableCell>
                      <TableCell><Badge variant={f.status === 'approved' ? 'default' : f.status === 'rejected' ? 'destructive' : 'outline'}>{f.status}</Badge></TableCell>
                      <TableCell>
                        {f.status === 'draft' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={async () => {
                                try {
                                  await invoke('approve_followup', { followup_id: f.id });
                                  toast.success('Follow-up approved');
                                  queryClient.invalidateQueries({ queryKey: ['commercial-followups'] });
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
                                  toast.success('Follow-up rejected');
                                  queryClient.invalidateQueries({ queryKey: ['commercial-followups'] });
                                } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to reject'); }
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(followupsQuery.data ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No follow-up drafts yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={!!selectedProspect} onOpenChange={(open) => !open && setSelectedProspect(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {selectedProspect && (
              <ProspectWorkspace
                prospect={selectedProspect}
                onStageChanged={(updated) => {
                  setSelectedProspect(updated);
                  queryClient.invalidateQueries({ queryKey: ['commercial-prospects'] });
                }}
                onFollowupDrafted={() => queryClient.invalidateQueries({ queryKey: ['commercial-followups'] })}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

function NewProspectForm({ onCreated }: { onCreated: () => void }) {
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactChannel, setContactChannel] = useState('');
  const [segment, setSegment] = useState('');
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
      <div><Label>Contact channel</Label><Input placeholder="linkedin:jane-doe" value={contactChannel} onChange={(e) => setContactChannel(e.target.value)} /></div>
      <div><Label>Segment</Label><Input placeholder="fractional CFO" value={segment} onChange={(e) => setSegment(e.target.value)} /></div>
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
      toast.success(`${label} generated`);
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
      </div>

      <div className="grid gap-4">
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
          title="Draft follow-up"
          busy={busy === 'Follow-up'}
          onRun={async () => {
            await run('Follow-up', 'draft_followup', { prospect_id: prospect.id, stage_context: stageContext });
            onFollowupDrafted();
          }}
        >
          <Label className="text-xs">Stage context</Label>
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
