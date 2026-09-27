/**
 * Phase 7 (Paid Decision Workflow Validation, 2026-08-30).
 *
 * Internal tooling for the founder/consultant paid decision-review
 * pipeline -- not a customer-facing feature (there is no self-serve "buy a
 * review" flow). Three things live here:
 *  1. Tracking: log an engagement (who, what decision, price, status).
 *  2. Decision memo: export the same trusted verdict/numbers report, framed
 *     around this engagement's decision question, for a named recipient
 *     (createExecutiveReport's optional engagementContext, added this
 *     session -- see usePdfExport.ts).
 *  3. Measured-return usage: for engagements tied to a real account, did
 *     that user come back for another analysis after the engagement date?
 */
import React, { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, ChevronDown, ChevronUp, Download, Link2, Play, Plus, RefreshCw, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePdfExport } from '@/hooks/usePdfExport';
import { useDocumentDownload } from '@/hooks/useDocumentDownload';
import { buildEngagementPacketHtml } from '@/lib/engagement-packet';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { logger } from '@/lib/logger';

interface Engagement {
  id: string;
  user_id: string | null;
  contact_name: string;
  contact_email: string | null;
  engagement_type: 'founder_review' | 'consultant_review' | 'other';
  price_usd: number | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  analysis_id: string | null;
  decision_question: string | null;
  consultant_notes: string | null;
  engaged_at: string;
  offer_code?: string | null;
  payment_status?: 'pending' | 'paid' | 'partially_refunded' | 'refunded' | 'failed';
  intake_status?: 'pending' | 'complete' | 'needs_information' | 'waived';
  case_capacity?: number;
  cases_completed?: number;
  delivery_due_at?: string | null;
  pilot_ends_at?: string | null;
  substantive_work_started_at?: string | null;
  completed_at?: string | null;
  company_name?: string | null;
  intake_data?: Record<string, unknown> | null;
  workspace_data?: {
    decision_summary?: string;
    constraints?: string;
    assumptions?: unknown[];
    scenarios?: unknown[];
    questions?: string[];
    cases?: unknown[];
  } | null;
}

interface ReturnUsage {
  checked: boolean;
  returned: boolean;
  count: number;
}

const RETURN_WINDOW_LABEL = 'any time after the engagement';

export default function PaidEngagements() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [returnUsage, setReturnUsage] = useState<Record<string, ReturnUsage>>({});
  const [showForm, setShowForm] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ analysis_id: '', decision_question: '', consultant_notes: '' });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { generatePdf } = usePdfExport();
  const { downloadPDF } = useDocumentDownload();

  const [form, setForm] = useState({
    contact_name: '',
    contact_email: '',
    engagement_type: 'founder_review' as Engagement['engagement_type'],
    price_usd: '',
    analysis_id: '',
    decision_question: '',
    consultant_notes: '',
    status: 'scheduled' as Engagement['status'],
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('paid_engagements')
      .select('*')
      .order('engaged_at', { ascending: false });
    const rows = (data ?? []) as Engagement[];
    setEngagements(rows);
    setLoading(false);

    // Measured-return usage: for each engagement tied to a real account,
    // did that user run another analysis after this engagement?
    const withUser = rows.filter((r) => r.user_id);
    const results = await Promise.all(
      withUser.map(async (r) => {
        const { count } = await supabase
          .from('analyses')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', r.user_id!)
          .gt('created_at', r.engaged_at);
        return [r.id, { checked: true, returned: (count ?? 0) > 0, count: count ?? 0 }] as const;
      })
    );
    setReturnUsage(Object.fromEntries(results));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!form.contact_name.trim()) return;
    const { error } = await supabase.from('paid_engagements').insert({
      contact_name: form.contact_name.trim(),
      contact_email: form.contact_email.trim() || null,
      engagement_type: form.engagement_type,
      price_usd: form.price_usd ? Number(form.price_usd) : null,
      analysis_id: form.analysis_id.trim() || null,
      decision_question: form.decision_question.trim() || null,
      consultant_notes: form.consultant_notes.trim() || null,
      status: form.status,
    });
    if (error) {
      logger.error('Failed to create paid engagement', error);
      return;
    }
    setForm({
      contact_name: '', contact_email: '', engagement_type: 'founder_review',
      price_usd: '', analysis_id: '', decision_question: '', consultant_notes: '', status: 'scheduled',
    });
    setShowForm(false);
    load();
  }

  async function handleExportMemo(engagement: Engagement) {
    if (!engagement.analysis_id) return;
    setExportingId(engagement.id);
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('result')
        .eq('id', engagement.analysis_id)
        .single();
      if (error || !data?.result) {
        logger.error('Could not load linked analysis for decision memo export', error);
        return;
      }
      const result = data.result as unknown as BusinessAnalysisResult;
      // Stage 4 (Reports Consolidation) changed usePdfExport's generatePdf()
      // default variant to 'memo' (the new short Decision Memo). This paid
      // engagement flow existed before that change and delivers the FULL
      // detailed report with an extra engagement-framing page inserted
      // (see EngagementMemoContext in usePdfExport.ts) -- pinned to 'full'
      // explicitly so this revenue-critical export keeps its exact prior
      // behavior, unaffected by the new client-side default.
      await generatePdf(result, undefined, {
        preparedFor: engagement.contact_name,
        decisionQuestion: engagement.decision_question || undefined,
        consultantNotes: engagement.consultant_notes || undefined,
      }, 'full');
    } finally {
      setExportingId(null);
    }
  }

  function downloadPacket(engagement: Engagement) {
    const ws = engagement.workspace_data || {};
    const isConsultant = engagement.offer_code === 'consultant_founding_pilot';
    const html = buildEngagementPacketHtml({
      offerName: isConsultant ? 'Consultant Founding Pilot' : 'Founder Decision Review',
      contactName: engagement.contact_name,
      contactEmail: engagement.contact_email,
      companyName: engagement.company_name,
      generatedAt: new Date().toISOString(),
      decisionSummary: isConsultant ? undefined : ws.decision_summary,
      constraints: isConsultant ? undefined : ws.constraints,
      // Workspace JSON already matches this shape (label/value/type/... for
      // assumptions, name/revenue/costs/... for scenarios) — see PaidWorkspace.tsx.
      assumptions: isConsultant ? undefined : (ws.assumptions as never),
      scenarios: isConsultant ? undefined : (ws.scenarios as never),
      questions: ws.questions,
      cases: isConsultant ? (ws.cases as never) : undefined,
      intake: engagement.intake_data,
    });
    downloadPDF(html, `${engagement.company_name || engagement.contact_name} — Founder Packet`);
  }

  async function updateEngagement(id: string, updates: Record<string, unknown>) {
    // Generated database types are updated after the production migration;
    // keep this operational helper compatible with the pre-migration client.
    const { error } = await supabase.from('paid_engagements').update(updates as never).eq('id', id);
    if (error) {
      logger.error('Failed to update paid engagement', error);
      return false;
    }
    await load();
    return true;
  }

  function beginLinkAnalysis(engagement: Engagement) {
    setEditingId(engagement.id);
    setEditForm({
      analysis_id: engagement.analysis_id ?? '',
      decision_question: engagement.decision_question ?? '',
      consultant_notes: engagement.consultant_notes ?? '',
    });
  }

  async function saveLinkedAnalysis(id: string) {
    if (!editForm.analysis_id.trim()) return;
    const saved = await updateEngagement(id, {
      analysis_id: editForm.analysis_id.trim(),
      decision_question: editForm.decision_question.trim() || null,
      consultant_notes: editForm.consultant_notes.trim() || null,
    });
    if (saved) setEditingId(null);
  }

  async function markCaseComplete(engagement: Engagement) {
    const capacity = engagement.case_capacity ?? 1;
    const nextCompleted = Math.min((engagement.cases_completed ?? 0) + 1, capacity);
    await updateEngagement(engagement.id, {
      cases_completed: nextCompleted,
      ...(nextCompleted >= capacity ? { status: 'completed', completed_at: new Date().toISOString() } : {}),
    });
  }

  const completedWithUser = engagements.filter((e) => e.user_id).length;
  const returnedCount = Object.values(returnUsage).filter((r) => r.returned).length;
  const paidAwaitingIntake = engagements.filter((e) => e.payment_status === 'paid' && e.intake_status === 'pending').length;
  const readyForDelivery = engagements.filter((e) => e.payment_status === 'paid' && e.intake_status === 'complete' && e.status === 'scheduled').length;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Paid Decision Engagements</h1>
            <p className="text-sm text-muted-foreground mt-1">Phase 7 — Paid Decision Workflow Validation</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowForm((s) => !s)} size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> Log engagement
            </Button>
            <button onClick={load} className="text-muted-foreground hover:text-foreground">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" />Measured return usage</CardTitle>
            <CardDescription>
              Of {completedWithUser} engagement{completedWithUser === 1 ? '' : 's'} tied to a real account, {returnedCount} came back
              for at least one more analysis ({RETURN_WINDOW_LABEL}). {completedWithUser === 0 && 'No engagements have a linked account yet.'}
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card><CardContent className="pt-6"><p className="text-xs uppercase tracking-wider text-muted-foreground">Paid · awaiting intake</p><p className="text-3xl font-bold mt-2">{paidAwaitingIntake}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs uppercase tracking-wider text-muted-foreground">Intake complete · ready</p><p className="text-3xl font-bold mt-2">{readyForDelivery}</p></CardContent></Card>
        </div>

        {showForm && (
          <Card>
            <CardHeader><CardTitle>Log a new engagement</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Contact name" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
                <Input placeholder="Contact email (optional)" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Select value={form.engagement_type} onValueChange={(v) => setForm({ ...form, engagement_type: v as Engagement['engagement_type'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="founder_review">Founder review</SelectItem>
                    <SelectItem value="consultant_review">Consultant review</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Price (USD, optional)" type="number" value={form.price_usd} onChange={(e) => setForm({ ...form, price_usd: e.target.value })} />
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Engagement['status'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="Linked analysis ID (optional — enables Decision Memo export)" value={form.analysis_id} onChange={(e) => setForm({ ...form, analysis_id: e.target.value })} />
              <Textarea placeholder="Decision question (what is this engagement deciding?)" value={form.decision_question} onChange={(e) => setForm({ ...form, decision_question: e.target.value })} className="h-16" />
              <Textarea placeholder="Reviewer notes (included in the exported memo)" value={form.consultant_notes} onChange={(e) => setForm({ ...form, consultant_notes: e.target.value })} className="h-16" />
              <Button onClick={handleCreate} disabled={!form.contact_name.trim()}>Save engagement</Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>All engagements ({engagements.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {engagements.length === 0 && <p className="text-sm text-muted-foreground">No engagements logged yet.</p>}
            {engagements.map((e) => {
              const usage = e.user_id ? returnUsage[e.id] : undefined;
              return (
                <div key={e.id} className="p-4 rounded-md border border-border space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="font-medium text-foreground">{e.contact_name}</span>
                      {e.contact_email && <span className="text-muted-foreground text-sm ml-2">{e.contact_email}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{e.engagement_type.replace('_', ' ')}</Badge>
                      {e.payment_status && <Badge variant={e.payment_status === 'paid' ? 'default' : e.payment_status.includes('refund') ? 'destructive' : 'secondary'}>{e.payment_status.replace('_', ' ')}</Badge>}
                      {e.intake_status && <Badge variant="outline">intake: {e.intake_status.replace('_', ' ')}</Badge>}
                      <Badge variant={e.status === 'completed' ? 'default' : e.status === 'cancelled' ? 'destructive' : 'secondary'}>{e.status}</Badge>
                      {e.price_usd != null && <Badge variant="outline">${e.price_usd.toLocaleString()}</Badge>}
                    </div>
                  </div>
                  {e.decision_question && <p className="text-sm text-muted-foreground">Deciding: {e.decision_question}</p>}
                  {e.case_capacity != null && (
                    <p className="text-xs text-muted-foreground">
                      Cases {e.cases_completed ?? 0}/{e.case_capacity}
                      {e.delivery_due_at ? ` · target ${new Date(e.delivery_due_at).toLocaleString()}` : ''}
                      {e.pilot_ends_at ? ` · pilot closes ${new Date(e.pilot_ends_at).toLocaleDateString()}` : ''}
                    </p>
                  )}
                  {(e.intake_data || e.workspace_data) && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        {expandedId === e.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {expandedId === e.id ? 'Hide submitted brief' : 'View submitted brief'}
                      </button>
                      {expandedId === e.id && (
                        <div className="mt-2 rounded-md border border-border bg-muted/30 p-3 space-y-2 text-xs">
                          {e.workspace_data?.decision_summary && (
                            <p><span className="font-medium">Decision:</span> {e.workspace_data.decision_summary}</p>
                          )}
                          {(e.workspace_data?.assumptions?.length ?? 0) > 0 && (
                            <p><span className="font-medium">Assumptions recorded:</span> {e.workspace_data!.assumptions!.length}</p>
                          )}
                          {(e.workspace_data?.cases?.length ?? 0) > 0 && (
                            <p><span className="font-medium">Client cases:</span> {e.workspace_data!.cases!.length}</p>
                          )}
                          {e.intake_data && Object.entries(e.intake_data).filter(([, v]) => v && String(v).trim()).map(([key, value]) => (
                            <p key={key}><span className="font-medium">{key.replace(/_/g, ' ')}:</span> {String(value)}</p>
                          ))}
                          {!e.intake_data && !e.workspace_data?.decision_summary && (e.workspace_data?.cases?.length ?? 0) === 0 && (
                            <p className="text-muted-foreground">Nothing submitted yet.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {editingId === e.id && (
                    <div className="space-y-2 rounded-md border border-border p-3">
                      <Input placeholder="Analysis ID" value={editForm.analysis_id} onChange={(event) => setEditForm({ ...editForm, analysis_id: event.target.value })} />
                      <Textarea placeholder="Decision question" value={editForm.decision_question} onChange={(event) => setEditForm({ ...editForm, decision_question: event.target.value })} className="h-16" />
                      <Textarea placeholder="Reviewer notes" value={editForm.consultant_notes} onChange={(event) => setEditForm({ ...editForm, consultant_notes: event.target.value })} className="h-16" />
                      <div className="flex gap-2"><Button size="sm" onClick={() => saveLinkedAnalysis(e.id)} disabled={!editForm.analysis_id.trim()}>Save link</Button><Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button></div>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Engaged {new Date(e.engaged_at).toLocaleDateString()}
                      {' · '}
                      {e.user_id
                        ? usage
                          ? usage.returned
                            ? `Returned — ${usage.count} analysis${usage.count === 1 ? '' : 'es'} since`
                            : 'No return usage yet'
                          : 'Checking return usage…'
                        : 'No linked account'}
                    </span>
                    <div className="flex flex-wrap justify-end gap-2">
                      {e.payment_status === 'paid' && e.intake_status === 'complete' && !e.substantive_work_started_at && e.status === 'scheduled' && (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => updateEngagement(e.id, { substantive_work_started_at: new Date().toISOString() })}><Play className="w-3.5 h-3.5" />Start work</Button>
                      )}
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => beginLinkAnalysis(e)}><Link2 className="w-3.5 h-3.5" />{e.analysis_id ? 'Edit analysis' : 'Link analysis'}</Button>
                      {(e.intake_data || e.workspace_data) && (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadPacket(e)}><Download className="w-3.5 h-3.5" />Download packet</Button>
                      )}
                      {e.status === 'scheduled' && (e.cases_completed ?? 0) < (e.case_capacity ?? 1) && (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => markCaseComplete(e)}><CheckCircle2 className="w-3.5 h-3.5" />Case complete</Button>
                      )}
                      {e.analysis_id && (
                        <Button size="sm" variant="outline" className="gap-1.5" disabled={exportingId === e.id} onClick={() => handleExportMemo(e)}>
                          <Download className="w-3.5 h-3.5" />
                          {exportingId === e.id ? 'Exporting…' : 'Export Decision Memo'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
