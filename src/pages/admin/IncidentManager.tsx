/**
 * Phase 6A (2026-08-30) -- closes the 6.5 scope cut from Phase 6's
 * closure pass: "Add a clear incident workflow: detect, acknowledge,
 * update, resolve, and postmortem." status_incidents (table + RLS) shipped
 * with Phase 6, but there was no admin UI -- incidents were only ever
 * written via direct SQL. This is that UI.
 *
 * Workflow mapping:
 *  - detect      -> "Log incident" creates a row (status: investigating)
 *  - acknowledge -> first status change away from investigating (identified)
 *  - update      -> "Add update" appends a timestamped entry to the
 *                   `updates` jsonb array without necessarily changing status
 *  - resolve     -> "Resolve" sets status=resolved, resolved_at=now()
 *  - postmortem  -> optional postmortem_url, addable any time (usually at resolve)
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, RefreshCw, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

type Severity = 'minor' | 'major' | 'critical' | 'maintenance';
type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'scheduled';

interface IncidentUpdate {
  at: string;
  status: IncidentStatus;
  message: string;
}

interface Incident {
  id: string;
  title: string;
  component: string;
  severity: Severity;
  status: IncidentStatus;
  detected_at: string;
  resolved_at: string | null;
  summary: string;
  postmortem_url: string | null;
  updates: IncidentUpdate[];
}

const COMPONENTS = ['Database', 'Authentication', 'Analysis Engine (deterministic)', 'AI Narrative Generation', 'Billing', 'RVCE / Benchmark Corpus', 'Report / PDF Generation', 'Other'];
const STATUS_OPTIONS: IncidentStatus[] = ['investigating', 'identified', 'monitoring', 'resolved', 'scheduled'];

export default function IncidentManager() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [updateDraft, setUpdateDraft] = useState<Record<string, string>>({});
  const [postmortemDraft, setPostmortemDraft] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    title: '', component: COMPONENTS[0], severity: 'minor' as Severity, summary: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('status_incidents')
      .select('*')
      .order('detected_at', { ascending: false });
    setIncidents((data ?? []) as unknown as Incident[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!form.title.trim() || !form.summary.trim()) return;
    const { error } = await supabase.from('status_incidents').insert({
      title: form.title.trim(),
      component: form.component,
      severity: form.severity,
      summary: form.summary.trim(),
      status: 'investigating',
    });
    if (error) {
      logger.error('Failed to create incident', error);
      return;
    }
    setForm({ title: '', component: COMPONENTS[0], severity: 'minor', summary: '' });
    setShowForm(false);
    load();
  }

  // "acknowledge" and "update" both go through here -- acknowledge is just
  // the first status transition away from investigating.
  async function handleAddUpdate(incident: Incident, newStatus: IncidentStatus) {
    const message = (updateDraft[incident.id] || '').trim();
    if (!message) return;
    const nextUpdates: IncidentUpdate[] = [
      ...(incident.updates || []),
      { at: new Date().toISOString(), status: newStatus, message },
    ];
    const { error } = await supabase
      .from('status_incidents')
      .update({ status: newStatus, updates: nextUpdates as any, updated_at: new Date().toISOString() })
      .eq('id', incident.id);
    if (error) {
      logger.error('Failed to add incident update', error);
      return;
    }
    setUpdateDraft((d) => ({ ...d, [incident.id]: '' }));
    load();
  }

  async function handleResolve(incident: Incident) {
    const postmortemUrl = (postmortemDraft[incident.id] || '').trim();
    const message = (updateDraft[incident.id] || '').trim() || 'Resolved.';
    const nextUpdates: IncidentUpdate[] = [
      ...(incident.updates || []),
      { at: new Date().toISOString(), status: 'resolved', message },
    ];
    const { error } = await supabase
      .from('status_incidents')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        postmortem_url: postmortemUrl || incident.postmortem_url,
        updates: nextUpdates as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incident.id);
    if (error) {
      logger.error('Failed to resolve incident', error);
      return;
    }
    setUpdateDraft((d) => ({ ...d, [incident.id]: '' }));
    setPostmortemDraft((d) => ({ ...d, [incident.id]: '' }));
    load();
  }

  return (
    <>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Incident Manager</h1>
            <p className="text-sm text-muted-foreground mt-1">Phase 6A — detect, acknowledge, update, resolve, postmortem</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowForm((s) => !s)} size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> Log incident
            </Button>
            <button onClick={load} className="text-muted-foreground hover:text-foreground">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {showForm && (
          <Card>
            <CardHeader><CardTitle>Log a new incident (detect)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Select value={form.component} onValueChange={(v) => setForm({ ...form, component: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMPONENTS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as Severity })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="major">Major</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea placeholder="Customer-facing summary (shown on /status)" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="h-20" />
              <Button onClick={handleCreate} disabled={!form.title.trim() || !form.summary.trim()}>Log incident</Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {incidents.length === 0 && <p className="text-sm text-muted-foreground">No incidents logged.</p>}
          {incidents.map((incident) => (
            <Card key={incident.id}>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base">{incident.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{incident.component}</Badge>
                    <Badge variant={incident.severity === 'critical' ? 'destructive' : 'secondary'}>{incident.severity}</Badge>
                    <Badge variant={incident.status === 'resolved' ? 'default' : 'secondary'}>{incident.status}</Badge>
                  </div>
                </div>
                <CardDescription>{incident.summary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {incident.updates?.length > 0 && (
                  <div className="space-y-1.5 border-l-2 border-border pl-3">
                    {incident.updates.map((u, i) => (
                      <div key={i} className="text-xs text-muted-foreground">
                        <span className="font-mono">{new Date(u.at).toLocaleString('en-US')}</span> — <span className="font-medium">{u.status}</span>: {u.message}
                      </div>
                    ))}
                  </div>
                )}

                {incident.status !== 'resolved' && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <Textarea
                      placeholder="Update message (acknowledge / update / resolution note)"
                      value={updateDraft[incident.id] || ''}
                      onChange={(e) => setUpdateDraft((d) => ({ ...d, [incident.id]: e.target.value }))}
                      className="h-16 text-sm"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      {STATUS_OPTIONS.filter((s) => s !== 'resolved').map((s) => (
                        <Button key={s} size="sm" variant="outline" onClick={() => handleAddUpdate(incident, s)} disabled={!updateDraft[incident.id]?.trim()}>
                          Post as "{s}"
                        </Button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Input
                        placeholder="Postmortem URL (optional)"
                        value={postmortemDraft[incident.id] || ''}
                        onChange={(e) => setPostmortemDraft((d) => ({ ...d, [incident.id]: e.target.value }))}
                        className="text-sm"
                      />
                      <Button size="sm" className="gap-1.5 shrink-0" onClick={() => handleResolve(incident)}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                      </Button>
                    </div>
                  </div>
                )}

                {incident.status === 'resolved' && (
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Resolved {incident.resolved_at && new Date(incident.resolved_at).toLocaleString('en-US')}
                    {incident.postmortem_url && (
                      <>
                        {' · '}
                        <a href={incident.postmortem_url} target="_blank" rel="noreferrer" className="underline">Postmortem</a>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
