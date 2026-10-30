/**
 * Sitemap generator — runs via predev / prebuild.
 * Source of truth:
 *   - Static routes: hardcoded list below (mirrors src/App.tsx public routes)
 *   - Examples: src/pages/examples/exampleData.ts (EXAMPLE_LIST)
 *   - Blog posts: src/pages/Blog.tsx (BLOG_ARTICLES)
 *
 * Also rewrites public/prerender-urls.txt so the prerender pipeline
 * never drifts from the sitemap.
 */
import { writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';

// Extract slugs via regex to avoid importing TSX files that pull in image assets.
function extractSlugs(filePath: string, sliceStart = 0, sliceEnd?: number): string[] {
  const src = readFileSync(resolve(filePath), 'utf8');
  const all = Array.from(src.matchAll(/slug:\s*['"]([a-z0-9-]+)['"]/g)).map((m) => m[1]);
  return Array.from(new Set(all)).slice(sliceStart, sliceEnd);
}

// exampleData.ts + exampleDataExpanded.ts: slugs are object keys.
function extractObjectKeySlugs(filePath: string): string[] {
  const src = readFileSync(resolve(filePath), 'utf8');
  return Array.from(src.matchAll(/^\s*['"]([a-z0-9][a-z0-9-]+)['"]\s*:\s*\{/gm)).map((m) => m[1]);
}
const EXAMPLE_SLUGS = Array.from(
  new Set([
    ...extractObjectKeySlugs('src/pages/examples/exampleData.ts'),
    ...extractObjectKeySlugs('src/pages/examples/exampleDataExpanded.ts'),
  ])
);
// Blog.tsx: first 11 `slug:` entries belong to BLOG_ARTICLES (rest are example refs in JSX).
const BLOG_SLUGS = (() => {
  const src = readFileSync(resolve('src/pages/Blog.tsx'), 'utf8');
  const articlesBlock = src.split('BLOG_ARTICLES')[1]?.split('];')[0] ?? '';
  return Array.from(articlesBlock.matchAll(/slug:\s*['"]([a-z0-9-]+)['"]/g)).map((m) => m[1]);
})();

const BASE_URL = 'https://www.aiwmcquantis.com';
const today = new Date().toISOString().slice(0, 10);

type Entry = { path: string; changefreq: string; priority: string };

const staticEntries: Entry[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/app', changefreq: 'weekly', priority: '0.95' },
  { path: '/pricing', changefreq: 'weekly', priority: '0.9' },
  { path: '/how-it-works', changefreq: 'monthly', priority: '0.9' },
  { path: '/methodology', changefreq: 'monthly', priority: '0.8' },
  { path: '/use-cases', changefreq: 'monthly', priority: '0.8' },
  { path: '/consultants', changefreq: 'monthly', priority: '0.9' },
  { path: '/examples', changefreq: 'weekly', priority: '0.9' },
  { path: '/blog', changefreq: 'weekly', priority: '0.9' },
  { path: '/leaderboard', changefreq: 'hourly', priority: '0.7' },
  { path: '/risk-gallery', changefreq: 'weekly', priority: '0.8' },
  { path: '/research', changefreq: 'monthly', priority: '0.7' },
  { path: '/status', changefreq: 'daily', priority: '0.4' },
  { path: '/state-of-quantis', changefreq: 'weekly', priority: '0.5' },
  { path: '/security', changefreq: 'monthly', priority: '0.5' },
  { path: '/refund-policy', changefreq: 'yearly', priority: '0.3' },
  { path: '/decision-review', changefreq: 'weekly', priority: '0.9' },
  { path: '/consultant-pilot', changefreq: 'weekly', priority: '0.9' },
  { path: '/demo/founder-decision-review', changefreq: 'monthly', priority: '0.7' },
  { path: '/demo/hiring-decision', changefreq: 'monthly', priority: '0.7' },
  { path: '/demo/price-change', changefreq: 'monthly', priority: '0.7' },
  { path: '/demo/sample-decision-memo', changefreq: 'monthly', priority: '0.6' },
  { path: '/demo/consultant-founding-pilot', changefreq: 'monthly', priority: '0.7' },
  { path: '/connect', changefreq: 'monthly', priority: '0.6' },
  { path: '/invite', changefreq: 'monthly', priority: '0.1' },
  { path: '/changelog', changefreq: 'weekly', priority: '0.6' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/vs/liveplan', changefreq: 'monthly', priority: '0.7' },
  { path: '/vs/upmetrics', changefreq: 'monthly', priority: '0.7' },
  { path: '/vs/bizplanr', changefreq: 'monthly', priority: '0.7' },
  { path: '/vs/foundra', changefreq: 'monthly', priority: '0.7' },
  { path: '/vs/aicofounder', changefreq: 'monthly', priority: '0.7' },
  { path: '/vs/chatgpt', changefreq: 'monthly', priority: '0.7' },
];

const blogEntries: Entry[] = BLOG_SLUGS.map((slug) => ({
  path: `/blog/${slug}`,
  changefreq: 'monthly',
  priority: '0.7',
}));

const exampleEntries: Entry[] = EXAMPLE_SLUGS.map((slug) => ({
  path: `/examples/${slug}`,
  changefreq: 'monthly',
  priority: '0.7',
}));

// Deduplicate by path
const seen = new Set<string>();
const entries = [...staticEntries, ...blogEntries, ...exampleEntries].filter((e) => {
  if (seen.has(e.path)) return false;
  seen.add(e.path);
  return true;
});

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...entries.map(
    (e) =>
      `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`
  ),
  '</urlset>',
  '',
].join('\n');

writeFileSync(resolve('public/sitemap.xml'), xml);
writeFileSync(resolve('public/prerender-urls.txt'), entries.map((e) => e.path).join('\n') + '\n');

console.log(`sitemap.xml written (${entries.length} entries)`);
console.log(`prerender-urls.txt written (${entries.length} routes)`);
