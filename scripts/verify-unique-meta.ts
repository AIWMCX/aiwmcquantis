/**
 * CI guard: every prerendered route must ship a UNIQUE <title> and
 * <meta name="description">. Two routes with byte-identical head tags = the
 * SPA SEO bug regressed (every URL serves the homepage HTML).
 *
 * Runs after `vite build` + `scripts/prerender-seo.ts`. Exits non-zero on
 * any duplicate, with a list of the offending routes.
 */
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const DIST = resolve('dist');
const URLS_FILE = resolve('public/prerender-urls.txt');

if (!existsSync(DIST)) {
  console.error('[verify-unique-meta] dist/ missing — run vite build first.');
  process.exit(1);
}
if (!existsSync(URLS_FILE)) {
  console.error('[verify-unique-meta] public/prerender-urls.txt missing.');
  process.exit(1);
}

const routes = readFileSync(URLS_FILE, 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

function readHtml(route: string): string | null {
  const candidate =
    route === '/' ? join(DIST, 'index.html') : join(DIST, route.replace(/^\//, ''), 'index.html');
  if (!existsSync(candidate)) return null;
  return readFileSync(candidate, 'utf8');
}

function extract(html: string, re: RegExp): string {
  const m = html.match(re);
  return m ? m[1].trim() : '';
}

const TITLE_RE = /<title>([^<]*)<\/title>/i;
const DESC_RE = /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i;

const byTitle = new Map<string, string[]>();
const byDesc = new Map<string, string[]>();
const missing: string[] = [];

for (const route of routes) {
  const html = readHtml(route);
  if (!html) {
    missing.push(route);
    continue;
  }
  const title = extract(html, TITLE_RE);
  const desc = extract(html, DESC_RE);
  if (!title || !desc) {
    missing.push(`${route} (title="${title}" desc="${desc.slice(0, 40)}")`);
    continue;
  }
  if (!byTitle.has(title)) byTitle.set(title, []);
  if (!byDesc.has(desc)) byDesc.set(desc, []);
  byTitle.get(title)!.push(route);
  byDesc.get(desc)!.push(route);
}

let failed = false;

const dupTitles = [...byTitle.entries()].filter(([, rs]) => rs.length > 1);
const dupDescs = [...byDesc.entries()].filter(([, rs]) => rs.length > 1);

if (dupTitles.length) {
  failed = true;
  console.error('\n❌ Duplicate <title> across routes:');
  for (const [title, rs] of dupTitles) {
    console.error(`   "${title}"`);
    for (const r of rs) console.error(`     - ${r}`);
  }
}
if (dupDescs.length) {
  failed = true;
  console.error('\n❌ Duplicate <meta description> across routes:');
  for (const [desc, rs] of dupDescs) {
    console.error(`   "${desc.slice(0, 80)}..."`);
    for (const r of rs) console.error(`     - ${r}`);
  }
}
if (missing.length) {
  failed = true;
  console.error('\n❌ Routes missing prerendered HTML or head tags:');
  for (const r of missing) console.error(`   - ${r}`);
}

if (failed) {
  console.error(
    `\n[verify-unique-meta] FAIL — ${dupTitles.length} dup titles, ${dupDescs.length} dup descs, ${missing.length} missing.`,
  );
  process.exit(1);
}

console.log(`[verify-unique-meta] OK — ${routes.length} routes, all unique head tags.`);
