/**
 * Instagram Harvest: filter, sort and export the stored triage list.
 * Pure: works on ig_harvest_items rows already loaded in the page.
 */
import type { ItemKind, ProductRoute } from './classify';

export const STATUSES = ['new', 'reviewing', 'adopted', 'rejected'] as const;
export type ItemStatus = (typeof STATUSES)[number];

export const PRODUCTS = ['quantis', 'store', 'build', 'marketing', 'video', 'other'] as const;
export type Product = (typeof PRODUCTS)[number];

/** A row of public.ig_harvest_items. */
export interface IgItemRow {
  id: string;
  item_key: string;
  kind: ItemKind | string;
  host: string;
  name: string;
  example_url: string;
  urls: string[];
  mentions: number;
  routes: (ProductRoute | string)[];
  senders: string[];
  first_seen: string | null;
  last_seen: string | null;
  context: string | null;
  status: ItemStatus;
  product: Product | null;
  notes: string | null;
  last_run_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemFilter {
  query: string;
  kind: string; // 'all' or an ItemKind
  route: string; // 'all', 'none' or a ProductRoute
  status: string; // 'all' or an ItemStatus
  product: string; // 'all', 'unset' or a Product
}

export type ItemSort = 'mentions' | 'last_seen';

export const EMPTY_FILTER: ItemFilter = { query: '', kind: 'all', route: 'all', status: 'all', product: 'all' };

export function filterItems(rows: IgItemRow[], f: ItemFilter): IgItemRow[] {
  const q = f.query.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.kind !== 'all' && r.kind !== f.kind) return false;
    if (f.route === 'none' ? r.routes.length > 0 : f.route !== 'all' && !r.routes.includes(f.route)) return false;
    if (f.status !== 'all' && r.status !== f.status) return false;
    if (f.product === 'unset' ? r.product !== null : f.product !== 'all' && r.product !== f.product) return false;
    if (!q) return true;
    return [r.name, r.host, r.example_url, r.context ?? '', r.notes ?? '', ...r.senders, ...r.urls].some((s) => s.toLowerCase().includes(q));
  });
}

export function sortItems(rows: IgItemRow[], by: ItemSort): IgItemRow[] {
  const out = [...rows];
  if (by === 'mentions') out.sort((a, b) => b.mentions - a.mentions || (b.last_seen ?? '').localeCompare(a.last_seen ?? ''));
  else out.sort((a, b) => (b.last_seen ?? '').localeCompare(a.last_seen ?? '') || b.mentions - a.mentions);
  return out;
}

const CSV_COLS: (keyof IgItemRow)[] = ['name', 'kind', 'host', 'mentions', 'routes', 'status', 'product', 'first_seen', 'last_seen', 'example_url', 'senders', 'context', 'notes'];

export function itemsToCsv(rows: IgItemRow[]): string {
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : Array.isArray(v) ? v.join('; ') : String(v);
    // Leading = + - @ would run as a formula when the CSV is opened in a spreadsheet.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [CSV_COLS.join(','), ...rows.map((r) => CSV_COLS.map((c) => cell(r[c])).join(','))].join('\n');
}

/** Split a list into fixed-size batches (upload in chunks the RPC can take). */
export function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Only http(s) links are opened from the table. */
export function safeHref(url: string): string | undefined {
  return /^https?:\/\//i.test(url) ? url : undefined;
}
