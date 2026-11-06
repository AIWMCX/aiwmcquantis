import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Linkedin, Copy, Check, RefreshCw, SkipForward, Sparkles, ShieldCheck, Upload, Pause, Play, AlertTriangle } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { lintDraft, type LiDraftAction, type LiLintReport } from '@/lib/li-growth/lint';
import { scoreFit, BUSINESS_TYPES, SIGNAL_TYPES, WARMTH_POINTS, type BusinessType, type FitResult, type SignalType, type Warmth } from '@/lib/li-growth/fit-score';
import {
  DEFAULT_SETTINGS, CEILING, addDays, checkSend, denverDay, effectiveCaps, evaluateStopRules, remaining, settingsForRampWeek, usedToday, weekStart,
  type CapAction, type LiSettings, type TouchLite,
} from '@/lib/li-growth/caps';
import { buildQueue, type QueueItem } from '@/lib/li-growth/queue';
import { TARGET_SOURCES, firstName, isSafeLinkedInUrl, normalizePostUrl, normalizeProfileUrl, parseTargetCsv, type TargetImportRow } from '@/lib/li-growth/prospects';
import { channelEmail, latestEmailEvidence, type EmailKind } from '@/lib/li-growth/published-email';

// The li_* tables are not in the generated Supabase types (the 6.4k-line
// types file is not regenerated per PR), so table access is cast through
// `(supabase as any)`, the same workaround CommercialOps.tsx uses.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const COMPLIANCE_LINE =
  'This tool never posts, comments, reacts, connects or messages on LinkedIn and never reads LinkedIn: it drafts, you paste and send by hand, then click Mark sent.';

export const PUBLISHED_EMAIL_LINE = 'Only addresses the firm publishes on its own website. Quantis never guesses an address.';

// ─── Row shapes ─────────────────────────────────────────────────────────────

interface ProspectRow {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_role: string | null;
  contact_channel: string | null;
  stage: string;
  suppression_status: string;
}

interface TargetRow {
  prospect_id: string;
  linkedin_url: string;
  headline: string | null;
  country: string | null;
  business_type: BusinessType | null;
  employees: number | null;
  source: string;
  warmth: Warmth;
  connection_degree: number | null;
  posts_weekly: boolean;
  has_verified_email: boolean;
  persona: string | null;
  fit_score: number | null;
  fit_breakdown: FitResult['breakdown'] | Record<string, never>;
  nurture_until: string | null;
  notes: string | null;
  created_at: string;
  commercial_prospects: ProspectRow | null;
}

interface SignalRow {
  id: string;
  prospect_id: string;
  signal_type: SignalType;
  post_url: string | null;
  excerpt: string | null;
  observed_at: string;
}

interface DraftRow {
  id: string;
  prospect_id: string;
  signal_id: string | null;
  action_type: LiDraftAction;
  target_url: string;
  rationale: string;
  draft_text: string;
  lint_report: LiLintReport | Record<string, never>;
  status: 'draft' | 'approved' | 'sent' | 'skipped';
  final_text: string | null;
  attempts: number;
  sent_at: string | null;
  created_at: string;
}

interface TouchRow extends TouchLite {
  id: string;
  draft_id: string | null;
  revenue_cents: number | null;
  note: string | null;
}

interface FactRow {
  id: string;
  fact: string;
  numbers: string[];
  source_url: string;
  verified_at: string;
  topic: string | null;
  active: boolean;
}

type SettingsRow = LiSettings & { updated_at?: string };

const ACTION_LABEL: Record<LiDraftAction, string> = { comment: 'Comment', dm_first: 'First DM', dm_followup: 'Follow-up DM' };
const SKIP_REASONS = ['Not relevant', 'Already engaged', 'Post too old', 'Bad draft', 'Not a fit'];
const OUTCOME_KINDS = [
  { value: 'connect_no_note', label: 'Connection request sent' },
  { value: 'connect_accepted', label: 'Connection accepted' },
  { value: 'reply_received', label: 'Reply received' },
  { value: 'call_booked', label: 'Call booked' },
  { value: 'call_done', label: 'Call held' },
  { value: 'paid', label: 'Paid' },
] as const;
const REPLY_CLASSES = ['positive', 'neutral', 'objection', 'not_now', 'negative'] as const;
const SELECT_CLS = 'mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm';

// ─── Data access ────────────────────────────────────────────────────────────

async function rows<T>(q: Promise<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function invokeDraft(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('li-growth-draft', { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      const parsed = await ctx.json().catch(() => null);
      if (parsed?.error) {
        const issues = parsed.lint?.issues?.map((i: { message: string }) => i.message).join(' ') ?? '';
        throw new Error(`${parsed.error}${issues ? `: ${issues}` : ''}`);
      }
    }
    throw error;
  }
  return data as { draft: DraftRow; lint: LiLintReport };
}

async function invokeEnrich<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('li-enrich', { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      const parsed = await ctx.json().catch(() => null);
      if (parsed?.error) throw new Error(parsed.error);
    }
    throw error;
  }
  return data as T;
}

async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw new Error(error.message);
  return data;
}

function fitFor(t: TargetRow, signals: SignalRow[], s: LiSettings): FitResult {
  const p = t.commercial_prospects;
  return scoreFit(
    {
      name: p?.contact_name ?? null,
      headline: t.headline ?? p?.contact_role ?? null,
      company: p?.company_name ?? null,
      linkedin_url: t.linkedin_url,
      contact_channel: p?.contact_channel ?? null,
      country: t.country,
      business_type: t.business_type,
      employees: t.employees,
      warmth: t.warmth,
      connection_degree: t.connection_degree,
      posts_weekly: t.posts_weekly,
      has_verified_email: t.has_verified_email,
      do_not_contact: (p?.suppression_status ?? 'active') !== 'active',
      signals: signals.filter((x) => x.prospect_id === t.prospect_id),
    },
    new Date(),
    { dm: s.fit_threshold_dm, comment: s.fit_threshold_comment },
  );
}

function fitPatch(fit: FitResult) {
  return {
    fit_score: fit.score,
    fit_breakdown: { ...fit.breakdown, disqualified: fit.disqualified },
    persona: fit.persona,
    fit_version: fit.version,
    fit_scored_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function tierBadge(score: number | null, s: LiSettings) {
  const v = score ?? 0;
  if (v >= s.fit_threshold_dm) return <Badge className="bg-emerald-600 hover:bg-emerald-600">{v} DM</Badge>;
  if (v >= s.fit_threshold_comment) return <Badge className="bg-amber-600 hover:bg-amber-600">{v} comment</Badge>;
  return <Badge variant="outline">{v}</Badge>;
}

function ageLabel(iso: string): string {
  const h = Math.max(0, (Date.now() - new Date(iso).getTime()) / 3_600_000);
  return h < 48 ? `${Math.round(h)}h ago` : `${Math.round(h / 24)}d ago`;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function LinkedInGrowth() {
  const { isAdmin, isLoading } = useAdmin();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const enabled = isAdmin;

  useEffect(() => {
    if (!isLoading && !isAdmin) navigate('/app', { replace: true });
  }, [isAdmin, isLoading, navigate]);

  const targetsQ = useQuery({
    queryKey: ['li', 'targets'],
    enabled,
    queryFn: () => rows<TargetRow>(db.from('li_engagement_targets')
      .select('*, commercial_prospects(id, company_name, contact_name, contact_role, contact_channel, stage, suppression_status)')
      .order('fit_score', { ascending: false, nullsFirst: false }).limit(2000)),
  });
  const signalsQ = useQuery({
    queryKey: ['li', 'signals'],
    enabled,
    queryFn: () => rows<SignalRow>(db.from('li_engagement_signals').select('id, prospect_id, signal_type, post_url, excerpt, observed_at')
      .order('observed_at', { ascending: false }).limit(3000)),
  });
  const draftsQ = useQuery({
    queryKey: ['li', 'drafts'],
    enabled,
    queryFn: () => rows<DraftRow>(db.from('li_engagement_drafts').select('*')
      .gte('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString())
      .order('created_at', { ascending: false }).limit(1000)),
  });
  const touchesQ = useQuery({
    queryKey: ['li', 'touches'],
    enabled,
    queryFn: () => rows<TouchRow>(db.from('li_engagement_touches').select('*').order('occurred_at', { ascending: false }).limit(5000)),
  });
  const factsQ = useQuery({
    queryKey: ['li', 'facts'],
    enabled,
    queryFn: () => rows<FactRow>(db.from('li_fact_bank').select('*').order('verified_at', { ascending: false })),
  });
  const settingsQ = useQuery({
    queryKey: ['li', 'settings'],
    enabled,
    queryFn: async () => {
      const { data, error } = await db.from('li_engagement_settings').select('*').eq('id', true).maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? DEFAULT_SETTINGS) as SettingsRow;
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['li'] });

  const targets = useMemo(() => targetsQ.data ?? [], [targetsQ.data]);
  const signals = useMemo(() => signalsQ.data ?? [], [signalsQ.data]);
  const drafts = useMemo(() => draftsQ.data ?? [], [draftsQ.data]);
  const touches = useMemo(() => touchesQ.data ?? [], [touchesQ.data]);
  const facts = useMemo(() => factsQ.data ?? [], [factsQ.data]);
  const settings: SettingsRow = settingsQ.data ?? DEFAULT_SETTINGS;
  const factNumbers = useMemo(() => facts.filter((f) => f.active).flatMap((f) => f.numbers ?? []), [facts]);

  // Scores depend on time (a trigger counts for 30 days), so re-score on load
  // and store any that moved; li-growth-draft reads the stored score.
  const fits = useMemo(() => new Map(targets.map((t) => [t.prospect_id, fitFor(t, signals, settings)])), [targets, signals, settings]);
  const rescored = useRef(new Set<string>()); // one attempt per person+score per visit
  useEffect(() => {
    if (!targetsQ.data || !signalsQ.data || !settingsQ.data) return;
    const stale = targets.filter((t) => {
      const score = fits.get(t.prospect_id)?.score;
      return score !== t.fit_score && !rescored.current.has(`${t.prospect_id}:${score}`);
    });
    if (!stale.length) return;
    let cancelled = false;
    (async () => {
      let saved = 0;
      for (const t of stale.slice(0, 200)) {
        if (cancelled) return;
        const fit = fits.get(t.prospect_id) as FitResult;
        rescored.current.add(`${t.prospect_id}:${fit.score}`);
        const { error } = await db.from('li_engagement_targets').update(fitPatch(fit)).eq('prospect_id', t.prospect_id);
        if (!error) saved++;
      }
      if (!cancelled && saved) qc.invalidateQueries({ queryKey: ['li', 'targets'] });
    })();
    return () => { cancelled = true; };
  }, [fits, targets, targetsQ.data, signalsQ.data, settingsQ.data, qc]);

  const today = denverDay(new Date());
  const stop = useMemo(() => evaluateStopRules(touches), [touches]);
  const eff = useMemo(() => effectiveCaps(settings, today, stop), [settings, today, stop]);
  const used = useMemo(() => usedToday(touches, today), [touches, today]);
  const left = remaining(eff.caps, used);

  const queue = useMemo(() => buildQueue({
    targets: targets.map((t) => ({
      prospect_id: t.prospect_id,
      fit_score: fits.get(t.prospect_id)?.score ?? t.fit_score,
      connection_degree: t.connection_degree,
      nurture_until: t.nurture_until,
      do_not_contact: (t.commercial_prospects?.suppression_status ?? 'active') !== 'active',
      warmth_points: fits.get(t.prospect_id)?.breakdown.warmth.points ?? WARMTH_POINTS[t.warmth] ?? 0,
    })),
    signals,
    touches,
    drafts,
    settings,
    caps: eff.caps,
    remaining: left,
    today,
    now: new Date(),
  }), [targets, fits, signals, touches, drafts, settings, eff.caps, left.comment, left.dm_first, left.dm_followup, today]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || !isAdmin) {
    return <div className="min-h-[400px] flex items-center justify-center text-[var(--q-text-secondary)]">{isLoading ? 'Checking access…' : 'Redirecting…'}</div>;
  }

  const loading = targetsQ.isLoading || signalsQ.isLoading || draftsQ.isLoading || touchesQ.isLoading || settingsQ.isLoading;
  const shared = { targets, signals, drafts, touches, facts, settings, fits, factNumbers, today, refresh, caps: eff.caps };

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold font-sora flex items-center gap-2">
          <Linkedin className="w-6 h-6 text-primary" /> LinkedIn Growth
        </h1>
        <p className="text-sm text-[var(--q-text-secondary)]">
          Fit-scored people you added, one drafted comment or DM each, linted before you can copy it.
        </p>
        <p className="text-sm font-medium flex items-center gap-1.5" data-testid="li-compliance-line">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" /> {COMPLIANCE_LINE}
        </p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : (
        <Tabs defaultValue="queue">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="queue">Today&apos;s queue</TabsTrigger>
            <TabsTrigger value="prospects">Prospects ({targets.length})</TabsTrigger>
            <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
            <TabsTrigger value="facts">Fact bank ({facts.filter((f) => f.active).length})</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="queue">
            <QueueTab {...shared} queue={queue} used={used} left={left} reasons={eff.reasons} />
          </TabsContent>
          <TabsContent value="prospects">
            <ProspectsTab {...shared} />
          </TabsContent>
          <TabsContent value="outcomes">
            <OutcomesTab {...shared} />
          </TabsContent>
          <TabsContent value="facts">
            <FactsTab facts={facts} refresh={refresh} />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab settings={settings} today={today} refresh={refresh} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

interface Shared {
  targets: TargetRow[];
  signals: SignalRow[];
  drafts: DraftRow[];
  touches: TouchRow[];
  facts: FactRow[];
  settings: SettingsRow;
  fits: Map<string, FitResult>;
  factNumbers: string[];
  today: string;
  refresh: () => void;
  caps: ReturnType<typeof effectiveCaps>['caps'];
}

// ─── Today's queue ──────────────────────────────────────────────────────────

function QueueTab(props: Shared & { queue: { comments: QueueItem[]; dms: QueueItem[] }; used: Record<CapAction, number>; left: Record<CapAction, number>; reasons: string[] }) {
  const { queue, used, caps, reasons, drafts, today, settings, refresh } = props;
  const [bulk, setBulk] = useState(false);
  const sentToday = drafts.filter((d) => d.status === 'sent' && d.sent_at && denverDay(d.sent_at) === today);
  const missing = [...queue.comments, ...queue.dms].filter((i) => !i.draft_id);

  async function draftAll() {
    setBulk(true);
    let ok = 0;
    for (const item of missing) {
      try {
        await invokeDraft({ action: 'generate', prospect_id: item.prospect_id, action_type: item.action, signal_id: item.signal_id });
        ok++;
      } catch (e) {
        toast.error((e as Error).message);
      }
    }
    setBulk(false);
    toast.success(`${ok} draft${ok === 1 ? '' : 's'} ready`);
    refresh();
  }

  const paused = !!(settings.paused_until && settings.paused_until >= today);
  async function setPause(on: boolean) {
    const { error } = await db.from('li_engagement_settings').update({ paused_until: on ? addDays(today, 6) : null, updated_at: new Date().toISOString() }).eq('id', true);
    if (error) toast.error(error.message); else { toast.success(on ? 'Outreach paused for 7 days' : 'Outreach resumed'); refresh(); }
  }

  return (
    <div className="space-y-4 mt-3">
      <Card className="p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span>Comments <b>{used.comment}/{caps.comment}</b></span>
        <span>First DMs <b>{used.dm_first}/{caps.dm_first}</b></span>
        <span>Follow-ups <b>{used.dm_followup}/{caps.dm_followup}</b></span>
        <span>Connects <b>{used.connect}/{caps.connect}</b></span>
        <span className="text-muted-foreground">Ramp week {settings.ramp_week} · Denver day {today}</span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setPause(!paused)}>
            {paused ? <><Play className="w-4 h-4 mr-1" /> Resume outreach</> : <><Pause className="w-4 h-4 mr-1" /> Pause outreach 7 days</>}
          </Button>
          <Button size="sm" disabled={bulk || missing.length === 0} onClick={draftAll}>
            {bulk ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />} Draft all missing ({missing.length})
          </Button>
        </div>
        {reasons.map((r) => (
          <p key={r} className="w-full text-amber-700 dark:text-amber-400 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {r}</p>
        ))}
      </Card>

      <Section title={`Comments (${queue.comments.length})`} empty="No comment cards: add a prospect scoring 50+ and paste a post of theirs from the last 72 hours.">
        {queue.comments.map((i) => <QueueCard key={`c-${i.prospect_id}`} item={i} {...props} />)}
      </Section>
      <Section title={`DMs (${queue.dms.length})`} empty="No DM cards: DMs go to 1st-degree connections scoring 70+ with a reason in the last 30 days.">
        {queue.dms.map((i) => <QueueCard key={`d-${i.prospect_id}-${i.action}`} item={i} {...props} />)}
      </Section>
      {sentToday.length > 0 && (
        <Section title={`Sent today (${sentToday.length})`} empty="">
          {sentToday.map((d) => {
            const t = props.targets.find((x) => x.prospect_id === d.prospect_id);
            return (
              <Card key={d.id} className="p-3 text-sm">
                <b>{t?.commercial_prospects?.contact_name ?? 'Unknown'}</b> · {ACTION_LABEL[d.action_type]} · {d.final_text}
              </Card>
            );
          })}
        </Section>
      )}
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const list = Array.isArray(children) ? children : [children];
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{title}</h2>
      {list.filter(Boolean).length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : <div className="grid gap-3">{children}</div>}
    </section>
  );
}

function LintBadges({ lint }: { lint: LiLintReport }) {
  const items: Array<[keyof LiLintReport['checks'], string]> = [
    ['dash', 'no dash'], ['banned', 'no AI tells'], ['length', `length ${lint.chars}`], ['numbers_sourced', 'numbers sourced'], ['pitch', 'no pitch'],
  ];
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1.5">
        {items.map(([k, label]) => (
          <Badge key={k} variant="outline" className={lint.checks[k] ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-red-600 text-red-700 dark:text-red-400'}>
            {lint.checks[k] ? '✓' : '✗'} {label}
          </Badge>
        ))}
      </div>
      {lint.issues.length > 0 && (
        <ul className="text-xs text-red-700 dark:text-red-400 list-disc pl-5">
          {lint.issues.map((i, n) => <li key={`${i.code}-${n}`}>{i.message}</li>)}
        </ul>
      )}
    </div>
  );
}

function QueueCard(props: Shared & { item: QueueItem }) {
  const { item, targets, signals, drafts, fits, factNumbers, settings, touches, today, caps, refresh } = props;
  const target = targets.find((t) => t.prospect_id === item.prospect_id) as TargetRow;
  const p = target?.commercial_prospects;
  const fit = fits.get(item.prospect_id);
  const draft = drafts.find((d) => d.prospect_id === item.prospect_id && d.action_type === item.action && (d.status === 'draft' || d.status === 'approved'));
  const signal = signals.find((s) => s.id === (draft?.signal_id ?? item.signal_id)) ?? null;
  const [text, setText] = useState(draft?.final_text ?? draft?.draft_text ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState(SKIP_REASONS[0]);
  const [showFit, setShowFit] = useState(false);

  useEffect(() => { setText(draft?.final_text ?? draft?.draft_text ?? ''); }, [draft?.id, draft?.draft_text, draft?.final_text]);

  const lint = useMemo(
    () => lintDraft({ text, action: item.action, sourceText: signal?.excerpt ?? null, factNumbers }),
    [text, item.action, signal?.excerpt, factNumbers],
  );
  const send = checkSend({
    action: item.action as CapAction,
    prospectId: item.prospect_id,
    today,
    now: new Date(),
    settings,
    caps,
    touches,
    connectionDegree: target?.connection_degree ?? null,
    nurtureUntil: target?.nurture_until ?? null,
    doNotContact: (p?.suppression_status ?? 'active') !== 'active',
  });
  const approvedSame = draft?.status === 'approved' && draft.final_text === text.trim();
  if (!target) return null;

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    try { await fn(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }

  const generate = () => run('gen', async () => {
    const r = await invokeDraft({ action: 'generate', prospect_id: item.prospect_id, action_type: item.action, signal_id: signal?.id ?? item.signal_id });
    setText(r.draft.draft_text);
    toast[r.lint.ok ? 'success' : 'warning'](r.lint.ok ? 'Draft ready' : 'Draft needs edits before it can be copied');
    refresh();
  });

  const copyAndOpen = () => run('copy', async () => {
    if (!draft || !lint.ok || !isSafeLinkedInUrl(draft.target_url)) return;
    const finalText = text.trim();
    // Start the clipboard write while this tab still has focus, then open.
    const copied = navigator.clipboard.writeText(finalText).then(() => true, () => false);
    window.open(draft.target_url, '_blank', 'noopener,noreferrer');
    await invokeDraft({ action: 'approve', draft_id: draft.id, text: finalText });
    toast.success((await copied) ? 'Copied. Paste it in LinkedIn, send it yourself, then click Mark sent.' : 'Opened. Copy failed: select the text and copy it by hand.');
    refresh();
  });

  const markSent = () => run('sent', async () => {
    if (!draft) return;
    await rpc('li_mark_draft_sent', { _draft_id: draft.id });
    toast.success('Logged as sent');
    refresh();
  });

  const skip = () => run('skip', async () => {
    if (!draft) return;
    await rpc('li_skip_draft', { _draft_id: draft.id, _reason: skipReason });
    toast.success('Skipped');
    refresh();
  });

  return (
    <Card className="p-4 space-y-3" data-testid="li-queue-card">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{ACTION_LABEL[item.action]}</Badge>
        <b>{p?.contact_name ?? 'Unknown'}</b>
        <span className="text-sm text-muted-foreground">{target.headline ?? p?.contact_role ?? ''}{p?.company_name ? ` · ${p.company_name}` : ''}</span>
        {tierBadge(fit?.score ?? target.fit_score, settings)}
        <button type="button" className="text-xs underline text-muted-foreground" onClick={() => setShowFit((v) => !v)}>
          {showFit ? 'hide score' : 'why this score'}
        </button>
        {fit?.persona && <Badge variant="outline">{fit.persona.replace(/_/g, ' ')}</Badge>}
        <Badge variant="outline">{target.connection_degree ? `${target.connection_degree}°` : 'degree ?'}</Badge>
        <Badge variant="outline">{target.source.replace(/_/g, ' ')}</Badge>
      </div>
      {showFit && fit && <FitBreakdownView fit={fit} />}

      <div className="text-sm space-y-1">
        <p><span className="font-medium">Why now:</span> {draft?.rationale ?? (signal ? `${signal.signal_type.replace(/_/g, ' ')} ${ageLabel(signal.observed_at)}` : 'follow-up due')}</p>
        {signal?.excerpt && (
          <blockquote className="border-l-2 pl-3 text-muted-foreground whitespace-pre-wrap">
            {signal.excerpt.length > 500 ? `${signal.excerpt.slice(0, 500)}…` : signal.excerpt}
            <span className="block text-xs mt-1">their words · {ageLabel(signal.observed_at)}</span>
          </blockquote>
        )}
      </div>

      {!draft ? (
        <Button size="sm" onClick={generate} disabled={!!busy}>
          {busy === 'gen' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />} Draft it
        </Button>
      ) : (
        <div className="space-y-2">
          <Label htmlFor={`draft-${draft.id}`} className="sr-only">Draft text</Label>
          <Textarea id={`draft-${draft.id}`} value={text} onChange={(e) => setText(e.target.value)} rows={5} />
          <LintBadges lint={lint} />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={generate} disabled={!!busy}>
              {busy === 'gen' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />} Regenerate
            </Button>
            <Button size="sm" onClick={copyAndOpen} disabled={!!busy || !lint.ok || !isSafeLinkedInUrl(draft.target_url)}>
              <Copy className="w-4 h-4 mr-1" /> Copy &amp; open LinkedIn
            </Button>
            <Button size="sm" variant="secondary" onClick={markSent} disabled={!!busy || !approvedSame || !send.ok} title={!approvedSame ? 'Use Copy & open first (again if you edited the text)' : send.reason ?? ''}>
              <Check className="w-4 h-4 mr-1" /> Mark sent
            </Button>
            <select aria-label="Skip reason" className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={skipReason} onChange={(e) => setSkipReason(e.target.value)}>
              {SKIP_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
            <Button size="sm" variant="ghost" onClick={skip} disabled={!!busy}>
              <SkipForward className="w-4 h-4 mr-1" /> Skip
            </Button>
          </div>
          {!send.ok && <p className="text-xs text-amber-700 dark:text-amber-400">{send.reason}</p>}
          {draft.status === 'approved' && !approvedSame && <p className="text-xs text-muted-foreground">Edited after Copy &amp; open: copy again before marking sent.</p>}
        </div>
      )}
    </Card>
  );
}

function FitBreakdownView({ fit }: { fit: FitResult }) {
  const dims = Object.entries(fit.breakdown) as Array<[string, FitResult['breakdown']['role']]>;
  return (
    <div className="rounded-md border p-3 text-xs space-y-1">
      {fit.disqualified && <p className="text-red-700 dark:text-red-400 font-medium">Disqualified: {fit.disqualified} (score forced to 0)</p>}
      {dims.map(([k, d]) => (
        <p key={k}><b className="capitalize">{k}</b> {d.points}/{d.max} · {d.evidence} <span className="text-muted-foreground">({d.state})</span></p>
      ))}
      <p className="text-muted-foreground">Rubric {fit.version}</p>
    </div>
  );
}

// ─── Prospects ──────────────────────────────────────────────────────────────

interface TargetForm {
  name: string;
  linkedin_url: string;
  headline: string;
  company: string;
  country: string;
  source: string;
  notes: string;
  business_type: string;
  employees: string;
  connection_degree: string;
  warmth: Warmth;
  posts_weekly: boolean;
  post_url: string;
  post_excerpt: string;
  signal_type: SignalType;
  post_days_ago: string;
}

const EMPTY_FORM: TargetForm = {
  name: '', linkedin_url: '', headline: '', company: '', country: 'US', source: 'manual', notes: '', business_type: '',
  employees: '', connection_degree: '', warmth: 'cold', posts_weekly: false, post_url: '', post_excerpt: '', signal_type: 'their_post', post_days_ago: '0',
};

function formToRow(f: TargetForm): TargetImportRow | string {
  const url = normalizeProfileUrl(f.linkedin_url);
  if (!f.name.trim()) return 'Name is required';
  if (!url) return 'LinkedIn URL must be a profile link like https://www.linkedin.com/in/jane-doe';
  if (!f.company.trim()) return 'Company is required';
  const postUrl = f.post_url.trim() ? normalizePostUrl(f.post_url) : null;
  if (f.post_url.trim() && !postUrl) return 'Post URL must be a linkedin.com post link';
  return {
    name: f.name.trim(), linkedin_url: url, headline: f.headline.trim() || null, company: f.company.trim(), country: f.country || null,
    source: (TARGET_SOURCES as readonly string[]).includes(f.source) ? (f.source as TargetImportRow['source']) : 'manual',
    notes: f.notes.trim() || null, business_type: (BUSINESS_TYPES as string[]).includes(f.business_type) ? (f.business_type as BusinessType) : null,
    employees: f.employees.trim() ? Math.max(0, Math.round(Number(f.employees))) : null,
    connection_degree: f.connection_degree ? Number(f.connection_degree) : null, warmth: f.warmth, post_url: postUrl,
    post_excerpt: f.post_excerpt.trim() ? f.post_excerpt.trim().slice(0, 1200) : null, signal_type: f.post_excerpt.trim() || postUrl ? f.signal_type : null,
    post_days_ago: Math.max(0, Math.round(Number(f.post_days_ago) || 0)), posts_weekly: f.posts_weekly,
  };
}

/**
 * Adds one person: links to an existing commercial_prospects row with the same
 * LinkedIn handle (or the given one), otherwise creates it, then the target
 * row, then the pasted post. Scored before insert so the row is never unscored.
 */
async function addTarget(row: TargetImportRow, opts: { settings: LiSettings; userId: string | null; prospectId?: string; postDaysAgo?: number; postsWeekly?: boolean }) {
  // Case-insensitive: rows imported before 2026-11-03 have lowercased member-id URLs.
  const pattern = row.linkedin_url.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data: existing } = await db.from('li_engagement_targets').select('prospect_id').ilike('linkedin_url', pattern).limit(1);
  if (existing?.length) throw new Error(`${row.name} is already a target`);

  const channel = `linkedin:${row.linkedin_url}`;
  let prospectId = opts.prospectId ?? null;
  let created = false;
  let prospect: ProspectRow | null = null;
  if (!prospectId) {
    const { data: matches } = await db.from('commercial_prospects').select('id, company_name, contact_name, contact_role, contact_channel, stage, suppression_status').eq('contact_channel', channel).limit(1);
    if (matches?.[0]) prospect = matches[0];
  } else {
    const { data } = await db.from('commercial_prospects').select('id, company_name, contact_name, contact_role, contact_channel, stage, suppression_status').eq('id', prospectId).single();
    prospect = data;
  }
  if (!prospect) {
    const { data, error } = await db.from('commercial_prospects').insert({
      company_name: row.company, contact_name: row.name, contact_role: row.headline, contact_channel: channel, segment: 'linkedin', owner_user_id: opts.userId,
    }).select('id, company_name, contact_name, contact_role, contact_channel, stage, suppression_status').single();
    if (error) throw new Error(error.message);
    prospect = data;
    created = true;
  }
  prospectId = (prospect as ProspectRow).id;

  const observed = new Date(Date.now() - Math.max(0, opts.postDaysAgo ?? 0) * 86_400_000).toISOString();
  const pendingSignal = row.signal_type ? { id: 'pending', prospect_id: prospectId, signal_type: row.signal_type, post_url: row.post_url, excerpt: row.post_excerpt, observed_at: observed } : null;
  const draftTarget: TargetRow = {
    prospect_id: prospectId, linkedin_url: row.linkedin_url, headline: row.headline, country: row.country, business_type: row.business_type, employees: row.employees,
    source: row.source, warmth: row.warmth ?? 'cold', connection_degree: row.connection_degree, posts_weekly: !!opts.postsWeekly, has_verified_email: false,
    persona: null, fit_score: null, fit_breakdown: {}, nurture_until: null, notes: row.notes, created_at: '', commercial_prospects: prospect,
  };
  const fit = fitFor(draftTarget, pendingSignal ? [pendingSignal] : [], opts.settings);
  const { error: tErr } = await db.from('li_engagement_targets').insert({
    prospect_id: prospectId, linkedin_url: row.linkedin_url, headline: row.headline, country: row.country, business_type: row.business_type, employees: row.employees,
    source: row.source, warmth: row.warmth ?? 'cold', connection_degree: row.connection_degree, posts_weekly: !!opts.postsWeekly, notes: row.notes, ...fitPatch(fit),
  });
  if (tErr) {
    if (created) await db.from('commercial_prospects').delete().eq('id', prospectId);
    throw new Error(tErr.message);
  }
  if (pendingSignal) {
    const { error: sErr } = await db.from('li_engagement_signals').insert({
      prospect_id: prospectId, signal_type: pendingSignal.signal_type, post_url: pendingSignal.post_url, excerpt: pendingSignal.excerpt, observed_at: observed,
    });
    if (sErr) toast.error(`Added, but the post was not saved: ${sErr.message}`);
  }
  return fit;
}

function TargetFields({ f, set, idPrefix }: { f: TargetForm; set: (patch: Partial<TargetForm>) => void; idPrefix: string }) {
  const field = (key: keyof TargetForm, label: string, placeholder = '') => (
    <div>
      <Label htmlFor={`${idPrefix}-${key}`}>{label}</Label>
      <Input id={`${idPrefix}-${key}`} value={String(f[key])} placeholder={placeholder} onChange={(e) => set({ [key]: e.target.value } as Partial<TargetForm>)} className="mt-1" />
    </div>
  );
  const select = (key: keyof TargetForm, label: string, options: Array<[string, string]>) => (
    <div>
      <Label htmlFor={`${idPrefix}-${key}`}>{label}</Label>
      <select id={`${idPrefix}-${key}`} className={SELECT_CLS} value={String(f[key])} onChange={(e) => set({ [key]: e.target.value } as Partial<TargetForm>)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {field('name', 'Name *')}
      {field('linkedin_url', 'LinkedIn profile URL *', 'https://www.linkedin.com/in/…')}
      {field('headline', 'Title / headline')}
      {field('company', 'Company *')}
      {select('country', 'Country', [['US', 'United States'], ['CA', 'Canada'], ['Other', 'Other (not a fit)'], ['', 'Unknown']])}
      {select('source', 'Source', TARGET_SOURCES.map((s) => [s, s.replace(/_/g, ' ')]))}
      {select('business_type', 'Business type', [['', 'Unknown'], ...BUSINESS_TYPES.map((b): [string, string] => [b, b.replace(/_/g, ' ')])])}
      {field('employees', 'Employees')}
      {select('connection_degree', 'Connection degree', [['', 'Unknown'], ['1', '1st'], ['2', '2nd'], ['3', '3rd']])}
      {select('warmth', 'Warmth', (Object.keys(WARMTH_POINTS) as Warmth[]).map((w) => [w, `${w.replace(/_/g, ' ')} (${WARMTH_POINTS[w]})`]))}
      <div className="flex items-end gap-2 pb-1">
        <Switch id={`${idPrefix}-weekly`} checked={f.posts_weekly} onCheckedChange={(v) => set({ posts_weekly: v })} />
        <Label htmlFor={`${idPrefix}-weekly`}>Posts or comments weekly</Label>
      </div>
      {field('notes', 'Notes')}
    </div>
  );
}

function PostFields({ f, set, idPrefix }: { f: TargetForm; set: (patch: Partial<TargetForm>) => void; idPrefix: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr,180px,120px]">
      <div>
        <Label htmlFor={`${idPrefix}-post-url`}>Their post URL (optional)</Label>
        <Input id={`${idPrefix}-post-url`} value={f.post_url} onChange={(e) => set({ post_url: e.target.value })} className="mt-1" placeholder="https://www.linkedin.com/posts/…" />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-sig`}>Signal type</Label>
        <select id={`${idPrefix}-sig`} className={SELECT_CLS} value={f.signal_type} onChange={(e) => set({ signal_type: e.target.value as SignalType })}>
          {SIGNAL_TYPES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-age`}>Posted days ago</Label>
        <Input id={`${idPrefix}-age`} type="number" min={0} value={f.post_days_ago} onChange={(e) => set({ post_days_ago: e.target.value })} className="mt-1" />
      </div>
      <div className="sm:col-span-3">
        <Label htmlFor={`${idPrefix}-excerpt`}>Paste their post or comment text (you copy it; nothing is fetched)</Label>
        <Textarea id={`${idPrefix}-excerpt`} value={f.post_excerpt} maxLength={1200} rows={3} onChange={(e) => set({ post_excerpt: e.target.value })} className="mt-1" />
      </div>
    </div>
  );
}

function ProspectsTab({ targets, signals, settings, fits, touches, refresh }: Shared) {
  const { user } = useAuth();
  const [form, setForm] = useState<TargetForm>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [csv, setCsv] = useState('');
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('all');
  const [source, setSource] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [linkId, setLinkId] = useState('');
  const set = (patch: Partial<TargetForm>) => setForm((f) => ({ ...f, ...patch }));

  const crmQ = useQuery({
    queryKey: ['li', 'crm-prospects'],
    queryFn: () => rows<ProspectRow>(db.from('commercial_prospects').select('id, company_name, contact_name, contact_role, contact_channel, stage, suppression_status').order('created_at', { ascending: false }).limit(500)),
  });
  const targetIds = new Set(targets.map((t) => t.prospect_id));
  const linkable = (crmQ.data ?? []).filter((p) => !targetIds.has(p.id));

  async function submit() {
    const row = formToRow(form);
    if (typeof row === 'string') { toast.error(row); return; }
    setBusy(true);
    try {
      const fit = await addTarget(row, { settings, userId: user?.id ?? null, prospectId: linkId || undefined, postDaysAgo: Number(form.post_days_ago) || 0, postsWeekly: form.posts_weekly });
      toast.success(`Added. Fit ${fit.score}${fit.disqualified ? ` (${fit.disqualified})` : ''}`);
      setForm(EMPTY_FORM);
      setLinkId('');
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function pickCrm(id: string) {
    setLinkId(id);
    const p = linkable.find((x) => x.id === id);
    if (p) set({ name: p.contact_name ?? '', company: p.company_name, headline: p.contact_role ?? '', source: 'crm', linkedin_url: p.contact_channel?.startsWith('linkedin:') ? p.contact_channel.slice(9) : form.linkedin_url });
  }

  const [csvCountry, setCsvCountry] = useState('US');
  const parsed = useMemo(() => (csv.trim() ? parseTargetCsv(csv, { defaultCountry: csvCountry }) : null), [csv, csvCountry]);
  async function importCsv() {
    if (!parsed) return;
    setBusy(true);
    let ok = 0;
    const errs: string[] = [...parsed.errors];
    for (const r of parsed.rows) {
      try { await addTarget(r, { settings, userId: user?.id ?? null, postDaysAgo: r.post_days_ago, postsWeekly: r.posts_weekly }); ok++; } catch (e) { errs.push(`${r.name}: ${(e as Error).message}`); }
    }
    setBusy(false);
    toast.success(`Imported ${ok} of ${parsed.rows.length}`);
    if (errs.length) toast.error(errs.slice(0, 5).join('\n'));
    setCsv('');
    refresh();
  }

  const lastTouch = (pid: string) => touches.find((t) => t.prospect_id === pid);
  const shown = targets.filter((t) => {
    const fit = fits.get(t.prospect_id);
    const score = fit?.score ?? t.fit_score ?? 0;
    const hay = `${t.commercial_prospects?.contact_name} ${t.commercial_prospects?.company_name} ${t.headline}`.toLowerCase();
    if (search && !hay.includes(search.toLowerCase())) return false;
    if (source !== 'all' && t.source !== source) return false;
    if (tier === 'dm' && score < settings.fit_threshold_dm) return false;
    if (tier === 'comment' && (score < settings.fit_threshold_comment || score >= settings.fit_threshold_dm)) return false;
    if (tier === 'none' && score >= settings.fit_threshold_comment) return false;
    return true;
  });
  const open = targets.find((t) => t.prospect_id === openId) ?? null;

  return (
    <div className="space-y-4 mt-3">
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Quick add</h2>
        <p className="text-xs text-muted-foreground">Someone you saw in LinkedIn yourself: paste their profile URL and, if you have it, the post or comment that made you notice them.</p>
        <div className="max-w-md">
          <Label htmlFor="li-link-crm">Or start from an existing CRM prospect</Label>
          <select id="li-link-crm" className={SELECT_CLS} value={linkId} onChange={(e) => pickCrm(e.target.value)}>
            <option value="">New person</option>
            {linkable.map((p) => <option key={p.id} value={p.id}>{p.contact_name ?? '(no name)'} · {p.company_name}</option>)}
          </select>
        </div>
        <TargetFields f={form} set={set} idPrefix="qa" />
        <PostFields f={form} set={set} idPrefix="qa" />
        <Button onClick={submit} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Add and score</Button>
      </Card>

      <Card className="p-4 space-y-2">
        <h2 className="font-semibold flex items-center gap-2"><Upload className="w-4 h-4" /> CSV import</h2>
        <p className="text-xs text-muted-foreground">Header row with: name, linkedin_url, company (required); title, country, source, notes, business_type, employees, degree, warmth, posts_weekly, post_url, post_excerpt, post_days_ago, signal_type (optional).</p>
        <div className="max-w-xs">
          <Label htmlFor="li-csv-country">Country for rows without one</Label>
          <select id="li-csv-country" className={SELECT_CLS} value={csvCountry} onChange={(e) => setCsvCountry(e.target.value)}>
            <option value="US">United States</option><option value="CA">Canada</option><option value="">Leave unknown (scores 0)</option>
          </select>
        </div>
        <Label htmlFor="li-csv" className="sr-only">CSV</Label>
        <Textarea id="li-csv" rows={4} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="name,linkedin_url,title,company,country" />
        <Input type="file" accept=".csv,.tsv,text/csv" aria-label="CSV file" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setCsv(await file.text()); }} />
        {parsed && <p className="text-xs">{parsed.rows.length} valid rows{parsed.errors.length ? `, ${parsed.errors.length} skipped: ${parsed.errors.slice(0, 3).join('; ')}` : ''}</p>}
        <Button size="sm" onClick={importCsv} disabled={busy || !parsed?.rows.length}>Import {parsed?.rows.length ?? 0}</Button>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div><Label htmlFor="li-search">Search</Label><Input id="li-search" value={search} onChange={(e) => setSearch(e.target.value)} className="mt-1 w-56" /></div>
          <div><Label htmlFor="li-tier">Fit</Label>
            <select id="li-tier" className={SELECT_CLS} value={tier} onChange={(e) => setTier(e.target.value)}>
              <option value="all">All</option><option value="dm">{settings.fit_threshold_dm}+ (DM)</option>
              <option value="comment">{settings.fit_threshold_comment} to {settings.fit_threshold_dm - 1} (comment)</option><option value="none">Below {settings.fit_threshold_comment}</option>
            </select>
          </div>
          <div><Label htmlFor="li-source">Source</Label>
            <select id="li-source" className={SELECT_CLS} value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="all">All</option>{TARGET_SOURCES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <span className="text-sm text-muted-foreground ml-auto">{shown.length} shown</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Person</TableHead><TableHead>Fit</TableHead><TableHead>Persona</TableHead><TableHead>Degree</TableHead><TableHead>Stage</TableHead><TableHead>Last touch</TableHead><TableHead /></TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((t) => {
              const fit = fits.get(t.prospect_id);
              const lt = lastTouch(t.prospect_id);
              const dnc = (t.commercial_prospects?.suppression_status ?? 'active') !== 'active';
              return (
                <TableRow key={t.prospect_id}>
                  <TableCell>
                    <b>{t.commercial_prospects?.contact_name ?? '(no name)'}</b>
                    <div className="text-xs text-muted-foreground">{t.headline ?? ''} · {t.commercial_prospects?.company_name}</div>
                  </TableCell>
                  <TableCell>{tierBadge(fit?.score ?? t.fit_score, settings)}{fit?.disqualified && <div className="text-xs text-red-700 dark:text-red-400">{fit.disqualified}</div>}</TableCell>
                  <TableCell className="text-xs">{fit?.persona?.replace(/_/g, ' ')}</TableCell>
                  <TableCell>{t.connection_degree ?? '?'}</TableCell>
                  <TableCell className="text-xs">{dnc ? <Badge variant="destructive">DNC</Badge> : t.commercial_prospects?.stage}</TableCell>
                  <TableCell className="text-xs">{lt ? `${lt.touch_type.replace(/_/g, ' ')} ${ageLabel(lt.occurred_at)}` : '-'}</TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => setOpenId(t.prospect_id)}>Details</Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {open && <TargetDetail key={open.prospect_id} target={open} signals={signals.filter((s) => s.prospect_id === open.prospect_id)} settings={settings} fit={fits.get(open.prospect_id)} refresh={refresh} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TargetDetail({ target, signals, settings, fit, refresh }: { target: TargetRow; signals: SignalRow[]; settings: LiSettings; fit?: FitResult; refresh: () => void }) {
  const p = target.commercial_prospects;
  const [f, setF] = useState<TargetForm>({
    ...EMPTY_FORM, name: p?.contact_name ?? '', linkedin_url: target.linkedin_url, headline: target.headline ?? '', company: p?.company_name ?? '',
    country: target.country ?? '', source: target.source, notes: target.notes ?? '', business_type: target.business_type ?? '',
    employees: target.employees?.toString() ?? '', connection_degree: target.connection_degree?.toString() ?? '', warmth: target.warmth, posts_weekly: target.posts_weekly,
  });
  const set = (patch: Partial<TargetForm>) => setF((x) => ({ ...x, ...patch }));
  const [busy, setBusy] = useState(false);

  async function save() {
    const row = formToRow({ ...f, post_url: '', post_excerpt: '' });
    if (typeof row === 'string') { toast.error(row); return; }
    setBusy(true);
    try {
      const next: TargetRow = { ...target, headline: row.headline, country: row.country, business_type: row.business_type, employees: row.employees, source: row.source,
        warmth: row.warmth ?? 'cold', connection_degree: row.connection_degree, posts_weekly: f.posts_weekly, notes: row.notes, linkedin_url: row.linkedin_url,
        commercial_prospects: p ? { ...p, contact_name: row.name, company_name: row.company } : p };
      const nextFit = fitFor(next, signals, settings);
      const { error } = await db.from('li_engagement_targets').update({
        linkedin_url: row.linkedin_url, headline: row.headline, country: row.country, business_type: row.business_type, employees: row.employees, source: row.source,
        warmth: row.warmth ?? 'cold', connection_degree: row.connection_degree, posts_weekly: f.posts_weekly, notes: row.notes, ...fitPatch(nextFit),
      }).eq('prospect_id', target.prospect_id);
      if (error) throw new Error(error.message);
      if (p) await db.from('commercial_prospects').update({ contact_name: row.name, company_name: row.company, contact_role: row.headline, updated_at: new Date().toISOString() }).eq('id', p.id);
      toast.success(`Saved. Fit ${nextFit.score}`);
      refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  async function addSignal() {
    const postUrl = f.post_url.trim() ? normalizePostUrl(f.post_url) : null;
    if (f.post_url.trim() && !postUrl) { toast.error('Post URL must be a linkedin.com post link'); return; }
    if (!f.post_excerpt.trim() && !postUrl) { toast.error('Paste the post text or URL'); return; }
    const observed = new Date(Date.now() - Math.max(0, Number(f.post_days_ago) || 0) * 86_400_000).toISOString();
    const { error } = await db.from('li_engagement_signals').insert({ prospect_id: target.prospect_id, signal_type: f.signal_type, post_url: postUrl, excerpt: f.post_excerpt.trim().slice(0, 1200) || null, observed_at: observed });
    if (error) { toast.error(error.message); return; }
    const nextFit = fitFor(target, [...signals, { id: 'new', prospect_id: target.prospect_id, signal_type: f.signal_type, post_url: postUrl, excerpt: f.post_excerpt, observed_at: observed }], settings);
    await db.from('li_engagement_targets').update(fitPatch(nextFit)).eq('prospect_id', target.prospect_id);
    set({ post_url: '', post_excerpt: '', post_days_ago: '0' });
    toast.success(`Signal added. Fit ${nextFit.score}`);
    refresh();
  }

  async function setDnc() {
    if (!p) return;
    const { error } = await db.from('commercial_prospects').update({ suppression_status: 'do_not_contact', updated_at: new Date().toISOString() }).eq('id', p.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Marked do-not-contact (LinkedIn and email)');
    refresh();
  }

  return (
    <div className="space-y-4">
      <DialogHeader><DialogTitle>{p?.contact_name ?? 'Prospect'} · {p?.company_name}</DialogTitle></DialogHeader>
      {fit && <FitBreakdownView fit={fit} />}
      <TargetFields f={f} set={set} idPrefix="ed" />
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={busy}>Save and re-score</Button>
        <Button size="sm" variant="destructive" onClick={setDnc} disabled={!p || p.suppression_status !== 'active'}>Do not contact</Button>
      </div>
      <PublishedEmail target={target} signals={signals} settings={settings} refresh={refresh} />
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Signals (their posts, comments, events)</h3>
        {signals.length === 0 && <p className="text-xs text-muted-foreground">None yet.</p>}
        {signals.map((s) => (
          <div key={s.id} className="text-xs border rounded p-2">
            <b>{s.signal_type.replace(/_/g, ' ')}</b> · {ageLabel(s.observed_at)}{s.post_url ? ` · ${s.post_url}` : ''}
            {s.excerpt && <p className="whitespace-pre-wrap mt-1 text-muted-foreground">{s.excerpt}</p>}
          </div>
        ))}
        <PostFields f={f} set={set} idPrefix="ed" />
        <Button size="sm" variant="outline" onClick={addSignal}>Add signal</Button>
      </div>
    </div>
  );
}

interface EmailCandidate { email: string; kind: EmailKind; source_url: string }
interface ScanResult { website: string; candidates: EmailCandidate[]; pages: Array<{ path: string; result: string }>; protected_hidden: boolean }

const httpLink = (url: string | null | undefined) => (url && /^https?:\/\//i.test(url) ? url : null);

/**
 * Published email (li-enrich): scans the firm's own website for the addresses
 * it prints, the founder picks one, the server re-checks and stores it on the
 * prospect, then the page re-scores fit so the reachability points update.
 */
function PublishedEmail({ target, signals, settings, refresh }: { target: TargetRow; signals: SignalRow[]; settings: LiSettings; refresh: () => void }) {
  const p = target.commercial_prospects;
  const savedQ = useQuery({
    queryKey: ['li', 'published-email', target.prospect_id],
    queryFn: async () => {
      const { data, error } = await db.from('commercial_prospects').select('website, supporting_evidence').eq('id', target.prospect_id).maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as { website: string | null; supporting_evidence: unknown } | null;
    },
  });
  const [website, setWebsite] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const siteValue = website ?? savedQ.data?.website ?? '';
  const attached = channelEmail(p?.contact_channel);
  const evidence = latestEmailEvidence(savedQ.data?.supporting_evidence, attached);
  const evidenceUrl = httpLink(evidence?.email_source_url);
  const dnc = (p?.suppression_status ?? 'active') !== 'active';

  async function runScan() {
    setBusy('scan');
    try {
      setScan(await invokeEnrich<ScanResult>({ action: 'scan', prospect_id: target.prospect_id, website: siteValue.trim() }));
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }

  async function use(c: EmailCandidate) {
    if (!scan) return;
    setBusy(c.email);
    try {
      const res = await invokeEnrich<{ email: string; contact_channel: string }>({ action: 'attach', prospect_id: target.prospect_id, email: c.email, source_url: c.source_url, website: scan.website });
      const next: TargetRow = { ...target, has_verified_email: true, commercial_prospects: p ? { ...p, contact_channel: res.contact_channel } : p };
      const nextFit = fitFor(next, signals, settings);
      await db.from('li_engagement_targets').update(fitPatch(nextFit)).eq('prospect_id', target.prospect_id);
      toast.success(`Email attached: ${res.email}. Fit ${nextFit.score}`);
      setScan(null);
      refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }

  return (
    <div className="space-y-2" data-testid="li-published-email">
      <h3 className="font-semibold text-sm">Published email</h3>
      <p className="text-xs text-muted-foreground">{PUBLISHED_EMAIL_LINE}</p>
      {attached ? (
        <p className="text-sm">
          Email: <b>{attached}</b>
          {evidence && evidenceUrl && (
            <> · <a href={evidenceUrl} target="_blank" rel="noopener noreferrer" className="underline">source page</a> ({evidence.email_kind})</>
          )}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">No email yet.</p>
      )}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label htmlFor="ed-website">Firm website</Label>
          <Input id="ed-website" value={siteValue} placeholder="https://firm.com" onChange={(e) => setWebsite(e.target.value)} className="mt-1" />
        </div>
        <Button size="sm" variant="outline" onClick={runScan} disabled={!!busy || dnc || !siteValue.trim()}>
          {busy === 'scan' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Scan
        </Button>
      </div>
      {scan && (
        <div className="space-y-1">
          {scan.candidates.length === 0 && <p className="text-xs">No address on the firm&apos;s own domain in the pages Quantis may read.</p>}
          {scan.candidates.map((c) => {
            const href = httpLink(c.source_url);
            return (
              <div key={c.email} className="flex flex-wrap items-center gap-2 text-xs border rounded p-2">
                <b>{c.email}</b>
                <Badge variant="outline">{c.kind}</Badge>
                {href && <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-muted-foreground">{new URL(href).pathname}</a>}
                <Button size="sm" className="ml-auto" onClick={() => use(c)} disabled={!!busy || dnc || (!!attached && attached !== c.email)}>
                  {busy === c.email ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Use this address
                </Button>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">{scan.pages.map((x) => `${x.path} ${x.result}`).join(' · ')}</p>
          {scan.protected_hidden && <p className="text-xs text-muted-foreground">Some addresses on this site are hidden by Cloudflare email protection. Quantis does not decode them.</p>}
        </div>
      )}
    </div>
  );
}

// ─── Outcomes ───────────────────────────────────────────────────────────────

function OutcomesTab({ targets, touches, today, refresh }: Shared) {
  const [prospectId, setProspectId] = useState('');
  const [kind, setKind] = useState<string>('reply_received');
  const [replyClass, setReplyClass] = useState<string>('positive');
  const [revenue, setRevenue] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const monday = weekStart(today);
  const week = touches.filter((t) => denverDay(t.occurred_at) >= monday);
  const count = (...types: string[]) => week.filter((t) => types.includes(t.touch_type)).length;
  const stop = evaluateStopRules(touches);
  const revenueCents = week.filter((t) => t.touch_type === 'paid').reduce((s, t) => s + (t.revenue_cents ?? 0), 0);
  const nameOf = (pid: string) => targets.find((t) => t.prospect_id === pid)?.commercial_prospects?.contact_name ?? pid.slice(0, 8);

  async function log() {
    if (!prospectId) { toast.error('Pick a person'); return; }
    setBusy(true);
    try {
      const cents = kind === 'paid' && revenue.trim() ? Math.round(Number(revenue) * 100) : null;
      await rpc('li_record_outcome', { _prospect_id: prospectId, _kind: kind, _reply_class: kind === 'reply_received' ? replyClass : null, _note: note || null, _revenue_cents: cents });
      toast.success('Logged');
      setNote('');
      setRevenue('');
      refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  const stats: Array<[string, number | string]> = [
    ['Touches sent', count('comment', 'dm_first', 'dm_followup', 'connect_no_note')],
    ['Comments', count('comment')],
    ['DMs', count('dm_first', 'dm_followup')],
    ['Connects', count('connect_no_note')],
    ['Replies', count('reply_received')],
    ['Calls booked', count('call_booked')],
    ['Paid', count('paid')],
    ['Revenue', `$${(revenueCents / 100).toFixed(0)}`],
  ];

  return (
    <div className="space-y-4 mt-3">
      <Card className="p-4 space-y-2">
        <h2 className="font-semibold">This week (Denver, from Monday {monday}; today is partial)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {stats.map(([label, v]) => (
            <div key={label} className="rounded-md border p-2"><div className="text-xs text-muted-foreground">{label}</div><div className="text-xl font-semibold">{v}</div></div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Accept rate (last 40 requests): {stop.acceptRate === null ? 'not enough data' : `${Math.round(stop.acceptRate * 100)}%`} ·
          Positive or neutral reply rate (last 50 first DMs): {stop.replyRate === null ? 'not enough data' : `${Math.round(stop.replyRate * 100)}%`}
        </p>
        {stop.reasons.map((r) => <p key={r} className="text-xs text-amber-700 dark:text-amber-400">{r}</p>)}
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Log what happened in LinkedIn</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><Label htmlFor="oc-person">Person</Label>
            <select id="oc-person" className={SELECT_CLS} value={prospectId} onChange={(e) => setProspectId(e.target.value)}>
              <option value="">Choose…</option>
              {targets.map((t) => <option key={t.prospect_id} value={t.prospect_id}>{t.commercial_prospects?.contact_name ?? '(no name)'} · {t.commercial_prospects?.company_name}</option>)}
            </select>
          </div>
          <div><Label htmlFor="oc-kind">What</Label>
            <select id="oc-kind" className={SELECT_CLS} value={kind} onChange={(e) => setKind(e.target.value)}>
              {OUTCOME_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </div>
          {kind === 'reply_received' && (
            <div><Label htmlFor="oc-class">Reply</Label>
              <select id="oc-class" className={SELECT_CLS} value={replyClass} onChange={(e) => setReplyClass(e.target.value)}>
                {REPLY_CLASSES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}{c === 'negative' ? ' (sets do-not-contact)' : c === 'not_now' ? ' (no DMs for 90 days)' : ''}</option>)}
              </select>
            </div>
          )}
          {kind === 'paid' && (
            <div><Label htmlFor="oc-rev">Amount paid (USD)</Label><Input id="oc-rev" type="number" min={0} value={revenue} onChange={(e) => setRevenue(e.target.value)} className="mt-1" /></div>
          )}
          <div className="sm:col-span-2"><Label htmlFor="oc-note">Note (optional)</Label><Input id="oc-note" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" /></div>
        </div>
        <Button size="sm" onClick={log} disabled={busy}>Log it</Button>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-2">Recent activity</h2>
        <Table>
          <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Person</TableHead><TableHead>What</TableHead><TableHead>Note</TableHead></TableRow></TableHeader>
          <TableBody>
            {touches.slice(0, 50).map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-xs">{ageLabel(t.occurred_at)}</TableCell>
                <TableCell>{nameOf(t.prospect_id)}</TableCell>
                <TableCell className="text-xs">{t.touch_type.replace(/_/g, ' ')}{t.reply_class ? ` (${t.reply_class.replace('_', ' ')})` : ''}{t.revenue_cents ? ` $${(t.revenue_cents / 100).toFixed(0)}` : ''}</TableCell>
                <TableCell className="text-xs">{t.note ?? ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ─── Fact bank ──────────────────────────────────────────────────────────────

function FactsTab({ facts, refresh }: { facts: FactRow[]; refresh: () => void }) {
  const [fact, setFact] = useState('');
  const [numbers, setNumbers] = useState('');
  const [url, setUrl] = useState('');
  const [verified, setVerified] = useState(denverDay(new Date()));
  const [topic, setTopic] = useState('');

  async function add() {
    const nums = numbers.split(',').map((n) => n.trim()).filter(Boolean);
    if (fact.trim().length < 5) { toast.error('Write the fact'); return; }
    if (!/^https?:\/\//.test(url.trim())) { toast.error('A source URL is required'); return; }
    const { error } = await db.from('li_fact_bank').insert({ fact: fact.trim(), numbers: nums, source_url: url.trim(), verified_at: verified, topic: topic.trim() || null });
    if (error) { toast.error(error.message); return; }
    setFact(''); setNumbers(''); setUrl(''); setTopic('');
    toast.success('Fact added');
    refresh();
  }

  async function toggle(f: FactRow) {
    const { error } = await db.from('li_fact_bank').update({ active: !f.active }).eq('id', f.id);
    if (error) toast.error(error.message); else refresh();
  }

  return (
    <div className="space-y-4 mt-3">
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Add a verified fact</h2>
        <p className="text-xs text-muted-foreground">Drafts may only use numbers from the prospect&apos;s own post or from an active fact here. Add a fact only after you checked its source.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label htmlFor="fb-fact">Fact</Label><Input id="fb-fact" value={fact} onChange={(e) => setFact(e.target.value)} className="mt-1" placeholder="Biweekly payroll means 26 runs a year, so 2 months have 3 runs" /></div>
          <div><Label htmlFor="fb-nums">Numbers drafts may use (comma-separated)</Label><Input id="fb-nums" value={numbers} onChange={(e) => setNumbers(e.target.value)} className="mt-1" placeholder="26, 2, 3" /></div>
          <div><Label htmlFor="fb-url">Source URL</Label><Input id="fb-url" value={url} onChange={(e) => setUrl(e.target.value)} className="mt-1" /></div>
          <div><Label htmlFor="fb-date">Verified on</Label><Input id="fb-date" type="date" value={verified} onChange={(e) => setVerified(e.target.value)} className="mt-1" /></div>
          <div><Label htmlFor="fb-topic">Topic</Label><Input id="fb-topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1" placeholder="hiring, pricing, cash, payroll" /></div>
        </div>
        <Button size="sm" onClick={add}>Add fact</Button>
      </Card>
      <Card className="p-4">
        <Table>
          <TableHeader><TableRow><TableHead>Fact</TableHead><TableHead>Numbers</TableHead><TableHead>Source</TableHead><TableHead>Verified</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
          <TableBody>
            {facts.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="text-sm">{f.fact}</TableCell>
                <TableCell className="text-xs">{f.numbers.join(', ')}</TableCell>
                <TableCell className="text-xs break-all"><a href={f.source_url} target="_blank" rel="noopener noreferrer" className="underline">{f.source_url}</a></TableCell>
                <TableCell className="text-xs">{f.verified_at}</TableCell>
                <TableCell><Switch checked={f.active} onCheckedChange={() => toggle(f)} aria-label="Active" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ─── Settings ───────────────────────────────────────────────────────────────

const CAP_FIELDS: Array<[keyof LiSettings, string, number]> = [
  ['max_comments_day', 'Comments per day', CEILING.comment],
  ['max_dm_first_day', 'First DMs per day', CEILING.dm_first],
  ['max_dm_followup_day', 'Follow-ups per day', CEILING.dm_followup],
  ['max_connects_day', 'Connection requests per day', CEILING.connect],
  ['max_connects_week', 'Connection requests per week', CEILING.connect_week],
  ['fit_threshold_dm', 'Fit needed for a DM', 100],
  ['fit_threshold_comment', 'Fit needed for a comment', 100],
];

function SettingsTab({ settings, today, refresh }: { settings: SettingsRow; today: string; refresh: () => void }) {
  const [draft, setDraft] = useState<LiSettings>(settings);
  useEffect(() => { setDraft(settings); }, [settings]);

  async function save(patch: Partial<LiSettings>) {
    const { error } = await db.from('li_engagement_settings').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', true);
    if (error) { toast.error(error.message); return; }
    toast.success('Saved');
    refresh();
  }

  const warning = !!(settings.warning_paused_until && settings.warning_paused_until >= today);
  return (
    <div className="space-y-4 mt-3">
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Ramp</h2>
        <p className="text-xs text-muted-foreground">Week 1: 5 comments, 3 first DMs, 5 connects a day. Week 2: 8, 6, 8. Week 3 and later, only with no LinkedIn warnings: 10, 10, 10. Follow-ups 5 a day, connects 50 a week.</p>
        <div className="flex gap-2">
          {[1, 2, 3].map((w) => (
            <Button key={w} size="sm" variant={settings.ramp_week === w ? 'default' : 'outline'} onClick={() => save(settingsForRampWeek(w))}>Week {w}{w === 3 ? '+' : ''}</Button>
          ))}
        </div>
      </Card>
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Caps and thresholds</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CAP_FIELDS.map(([key, label, max]) => (
            <div key={key}>
              <Label htmlFor={`st-${key}`}>{label} (max {max})</Label>
              <Input id={`st-${key}`} type="number" min={0} max={max} value={Number(draft[key])} onChange={(e) => setDraft((d) => ({ ...d, [key]: Math.min(max, Math.max(0, Number(e.target.value))) }))} className="mt-1" />
            </div>
          ))}
        </div>
        <Button size="sm" onClick={() => save(Object.fromEntries(CAP_FIELDS.map(([k]) => [k, draft[k]])) as Partial<LiSettings>)}>Save caps</Button>
      </Card>
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Stop switches</h2>
        <p className="text-xs text-muted-foreground">Any LinkedIn warning (invitation limit, unusual activity, identity check, CAPTCHA): DMs and connection requests stop for 7 days and comments drop to half.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={warning ? 'outline' : 'destructive'} onClick={() => save({ warning_paused_until: warning ? null : addDays(today, 6) })}>
            {warning ? `Clear warning pause (through ${settings.warning_paused_until})` : 'I got a LinkedIn warning'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => save({ paused_until: settings.paused_until && settings.paused_until >= today ? null : addDays(today, 6) })}>
            {settings.paused_until && settings.paused_until >= today ? `Resume (paused through ${settings.paused_until})` : 'Pause all outreach 7 days'}
          </Button>
        </div>
      </Card>
      <Card className="p-4 text-sm space-y-1">
        <h2 className="font-semibold">Rules this tool follows</h2>
        <p>{COMPLIANCE_LINE}</p>
        <p className="text-muted-foreground">No scraping, no browser extension, no LinkedIn API member data for prospecting. People enter only by your quick add, CSV or an existing CRM row; post text only by your paste, and it is cleared after 30 days.</p>
      </Card>
    </div>
  );
}
