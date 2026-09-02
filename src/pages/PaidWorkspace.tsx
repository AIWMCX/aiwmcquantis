import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, FileText, Loader2, Plus, Save, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageSEO } from '@/components/seo/PageSEO';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard, SectionHeader } from '@/components/ui/glass-card';
import { supabase } from '@/integrations/supabase/client';

type Stage = 'intake' | 'briefing' | 'analysis' | 'review' | 'delivered' | 'closed';
type Assumption = { label: string; value: string; type: 'fact' | 'estimate' | 'unknown'; source: string; confidence: 'high' | 'medium' | 'low'; notes: string };
type Scenario = { name: string; revenue: string; costs: string; cash: string; trigger: string; notes: string };
// Each consultant case is a separate model per the offer's own promise
// ("Each case has its own decision, assumptions, scenarios, and memo") --
// assumptions/scenarios live on the Case itself, not shared workspace-wide.
// The founder_decision_review offer has no cases and keeps using the
// top-level WorkspaceData.assumptions/scenarios fields below.
type Case = { case_name: string; client_type: string; decision_question: string; deadline: string; context: string; status: 'not_started' | 'ready' | 'in_review' | 'delivered'; assumptions: Assumption[]; scenarios: Scenario[] };
type WorkspaceData = { version: number; stage: Stage; decision_summary: string; constraints: string; assumptions: Assumption[]; scenarios: Scenario[]; questions: string[]; action_items: string[]; cases: Case[] };
type Engagement = { id: string; offer_code: 'founder_decision_review' | 'consultant_founding_pilot'; engagement_type: string; contact_name: string; contact_email: string | null; company_name: string | null; decision_question: string | null; status: string; payment_status: string; intake_status: string; delivery_due_at: string | null; pilot_ends_at: string | null; case_capacity: number; cases_completed: number; workspace_status: Stage; workspace_updated_at: string | null };

const newAssumption = (): Assumption => ({ label: '', value: '', type: 'unknown', source: '', confidence: 'medium', notes: '' });
const newScenario = (name: string): Scenario => ({ name, revenue: '', costs: '', cash: '', trigger: '', notes: '' });
const defaultScenarios = () => [newScenario('Base'), newScenario('Downside'), newScenario('Upside')];
const newCase = (): Case => ({ case_name: '', client_type: '', decision_question: '', deadline: '', context: '', status: 'not_started', assumptions: [], scenarios: defaultScenarios() });
const initialData = (e: Engagement): WorkspaceData => ({ version: 1, stage: 'briefing', decision_summary: e.decision_question || '', constraints: '', assumptions: [], scenarios: defaultScenarios(), questions: [], action_items: [], cases: e.case_capacity > 1 ? [newCase(), newCase()] : [] });
const dateLabel = (v: string | null) => v ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v)) : 'Set after intake';

export default function PaidWorkspace() {
  const [sessionId, setSessionId] = useState('');
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [activeCase, setActiveCase] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const urlId = new URLSearchParams(window.location.search).get('session_id') || '';
    const id = urlId || window.sessionStorage.getItem('quantis_paid_session') || '';
    if (urlId) window.sessionStorage.setItem('quantis_paid_session', urlId);
    window.history.replaceState({}, document.title, '/engagement-workspace');
    setSessionId(id);
  }, []);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    supabase.functions.invoke('engagement-intake', { body: { action: 'workspace', session_id: sessionId } })
      .then(({ data: result, error: invokeError }) => {
        if (invokeError || !result?.workspace?.engagement) throw invokeError || new Error('unavailable');
        const e = result.workspace.engagement as Engagement;
        const raw = (result.workspace.data || {}) as Partial<WorkspaceData>;
        const base = initialData(e);
        setEngagement(e);
        // Backward-compatible with any workspace saved before cases carried
        // their own assumptions/scenarios: fills in empty defaults rather
        // than crashing on older shapes.
        const cases = (raw.cases?.length ? raw.cases : base.cases).map((c) => ({
          ...newCase(), ...c, assumptions: c.assumptions || [], scenarios: c.scenarios?.length ? c.scenarios : defaultScenarios(),
        }));
        setData({ ...base, ...raw, assumptions: raw.assumptions || [], scenarios: raw.scenarios?.length ? raw.scenarios : base.scenarios, questions: raw.questions || [], action_items: raw.action_items || [], cases });
      })
      .catch(() => setError('We could not open this paid workspace. Use the original Stripe return link or contact support@aiwmcquantis.com.'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const consultant = engagement?.offer_code === 'consultant_founding_pilot';
  const activeAssumptions = consultant ? (data?.cases[activeCase]?.assumptions || []) : (data?.assumptions || []);
  const activeScenarios = consultant ? (data?.cases[activeCase]?.scenarios || []) : (data?.scenarios || []);
  const completion = useMemo(() => data ? [Boolean(consultant ? data.cases[activeCase]?.decision_question : data.decision_summary), activeAssumptions.length > 0, activeScenarios.length === 3, consultant ? data.cases.some(c => Boolean(c.decision_question)) : data.questions.length > 0].filter(Boolean).length : 0, [data, consultant, activeCase, activeAssumptions, activeScenarios]);

  const update = <K extends keyof WorkspaceData>(key: K, value: WorkspaceData[K]) => { setData(d => d ? { ...d, [key]: value } : d); setSaved(false); };
  const changeCase = <K extends keyof Case>(key: K, value: Case[K]) => { if (!data) return; const cases = [...data.cases]; cases[activeCase] = { ...cases[activeCase], [key]: value }; update('cases', cases); };
  const setAssumptions = (next: Assumption[]) => consultant ? changeCase('assumptions', next) : update('assumptions', next);
  const setScenarios = (next: Scenario[]) => consultant ? changeCase('scenarios', next) : update('scenarios', next);

  async function save() {
    if (!data || !sessionId) return;
    setSaving(true); setSaved(false); setError('');
    const { data: result, error: invokeError } = await supabase.functions.invoke('engagement-intake', { body: { action: 'save_workspace', session_id: sessionId, workspace_data: data } });
    if (invokeError || !result?.saved) setError('Your workspace could not be saved. Nothing was charged again; please retry.');
    else { setData({ ...data, ...result.data }); setSaved(true); }
    setSaving(false);
  }

  if (loading) return <PublicPageShell maxWidth="xl"><div className="py-24 flex justify-center"><Loader2 className="animate-spin" /></div></PublicPageShell>;
  if (error || !engagement || !data) return <PublicPageShell maxWidth="md"><div className="py-20"><GlassCard className="p-8"><h1 className="text-2xl font-semibold">Workspace unavailable</h1><p className="text-muted-foreground mt-3">{error || 'Complete your paid intake first.'}</p><Link className="inline-flex mt-6 underline" to="/decision-review">Return to offer page <ArrowRight className="h-4 w-4 ml-2" /></Link></GlassCard></div></PublicPageShell>;

  return <PublicPageShell maxWidth="xl">
    <PageSEO title={consultant ? 'Consultant Pilot Desk — AIWMC Quantis' : 'Founder Decision Room — AIWMC Quantis'} description="Secure paid Quantis workspace for your decision review." canonical="/engagement-workspace" noindex />
    <div className="py-8 md:py-14">
      <div className="flex flex-wrap justify-between gap-5 items-start"><div><div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-primary"><ShieldCheck className="h-4 w-4" />Payment verified · private workspace</div><h1 className="text-3xl md:text-5xl font-bold mt-3">{consultant ? 'Consultant Pilot Desk' : 'Founder Decision Room'}</h1><p className="text-muted-foreground mt-3 max-w-2xl">{consultant ? 'Prepare two client cases with repeatable intake, explicit assumptions, and a consultant-ready memo for each.' : 'Turn one consequential decision into a structured brief, reconciled assumptions, and a reviewable decision memo.'}</p></div><Button size="lg" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}{saved ? 'Saved' : 'Save workspace'}</Button></div>
      <div className="grid md:grid-cols-4 gap-3 mt-8">{[['Payment', true], ['Intake', engagement.intake_status === 'complete'], ['Brief', completion >= 1], ['Review', engagement.workspace_status === 'review' || engagement.workspace_status === 'delivered']].map(([label, ok]) => <div key={String(label)} className="rounded-xl border border-border/60 bg-card/60 p-4 flex items-center gap-3">{ok ? <Check className="h-4 w-4 text-emerald-400" /> : <div className="h-4 w-4 rounded-full border border-muted-foreground" />}<span className="text-sm">{label}</span></div>)}</div>
      <div className="grid lg:grid-cols-[1fr_320px] gap-8 mt-10"><main className="space-y-8">
        {consultant ? <GlassCard className="p-6"><SectionHeader eyebrow="Two-case capacity" title="Case pipeline" description="Each case has its own decision, assumptions, scenarios, and memo." /><div className="flex flex-wrap gap-2 mt-5">{data.cases.map((item, i) => <Button key={i} variant={activeCase === i ? 'default' : 'outline'} onClick={() => setActiveCase(i)}><Users className="h-4 w-4 mr-2" />Case {i + 1}{item.case_name ? ' · ' + item.case_name : ''}</Button>)}</div>{data.cases[activeCase] && <div className="grid md:grid-cols-2 gap-4 mt-6"><label className="space-y-2"><span className="text-sm">Case or client name</span><Input value={data.cases[activeCase].case_name} onChange={e => changeCase('case_name', e.target.value)} /></label><label className="space-y-2"><span className="text-sm">Primary client type</span><Input value={data.cases[activeCase].client_type} onChange={e => changeCase('client_type', e.target.value)} /></label><label className="md:col-span-2 space-y-2"><span className="text-sm">Decision this case must answer</span><Textarea className="min-h-24" value={data.cases[activeCase].decision_question} onChange={e => changeCase('decision_question', e.target.value)} /></label><label className="space-y-2"><span className="text-sm">Deadline</span><Input value={data.cases[activeCase].deadline} onChange={e => changeCase('deadline', e.target.value)} /></label><label className="space-y-2"><span className="text-sm">Context and known constraints</span><Textarea value={data.cases[activeCase].context} onChange={e => changeCase('context', e.target.value)} /></label></div>}</GlassCard> : <GlassCard className="p-6"><SectionHeader eyebrow="Founder decision" title="Write the decision in plain language" description="Name the commitment, deadline, and consequence—not a generic business goal." /><Textarea className="min-h-28 mt-5" value={data.decision_summary} onChange={e => update('decision_summary', e.target.value)} placeholder="What decision must be made, by when, and what money is exposed?" /><label className="block space-y-2 mt-5"><span className="text-sm">Constraints, commitments, or non-negotiables</span><Textarea className="min-h-24" value={data.constraints} onChange={e => update('constraints', e.target.value)} /></label></GlassCard>}
        <GlassCard className="p-6"><SectionHeader eyebrow="Assumption register" title="Separate facts from estimates" description={consultant ? `Every important input for Case ${activeCase + 1}, with a value, source, and confidence level.` : "Every important input gets a value, source, and confidence level."} /><div className="space-y-4 mt-5">{activeAssumptions.map((row, i) => <div key={i} className="grid md:grid-cols-[1fr_1fr_130px] gap-3 rounded-xl border border-border/60 p-4"><Input placeholder="Assumption" value={row.label} onChange={e => { const a=[...activeAssumptions]; a[i]={...row,label:e.target.value}; setAssumptions(a); }} /><Input placeholder="Value or range" value={row.value} onChange={e => { const a=[...activeAssumptions]; a[i]={...row,value:e.target.value}; setAssumptions(a); }} /><select className="rounded-md border border-input bg-background px-3 text-sm" value={row.type} onChange={e => { const a=[...activeAssumptions]; a[i]={...row,type:e.target.value as Assumption['type']}; setAssumptions(a); }}><option value="fact">Fact</option><option value="estimate">Estimate</option><option value="unknown">Unknown</option></select><Input placeholder="Source / owner" value={row.source} onChange={e => { const a=[...activeAssumptions]; a[i]={...row,source:e.target.value}; setAssumptions(a); }} /><Input placeholder="Notes / what changes it" className="md:col-span-2" value={row.notes} onChange={e => { const a=[...activeAssumptions]; a[i]={...row,notes:e.target.value}; setAssumptions(a); }} /></div>)}<Button variant="outline" onClick={() => setAssumptions([...activeAssumptions, newAssumption()])} disabled={activeAssumptions.length >= 12}><Plus className="h-4 w-4 mr-2" />Add assumption</Button></div></GlassCard>
        <GlassCard className="p-6"><SectionHeader eyebrow="Scenario board" title="Make the decision testable" description={consultant ? `Base, downside, and upside for Case ${activeCase + 1} only.` : "Capture the base, downside, and upside cases for reconciliation in the delivered analysis."} /><div className="grid md:grid-cols-3 gap-4 mt-5">{activeScenarios.map((row, i) => <div key={i} className="rounded-xl border border-border/60 p-4 space-y-3"><Input value={row.name} onChange={e => { const s=[...activeScenarios]; s[i]={...row,name:e.target.value}; setScenarios(s); }} /><Input placeholder="Revenue / month" value={row.revenue} onChange={e => { const s=[...activeScenarios]; s[i]={...row,revenue:e.target.value}; setScenarios(s); }} /><Input placeholder="Costs / month" value={row.costs} onChange={e => { const s=[...activeScenarios]; s[i]={...row,costs:e.target.value}; setScenarios(s); }} /><Input placeholder="Ending cash / runway" value={row.cash} onChange={e => { const s=[...activeScenarios]; s[i]={...row,cash:e.target.value}; setScenarios(s); }} /><Textarea placeholder="What has to be true?" value={row.trigger} onChange={e => { const s=[...activeScenarios]; s[i]={...row,trigger:e.target.value}; setScenarios(s); }} /></div>)}</div></GlassCard>
        <GlassCard className="p-6"><SectionHeader eyebrow="Review agenda" title="What would change your mind?" description="These questions become the human review agenda." /><Textarea className="min-h-24 mt-5" placeholder="One question per line" value={data.questions.join('\n')} onChange={e => update('questions', e.target.value.split('\n').slice(0,10))} /><div className="flex items-center gap-3 mt-5 text-sm text-muted-foreground"><FileText className="h-4 w-4" />The memo distinguishes facts, estimates, unknowns, sensitivities, and limitations.</div></GlassCard>
      </main><aside className="space-y-5"><GlassCard className="p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Delivery target</p><p className="text-lg font-semibold mt-2">{dateLabel(engagement.delivery_due_at)}</p><p className="text-sm text-muted-foreground mt-2">Operational target after complete intake, not a guarantee.</p></GlassCard>{consultant && <GlassCard className="p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Pilot window</p><p className="text-lg font-semibold mt-2">{dateLabel(engagement.pilot_ends_at)}</p><p className="text-sm text-muted-foreground mt-2">{engagement.case_capacity} cases included · {engagement.cases_completed} delivered</p></GlassCard>}<GlassCard className="p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">What happens next</p><ol className="mt-3 space-y-3 text-sm text-muted-foreground"><li>1. Save your brief and assumptions.</li><li>2. AIWMC requests missing information.</li><li>3. Quantis runs deterministic model and scenario checks.</li><li>4. You receive an inspectable memo and live review.</li></ol></GlassCard><div className="text-xs text-muted-foreground">Need help? <a className="underline" href="mailto:support@aiwmcquantis.com">support@aiwmcquantis.com</a></div></aside></div>
    </div>
  </PublicPageShell>;
}
