/**
 * Post-build SEO prerender.
 *
 * Reads dist/index.html (the SPA shell) and writes one HTML file per
 * route from public/prerender-urls.txt with route-specific
 * <title>, <meta name="description">, <link rel="canonical">,
 * og:title/description/url, twitter:title/description, and robots tags.
 *
 * The body is unchanged — React still hydrates on top — but crawlers,
 * link-preview bots, and slow-connection visitors now see a unique,
 * route-correct head for every URL.
 *
 * Vercel serves static files before applying the SPA rewrite, so
 * dist/pricing/index.html wins over the catchall rewrite to /index.html.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { getRouteMeta, SITE_URL, type RouteMeta } from './seo-metadata';

const DIST = resolve('dist');
const SHELL_PATH = resolve(DIST, 'index.html');
const URLS_FILE = resolve('public/prerender-urls.txt');

function loadUrls(): string[] {
  if (!existsSync(URLS_FILE)) return ['/'];
  return readFileSync(URLS_FILE, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//') && !l.startsWith('#'));
}

function escapeAttr(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function applyMeta(shell: string, route: string, meta: RouteMeta): string {
  const canonical = `${SITE_URL}${route === '/' ? '/' : route}`;
  const title = escapeAttr(meta.title);
  const description = escapeAttr(meta.description);
  const ogType = meta.ogType ?? 'website';
  const robots = meta.noindex ? 'noindex, follow' : 'index, follow';

  let html = shell;

  // <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);

  // meta description
  html = html.replace(
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${description}">`
  );

  // robots
  if (/<meta\s+name=["']robots["'][^>]*>/i.test(html)) {
    html = html.replace(/<meta\s+name=["']robots["'][^>]*>/i, `<meta name="robots" content="${robots}">`);
  } else {
    html = html.replace('</head>', `    <meta name="robots" content="${robots}">\n  </head>`);
  }

  // Strip any existing canonical / per-route OG/twitter we might re-emit, then inject ours.
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta\s+property=["']og:(title|description|url|type)["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta\s+name=["']twitter:(title|description)["'][^>]*>\s*/gi, '');

  const injected = [
    `    <link rel="canonical" href="${canonical}">`,
    `    <meta property="og:type" content="${ogType}">`,
    `    <meta property="og:title" content="${title}">`,
    `    <meta property="og:description" content="${description}">`,
    `    <meta property="og:url" content="${canonical}">`,
    `    <meta name="twitter:title" content="${title}">`,
    `    <meta name="twitter:description" content="${description}">`,
    '',
  ].join('\n');

  html = html.replace('</head>', `${injected}  </head>`);
  return html;
}

function writeRoute(route: string, html: string) {
  // / -> dist/index.html ; /pricing -> dist/pricing/index.html
  const outPath =
    route === '/'
      ? resolve(DIST, 'index.html')
      : resolve(DIST, route.replace(/^\//, ''), 'index.html');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html, 'utf8');
}

function main() {
  if (!existsSync(SHELL_PATH)) {
    console.warn(`[prerender-seo] ${SHELL_PATH} not found — skipping.`);
    return;
  }
  const shell = readFileSync(SHELL_PATH, 'utf8');
  const urls = loadUrls();

  let written = 0;
  let skipped = 0;
  for (const route of urls) {
    const meta = getRouteMeta(route);
    if (!meta) {
      skipped++;
      continue;
    }
    const html = applyMeta(shell, route, meta);
    writeRoute(route, html);
    written++;
  }

  console.log(`[prerender-seo] wrote ${written} route-specific HTML files (${skipped} routes without metadata skipped).`);
}

main();
