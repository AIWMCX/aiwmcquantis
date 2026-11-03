/**
 * Instagram Harvest: read and write public.ig_harvest_runs / ig_harvest_items.
 * Admin-only by RLS. The generated Supabase types don't include these tables
 * yet, so access goes through the narrow shapes below (same workaround as
 * src/lib/activationTracking.ts) instead of editing types.ts.
 */
import { supabase } from '@/integrations/supabase/client';
import { clip, type HarvestItem } from './classify';
import type { HarvestStats } from './archive';
import { chunk, type IgItemRow, type ItemStatus, type Product } from './triage';

export interface IgRunRow {
  id: string;
  created_by: string | null;
  file_name: string;
  threads: number;
  link_mentions: number;
  distinct_items: number;
  media: number;
  created_at: string;
}

type PgError = { message: string } | null;
type Res<T> = PromiseLike<{ data: T | null; error: PgError }>;

interface ItemsTable {
  select(cols: string): { order(col: string, o: { ascending: boolean }): { range(from: number, to: number): Res<IgItemRow[]> } };
  update(patch: Partial<Pick<IgItemRow, 'status' | 'product' | 'notes'>>): { in(col: 'id', ids: string[]): { select(cols: string): Res<IgItemRow[]> } };
}

interface RunsTable {
  insert(row: Omit<IgRunRow, 'id' | 'created_at' | 'created_by'>): { select(cols: string): { single(): Res<IgRunRow> } };
  select(cols: string): { order(col: string, o: { ascending: boolean }): { limit(n: number): Res<IgRunRow[]> } };
}

type MergeRpc = (fn: 'ig_harvest_merge_items', args: { p_run_id: string; p_items: HarvestItem[] }) => Res<number>;

const items = () => supabase.from('ig_harvest_items' as never) as unknown as ItemsTable;
const runs = () => supabase.from('ig_harvest_runs' as never) as unknown as RunsTable;
const mergeRpc = supabase.rpc.bind(supabase) as unknown as MergeRpc;

const PAGE = 1000;
export const MERGE_BATCH = 500;

export async function loadItems(): Promise<IgItemRow[]> {
  const out: IgItemRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await items().select('*').order('mentions', { ascending: false }).range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

export async function loadRuns(limit = 10): Promise<IgRunRow[]> {
  const { data, error } = await runs().select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Record a run, then merge its items by item_key: counts keep the larger value,
 * links/senders/routes are unioned, and status/product/notes are never touched.
 */
export async function saveHarvest(
  fileName: string,
  stats: HarvestStats,
  harvestItems: HarvestItem[],
  onBatch?: (done: number, total: number) => void,
): Promise<IgRunRow> {
  const { data: run, error } = await runs()
    .insert({
      file_name: clip(fileName, 500),
      threads: stats.threads,
      link_mentions: stats.linkMentions,
      distinct_items: stats.distinctItems,
      media: stats.media,
    })
    .select('*')
    .single();
  if (error || !run) throw new Error(error?.message ?? 'Run was not saved');
  const batches = chunk(harvestItems, MERGE_BATCH);
  for (let i = 0; i < batches.length; i++) {
    const { error: mergeError } = await mergeRpc('ig_harvest_merge_items', { p_run_id: run.id, p_items: batches[i] });
    if (mergeError) throw new Error(mergeError.message);
    onBatch?.(i + 1, batches.length);
  }
  return run;
}

export async function updateItems(
  ids: string[],
  patch: { status?: ItemStatus; product?: Product | null; notes?: string | null },
): Promise<IgItemRow[]> {
  const out: IgItemRow[] = [];
  for (const part of chunk(ids, 200)) {
    const { data, error } = await items().update(patch).in('id', part).select('*');
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
  }
  return out;
}
