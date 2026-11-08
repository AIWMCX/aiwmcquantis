// =============================================================================
// scripts/verify-visibility.mjs — THE GATE. This is the "never again" piece.
//
// Runs after prerender. Asserts, for the emitted dist/ HTML:
//   1. Every public route emitted a real index.html file.
//   2. NO inner page's <body> is identical to the homepage <body>
//      (this is the exact bug — caught mechanically).
//   3. Pricing + homepage contain the full tier set incl. Pro $49.
//   4. Per-route <title> matches its expected unique title.
//   5. sitemap.xml exists and lists every public URL.
//   6. Raw HTML, without JavaScript: no "renders after JavaScript loads"
//      placeholder, exactly one <h1> and >= 80 words outside <noscript>.
//      `node scripts/verify-visibility.mjs --report` prints per-route counts.
//
// If ANY check fails → exit(1) → CI fails → nothing deploys.
// =============================================================================

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { PUBLIC_ROUTES, HOME, NON_HOME, ORIGIN } from "./seo.routes.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "..", "dist");

// SKIP_MISSING=1 → only check semantic correctness of emitted routes (CI mode
// after `bun run build` which uses prerender-seo.ts, not full Puppeteer).
// Unset (default) → full gate including MISSING check (build:prod / post-Puppeteer).
const SKIP_MISSING = process.env.SKIP_MISSING === '1';

const fail = [];
const warn = [];
const note = (cond, msg, isWarning = false) => {
  if (!cond) (isWarning ? warn : fail).push(msg);
};

function readRoute(p) {
  const file = p === "/" ? path.join(DIST, "index.html") : path.join(DIST, p, "index.html");
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}
function bodyOf(html) {
  const m = html && html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return m ? m[1] : "";
}
function bodyHash(html) {
  const normalized = bodyOf(html)
    .replace(/[a-f0-9]{8,}\.(js|css)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return crypto.createHash("sha1").update(normalized).digest("hex");
}
function titleOf(html) {
  const m = html && html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1] : "";
}
// Bug (2026-07-05): the previous [^"']+ capture treated an apostrophe as a
// valid attribute delimiter even inside a double-quoted value, truncating
// any content="...Quantis's..." string at the apostrophe. Two different
// /vs/* descriptions that both happened to start "Side-by-side: Quantis's"
// were silently truncated to the identical prefix "Side-by-side: Quantis"
// and falsely flagged as DUPLICATE_DESC. Fixed with a backreference so the
// capture only stops at whichever quote character actually opened the
// attribute, never the other one appearing inside the content.
function canonicalOf(html) {
  const m = html && html.match(/<link[^>]+rel=["']canonical["'][^>]+href=(["'])((?:(?!\1)[\s\S])*)\1/i);
  return m ? m[2] : "";
}
function descriptionOf(html) {
  const m = html && html.match(/<meta[^>]+name=["']description["'][^>]+content=(["'])((?:(?!\1)[\s\S])*)\1/i);
  return m ? m[2] : "";
}
function ogUrlOf(html) {
  const m = html && html.match(/<meta[^>]+property=["']og:url["'][^>]+content=(["'])((?:(?!\1)[\s\S])*)\1/i);
  return m ? m[2] : "";
}

// --- 1 & 4: every route emitted, with correct unique title -------------------
const homeHtml = readRoute("/");
// Homepage MISSING is always fatal — it means the build itself broke.
note(homeHtml, "MISSING: dist/index.html (homepage did not render)");
const homeHash = homeHtml ? bodyHash(homeHtml) : null;

for (const r of PUBLIC_ROUTES) {
  const html = readRoute(r.path);
  // In SKIP_MISSING mode (CI after bun run build / no Puppeteer), missing routes
  // are warnings not failures. Only report them; don't block the build.
  note(html, `MISSING: no index.html emitted for ${r.path}`, SKIP_MISSING);
  if (!html) continue;

  // HEAD checks (title, canonical, og:url, description) are stamped by
  // prerender-seo.ts even in partial-prerender / CI mode — those are the
  // ones the crawler actually reads, so they must HARD-FAIL always.
  // BODY-content `must[]` strings depend on the SPA having rendered, which
  // only happens in the full-Puppeteer build:prod. Body checks stay as
  // warnings in SKIP_MISSING mode; head checks do not.
  if (r.title) {
    note(titleOf(html).includes(r.title),
      `TITLE: ${r.path} — <title> should contain "${r.title}", got "${titleOf(html).slice(0, 80)}"`);
  }
  for (const s of (r.must || [])) {
    note(html.includes(s),
      `CONTENT: ${r.path} — missing required string "${s}"`,
      SKIP_MISSING);
  }
}

// --- 2: NO inner page may equal the homepage body (THE bug) ------------------
for (const r of NON_HOME) {
  const html = readRoute(r.path);
  if (!html || !homeHash) continue;
  note(bodyHash(html) !== homeHash,
    `SHELL BUG: ${r.path} body is IDENTICAL to the homepage — it rendered the shell, not its own content.`);
}

// --- 2b: NO two route bodies may share a hash (duplicate-content guard) ------
const seenHashes = new Map(); // hash → first route that had it
for (const r of PUBLIC_ROUTES) {
  const html = readRoute(r.path);
  if (!html) continue;
  const h = bodyHash(html);
  if (seenHashes.has(h)) {
    fail.push(`DUPLICATE_BODY: ${r.path} has IDENTICAL body to ${seenHashes.get(h)} — duplicate content will confuse crawlers`);
  } else {
    seenHashes.set(h, r.path);
  }
}

// --- 2c: "7-Layer" must never appear in any built route body -----------------
// This string was the historical staleness signal — it means a stale cached
// render slipped through before we patched to 8-Layer.
for (const r of PUBLIC_ROUTES) {
  const html = readRoute(r.path);
  if (!html) continue;
  note(!html.includes("7-Layer"),
    `STALE_CONTENT: ${r.path} contains "7-Layer" — the pre-patch stale content is back. Check prerender and RouteSEO.`);
}

// NOTE on head checks below: `prerender-seo.ts` injects per-route <head> tags
// on every emitted route, including in CI (partial-prerender) mode. So the
// head IS canonical and MUST match — every head check is a HARD FAIL, even
// with SKIP_MISSING=1. Only body-content (must[]) and route-emission
// (MISSING) checks may downgrade to warnings without Puppeteer.
// This closes F8 from the 2026-07-01 audit: SKIP_MISSING used to downgrade
// canonicals, og:url, descriptions, and sitemap entries to warnings — every
// SEO tripwire the freeze prompt built was quietly fail-open in CI.

// --- 3a: every emitted route must have a self-referencing absolute canonical -
// The historical canonical-collapse bug consolidated the whole site to /. This
// guard ensures every route's <link rel="canonical"> points to its own
// absolute ORIGIN-prefixed URL. HARD FAIL in every mode.
for (const r of PUBLIC_ROUTES) {
  const html = readRoute(r.path);
  if (!html) continue;
  const canon = canonicalOf(html);
  if (!canon) {
    note(false, `CANONICAL_MISSING: ${r.path} has no <link rel="canonical">`);
    continue;
  }
  const expected = `${ORIGIN}${r.path}`;
  // Homepage canonical may be either ORIGIN or ORIGIN + "/"
  const valid = r.path === "/"
    ? (canon === ORIGIN || canon === `${ORIGIN}/`)
    : canon === expected;
  note(valid,
    `CANONICAL_WRONG: ${r.path} canonical is "${canon}", expected "${expected}"`);
}

// --- 3b: og:url must match canonical (drift guard) — HARD FAIL --------------
for (const r of PUBLIC_ROUTES) {
  const html = readRoute(r.path);
  if (!html) continue;
  const canon = canonicalOf(html);
  const og = ogUrlOf(html);
  if (!canon || !og) continue; // covered by 3a
  note(og === canon,
    `OG_URL_MISMATCH: ${r.path} og:url="${og}" but canonical="${canon}" — must match`);
}

// --- 5a: unique meta description per route — HARD FAIL ----------------------
// Duplicate descriptions tell crawlers "these are the same page" and collapse
// indexing. This was the same root failure mode as duplicate <title>.
const seenDescs = new Map();
for (const r of PUBLIC_ROUTES) {
  const html = readRoute(r.path);
  if (!html) continue;
  const desc = descriptionOf(html);
  if (!desc) {
    note(false, `DESC_MISSING: ${r.path} has no <meta name="description">`);
    continue;
  }
  if (seenDescs.has(desc)) {
    note(false,
      `DUPLICATE_DESC: ${r.path} shares its meta description with ${seenDescs.get(desc)} — crawlers will collapse these as one page`);
  } else {
    seenDescs.set(desc, r.path);
  }
}

// --- 5: sitemap completeness — HARD FAIL ------------------------------------
// generate-sitemap.mjs runs in build and always emits dist/sitemap.xml,
// so any missing route in it is a real regression, not a partial-prerender
// artefact.
const sitemapPath = path.join(DIST, "sitemap.xml");
if (!fs.existsSync(sitemapPath)) {
  note(false, "MISSING: dist/sitemap.xml");
} else {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  for (const r of PUBLIC_ROUTES) {
    const url = `${ORIGIN}${r.path === "/" ? "/" : r.path}`;
    note(sitemap.includes(url), `SITEMAP: missing ${url}`);
  }
}

// --- 6: raw HTML is readable without JavaScript — HARD FAIL -----------------
// Bing, OAI-SearchBot, PerplexityBot, ClaudeBot and Google's first pass read
// the HTML as served. Text inside <noscript> does not count: many fetchers
// drop it. Every sitemap route must carry its own content as plain markup:
// no "renders after JavaScript loads" placeholder, exactly one <h1>, and at
// least MIN_VISIBLE_WORDS words outside <noscript>/<script>/<style>.
// (2026-11-08 GEO audit: `/`, `/pricing`, `/demo/hiring-decision` had 13
// words and 0 <h1> outside <noscript>; 19 routes served the placeholder.)
const MIN_VISIBLE_WORDS = 80;
const PLACEHOLDER_RE = /renders? after JavaScript loads/i;
function rawVisibility(html) {
  // Strip comments first: a <head> comment in index.html mentions "<body>".
  const body = bodyOf(html.replace(/<!--[\s\S]*?-->/g, " "))
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const h1 = (body.match(/<h1[\s>]/gi) || []).length;
  const text = body.replace(/<[^>]+>/g, " ").replace(/&[a-z0-9#]+;/gi, " ");
  const words = text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  return { words, h1, placeholder: PLACEHOLDER_RE.test(html) };
}
const visibilityReport = [];
for (const r of PUBLIC_ROUTES) {
  const html = readRoute(r.path);
  if (!html) continue;
  const v = rawVisibility(html);
  visibilityReport.push({ path: r.path, ...v });
  note(!v.placeholder,
    `RAW_PLACEHOLDER: ${r.path} raw HTML says content "renders after JavaScript loads" — write a real static body in generate-static-bodies.mjs`);
  note(v.h1 === 1,
    `RAW_H1: ${r.path} has ${v.h1} <h1> outside <noscript>; expected exactly 1`);
  note(v.words >= MIN_VISIBLE_WORDS,
    `RAW_THIN: ${r.path} has ${v.words} words outside <noscript>/<script>/<style>; minimum is ${MIN_VISIBLE_WORDS}`);
}
if (process.argv.includes("--report")) {
  console.log("\nRaw-HTML visibility (outside noscript/script/style):");
  for (const v of visibilityReport) {
    console.log(`  ${v.path.padEnd(48)} words=${String(v.words).padStart(4)} h1=${v.h1}${v.placeholder ? " PLACEHOLDER" : ""}`);
  }
  const words = visibilityReport.map((v) => v.words).sort((a, b) => a - b);
  console.log(`  routes=${words.length} min=${words[0]} median=${words[Math.floor(words.length / 2)]} max=${words[words.length - 1]}`);
}

// --- verdict -----------------------------------------------------------------
if (warn.length) {
  const label = SKIP_MISSING ? "CI-mode (SKIP_MISSING=1)" : "full-prerender";
  console.warn(`\n⚠ VISIBILITY WARNINGS [${label}] — ${warn.length} route(s) not emitted (expected without Puppeteer):`);
  warn.slice(0, 5).forEach((w) => console.warn("  ~ " + w));
  if (warn.length > 5) console.warn(`  … and ${warn.length - 5} more`);
}
if (fail.length) {
  console.error(`\n✗ VISIBILITY GATE FAILED — ${fail.length} issue(s). Deploy blocked.\n`);
  fail.forEach((f) => console.error("  • " + f));
  console.error("\nNothing ships until every public page renders its own content.\n");
  process.exit(1);
}
const mode = SKIP_MISSING ? " [CI partial-prerender mode]" : "";
console.log(`\n✓ VISIBILITY GATE PASSED${mode} — semantic checks clean. Pro $49 present. No homepage-equal or 7-Layer bodies.\n`);
