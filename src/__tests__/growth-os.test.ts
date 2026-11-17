import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { filterRows, matchesQuery, monthlyCounts, productCounts, type TimelineRow } from '@/lib/growth-os';

const ROOT = path.resolve(__dirname, '../..');
const FN_DIR = path.join(ROOT, 'supabase/functions/growth-os');

describe('growth-os helpers', () => {
  const rows: TimelineRow[] = [
    { date: '2026-11-16', kind: 'ops', text: 'Owner emails drafted', products: ['quantis'] },
    { date: '2026-11-15', kind: 'commit', repo: 'store', sha: 'abc', text: 'stage 3 homepage', products: ['store'] },
    { date: '2026-10-30', kind: 'ops', text: 'Runner switch', products: ['general'] },
    { date: 'undated', kind: 'ops', text: 'Header', products: ['quantis'] },
  ];

  it('searches with every word required, case-insensitive', () => {
    expect(matchesQuery('Owner emails drafted', 'owner DRAFTED')).toBe(true);
    expect(matchesQuery('Owner emails drafted', 'owner posted')).toBe(false);
    expect(matchesQuery('anything', '   ')).toBe(true);
  });

  it('filters by product and query together', () => {
    expect(filterRows(rows, 'quantis', '', (r) => r.text)).toHaveLength(2);
    expect(filterRows(rows, 'all', 'homepage', (r) => r.text)).toHaveLength(1);
    expect(filterRows(rows, 'space', '', (r) => r.text)).toHaveLength(0);
  });

  it('counts activity per month, newest first, undated kept apart', () => {
    expect(monthlyCounts(rows)).toEqual([
      { month: 'undated', ops: 1, commits: 0 },
      { month: '2026-11', ops: 1, commits: 1 },
      { month: '2026-10', ops: 1, commits: 0 },
    ]);
  });

  it('counts timeline entries and documents per product', () => {
    const c = productCounts({ timeline: rows, documents: [{ id: 'd', source: 's', path: 'p', title: 't', date: '', bytes: 1, truncated: false, products: ['store'], text: '' }] });
    expect(c.store).toEqual({ timeline: 1, documents: 1 });
    expect(c.quantis.timeline).toBe(2);
  });
});

describe('growth-os stays private', () => {
  it('the edge function checks the admin role before returning the snapshot', () => {
    const src = readFileSync(path.join(FN_DIR, 'index.ts'), 'utf8');
    expect(src).toMatch(/auth\.getUser\(token\)/);
    expect(src).toMatch(/\.eq\('role', 'admin'\)/);
    expect(src.indexOf("eq('role', 'admin')")).toBeLessThan(src.indexOf('JSON.stringify(snapshot)'));
  });

  it('no frontend file imports the snapshot (it must never ship in the public bundle)', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = path.join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(tsx?|jsx?)$/.test(name) && /growth-os\/snapshot\.json/.test(readFileSync(p, 'utf8')) && !p.includes('__tests__')) offenders.push(p);
      }
    };
    walk(path.join(ROOT, 'src'));
    expect(offenders).toEqual([]);
  }, 30_000);

  it('the snapshot carries no live keys, tokens or third-party emails', () => {
    const file = path.join(FN_DIR, 'snapshot.json');
    expect(existsSync(file)).toBe(true);
    const raw = readFileSync(file, 'utf8');
    expect(raw).not.toMatch(/\bsk_live_[A-Za-z0-9]{8,}/);
    expect(raw).not.toMatch(/\bwhsec_[A-Za-z0-9]{16,}/);
    expect(raw).not.toMatch(/\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/);
    expect(raw).not.toMatch(/\b(ghp|github_pat)_[A-Za-z0-9_]{20,}/);
    const emails = raw.match(/[\w.+-]+@[\w-]+(\.[\w-]+)*\.[a-z]{2,}/gi) ?? [];
    const foreign = emails.filter((e) => !/aiwmc|noreply\.github\.com|anthropic\.com|example\.com/i.test(e));
    expect(foreign).toEqual([]);
  });
});
