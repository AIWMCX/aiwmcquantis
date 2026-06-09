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
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { EXAMPLE_LIST } from '../src/pages/examples/exampleData';
import { BLOG_ARTICLES } from '../src/pages/Blog';

const BASE_URL = 'https://aiwmcquantis.com';
const today = new Date().toISOString().slice(0, 10);

type Entry = { path: string; changefreq: string; priority: string };

const staticEntries: Entry[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/pricing', changefreq: 'weekly', priority: '0.9' },
  { path: '/how-it-works', changefreq: 'monthly', priority: '0.9' },
  { path: '/methodology', changefreq: 'monthly', priority: '0.8' },
  { path: '/use-cases', changefreq: 'monthly', priority: '0.8' },
  { path: '/examples', changefreq: 'weekly', priority: '0.9' },
  { path: '/blog', changefreq: 'weekly', priority: '0.9' },
  { path: '/leaderboard', changefreq: 'hourly', priority: '0.7' },
  { path: '/risk-gallery', changefreq: 'weekly', priority: '0.8' },
  { path: '/research', changefreq: 'monthly', priority: '0.7' },
  { path: '/cases', changefreq: 'weekly', priority: '0.8' },
  { path: '/status', changefreq: 'daily', priority: '0.4' },
  { path: '/security', changefreq: 'monthly', priority: '0.5' },
  { path: '/refund-policy', changefreq: 'yearly', priority: '0.3' },
  { path: '/changelog', changefreq: 'weekly', priority: '0.6' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
];

const blogEntries: Entry[] = BLOG_ARTICLES.map((a) => ({
  path: `/blog/${a.slug}`,
  changefreq: 'monthly',
  priority: '0.7',
}));

const exampleEntries: Entry[] = EXAMPLE_LIST.map((e) => ({
  path: `/examples/${e.slug}`,
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
