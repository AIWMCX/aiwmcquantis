/**
 * Per-route SEO prerender (build-time, zero runtime cost).
 *
 * THE PROBLEM THIS SOLVES
 * -----------------------
 * The app is a Vite SPA: Vercel serves the SAME `dist/index.html` for every
 * route (catchall rewrite). `RouteSEO.tsx` sets per-route <title>/<meta> at
 * RUNTIME via react-helmet — but Googlebot indexes the STATIC HTML, where
 * every one of the ~79 routes carried the identical homepage title and
 * description. Result: effectively one indexable page.
 *
 * WHAT THIS DOES
 * --------------
 * After `vite build`, for every public route we write
 * `dist/<route>/index.html` — a byte-for-byte copy of the SPA shell with only
 * the <head> SEO tags rewritten (title, description, canonical, og:*,
 * twitter:*, robots). Vercel's `cleanUrls:false` + filesystem routing serves
 * `dist/pricing/index.html` for `/pricing` automatically, so the crawler now
 * gets a unique, correct head per URL. The SPA still boots and hydrates
 * exactly as before — this only changes what a crawler sees before JS runs.
 *
 * SOURCE OF TRUTH
 * ---------------
 * Titles/descriptions are parsed straight out of `src/components/seo/RouteSEO.tsx`
 * (the same ROUTE_META the runtime uses) so the two can never drift. Routes in
 * `public/prerender-urls.txt` that aren't in ROUTE_META get a unique
 * slug-derived title (still far better for SEO than the duplicate default).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';

const DIST = resolve('dist');
const BASE_URL = 'https://www.aiwmcquantis.com';
const TEMPLATE_PATH = join(DIST, 'index.html');

const DEFAULT_TITLE = 'AIWMC Quantis — AI Business Idea Validator';
const DEFAULT_DESC =
  'Stress-test your business idea in 90 seconds. AI-powered financial pre-mortem with 95,500 real benchmarks. Free to start.';

interface RouteMeta {
  title: string;
  description: string;
  noIndex?: boolean;
}

/** Parse ROUTE_META out of RouteSEO.tsx without importing the TSX (pulls assets). */
function parseRouteMeta(): Record<string, RouteMeta> {
  const src = readFileSync(resolve('src/components/seo/RouteSEO.tsx'), 'utf8');
  const block = src.split('ROUTE_META')[1]?.split('};')[0] ?? '';
  const meta: Record<string, RouteMeta> = {};

  // Match: '/path': { title: '...', description: '...', noIndex: true },
  // The path char class now includes `/` so multi-segment paths
  // (`/vs/liveplan`, `/blog/post-slug`) are captured — the original
  // `[a-z0-9-]*` only matched a single segment and silently dropped every
  // `/vs/*` entry, causing prerender-seo to fall through to slugTitle().
  const entryRe =
    /'(\/[a-z0-9\-/]*)':\s*\{\s*title:\s*(['"])((?:\\.|(?!\2).)*)\2,\s*description:\s*(['"])((?:\\.|(?!\4).)*)\4(?:,\s*noIndex:\s*(true))?/g;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(block)) !== null) {
    meta[m[1]] = {
      title: m[3].replace(/\\'/g, "'").replace(/\\"/g, '"'),
      description: m[5].replace(/\\'/g, "'").replace(/\\"/g, '"'),
      noIndex: m[6] === 'true',
    };
  }
  return meta;
}

/** Title-case a slug into a readable, unique heading for unregistered routes. */
function slugTitle(path: string): string {
  const slug = path.split('/').filter(Boolean).pop() ?? '';
  const words = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return `${words} — AIWMC Quantis`;
}

/** Per-route fallback description so unregistered routes don't share the homepage meta. */
function slugDescription(path: string): string {
  const segments = path.split('/').filter(Boolean);
  const slug = segments[segments.length - 1] ?? '';
  const human = slug.replace(/-/g, ' ');
  const section = segments[0] ?? '';
  if (section === 'blog') {
    return `${human.charAt(0).toUpperCase() + human.slice(1)} — a Quantis guide for founders. Real benchmarks, brutal honesty, zero filler. Read free at AIWMC Quantis.`;
  }
  if (section === 'examples') {
    return `Worked example: ${human}. See the unit economics, break-even, and verdict Quantis produced from 95,500 real benchmarks. Free to inspect.`;
  }
  return `${human.charAt(0).toUpperCase() + human.slice(1)} on AIWMC Quantis — AI-powered financial pre-mortem for founders, backed by 95,500 real benchmarks.`;
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Rewrite the head of the SPA shell for one route. */
function stampHtml(template: string, path: string, meta: RouteMeta): string {
  const url = `${BASE_URL}${path === '/' ? '/' : path}`;
  const title = htmlEscape(meta.title);
  const desc = htmlEscape(meta.description);

  let html = template;

  // <title> (also covers og:title/twitter:title which share the default string)
  html = html.split(DEFAULT_TITLE).join(title);
  // description (covers name=description, og:description, twitter:description)
  html = html.split(DEFAULT_DESC).join(desc);

  // robots — noindex transactional/auth routes
  if (meta.noIndex) {
    html = html.replace(
      /<meta name="robots" content="[^"]*"\s*\/>/,
      '<meta name="robots" content="noindex, nofollow" />'
    );
  }

  // Per-route og:image URL: same underlying self-hosted asset, unique URL
  // per route (query-string carries the route slug). Crawlers key on the
  // image URL when deciding whether two social cards are the same page, so
  // this closes F13 (all routes sharing an identical og:image URL) while we
  // keep visual generation as a future task. Also swaps in the self-hosted
  // /og-image.png fallback everywhere the off-domain googleapis URL used to
  // leak through, if it re-appears in the template later.
  const ogSlug = path === '/' ? 'home' : path.slice(1).replace(/\//g, '-');
  const ogImageUrl = `${BASE_URL}/og-image.png?r=${encodeURIComponent(ogSlug)}`;
  html = html.replace(
    /(<meta\s+property="og:image"\s+content=")[^"]+(")/g,
    () => `$1${ogImageUrl}$2`,
  );
  html = html.replace(
    /(<meta\s+name="twitter:image"\s+content=")[^"]+(")/g,
    () => `$1${ogImageUrl}$2`,
  );

  // Inject canonical + og:url + a per-route WebPage JSON-LD block immediately
  // after the (now per-route) <title>. The JSON-LD gives crawlers an explicit,
  // unique structured-data entity per URL — strengthens rich-result eligibility
  // beyond the <meta> tags alone. Indexable routes only.
  const jsonLd = meta.noIndex
    ? ''
    : `\n    <script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: meta.title,
        description: meta.description,
        url,
        image: ogImageUrl,
        isPartOf: { '@type': 'WebSite', name: 'AIWMC Quantis', url: BASE_URL },
        publisher: { '@type': 'Organization', name: 'AIWMC LLC', url: BASE_URL },
      })}</script>`;
  const headInject = `\n    <link rel="canonical" href="${url}" />\n    <meta property="og:url" content="${url}" />${jsonLd}`;
  // Function replacement: titles/descriptions contain '$' (e.g. "$17/mo"), and a
  // string replacement would interpret '$1' as a backreference and corrupt them.
  html = html.replace('</title>', () => `</title>${headInject}`);

  return html;
}

function main(): void {
  if (!existsSync(TEMPLATE_PATH)) {
    console.error(`prerender-seo: ${TEMPLATE_PATH} not found — run after vite build.`);
    process.exit(1);
  }
  const template = readFileSync(TEMPLATE_PATH, 'utf8');

  // Guard: the anchors we rely on must exist, else fail loud (don't ship silently-wrong heads).
  if (!template.includes(DEFAULT_TITLE) || !template.includes(DEFAULT_DESC)) {
    console.error(
      'prerender-seo: default title/description anchor missing in dist/index.html — aborting.'
    );
    process.exit(1);
  }

  const routeMeta = parseRouteMeta();
  const urls = readFileSync(resolve('public/prerender-urls.txt'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && l.startsWith('/') && l !== '/');

  // Homepage: stamp dist/index.html in place so it gets the same canonical +
  // og:url + WebPage JSON-LD as every other public route. The prior filter
  // dropped '/' entirely, so the live homepage had no <link rel="canonical">.
  // We use the pre-read `template` (line 147) so the read-then-overwrite is
  // safe even though template and output share a path.
  const homeMeta: RouteMeta = routeMeta['/'] ?? {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
  };
  writeFileSync(TEMPLATE_PATH, stampHtml(template, '/', homeMeta), 'utf8');

  let written = 1; // homepage counted
  for (const path of urls) {
    const meta: RouteMeta = routeMeta[path] ?? {
      title: slugTitle(path),
      description: slugDescription(path),
    };
    const outDir = join(DIST, ...path.split('/').filter(Boolean));
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), stampHtml(template, path, meta), 'utf8');
    written++;
  }

  console.log(
    `prerender-seo: stamped ${written} routes (${Object.keys(routeMeta).length} from ROUTE_META registry).`
  );
}

main();
