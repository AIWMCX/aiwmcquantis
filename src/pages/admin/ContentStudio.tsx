import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Copy, Loader2, Sparkles, Trash2, RefreshCw } from 'lucide-react';

type Platform = 'linkedin' | 'twitter' | 'facebook' | 'instagram' | 'threads' | 'reddit';
const PLATFORMS: { id: Platform; label: string; color: string }[] = [
  { id: 'linkedin',  label: 'LinkedIn',  color: '#0A66C2' },
  { id: 'twitter',   label: 'X / Twitter', color: '#E7E9EA' },
  { id: 'facebook',  label: 'Facebook',  color: '#1877F2' },
  { id: 'instagram', label: 'Instagram', color: '#E1306C' },
  { id: 'threads',   label: 'Threads',   color: '#9CA3AF' },
  { id: 'reddit',    label: 'Reddit',    color: '#FF4500' },
];

interface Variant {
  hook: string;
  body: string;
  hashtags?: string[];
  image_prompt?: string;
  char_count?: number;
  notes?: string;
}

interface HistoryRow {
  id: string;
  topic: string;
  platforms: string[];
  variants: Record<string, Variant>;
  created_at: string;
  model: string | null;
}

const TONE_PRESETS = [
  'confident, candid, useful',
  'contrarian, sharp, evidence-first',
  'storytelling, warm, founder-to-founder',
  'witty, punchy, slightly irreverent',
  'analytical, calm, data-led',
];

const ANGLE_PRESETS = [
  'A lesson learned the hard way',
  'A contrarian take on common advice',
  'A behind-the-scenes look at how we built it',
  'A before/after with concrete numbers',
  'A myth-bust with proof',
  'A short story → punchline → CTA',
];

export default function ContentStudio() {
  const { isAdmin, isLoading } = useAdmin();
  const navigate = useNavigate();

  const [topic, setTopic] = useState('');
  const [angle, setAngle] = useState('');
  const [tone, setTone] = useState(TONE_PRESETS[0]);
  const [audience, setAudience] = useState('technical founders and early-stage operators');
  const [cta, setCta] = useState('Try Quantis free — aiwmcquantis.com');
  const [length, setLength] = useState('platform-native');
  const [platforms, setPlatforms] = useState<Platform[]>([
    'linkedin', 'twitter', 'facebook', 'instagram', 'threads', 'reddit',
  ]);
  const [hashtagsEnabled, setHashtagsEnabled] = useState(true);
  const [emojiEnabled, setEmojiEnabled] = useState(true);
  const [model, setModel] = useState('google/gemini-3-flash-preview');

  const [generating, setGenerating] = useState(false);
  const [variants, setVariants] = useState<Record<string, Variant> | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  useEffect(() => {
    if (!isLoading && !isAdmin) navigate('/app', { replace: true });
  }, [isAdmin, isLoading, navigate]);

  useEffect(() => { if (isAdmin) loadHistory(); }, [isAdmin]);

  async function loadHistory() {
    const { data, error } = await supabase
      .from('content_studio_generations')
      .select('id, topic, platforms, variants, created_at, model')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) return;
    setHistory((data ?? []) as unknown as HistoryRow[]);
  }

  const togglePlatform = (p: Platform) =>
    setPlatforms((cur) => cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]);

  async function generate() {
    if (!topic.trim()) { toast.error('Topic is required'); return; }
    if (!platforms.length) { toast.error('Pick at least one platform'); return; }
    setGenerating(true);
    setVariants(null);
    try {
      const { data, error } = await supabase.functions.invoke('content-studio-generate', {
        body: {
          topic, angle, tone, audience, cta, length, platforms, model,
          hashtags_enabled: hashtagsEnabled, emoji_enabled: emojiEnabled,
          save: true,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setVariants((data as any).variants ?? {});
      toast.success(`Generated ${Object.keys((data as any).variants ?? {}).length} variant(s)`);
      loadHistory();
    } catch (e) {
      toast.error('Generation failed', { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setGenerating(false);
    }
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success('Copied');
  }

  async function deleteRow(id: string) {
    await supabase.from('content_studio_generations').delete().eq('id', id);
    loadHistory();
  }

  const variantList = useMemo(() => variants ? Object.entries(variants) : [], [variants]);

  if (isLoading || !isAdmin) {
    return (
      <AppLayout title="Content Studio">
        <div className="min-h-[400px] flex items-center justify-center text-[var(--q-text-secondary)]">
          {isLoading ? 'Checking access…' : 'Redirecting…'}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Content Studio">
      <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">
        <header>
          <h1 className="text-2xl md:text-3xl font-bold font-sora flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Content Studio
          </h1>
          <p className="text-sm text-[var(--q-text-secondary)] mt-1">
            Admin-only. Generate viral, human-natural, platform-optimized social posts on demand.
            Tuned for brutal honesty, real storytelling, zero AI filler.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[420px,1fr] gap-6">
          {/* INPUT PANEL */}
          <Card className="p-5 space-y-4 bg-card/60 border-border">
            <div>
              <Label htmlFor="topic">Topic / what's the post about? *</Label>
              <Textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Why most startup financial projections are useless within 90 days"
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="angle">Angle / hook direction</Label>
              <Input
                id="angle"
                value={angle}
                onChange={(e) => setAngle(e.target.value)}
                placeholder="Contrarian — most planning advice is wrong"
                className="mt-1"
                list="angle-presets"
              />
              <datalist id="angle-presets">
                {ANGLE_PRESETS.map((a) => <option key={a} value={a} />)}
              </datalist>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TONE_PRESETS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Length</Label>
                <Select value={length} onValueChange={setLength}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform-native">Platform-native</SelectItem>
                    <SelectItem value="short">Short / punchy</SelectItem>
                    <SelectItem value="medium">Medium / story</SelectItem>
                    <SelectItem value="long">Long-form essay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="audience">Audience</Label>
              <Input id="audience" value={audience} onChange={(e) => setAudience(e.target.value)} className="mt-1" />
            </div>

            <div>
              <Label htmlFor="cta">CTA (optional)</Label>
              <Input id="cta" value={cta} onChange={(e) => setCta(e.target.value)} className="mt-1" />
            </div>

            <div>
              <Label>Platforms</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {PLATFORMS.map((p) => {
                  const on = platforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border transition ${
                        on ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent border-border text-foreground/70 hover:border-foreground'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="hashtags" className="cursor-pointer">Hashtags</Label>
              <Switch id="hashtags" checked={hashtagsEnabled} onCheckedChange={setHashtagsEnabled} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="emoji" className="cursor-pointer">Emojis (sparingly)</Label>
              <Switch id="emoji" checked={emojiEnabled} onCheckedChange={setEmojiEnabled} />
            </div>

            <div>
              <Label>Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google/gemini-3-flash-preview">Gemini 3 Flash (default, fast)</SelectItem>
                  <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro (deepest)</SelectItem>
                  <SelectItem value="openai/gpt-5">GPT-5 (alternative voice)</SelectItem>
                  <SelectItem value="openai/gpt-5-mini">GPT-5 mini (cheap)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={generate} disabled={generating} className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
              {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</> : <><Sparkles className="w-4 h-4 mr-2" />Generate</>}
            </Button>
          </Card>

          {/* RESULTS PANEL */}
          <div className="space-y-4">
            {!variants && !generating && (
              <Card className="p-10 text-center text-[var(--q-text-secondary)] border-dashed">
                Fill the form and hit Generate. You'll get one platform-native variant per selected channel.
              </Card>
            )}
            {generating && (
              <Card className="p-10 text-center text-[var(--q-text-secondary)] border-dashed">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
                Writing on-brand variants…
              </Card>
            )}
            {variantList.map(([platform, v]) => {
              const meta = PLATFORMS.find((p) => p.id === platform);
              const fullText = `${v.body || ''}${v.hashtags?.length ? '\n\n' + v.hashtags.join(' ') : ''}`;
              return (
                <Card key={platform} className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: meta?.color }} />
                      <span className="font-semibold">{meta?.label ?? platform}</span>
                      {v.char_count != null && (
                        <Badge variant="outline" className="font-mono text-xs">{v.char_count} chars</Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyText(fullText)}>
                      <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
                    </Button>
                  </div>
                  {v.hook && <p className="text-sm font-semibold text-foreground/90">{v.hook}</p>}
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans bg-background/40 p-3 rounded-md border border-border">{v.body}</pre>
                  {v.hashtags?.length ? (
                    <p className="text-xs text-primary font-mono">{v.hashtags.join(' ')}</p>
                  ) : null}
                  {v.image_prompt ? (
                    <p className="text-xs text-[var(--q-text-secondary)]">
                      <span className="font-semibold">Image brief:</span> {v.image_prompt}
                    </p>
                  ) : null}
                  {v.notes ? (
                    <p className="text-xs text-[var(--q-text-secondary)] italic">Why it works: {v.notes}</p>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </div>

        {/* HISTORY */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold font-sora">Recent generations</h2>
            <Button variant="ghost" size="sm" onClick={loadHistory}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
            </Button>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-[var(--q-text-secondary)]">No generations yet.</p>
          ) : (
            <div className="grid gap-3">
              {history.map((h) => (
                <Card key={h.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{h.topic}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {h.platforms.map((p) => (
                          <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                        ))}
                        <span className="text-xs text-[var(--q-text-secondary)] ml-2">
                          {new Date(h.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setVariants(h.variants)}>Open</Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteRow(h.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
