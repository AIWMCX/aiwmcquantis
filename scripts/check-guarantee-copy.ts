#!/usr/bin/env bun
/**
 * Fails CI if the phrase "14-day" appears anywhere in UI copy / docs / SEO.
 * The canonical phrasing is "14-days" (per product decision).
 *
 * Scans src/, public/, docs/, scripts/seo-*.ts and scripts/prerender-seo.ts.
 * Self-references in this script are excluded via a marker.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['src', 'public', 'docs'];
const EXTRA_FILES = [
  'scripts/seo-metadata.ts',
  'scripts/seo-jsonld.ts',
  'scripts/prerender-seo.ts',
  'index.html',
];
const SKIP_DIR_NAMES = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);
const SKIP_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
  '.woff', '.woff2', '.ttf', '.otf', '.mp4', '.webm', '.pdf', '.zip',
]);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SELF_MARKER = 'CHECK_GUARANTEE_COPY_SELF';
const FORBIDDEN = /14-day(?!s)/g;

const offenders: { file: string; line: number; text: string }[] = [];

function walk(dir: string): string[] {
  const out: string[] = [];
  let entries: string[] = [];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (SKIP_DIR_NAMES.has(name)) continue;
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) out.push(...walk(full));
    else {
      const dot = name.lastIndexOf('.');
      const ext = dot >= 0 ? name.slice(dot).toLowerCase() : '';
      if (SKIP_EXTS.has(ext)) continue;
      out.push(full);
    }
  }
  return out;
}

const files = [
  ...SCAN_DIRS.flatMap((d) => walk(join(ROOT, d))),
  ...EXTRA_FILES.map((f) => join(ROOT, f)),
];

for (const file of files) {
  let content: string;
  try { content = readFileSync(file, 'utf8'); } catch { continue; }
  if (content.includes('CHECK_GUARANTEE_COPY_SELF')) continue;
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (FORBIDDEN.test(line)) {
      offenders.push({ file: relative(ROOT, file), line: i + 1, text: line.trim().slice(0, 200) });
    }
    FORBIDDEN.lastIndex = 0;
  });
}

if (offenders.length > 0) {
  console.error('❌ Found forbidden phrase "14-day" (must be "14-days"):\n');
  for (const o of offenders) console.error(`  ${o.file}:${o.line}  ${o.text}`);
  console.error(`\n${offenders.length} occurrence(s). Replace with "14-days".`);
  process.exit(1);
}

console.log('✅ Guarantee copy check passed: no "14-day" found. CHECK_GUARANTEE_COPY_SELF');
