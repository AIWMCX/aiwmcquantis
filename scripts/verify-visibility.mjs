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

const fail = [];
const note = (cond, msg) => { if (!cond) fail.push(msg); };

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

// --- 1 & 4: every route emitted, with correct unique title -------------------
const homeHtml = readRoute("/");
note(homeHtml, "MISSING: dist/index.html (homepage did not render)");
const homeHash = homeHtml ? bodyHash(homeHtml) : null;

for (const r of PUBLIC_ROUTES) {
  const html = readRoute(r.path);
  note(html, `MISSING: no index.html emitted for ${r.path}`);
  if (!html) continue;

  if (r.title) {
    note(titleOf(html).includes(r.title),
      `TITLE: ${r.path} — <title> should contain "${r.title}", got "${titleOf(html).slice(0, 80)}"`);
  }
  for (const s of (r.must || [])) {
    note(html.includes(s), `CONTENT: ${r.path} — missing required string "${s}"`);
  }
}

// --- 2: NO inner page may equal the homepage body (THE bug) ------------------
for (const r of NON_HOME) {
  const html = readRoute(r.path);
  if (!html || !homeHash) continue;
  note(bodyHash(html) !== homeHash,
    `SHELL BUG: ${r.path} body is IDENTICAL to the homepage — it rendered the shell, not its own content.`);
}

// --- 5: sitemap completeness -------------------------------------------------
const sitemapPath = path.join(DIST, "sitemap.xml");
if (!fs.existsSync(sitemapPath)) {
  fail.push("MISSING: dist/sitemap.xml");
} else {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  for (const r of PUBLIC_ROUTES) {
    const url = `${ORIGIN}${r.path === "/" ? "/" : r.path}`;
    note(sitemap.includes(url), `SITEMAP: missing ${url}`);
  }
}

// --- verdict -----------------------------------------------------------------
if (fail.length) {
  console.error(`\n✗ VISIBILITY GATE FAILED — ${fail.length} issue(s). Deploy blocked.\n`);
  fail.forEach((f) => console.error("  • " + f));
  console.error("\nNothing ships until every public page renders its own content.\n");
  process.exit(1);
}
console.log(`\n✓ VISIBILITY GATE PASSED — ${PUBLIC_ROUTES.length} public routes render unique, crawlable content. Pro $49 present. Sitemap complete.\n`);
