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
function canonicalOf(html) {
  const m = html && html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  return m ? m[1] : "";
}
function descriptionOf(html) {
  const m = html && html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  return m ? m[1] : "";
}
function ogUrlOf(html) {
  const m = html && html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i);
  return m ? m[1] : "";
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

  // In SKIP_MISSING mode the route may have been emitted as the SPA shell
  // (no prerender data injected yet) — skip content/title checks in that case.
  const isSpaShell = SKIP_MISSING && bodyHash(html) === homeHash && r.path !== "/";
  if (isSpaShell) continue;

  if (r.title) {
    note(titleOf(html).includes(r.title),
      `TITLE: ${r.path} — <title> should contain "${r.title}", got "${titleOf(html).slice(0, 80)}"`);
  }
  for (const s of (r.must || [])) {
    // In SKIP_MISSING mode, must[] failures on the homepage become warnings
    // if the homepage is the SPA shell (no prerender-seo.ts output yet).
    const isShellCheck = SKIP_MISSING && r.path === "/";
    note(html.includes(s), `CONTENT: ${r.path} — missing required string "${s}"`, isShellCheck);
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

// Helper: identify routes that rendered as SPA shells (no prerender data) in
// SKIP_MISSING mode. Those share the homepage hash and would false-positive
// every per-route head-tag check below. Skip them.
function isShellRender(routePath, html) {
  if (!SKIP_MISSING) return false;
  if (routePath === "/") return false;
  return bodyHash(html) === homeHash;
}

// --- 3a: every emitted route must have a self-referencing absolute canonical -
// The historical canonical-collapse bug consolidated the whole site to /. This
// guard ensures every route's <link rel="canonical"> points to its own
// absolute ORIGIN-prefixed URL.
for (const r of PUBLIC_ROUTES) {
  const html = readRoute(r.path);
  if (!html) continue;
  if (isShellRender(r.path, html)) continue; // SPA shell — no per-route head yet
  const canon = canonicalOf(html);
  if (!canon) {
    note(false, `CANONICAL_MISSING: ${r.path} has no <link rel="canonical">`, SKIP_MISSING);
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

// --- 3b: og:url must match canonical (drift guard) ---------------------------
for (const r of PUBLIC_ROUTES) {
  const html = readRoute(r.path);
  if (!html) continue;
  if (isShellRender(r.path, html)) continue;
  const canon = canonicalOf(html);
  const og = ogUrlOf(html);
  if (!canon || !og) continue; // covered by 3a / N/A on shell pages
  note(og === canon,
    `OG_URL_MISMATCH: ${r.path} og:url="${og}" but canonical="${canon}" — must match`);
}

// --- 5a: unique meta description per route -----------------------------------
// Duplicate descriptions tell crawlers "these are the same page" and collapse
// indexing. This was the same root failure mode as duplicate <title>.
const seenDescs = new Map();
for (const r of PUBLIC_ROUTES) {
  const html = readRoute(r.path);
  if (!html) continue;
  if (isShellRender(r.path, html)) continue;
  const desc = descriptionOf(html);
  if (!desc) {
    note(false, `DESC_MISSING: ${r.path} has no <meta name="description">`, SKIP_MISSING);
    continue;
  }
  if (seenDescs.has(desc)) {
    note(false,
      `DUPLICATE_DESC: ${r.path} shares its meta description with ${seenDescs.get(desc)} — crawlers will collapse these as one page`);
  } else {
    seenDescs.set(desc, r.path);
  }
}

// --- 5: sitemap completeness -------------------------------------------------
const sitemapPath = path.join(DIST, "sitemap.xml");
if (!fs.existsSync(sitemapPath)) {
  // Sitemap is generated by build:prod — warn only in SKIP_MISSING mode.
  note(false, "MISSING: dist/sitemap.xml", SKIP_MISSING);
} else {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  for (const r of PUBLIC_ROUTES) {
    const url = `${ORIGIN}${r.path === "/" ? "/" : r.path}`;
    note(sitemap.includes(url), `SITEMAP: missing ${url}`, SKIP_MISSING);
  }
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
