import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GrowthOsBlock } from './GrowthOsBlock';
import {
  PRODUCT_LABELS,
  filterRows,
  monthlyCounts,
  productCounts,
  type DocRow,
  type GrowthOsSnapshot,
  type ProductFilter,
} from '@/lib/growth-os';

/**
 * /admin/growth-studio: AIWMC Growth Studio OS, one system for aiwmc.store, build.aiwmc.store,
 * aiwmcquantis.com and aiwmc.space. Everything since the first entry: products, registry and engines,
 * every OPS-LOG entry, the git history of all product repos, every working document, rules and
 * decisions (memory), skills, scheduled tasks and the Growth Studio page data.
 * Data: admin-only edge function `growth-os` (scrubbed snapshot, never in the public bundle).
 */
const PAGE = 150;
const FILTERS: ProductFilter[] = ['all', 'store', 'build', 'quantis', 'space', 'general'];

function Pre({ text, max = '28rem' }: { text: string; max?: string }) {
  return (
    <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed bg-muted/40 rounded-md p-3 overflow-auto" style={{ maxHeight: max }}>
      {text || '(empty)'}
    </pre>
  );
}

function ProductBadges({ products }: { products: string[] }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {products.map((p) => (
        <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0">{p}</Badge>
      ))}
    </span>
  );
}

function ShowMore({ shown, total, onMore }: { shown: number; total: number; onMore: () => void }) {
  if (shown >= total) return <p className="text-xs text-muted-foreground">Showing all {total}.</p>;
  return (
    <Button variant="outline" size="sm" onClick={onMore}>
      Show more ({shown} of {total})
    </Button>
  );
}

export default function GrowthStudioOS() {
  const [snap, setSnap] = useState<GrowthOsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [params] = useSearchParams();
  // ?product=build|store|quantis|space opens on one product (the build.aiwmc.store/admin entry links here).
  const initial = params.get('product');
  const [filter, setFilter] = useState<ProductFilter>(FILTERS.includes(initial as ProductFilter) ? (initial as ProductFilter) : 'all');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [openDoc, setOpenDoc] = useState<DocRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.functions.invoke('growth-os').then(({ data, error: err }) => {
      if (cancelled) return;
      if (err) setError(err.message);
      else setSnap(data as GrowthOsSnapshot);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => setLimit(PAGE), [filter, query]);

  const timeline = useMemo(
    () => (snap ? filterRows(snap.timeline, filter, query, (r) => `${r.text} ${r.section ?? ''} ${r.repo ?? ''} ${r.date}`) : []),
    [snap, filter, query],
  );
  const documents = useMemo(
    () => (snap ? filterRows(snap.documents, filter, query, (d) => `${d.title} ${d.path} ${d.text}`) : []),
    [snap, filter, query],
  );
  const memory = useMemo(
    () => (snap ? filterRows(snap.memory, filter, query, (m) => `${m.title} ${m.description} ${m.text}`) : []),
    [snap, filter, query],
  );
  const tasks = useMemo(
    () => (snap ? filterRows(snap.tasks, filter, query, (t) => `${t.id} ${t.description} ${t.text}`) : []),
    [snap, filter, query],
  );
  const skills = useMemo(
    () => (snap ? snap.skills.filter((s) => `${s.name} ${s.description}`.toLowerCase().includes(query.toLowerCase())) : []),
    [snap, query],
  );
  const months = useMemo(() => monthlyCounts(timeline), [timeline]);
  const counts = useMemo(() => (snap ? productCounts(snap) : {}), [snap]);

  if (error) {
    return (
      <Card><CardContent className="p-6 text-sm space-y-2">
        <p className="text-destructive">Could not load the Growth Studio OS: {error}</p>
        <p className="text-muted-foreground">
          The snapshot is read from the private AIWMCX/aiwmc-growth-studio repo. If the edge secret
          GROWTH_OS_GITHUB_TOKEN (read-only Contents access to that repo) is not set yet, the function answers 503.
        </p>
      </CardContent></Card>
    );
  }
  if (!snap) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet><title>Growth Studio OS | Admin</title></Helmet>
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold font-sora">AIWMC Growth Studio OS</h1>
        <p className="text-sm text-muted-foreground">
          One system for aiwmc.store, build.aiwmc.store, aiwmcquantis.com and aiwmc.space.
          History {snap.range.from} to {snap.range.to}: {snap.timeline.length.toLocaleString('en-US')} timeline entries,{' '}
          {snap.documents.length} documents, {snap.memory.length} rules and decisions, {snap.skills.length} skills,{' '}
          {snap.tasks.length} scheduled tasks. Snapshot {new Date(snap.generated_at).toLocaleString('en-US')}.
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
              {PRODUCT_LABELS[f]}
            </Button>
          ))}
        </div>
        <Input
          className="md:max-w-sm"
          placeholder="Search everything (all words must match)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search the Growth Studio OS"
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="growth-os">Growth OS: channels, hooks, videos</TabsTrigger>
          <TabsTrigger value="timeline">Timeline ({timeline.length})</TabsTrigger>
          <TabsTrigger value="docs">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="engines">Engines & registry</TabsTrigger>
          <TabsTrigger value="rules">Rules & decisions ({memory.length})</TabsTrigger>
          <TabsTrigger value="ops">Skills & tasks</TabsTrigger>
          <TabsTrigger value="page">Growth Studio page data</TabsTrigger>
          <TabsTrigger value="v1">Growth Studio v1 (Nov 8)</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {snap.products.filter((p) => filter === 'all' || filter === p.id).map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between gap-2">
                    <span>{p.name}</span>
                    <Badge variant={p.live.status === 200 ? 'default' : 'destructive'}>
                      {p.live.status === 200 ? 'live 200' : `down ${p.live.status ?? p.live.error ?? ''}`}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <a className="underline" href={p.url} target="_blank" rel="noreferrer">{p.url}</a>
                  <p className="text-muted-foreground">{p.role}</p>
                  <p className="text-xs">Repo {p.repo}. Last commit: {p.last_commit || 'unknown'}</p>
                  <p className="text-xs">
                    {counts[p.id]?.timeline ?? 0} timeline entries, {counts[p.id]?.documents ?? 0} documents
                  </p>
                  {p.wiring && <details><summary className="cursor-pointer text-xs font-medium">Wiring map</summary><Pre text={p.wiring} /></details>}
                  {p.prompt && <details><summary className="cursor-pointer text-xs font-medium">Start prompt</summary><Pre text={p.prompt} /></details>}
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Activity by month ({PRODUCT_LABELS[filter]})</CardTitle></CardHeader>
            <CardContent>
              <table className="text-sm w-full">
                <thead><tr className="text-left text-muted-foreground"><th>Month</th><th>Logged actions</th><th>Commits</th></tr></thead>
                <tbody>
                  {months.map((m) => (
                    <tr key={m.month} className="border-t"><td className="py-1">{m.month}</td><td>{m.ops}</td><td>{m.commits}</td></tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="growth-os" className="mt-4">
          {snap.growth_os ? <GrowthOsBlock os={snap.growth_os} filter={filter} /> : <p className="text-sm text-muted-foreground">No Growth OS block in this snapshot.</p>}
        </TabsContent>

        <TabsContent value="v1" className="space-y-4 mt-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">v1 archive</CardTitle></CardHeader><CardContent><Pre text={snap.v1?.readme ?? ''} max="30vh" /></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">v1 page, full text (Quantis, Store + Build reels, Playbook and hooks, Noir + Studio, funnel, lanes, Telegram engine)</CardTitle></CardHeader><CardContent><Pre text={snap.v1?.page_text ?? ''} max="70vh" /></CardContent></Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-2 mt-4">
          {timeline.slice(0, limit).map((r, i) => (
            <div key={`${r.date}-${r.sha ?? i}`} className="border rounded-md p-2 text-sm space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{r.date}{r.time ? ` ${r.time}` : ''}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{r.kind === 'commit' ? `commit ${r.repo} ${r.sha}` : 'ops log'}</Badge>
                <ProductBadges products={r.products} />
                {r.section && <span className="truncate max-w-[24rem]">{r.section}</span>}
              </div>
              <p className="whitespace-pre-wrap break-words">{r.text}</p>
            </div>
          ))}
          <ShowMore shown={Math.min(limit, timeline.length)} total={timeline.length} onMore={() => setLimit((l) => l + PAGE)} />
        </TabsContent>

        <TabsContent value="docs" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <div className="space-y-1">
              {documents.slice(0, limit).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setOpenDoc(d)}
                  className={`w-full text-left border rounded-md p-2 text-sm hover:bg-muted/50 ${openDoc?.id === d.id ? 'bg-muted' : ''}`}
                >
                  <div className="font-medium">{d.title}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                    <span className="font-mono">{d.date}</span><span>{d.source}/{d.path}</span><ProductBadges products={d.products} />
                  </div>
                </button>
              ))}
              <ShowMore shown={Math.min(limit, documents.length)} total={documents.length} onMore={() => setLimit((l) => l + PAGE)} />
            </div>
            <div className="lg:sticky lg:top-4 self-start">
              {openDoc ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{openDoc.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {openDoc.source}/{openDoc.path} · {openDoc.date} · {(openDoc.bytes / 1024).toFixed(0)} KB
                      {openDoc.truncated ? ' · first 80 KB shown' : ''}
                    </p>
                  </CardHeader>
                  <CardContent><Pre text={openDoc.text} max="70vh" /></CardContent>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground">Pick a document to read it here.</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="engines" className="space-y-4 mt-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">Registry: engines, teardowns, plugins, library, product map</CardTitle></CardHeader><CardContent><Pre text={snap.registry} max="60vh" /></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">Master spec</CardTitle></CardHeader><CardContent><Pre text={snap.master_spec} max="50vh" /></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">Master prompt (the loop)</CardTitle></CardHeader><CardContent><Pre text={snap.master_prompt} max="50vh" /></CardContent></Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-2 mt-4">
          {memory.map((m) => (
            <details key={m.id} className="border rounded-md p-2 text-sm">
              <summary className="cursor-pointer">
                <Badge variant={m.kind === 'rule' ? 'default' : 'outline'} className="mr-2 text-[10px]">{m.kind}</Badge>
                <span className="font-medium">{m.title}</span>
                <span className="text-muted-foreground"> · {m.description}</span>
              </summary>
              <div className="mt-2"><Pre text={m.text} /></div>
            </details>
          ))}
        </TabsContent>

        <TabsContent value="ops" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Scheduled tasks ({tasks.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {tasks.map((t) => (
                <details key={t.id} className="border rounded-md p-2 text-sm">
                  <summary className="cursor-pointer"><span className="font-mono">{t.id}</span> · {t.schedule} · {t.description}</summary>
                  <div className="mt-2"><Pre text={t.text} /></div>
                </details>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Skills ({skills.length})</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {skills.map((s) => (
                  <li key={s.folder}><span className="font-mono">{s.name}</span> <span className="text-muted-foreground">{s.description}</span></li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="page" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Growth Studio page database (plan, 30-day slots, hooks, comments, copy, insights)</CardTitle></CardHeader>
            <CardContent><Pre text={JSON.stringify(snap.page_db, null, 2)} max="70vh" /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
