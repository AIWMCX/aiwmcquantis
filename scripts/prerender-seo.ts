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
// Values ROUTE_META entries are allowed to interpolate via `${...}` in a
// template literal. Both source files are plain config with zero React/asset
// imports (verified before adding this), so importing them directly here is
// safe and doesn't pull JSX/assets into this Node build script the way
// importing RouteSEO.tsx itself would.
import { TIERS } from '../src/config/tiers';
import { BENCHMARK_COUNT_DISPLAY, LEGAL_ENTITY_NAME } from '../src/config/canonical-facts';

const DIST = resolve('dist');
const BASE_URL = 'https://www.aiwmcquantis.com';
const TEMPLATE_PATH = join(DIST, 'index.html');

// MUST exactly match <title>/og:title/twitter:title in index.html — this
// literal string is the substitution anchor stampHtml() searches for and
// replaces per-route (see split(DEFAULT_TITLE).join(title) below). Changing
// index.html's title without updating this constant breaks per-route title
// injection silently: every route falls back to the raw base title verbatim,
// producing a mass duplicate-title regression across all ~62 non-ROUTE_META
// routes (caught by scripts/verify-unique-meta.ts, 2026-06-30).
const DEFAULT_TITLE = 'AIWMC Quantis — AI Business Idea Validator';
const DEFAULT_DESC =
  'Stress-test your business idea. AI-powered financial pre-mortem with 97,500 benchmark data points. Free to start.';

interface RouteMeta {
  title: string;
  description: string;
  noIndex?: boolean;
}

const INTERPOLATION_SCOPE: Record<string, unknown> = { BENCHMARK_COUNT_DISPLAY, LEGAL_ENTITY_NAME, TIERS };

/**
 * Resolves `${a.b.c}`-style placeholders against INTERPOLATION_SCOPE by plain
 * dotted-path lookup only -- never eval() or Function(), so it can't execute
 * arbitrary source even though it's reading a template literal's contents as
 * text. Fails loud (matches this file's existing guard convention) rather
 * than silently emitting a literal "${...}" into a shipped <title>/<meta> tag.
 */
function resolveInterpolations(raw: string): string {
  return raw.replace(/\$\{([\w.]+)\}/g, (_whole, path: string) => {
    const value = path.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, INTERPOLATION_SCOPE);
    if (value === undefined || (typeof value === 'object' && value !== null)) {
      console.error(
        `prerender-seo: RouteSEO.tsx interpolates \${${path}}, which this script's ` +
        `INTERPOLATION_SCOPE can't resolve to a plain value -- aborting rather than ` +
        `shipping a broken title/description. Add it to INTERPOLATION_SCOPE above.`
      );
      process.exit(1);
    }
    return String(value);
  });
}

/**
 * Parse ROUTE_META out of RouteSEO.tsx without importing the TSX (pulls
 * assets). Matches both quote-delimited ('/") and template-literal (`)
 * values -- ROUTE_META entries use backtick template literals wherever they
 * interpolate a shared constant (BENCHMARK_COUNT_DISPLAY, TIERS.*,
 * LEGAL_ENTITY_NAME) to avoid hardcoding facts that must stay in sync with
 * their real source (tiers-drift.test.ts specifically forbids hardcoded
 * "$17/mo" price literals outside src/config/tiers.ts, RouteSEO.tsx included).
 * Backtick support was added after discovering the original quote-only regex
 * silently failed to match 5 of ~30 entries ('/', '/consultants', '/pricing',
 * '/research', '/privacy', '/terms'), each falling through to a generic
 * slug-derived fallback instead of its real, more specific copy -- confirmed
 * live in production before this fix (e.g. /pricing's title was the generic
 * "Pricing — AIWMC Quantis" instead of stating the actual $17/mo price).
 */
function parseRouteMeta(): Record<string, RouteMeta> {
  const src = readFileSync(resolve('src/components/seo/RouteSEO.tsx'), 'utf8');
  const block = src.split('ROUTE_META')[1]?.split('};')[0] ?? '';
  const meta: Record<string, RouteMeta> = {};

  // Match: '/path': { title: '...'|"..."|`...`, description: same, noIndex: true },
  // The path char class includes `/` so multi-segment paths (`/vs/liveplan`,
  // `/blog/post-slug`) are captured — the original `[a-z0-9-]*` only matched
  // a single segment and silently dropped every `/vs/*` entry.
  const entryRe =
    /'(\/[a-z0-9\-/]*)':\s*\{\s*title:\s*(['"`])((?:\\.|(?!\2).)*)\2,\s*description:\s*(['"`])((?:\\.|(?!\4).)*)\4(?:,\s*noIndex:\s*(true))?/g;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(block)) !== null) {
    meta[m[1]] = {
      title: resolveInterpolations(m[3].replace(/\\'/g, "'").replace(/\\"/g, '"')),
      description: resolveInterpolations(m[5].replace(/\\'/g, "'").replace(/\\"/g, '"')),
      noIndex: m[6] === 'true',
    };
  }
  return meta;
}

/**
 * Load the authored SEO fields for dynamic public routes. These pages already
 * render their own PageSEO at runtime; parsing the same source here keeps the
 * pre-hydration HTML identical instead of replacing it with slug-generated copy.
 */
function parseAuthoredDynamicMeta(): Record<string, RouteMeta> {
  const meta: Record<string, RouteMeta> = {};
  const decode = (value: string) => value.replace(/\\'/g, "'").replace(/\\"/g, '"');

  for (const relativePath of [
    'src/pages/examples/exampleData.ts',
    'src/pages/examples/exampleDataExpanded.ts',
  ]) {
    const src = readFileSync(resolve(relativePath), 'utf8');
    const entryRe =
      /'([\\w-]+)'\\s*:\\s*\\{[\\s\\S]*?seo:\\s*\\{\\s*title:\\s*(['"`])((?:\\\\.|(?!\\2)[\\s\\S])*)\\2,\\s*description:\\s*(['"`])((?:\\\\.|(?!\\4)[\\s\\S])*)\\4/g;
    let match: RegExpExecArray | null;
    while ((match = entryRe.exec(src)) !== null) {
      meta[`/examples/${match[1]}`] = {
        title: decode(match[3]),
        description: decode(match[5]),
      };
    }
  }

  const blogSource = readFileSync(resolve('src/pages/Blog.tsx'), 'utf8');
  const blogEntryRe =
    /\\{\\s*slug:\\s*'([^']+)',\\s*title:\\s*(['"`])((?:\\\\.|(?!\\2)[\\s\\S])*)\\2,\\s*description:\\s*(['"`])((?:\\\\.|(?!\\4)[\\s\\S])*)\\4/g;
  let blogMatch: RegExpExecArray | null;
  while ((blogMatch = blogEntryRe.exec(blogSource)) !== null) {
    const fullTitle = decode(blogMatch[3]);
    meta[`/blog/${blogMatch[1]}`] = {
      // Mirrors BlogArticle.tsx, which shortens long titles before PageSEO.
      title: fullTitle.length > 60 ? fullTitle.slice(0, 57) + '…' : fullTitle,
      description: decode(blogMatch[5]),
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
    return `${human.charAt(0).toUpperCase() + human.slice(1)} — a Quantis guide for founders. Data-informed benchmarks, brutal honesty, zero filler. Read free at AIWMC Quantis.`;
  }
  if (section === 'examples') {
    // Kept short even for the longest real slug (mobile-app-startup-san-
    // francisco, 33 chars) -- technical SEO audit 2026-07-29 found the prior
    // template ran 166-174 chars once combined with multi-word slugs,
    // past Google's practical snippet-truncation length.
    return `Worked example: ${human}. Revenue, costs, and verdict from 97,500 benchmark data points. Free to inspect.`;
  }
  return `${human.charAt(0).toUpperCase() + human.slice(1)} on AIWMC Quantis — AI-powered financial pre-mortem for founders, informed by 97,500 benchmark data points.`;
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
  // BUG FIXED 2026-07-02: function replacers do NOT interpret $1/$2 as
  // backreferences — that substitution only happens for STRING replacement
  // patterns. Passing a function meant `$1${ogImageUrl}$2` was returned and
  // inserted LITERALLY, corrupting every route's <head> with visible
  // "$1https://...og-image.png?r=home$2" text above the rendered page.
  // Fix: consume the captured groups as the function's own arguments
  // instead of referencing $1/$2 syntax.
  html = html.replace(
    /(<meta\s+property="og:image"\s+content=")[^"]+(")/g,
    (_match, open: string, close: string) => `${open}${ogImageUrl}${close}`,
  );
  html = html.replace(
    /(<meta\s+name="twitter:image"\s+content=")[^"]+(")/g,
    (_match, open: string, close: string) => `${open}${ogImageUrl}${close}`,
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

  const routeMeta = { ...parseRouteMeta(), ...parseAuthoredDynamicMeta() };
  const urls = readFileSync(resolve('public/prerender-urls.txt'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && l.startsWith('/') && l !== '/');

  // Every shipped public route must have authored metadata. A slug fallback is
  // useful during local development, but it is not acceptable for production
  // because it can silently diverge from the metadata users see after hydration.
  const routesMissingAuthoredMeta = ['/', ...urls].filter((path) => !routeMeta[path]);
  if (routesMissingAuthoredMeta.length > 0) {
    console.error(
      `prerender-seo: missing authored metadata for: ${routesMissingAuthoredMeta.join(', ')}`,
    );
    process.exit(1);
  }

  const invalidDescriptions = Object.entries(routeMeta).filter(
    ([, value]) => value.description.length > 160,
  );
  if (invalidDescriptions.length > 0) {
    console.error(
      'prerender-seo: descriptions over 160 characters:\n' +
        invalidDescriptions
          .map(([path, value]) => `  ${path} (${value.description.length})`)
          .join('\n'),
    );
    process.exit(1);
  }

  // If scripts/prerender.mjs already ran (Puppeteer full-page capture), each
  // route's dist/<route>/index.html contains the REAL rendered body for that
  // route instead of the bare SPA shell. Re-stamping THAT file (rather than
  // always starting fresh from the base `template`) preserves the real body
  // while still guaranteeing correct title/description/canonical/OG/JSON-LD —
  // stampHtml's DEFAULT_TITLE/DEFAULT_DESC substitution is a no-op wherever
  // the live app already set a correct value, and fixes it wherever it
  // didn't (see F-prerender-body, 2026-07-04: most routes' live descriptions
  // were never actually overridden by RouteSEO/PageSEO at runtime, so without
  // this composition every route's body AND several routes' descriptions
  // were silently duplicating the homepage).
  function readRouteInput(path: string, dir: string): string {
    const candidate = join(dir, 'index.html');
    return existsSync(candidate) ? readFileSync(candidate, 'utf8') : template;
  }

  // Homepage: stamp dist/index.html in place so it gets the same canonical +
  // og:url + WebPage JSON-LD as every other public route. The prior filter
  // dropped '/' entirely, so the live homepage had no <link rel="canonical">.
  const homeMeta: RouteMeta = routeMeta['/'] ?? {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
  };
  const homeInput = readRouteInput('/', DIST);
  writeFileSync(TEMPLATE_PATH, stampHtml(homeInput, '/', homeMeta), 'utf8');

  let written = 1; // homepage counted
  for (const path of urls) {
    const meta: RouteMeta = routeMeta[path];
    const outDir = join(DIST, ...path.split('/').filter(Boolean));
    mkdirSync(outDir, { recursive: true });
    const routeInput = readRouteInput(path, outDir);
    writeFileSync(join(outDir, 'index.html'), stampHtml(routeInput, path, meta), 'utf8');
    written++;
  }

  console.log(
    `prerender-seo: stamped ${written} routes (${Object.keys(routeMeta).length} from ROUTE_META registry).`
  );
}

main();
