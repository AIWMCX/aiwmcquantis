import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { Download, ExternalLink, FileArchive, Image as ImageIcon, Loader2, RefreshCw, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ITEM_KINDS, PRODUCT_ROUTES } from '@/lib/ig-harvest/classify';
import { harvestArchives, type Harvest, type HarvestProgress, type OpenArchive } from '@/lib/ig-harvest/archive';
import { loadItems, loadRuns, saveHarvest, updateItems, type IgRunRow } from '@/lib/ig-harvest/db';
import type { MediaRef, SavedPostRef } from '@/lib/ig-harvest/parse';
import {
  EMPTY_FILTER, PRODUCTS, STATUSES, filterItems, itemsToCsv, safeHref, sortItems,
  type IgItemRow, type ItemFilter, type ItemSort, type ItemStatus, type Product,
} from '@/lib/ig-harvest/triage';

/**
 * /admin/instagram-harvest: load the official Instagram data export (JSON),
 * pull out every link, repo, app and file from DMs and saved posts, and triage
 * them per AIWMC product. The ZIP is read in this browser; only link-level
 * results are stored (ig_harvest_items). Nothing logs in to Instagram.
 */

const PAGE = 200;
const STATUS_LABEL: Record<ItemStatus, string> = { new: 'New', reviewing: 'Reviewing', adopted: 'Adopted', rejected: 'Rejected' };
const PRODUCT_LABEL: Record<Product, string> = { quantis: 'Quantis', store: 'Store', build: 'Build', marketing: 'Marketing', video: 'Video', other: 'Other' };

const fmtDay = (d: string | null) => d || '—';

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function InstagramHarvest() {
  const [rows, setRows] = useState<IgItemRow[] | null>(null);
  const [runs, setRuns] = useState<IgRunRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [harvest, setHarvest] = useState<Harvest | null>(null);
  const [fileLabel, setFileLabel] = useState('');
  const [progress, setProgress] = useState<HarvestProgress | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saveState, setSaveState] = useState<string | null>(null);
  const [savedRunId, setSavedRunId] = useState<string | null>(null);
  const archiveRef = useRef<OpenArchive | null>(null);

  const [filter, setFilter] = useState<ItemFilter>(EMPTY_FILTER);
  const [sort, setSort] = useState<ItemSort>('mentions');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(PAGE);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [items, recent] = await Promise.all([loadItems(), loadRuns()]);
      setRows(items);
      setRuns(recent);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
      setRows([]);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { void archiveRef.current?.close(); }, []);

  const onFiles = async (list: FileList | null) => {
    const files = list ? Array.from(list) : [];
    if (!files.length) return;
    await archiveRef.current?.close();
    archiveRef.current = null;
    setHarvest(null);
    setSavedRunId(null);
    setParsing(true);
    setFileLabel(files.map((f) => f.name).join(', '));
    try {
      const h = await harvestArchives(files, setProgress);
      archiveRef.current = h.archive;
      setHarvest(h);
      if (!h.stats.jsonFiles) toast.error('No messages or saved-posts JSON found. Request the export again with Format: JSON (not HTML).');
      else toast.success(`Found ${h.stats.distinctItems} distinct links in ${h.stats.threads} threads`);
    } catch (e) {
      toast.error(`Could not read the ZIP: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setParsing(false);
      setProgress(null);
    }
  };

  const onSave = async () => {
    if (!harvest) return;
    setSaveState('Saving run…');
    try {
      const run = await saveHarvest(fileLabel, harvest.stats, harvest.items, (done, total) => setSaveState(`Saving items, batch ${done} of ${total}…`));
      setSavedRunId(run.id);
      toast.success(`Saved ${harvest.items.length} items. Existing items were merged, your statuses and notes kept.`);
      await load();
    } catch (e) {
      toast.error(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaveState(null);
    }
  };

  const applyPatch = async (ids: string[], patch: { status?: ItemStatus; product?: Product | null; notes?: string | null }) => {
    if (!ids.length) return;
    try {
      const updated = await updateItems(ids, patch);
      const byId = new Map(updated.map((r) => [r.id, r]));
      setRows((prev) => prev?.map((r) => byId.get(r.id) ?? r) ?? prev);
      if (ids.length > 1) toast.success(`Updated ${updated.length} items`);
    } catch (e) {
      toast.error(`Update failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const visible = useMemo(() => (rows ? sortItems(filterItems(rows, filter), sort) : []), [rows, filter, sort]);
  const shown = visible.slice(0, limit);
  const allShownSelected = shown.length > 0 && shown.every((r) => selected.has(r.id));

  const setF = (patch: Partial<ItemFilter>) => { setFilter((f) => ({ ...f, ...patch })); setLimit(PAGE); };
  const toggle = (id: string, on: boolean) => setSelected((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
  const toggleShown = (on: boolean) => setSelected((s) => { const n = new Set(s); for (const r of shown) { if (on) n.add(r.id); else n.delete(r.id); } return n; });

  const exportCsv = () => {
    downloadBlob(new Blob([itemsToCsv(visible)], { type: 'text/csv;charset=utf-8' }), `instagram-harvest-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows?.length ?? 0 };
    for (const r of rows ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  return (
    <div className="space-y-6">
      <Helmet><title>Instagram Harvest · Admin</title></Helmet>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold">Instagram Harvest</h1>
          <p className="text-sm text-muted-foreground">
            Load your Instagram data export to list every link, GitHub repo, app and file people sent you in DMs or that you saved, then mark what each one is for.
            The ZIP is read in this browser. Only the link, its host, dates, sender names and up to 300 characters around the link are saved. Nothing logs in to Instagram.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!visible.length}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">1. Load the export</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Instagram › Accounts Center › Your information and permissions › Download your information.</li>
            <li>Choose “Some of your information”: Messages and Saved. Format: <strong>JSON</strong>. Date range: All time. Media quality: Low keeps the file smaller.</li>
            <li>When Instagram emails the link, download the ZIP (or every part, if it is split) and select it here. Several parts can be selected together.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex">
              <input
                type="file"
                accept=".zip,application/zip"
                multiple
                className="sr-only"
                disabled={parsing || !!saveState}
                onChange={(e) => { void onFiles(e.target.files); e.target.value = ''; }}
              />
              <span className={`inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted ${parsing || saveState ? 'pointer-events-none opacity-50' : ''}`}>
                <FileArchive className="mr-2 h-4 w-4" />Choose export ZIP
              </span>
            </label>
            {fileLabel && <span className="text-sm text-muted-foreground break-all">{fileLabel}</span>}
          </div>

          {parsing && (
            <div className="space-y-1">
              <Progress value={progress && progress.total ? (progress.done / progress.total) * 100 : 0} />
              <p className="text-xs text-muted-foreground">
                {progress?.phase === 'index' ? `Reading the archive index (${progress.done + 1} of ${progress.total})…`
                  : progress?.phase === 'json' ? `Reading JSON ${progress.done + 1} of ${progress.total}: ${progress.file}`
                  : 'Starting…'}
              </p>
            </div>
          )}

          {harvest && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Threads" value={harvest.stats.threads} />
                <Stat label="Link mentions" value={harvest.stats.linkMentions} />
                <Stat label="Distinct items" value={harvest.stats.distinctItems} />
                <Stat label="Photos, videos, files" value={harvest.stats.media} />
                <Stat label="Saved posts" value={harvest.stats.savedPosts} />
                <Stat label="JSON files read" value={harvest.stats.jsonFiles} />
                <Stat label="Unreadable JSON" value={harvest.stats.unreadable} />
                <Stat label="ZIP files" value={harvest.stats.archives} />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => void onSave()} disabled={!!saveState || !!savedRunId || !harvest.items.length}>
                  {saveState ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {savedRunId ? 'Saved' : `Save ${harvest.items.length} items to the triage list`}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {saveState ?? 'Items already in the list are merged: counts keep the larger number, links and senders are combined, your status, product and notes stay.'}
                </span>
              </div>
            </div>
          )}

          {runs.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <div className="font-medium text-foreground">Previous loads</div>
              <ul className="mt-1 space-y-0.5">
                {runs.slice(0, 5).map((r) => (
                  <li key={r.id}>
                    {new Date(r.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}: {r.distinct_items} items, {r.link_mentions} mentions, {r.threads} threads, {r.media} media
                    <span className="break-all"> ({r.file_name || 'unnamed'})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="items">Items ({rows?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="media">Screenshots &amp; files ({harvest?.media.length ?? 0})</TabsTrigger>
          <TabsTrigger value="saved">Saved posts ({harvest?.saved.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <Card>
            <CardHeader className="space-y-3">
              <CardTitle className="text-base">2. Triage ({visible.length} shown of {rows?.length ?? 0})</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Input className="max-w-xs" placeholder="Search name, link, sender, notes" value={filter.query} onChange={(e) => setF({ query: e.target.value })} />
                <FilterSelect label="Kind" value={filter.kind} onChange={(v) => setF({ kind: v })} options={[['all', 'All kinds'], ...ITEM_KINDS.map((k) => [k, k] as [string, string])]} />
                <FilterSelect label="Route" value={filter.route} onChange={(v) => setF({ route: v })} options={[['all', 'All routes'], ...PRODUCT_ROUTES.map((r) => [r, r] as [string, string]), ['none', 'No route']]} />
                <FilterSelect label="Status" value={filter.status} onChange={(v) => setF({ status: v })} options={[['all', `All statuses (${counts.all})`], ...STATUSES.map((s) => [s, `${STATUS_LABEL[s]} (${counts[s] ?? 0})`] as [string, string])]} />
                <FilterSelect label="Product" value={filter.product} onChange={(v) => setF({ product: v })} options={[['all', 'All products'], ['unset', 'No product yet'], ...PRODUCTS.map((p) => [p, PRODUCT_LABEL[p]] as [string, string])]} />
                <FilterSelect label="Sort" value={sort} onChange={(v) => setSort(v as ItemSort)} options={[['mentions', 'Most mentioned'], ['last_seen', 'Most recent']]} />
              </div>
              {selected.size > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-2 text-sm">
                  <span className="font-medium">{selected.size} selected</span>
                  <FilterSelect label="Set status" value="" placeholder="Set status…" onChange={(v) => void applyPatch([...selected], { status: v as ItemStatus })} options={STATUSES.map((s) => [s, STATUS_LABEL[s]] as [string, string])} />
                  <FilterSelect label="Set product" value="" placeholder="Set product…" onChange={(v) => void applyPatch([...selected], { product: v === 'unset' ? null : (v as Product) })} options={[...PRODUCTS.map((p) => [p, PRODUCT_LABEL[p]] as [string, string]), ['unset', 'Clear product']]} />
                  <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear selection</Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loadError && <p className="mb-3 text-sm text-destructive">Could not load the triage list: {loadError}</p>}
              {rows === null ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : !rows.length ? (
                <p className="text-sm text-muted-foreground">Nothing saved yet. Load an export above and press Save.</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"><Checkbox aria-label="Select all shown" checked={allShownSelected} onCheckedChange={(v) => toggleShown(v === true)} /></TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Mentions</TableHead>
                        <TableHead>Routes</TableHead>
                        <TableHead>Last seen</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="min-w-[200px]">Notes</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shown.map((r) => (
                        <ItemRow key={r.id} row={r} checked={selected.has(r.id)} onCheck={(on) => toggle(r.id, on)} onPatch={(p) => void applyPatch([r.id], p)} />
                      ))}
                    </TableBody>
                  </Table>
                  {visible.length > shown.length && (
                    <div className="mt-3 flex justify-center">
                      <Button variant="outline" size="sm" onClick={() => setLimit((n) => n + PAGE)}>Show {Math.min(PAGE, visible.length - shown.length)} more</Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media">
          <MediaTab media={harvest?.media ?? []} archive={archiveRef} />
        </TabsContent>

        <TabsContent value="saved">
          <SavedTab saved={harvest?.saved ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][]; placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto min-w-[140px]" aria-label={label}><SelectValue placeholder={placeholder ?? label} /></SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function ItemRow({ row: r, checked, onCheck, onPatch }: {
  row: IgItemRow; checked: boolean; onCheck: (on: boolean) => void;
  onPatch: (p: { status?: ItemStatus; product?: Product | null; notes?: string | null }) => void;
}) {
  const href = safeHref(r.example_url);
  return (
    <TableRow>
      <TableCell><Checkbox aria-label={`Select ${r.name}`} checked={checked} onCheckedChange={(v) => onCheck(v === true)} /></TableCell>
      <TableCell className="max-w-[380px]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium break-all">{r.name}</span>
          <Badge variant="outline">{r.kind}</Badge>
        </div>
        {r.host !== r.name && <div className="text-xs text-muted-foreground">{r.host}</div>}
        {r.context && <div className="mt-1 line-clamp-2 text-xs text-muted-foreground" title={r.context}>{r.context}</div>}
        {r.senders.length > 0 && <div className="mt-1 text-xs text-muted-foreground">From: {r.senders.slice(0, 3).join(', ')}{r.senders.length > 3 ? ` +${r.senders.length - 3}` : ''}</div>}
      </TableCell>
      <TableCell className="text-right tabular-nums">{r.mentions}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">{r.routes.length ? r.routes.map((x) => <Badge key={x} variant="secondary">{x}</Badge>) : <span className="text-xs text-muted-foreground">—</span>}</div>
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm">{fmtDay(r.last_seen)}</TableCell>
      <TableCell>
        <Select value={r.status} onValueChange={(v) => onPatch({ status: v as ItemStatus })}>
          <SelectTrigger className="h-8 w-[120px]" aria-label="Status"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select value={r.product ?? 'unset'} onValueChange={(v) => onPatch({ product: v === 'unset' ? null : (v as Product) })}>
          <SelectTrigger className="h-8 w-[120px]" aria-label="Product"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="unset">—</SelectItem>
            {PRODUCTS.map((p) => <SelectItem key={p} value={p}>{PRODUCT_LABEL[p]}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          className="h-8"
          placeholder="Add a note"
          defaultValue={r.notes ?? ''}
          onBlur={(e) => {
            const next = e.target.value.trim();
            if (next !== (r.notes ?? '')) onPatch({ notes: next || null });
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        />
      </TableCell>
      <TableCell>
        {href && (
          <Button asChild size="sm" variant="ghost" title={r.urls.length > 1 ? `${r.urls.length} different links; opens the first` : 'Open link'}>
            <a href={href} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Open ${r.name}`}><ExternalLink className="h-4 w-4" /></a>
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

const MEDIA_LABEL: Record<MediaRef['type'], string> = { photos: 'Photo', videos: 'Video', files: 'File', audio_files: 'Voice note' };

function MediaTab({ media, archive }: { media: MediaRef[]; archive: MutableRefObject<OpenArchive | null> }) {
  const [type, setType] = useState('all');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; ref: MediaRef } | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return media.filter((m) => (type === 'all' || m.type === type) && (!q || `${m.thread} ${m.sender} ${m.context} ${m.path}`.toLowerCase().includes(q)));
  }, [media, type, query]);

  const open = async (m: MediaRef) => {
    if (!archive.current) return;
    setBusy(m.path);
    try {
      const blob = await archive.current.readMedia(m.path);
      if (!blob) {
        toast.error('This file is not in the loaded ZIP. If the export came in several parts, select all parts together.');
        return;
      }
      if (m.type === 'photos') setPreview({ url: URL.createObjectURL(blob), ref: m });
      else downloadBlob(blob, m.path.split('/').pop() || 'instagram-file');
    } catch (e) {
      toast.error(`Could not extract: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  };

  if (!media.length) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">Load an export above to list the photos, screenshots, videos and files people sent you. They are read from the ZIP on demand and never uploaded.</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="text-base">Screenshots &amp; files in the loaded ZIP ({visible.length})</CardTitle>
        <p className="text-xs text-muted-foreground">Not saved anywhere. Photos open here; videos, files and voice notes download to your computer.</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input className="max-w-xs" placeholder="Search thread, sender, message" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }} />
          <FilterSelect label="Type" value={type} onChange={(v) => { setType(v); setLimit(PAGE); }} options={[['all', 'All types'], ['photos', 'Photos'], ['videos', 'Videos'], ['files', 'Files'], ['audio_files', 'Voice notes']]} />
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Thread</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Message</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.slice(0, limit).map((m, i) => (
              <TableRow key={`${m.path}-${i}`}>
                <TableCell className="whitespace-nowrap text-sm">{fmtDay(m.date)}</TableCell>
                <TableCell><Badge variant="outline">{MEDIA_LABEL[m.type]}</Badge></TableCell>
                <TableCell className="max-w-[180px] break-words text-sm">{m.thread}</TableCell>
                <TableCell className="max-w-[160px] break-words text-sm">{m.sender}</TableCell>
                <TableCell className="max-w-[320px] text-xs text-muted-foreground"><span className="line-clamp-2">{m.context}</span></TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" disabled={busy === m.path} onClick={() => void open(m)}>
                    {busy === m.path ? <Loader2 className="h-4 w-4 animate-spin" /> : m.type === 'photos' ? <><ImageIcon className="mr-1 h-4 w-4" />Preview</> : <><Download className="mr-1 h-4 w-4" />Save</>}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {visible.length > limit && (
          <div className="mt-3 flex justify-center">
            <Button variant="outline" size="sm" onClick={() => setLimit((n) => n + PAGE)}>Show {Math.min(PAGE, visible.length - limit)} more</Button>
          </div>
        )}
      </CardContent>
      <Dialog open={!!preview} onOpenChange={(o) => { if (!o) setPreview(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle className="text-base">{preview ? `${preview.ref.thread} · ${preview.ref.sender} · ${fmtDay(preview.ref.date)}` : ''}</DialogTitle></DialogHeader>
          {preview && <img src={preview.url} alt={`Shared by ${preview.ref.sender}`} className="max-h-[70vh] w-full object-contain" />}
          {preview?.ref.context && <p className="text-xs text-muted-foreground">{preview.ref.context}</p>}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SavedTab({ saved }: { saved: SavedPostRef[] }) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? saved.filter((s) => `${s.owner} ${s.collection} ${s.url}`.toLowerCase().includes(q)) : saved;
  }, [saved, query]);

  if (!saved.length) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">Load an export that includes “Saved” to list the posts you saved. Saved posts link back to Instagram, so they are listed here, not in the triage list.</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="text-base">Saved posts in the loaded ZIP ({visible.length})</CardTitle>
        <Input className="max-w-xs" placeholder="Search account or collection" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }} />
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Saved on</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Collection</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.slice(0, limit).map((s, i) => {
              const href = safeHref(s.url);
              return (
                <TableRow key={`${s.url}-${i}`}>
                  <TableCell className="whitespace-nowrap text-sm">{fmtDay(s.date)}</TableCell>
                  <TableCell className="text-sm">{s.owner || '—'}</TableCell>
                  <TableCell className="text-sm">{s.collection || '—'}</TableCell>
                  <TableCell>
                    {href && (
                      <Button asChild size="sm" variant="ghost">
                        <a href={href} target="_blank" rel="noopener noreferrer nofollow"><ExternalLink className="mr-1 h-4 w-4" />Open post</a>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {visible.length > limit && (
          <div className="mt-3 flex justify-center">
            <Button variant="outline" size="sm" onClick={() => setLimit((n) => n + PAGE)}>Show {Math.min(PAGE, visible.length - limit)} more</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
