/**
 * Post-build SEO prerender.
 *
 * Reads dist/index.html (the SPA shell) and writes one HTML file per
 * route from public/prerender-urls.txt with route-specific
 * <title>, <meta name="description">, <link rel="canonical">,
 * og:title/description/url, twitter:title/description, and robots tags.
 *
 * For /examples/<slug> routes, the static <noscript> block and the
 * pre-hydration LCP placeholder are ALSO replaced with example-specific
 * content so each crawlable HTML is unique (fixes the duplicate-doorway
 * SEO bug — Googlebot, LinkedIn, Slack, etc. now see the real report).
 *
 * React still hydrates on top — the noscript block is invisible to JS
 * users, and the LCP placeholder inside #root is replaced by React on
 * mount.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { getRouteMeta, SITE_URL, type RouteMeta } from './seo-metadata';
import { buildJsonLd } from './seo-jsonld';
import { EXAMPLE_ANALYSES, type ExampleData } from '../src/pages/examples/exampleData';

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

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildExampleNoscript(data: ExampleData, slug: string): string {
  const sev = { high: '#dc2626', medium: '#d97706', low: '#16a34a' } as const;
  return `
    <noscript>
      <div style="max-width:880px;margin:40px auto;padding:0 20px;font-family:system-ui,sans-serif;color:#1a1a1a;line-height:1.6">
        <nav style="font-size:13px;color:#666;margin-bottom:16px">
          <a href="/" style="color:#666">Home</a> / <a href="/examples" style="color:#666">Examples</a> / <span>${esc(data.title)}</span>
        </nav>
        <p style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#0ea5e9;margin:0 0 8px">${esc(data.industry)} · ${esc(data.location)}</p>
        <h1 style="font-size:34px;line-height:1.2;margin:0 0 16px">${esc(data.title)} — AI Financial Analysis</h1>
        <p style="font-size:17px;color:#374151;margin:0 0 28px">${esc(data.description)}</p>

        <h2 style="font-size:22px;margin:32px 0 12px">Financial Summary</h2>
        <table style="border-collapse:collapse;width:100%;margin:0 0 24px">
          <tbody>
            <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:10px 8px;color:#6b7280">Monthly revenue</td><td style="padding:10px 8px;text-align:right;font-weight:600">${esc(data.metrics.monthlyRevenue)}</td></tr>
            <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:10px 8px;color:#6b7280">Monthly profit</td><td style="padding:10px 8px;text-align:right;font-weight:600">${esc(data.metrics.monthlyProfit)}</td></tr>
            <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:10px 8px;color:#6b7280">Payback period</td><td style="padding:10px 8px;text-align:right;font-weight:600">${esc(data.metrics.paybackMonths)}</td></tr>
            <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:10px 8px;color:#6b7280">ROI (year 1)</td><td style="padding:10px 8px;text-align:right;font-weight:600">${esc(data.metrics.roi)}</td></tr>
            <tr><td style="padding:10px 8px;color:#6b7280">Startup investment</td><td style="padding:10px 8px;text-align:right;font-weight:600">${esc(data.metrics.startupCost)}</td></tr>
          </tbody>
        </table>

        <h2 style="font-size:22px;margin:32px 0 12px">Startup Cost Breakdown</h2>
        <ul style="padding-left:20px;margin:0 0 24px">
          ${data.costBreakdown.map(c => `<li><strong>${esc(c.value)}</strong> — ${esc(c.label)}</li>`).join('\n          ')}
        </ul>

        <h2 style="font-size:22px;margin:32px 0 12px">Risk Assessment</h2>
        <ul style="padding-left:20px;margin:0 0 24px">
          ${data.risks.map(r => `<li><span style="color:${sev[r.severity]};font-weight:600;text-transform:uppercase;font-size:11px;margin-right:8px">${r.severity}</span>${esc(r.text)}</li>`).join('\n          ')}
        </ul>

        <h2 style="font-size:22px;margin:32px 0 12px">Recommended Action Plan</h2>
        <ol style="padding-left:22px;margin:0 0 24px">
          ${data.actionPlan.map(s => `<li style="margin-bottom:8px">${esc(s)}</li>`).join('\n          ')}
        </ol>

        <p style="margin-top:32px;padding:16px;background:#f3f4f6;border-radius:8px">
          <strong>Want this for your idea?</strong> <a href="/app" style="color:#0ea5e9">Run a free analysis on AIWMC Quantis →</a>
        </p>
        <p style="font-size:12px;color:#9ca3af;margin-top:24px">Generated by AIWMC™ Quantis. Slug: ${esc(slug)}. Not financial advice.</p>
      </div>
    </noscript>`;
}

function buildExampleLcpPlaceholder(data: ExampleData): string {
  return `<div id="root">
      <div style="max-width:880px;margin:0 auto;padding:24px 20px;font-family:'DM Sans',system-ui,sans-serif;color:#070D1A">
        <p style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#0ea5e9;margin:0 0 6px">${esc(data.industry)} · ${esc(data.location)}</p>
        <h1 style="font-size:28px;line-height:1.25;margin:0 0 10px;color:#070D1A">${esc(data.title)} — AI Financial Analysis</h1>
        <p style="font-size:15px;color:#374151;margin:0">${esc(data.description)}</p>
      </div>
    </div>`;
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

  // Strip any existing canonical / per-route OG/twitter / prerender JSON-LD we might re-emit.
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta\s+property=["']og:(title|description|url|type)["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta\s+name=["']twitter:(title|description)["'][^>]*>\s*/gi, '');
  html = html.replace(
    /<script\s+type=["']application\/ld\+json["']\s+data-prerender=["']1["'][\s\S]*?<\/script>\s*/gi,
    '',
  );

  const jsonLdBlocks = buildJsonLd(route, meta.title, meta.description)
    .map(
      (obj) =>
        `    <script type="application/ld+json" data-prerender="1">${JSON.stringify(obj)}</script>`,
    )
    .join('\n');

  const injected = [
    `    <link rel="canonical" href="${canonical}">`,
    `    <meta property="og:type" content="${ogType}">`,
    `    <meta property="og:title" content="${title}">`,
    `    <meta property="og:description" content="${description}">`,
    `    <meta property="og:url" content="${canonical}">`,
    `    <meta name="twitter:title" content="${title}">`,
    `    <meta name="twitter:description" content="${description}">`,
    jsonLdBlocks,
    '',
  ].join('\n');

  html = html.replace('</head>', `${injected}  </head>`);

  // ====== UNIQUE BODY CONTENT FOR /examples/<slug> ======
  // Without this, every example route ships the same homepage noscript +
  // LCP placeholder — Google sees 50+ duplicate doorways.
  if (route.startsWith('/examples/')) {
    const slug = route.slice('/examples/'.length);
    const data = EXAMPLE_ANALYSES[slug];
    if (data) {
      // Replace the LCP placeholder inside #root with example-specific
      // above-the-fold content. React replaces this on hydrate.
      html = html.replace(
        /<div id="root">[\s\S]*?<\/div>\s*<\/div>/,
        buildExampleLcpPlaceholder(data),
      );
      // Replace the sitewide <noscript>...</noscript> fallback with the
      // example's real report content.
      html = html.replace(
        /<noscript>[\s\S]*?<\/noscript>/,
        buildExampleNoscript(data, slug),
      );
    }
  }

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
  let uniqueExamples = 0;
  for (const route of urls) {
    const meta = getRouteMeta(route);
    if (!meta) {
      skipped++;
      continue;
    }
    const html = applyMeta(shell, route, meta);
    writeRoute(route, html);
    written++;
    if (route.startsWith('/examples/')) {
      const slug = route.slice('/examples/'.length);
      if (EXAMPLE_ANALYSES[slug]) uniqueExamples++;
    }
  }

  console.log(
    `[prerender-seo] wrote ${written} route-specific HTML files ` +
      `(${uniqueExamples} examples with unique body content, ${skipped} routes without metadata skipped).`,
  );
}

main();
