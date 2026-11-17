/**
 * Pure helpers for /admin/growth-studio (AIWMC Growth Studio OS).
 * The snapshot comes from the admin-only `growth-os` edge function.
 */
export type ProductId = 'store' | 'build' | 'quantis' | 'space';
export type ProductFilter = ProductId | 'general' | 'all';

export interface GrowthOsProduct {
  id: ProductId;
  name: string;
  url: string;
  repo: string;
  role: string;
  live: { status: number | null; error?: string };
  last_commit: string;
  prompt: string;
  wiring: string;
}
export interface TimelineRow {
  date: string;
  time?: string;
  kind: 'ops' | 'commit';
  repo?: string;
  sha?: string;
  section?: string;
  text: string;
  products: string[];
}
export interface DocRow {
  id: string;
  source: string;
  path: string;
  title: string;
  date: string;
  bytes: number;
  truncated: boolean;
  products: string[];
  text: string;
}
export interface MemoryRow {
  id: string;
  title: string;
  description: string;
  kind: 'rule' | 'fact';
  products: string[];
  text: string;
  date: string;
}
export interface SkillRow { name: string; folder: string; description: string }
export interface TaskRow { id: string; schedule: string; description: string; products: string[]; text: string }
export interface GrowthOsSnapshot {
  generated_at: string;
  range: { from: string | null; to: string | null };
  products: GrowthOsProduct[];
  registry: string;
  master_spec: string;
  master_prompt: string;
  timeline: TimelineRow[];
  documents: DocRow[];
  memory: MemoryRow[];
  skills: SkillRow[];
  tasks: TaskRow[];
  page_db: Record<string, unknown>;
}

export const PRODUCT_LABELS: Record<ProductFilter, string> = {
  all: 'All 4 products',
  store: 'aiwmc.store',
  build: 'build.aiwmc.store',
  quantis: 'aiwmcquantis.com',
  space: 'aiwmc.space',
  general: 'Shared / general',
};

export function matchesProduct(products: string[] | undefined, filter: ProductFilter): boolean {
  if (filter === 'all') return true;
  return (products ?? []).includes(filter);
}

/** Case-insensitive AND search over whitespace-separated terms. */
export function matchesQuery(haystack: string, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const h = haystack.toLowerCase();
  return terms.every((t) => h.includes(t));
}

export function filterRows<T extends { products?: string[] }>(
  rows: T[],
  filter: ProductFilter,
  query: string,
  text: (row: T) => string,
): T[] {
  return rows.filter((r) => matchesProduct(r.products, filter) && matchesQuery(text(r), query));
}

/** Entries per month (YYYY-MM), newest first; undated rows are counted separately. */
export function monthlyCounts(rows: TimelineRow[]): Array<{ month: string; ops: number; commits: number }> {
  const m = new Map<string, { ops: number; commits: number }>();
  for (const r of rows) {
    const key = /^\d{4}-\d{2}/.test(r.date) ? r.date.slice(0, 7) : 'undated';
    const v = m.get(key) ?? { ops: 0, commits: 0 };
    if (r.kind === 'commit') v.commits += 1;
    else v.ops += 1;
    m.set(key, v);
  }
  return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([month, v]) => ({ month, ...v }));
}

/** Product counts across the timeline, for the overview cards. */
export function productCounts(snap: Pick<GrowthOsSnapshot, 'timeline' | 'documents'>): Record<string, { timeline: number; documents: number }> {
  const out: Record<string, { timeline: number; documents: number }> = {};
  const bump = (p: string, k: 'timeline' | 'documents') => {
    out[p] ??= { timeline: 0, documents: 0 };
    out[p][k] += 1;
  };
  for (const r of snap.timeline) for (const p of r.products) bump(p, 'timeline');
  for (const d of snap.documents) for (const p of d.products) bump(p, 'documents');
  return out;
}
