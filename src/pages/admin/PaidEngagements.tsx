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
import { Download, Plus, RefreshCw, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePdfExport } from '@/hooks/usePdfExport';
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
  const { generatePdf } = usePdfExport();

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
      await generatePdf(result, undefined, {
        preparedFor: engagement.contact_name,
        decisionQuestion: engagement.decision_question || undefined,
        consultantNotes: engagement.consultant_notes || undefined,
      });
    } finally {
      setExportingId(null);
    }
  }

  const completedWithUser = engagements.filter((e) => e.user_id).length;
  const returnedCount = Object.values(returnUsage).filter((r) => r.returned).length;

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
                      <Badge variant={e.status === 'completed' ? 'default' : e.status === 'cancelled' ? 'destructive' : 'secondary'}>{e.status}</Badge>
                      {e.price_usd != null && <Badge variant="outline">${e.price_usd.toLocaleString()}</Badge>}
                    </div>
                  </div>
                  {e.decision_question && <p className="text-sm text-muted-foreground">Deciding: {e.decision_question}</p>}
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
                    {e.analysis_id && (
                      <Button size="sm" variant="outline" className="gap-1.5" disabled={exportingId === e.id} onClick={() => handleExportMemo(e)}>
                        <Download className="w-3.5 h-3.5" />
                        {exportingId === e.id ? 'Exporting…' : 'Export Decision Memo'}
                      </Button>
                    )}
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
