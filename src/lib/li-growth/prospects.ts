/**
 * LinkedIn Growth Agent: prospect input helpers (pure).
 *
 * URLs are only ever typed or pasted by the founder. Nothing here fetches
 * LinkedIn: normalizing a URL is string work so the same person is not added
 * twice and "Copy & open" can only ever open https://www.linkedin.com/.
 */
import type { BusinessType, SignalType, Warmth } from './fit-score';
import { BUSINESS_TYPES, SIGNAL_TYPES } from './fit-score';

/** https://www.linkedin.com/in/<slug>, or null when it is not a profile URL. */
export function normalizeProfileUrl(input: string | null | undefined): string | null {
  const raw = (input ?? '').trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return null;
  const m = url.pathname.match(/^\/in\/([^/?#\s]+)\/?/i);
  if (!m) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(m[1]);
  } catch {
    slug = m[1];
  }
  slug = slug.trim().toLowerCase();
  if (!slug || /[\s/?#]/.test(slug)) return null;
  return `https://www.linkedin.com/in/${encodeURIComponent(slug)}`;
}

/** A LinkedIn post/activity/comment URL on www.linkedin.com, query dropped. */
export function normalizePostUrl(input: string | null | undefined): string | null {
  const raw = (input ?? '').trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return null;
  if (!/^\/(posts|feed\/update|pulse|in|company)\//i.test(url.pathname)) return null;
  return `https://www.linkedin.com${url.pathname}`;
}

/** Only https://www.linkedin.com/... may be opened by "Copy & open". */
export function isSafeLinkedInUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'www.linkedin.com';
  } catch {
    return false;
  }
}

export function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? '';
}

// ─── CSV import ─────────────────────────────────────────────────────────────

export const TARGET_SOURCES = [
  'manual', 'csv', 'crm', 'zoho', 'vibe_prospecting', 'apollo', 'own_post_engager', 'watchlist_engager', 'own_network',
] as const;
export type TargetSource = typeof TARGET_SOURCES[number];

export interface TargetImportRow {
  name: string;
  linkedin_url: string;
  headline: string | null;
  company: string;
  country: string | null;
  source: TargetSource;
  notes: string | null;
  business_type: BusinessType | null;
  employees: number | null;
  connection_degree: number | null;
  warmth: Warmth | null;
  post_url: string | null;
  post_excerpt: string | null;
  signal_type: SignalType | null;
}

const HEADERS: Record<string, keyof TargetImportRow> = {
  name: 'name', full_name: 'name', contact_name: 'name',
  linkedin_url: 'linkedin_url', linkedin: 'linkedin_url', profile_url: 'linkedin_url', url: 'linkedin_url',
  title: 'headline', headline: 'headline', role: 'headline', job_title: 'headline',
  company: 'company', company_name: 'company', organization: 'company',
  country: 'country',
  source: 'source',
  notes: 'notes', note: 'notes',
  business_type: 'business_type',
  employees: 'employees', headcount: 'employees', employee_count: 'employees',
  degree: 'connection_degree', connection_degree: 'connection_degree',
  warmth: 'warmth',
  post_url: 'post_url',
  post_excerpt: 'post_excerpt', post_text: 'post_excerpt', excerpt: 'post_excerpt',
  signal_type: 'signal_type',
};

const WARMTHS: Warmth[] = ['engaged_my_post', 'replied_my_comment', 'watchlist_comment', 'mutual_connection', 'cold'];

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/**
 * Header row required; columns matched by name (see HEADERS). Each row needs
 * name, a LinkedIn profile URL and a company. Bad rows are reported, not
 * guessed at.
 */
export function parseTargetCsv(text: string): { rows: TargetImportRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { rows: [], errors: ['empty file'] };
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const header = splitCsvLine(lines[0], sep).map((h) => HEADERS[h.toLowerCase().replace(/[\s-]+/g, '_')]);
  for (const req of ['name', 'linkedin_url', 'company'] as const) {
    if (!header.includes(req)) return { rows: [], errors: [`header row must include ${req}`] };
  }
  const rows: TargetImportRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i], sep);
    const get = (k: keyof TargetImportRow) => {
      const idx = header.indexOf(k);
      const v = idx >= 0 ? cells[idx]?.trim() : '';
      return v ? v : null;
    };
    const url = normalizeProfileUrl(get('linkedin_url'));
    const name = get('name');
    const company = get('company');
    if (!name) { errors.push(`line ${i + 1}: missing name`); continue; }
    if (!url) { errors.push(`line ${i + 1}: not a LinkedIn profile URL`); continue; }
    if (!company) { errors.push(`line ${i + 1}: missing company`); continue; }
    if (seen.has(url)) { errors.push(`line ${i + 1}: duplicate of an earlier row`); continue; }
    seen.add(url);
    const source = (get('source') ?? 'csv').toLowerCase() as TargetSource;
    const bt = (get('business_type') ?? '').toLowerCase() as BusinessType;
    const warmth = (get('warmth') ?? '').toLowerCase() as Warmth;
    const st = (get('signal_type') ?? '').toLowerCase() as SignalType;
    const emp = Number(get('employees'));
    const deg = Number(get('connection_degree'));
    const excerpt = get('post_excerpt');
    rows.push({
      name,
      linkedin_url: url,
      headline: get('headline'),
      company,
      country: get('country'),
      source: (TARGET_SOURCES as readonly string[]).includes(source) ? source : 'csv',
      notes: get('notes'),
      business_type: BUSINESS_TYPES.includes(bt) ? bt : null,
      employees: Number.isFinite(emp) && get('employees') !== null && emp >= 0 ? Math.round(emp) : null,
      connection_degree: [1, 2, 3].includes(deg) ? deg : null,
      warmth: WARMTHS.includes(warmth) ? warmth : null,
      post_url: normalizePostUrl(get('post_url')),
      post_excerpt: excerpt ? excerpt.slice(0, 1200) : null,
      signal_type: SIGNAL_TYPES.includes(st) ? st : excerpt ? 'their_post' : null,
    });
  }
  return { rows, errors };
}
