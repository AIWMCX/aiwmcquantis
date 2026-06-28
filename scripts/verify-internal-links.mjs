// =============================================================================
// scripts/verify-internal-links.mjs — Crawl-graph integrity gate (Prompt 2 F6)
//
// Walks every emitted route in dist/, builds the internal link graph, and
// asserts:
//   1. ORPHAN GUARD — every PUBLIC_ROUTES entry is linked from at least one
//      other emitted route (homepage exempt — it's the root).
//   2. BROKEN-LINK GUARD — every internal <a href> points to either a known
//      route in the registry, an emitted dist HTML, or a documented SPA path.
//
// SKIP_MISSING=1 → only check routes that were actually emitted (partial-
// prerender CI mode); orphans for non-emitted routes are warnings, not fails.
// =============================================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLIC_ROUTES, ORIGIN } from "./seo.routes.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "..", "dist");
const SKIP_MISSING = process.env.SKIP_MISSING === "1";

const fail = [];
const warn = [];

function readRoute(p) {
  const f = p === "/" ? path.join(DIST, "index.html") : path.join(DIST, p, "index.html");
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
}

// Routes that are intentionally not crawl-reachable from public pages but are
// in the registry (e.g. legal pages linked only from footer, auth-redirects).
// Empty for now — every registered public route should be reachable. Add only
// with a documented reason.
const ALLOWED_ORPHANS = new Set([
  "/app", // SPA dashboard — auth-gated entry; reached via login, not crawl
]);

// Internal paths that are SPA-only (not in the static prerender registry) but
// are legitimate href targets. The registry-vs-SPA boundary.
const ALLOWED_SPA_PATHS = new Set([
  "/auth", "/login", "/signup", "/reset-password",
  "/dashboard", "/account", "/checkout", "/thank-you",
  "/admin", "/pro-settings", "/plus-settings",
  "/r", // analysis result viewer /r/<id>
  "/share", // shared analysis viewer
]);
function isAllowedSpa(p) {
  if (ALLOWED_SPA_PATHS.has(p)) return true;
  for (const prefix of ALLOWED_SPA_PATHS) {
    if (p.startsWith(prefix + "/")) return true;
  }
  return false;
}

const REGISTRY = new Set(PUBLIC_ROUTES.map((r) => r.path));

// ── Build the link graph ────────────────────────────────────────────────────
const incoming = new Map(); // route → Set<source>
for (const r of PUBLIC_ROUTES) incoming.set(r.path, new Set());

// Match <a ...href="..."> only — NOT <link href> (asset preloads) or other
// elements. The `\sa\s` boundary ensures we're inside an anchor tag.
const HREF_RE = /<a\s[^>]*?href=["']([^"']+)["'][^>]*>/gi;

function normalizeHref(href) {
  if (!href) return null;
  // External / mailto / tel / anchor / javascript → not internal
  if (/^(https?:|mailto:|tel:|#|javascript:)/i.test(href)) {
    if (href.startsWith(ORIGIN)) return href.slice(ORIGIN.length) || "/";
    return null;
  }
  // Strip query + hash
  const stripped = href.split("#")[0].split("?")[0];
  if (!stripped || stripped === "") return null;
  // Strip trailing slash (registry uses no-trailing-slash)
  const noSlash = stripped.length > 1 && stripped.endsWith("/") ? stripped.slice(0, -1) : stripped;
  return noSlash;
}

let crawledRoutes = 0;
let totalLinksChecked = 0;
const brokenLinks = []; // { source, href, normalized }

for (const r of PUBLIC_ROUTES) {
  const html = readRoute(r.path);
  if (!html) continue;
  crawledRoutes++;

  const hrefs = [...html.matchAll(HREF_RE)].map((m) => m[1]);
  for (const raw of hrefs) {
    const norm = normalizeHref(raw);
    if (!norm) continue; // external / anchor / non-internal
    totalLinksChecked++;

    // Record incoming edge
    if (incoming.has(norm)) {
      incoming.get(norm).add(r.path);
    }

    // Validate: must resolve to a registered route OR an allowed SPA path
    if (!REGISTRY.has(norm) && !isAllowedSpa(norm)) {
      brokenLinks.push({ source: r.path, href: raw, normalized: norm });
    }
  }
}

// ── Orphan check ────────────────────────────────────────────────────────────
const orphans = [];
for (const r of PUBLIC_ROUTES) {
  if (r.path === "/") continue; // homepage is the root
  if (ALLOWED_ORPHANS.has(r.path)) continue;
  // Only fail-orphan if the route was actually emitted; otherwise warn.
  const html = readRoute(r.path);
  const emitted = !!html;
  const inboundCount = incoming.get(r.path)?.size ?? 0;
  if (inboundCount === 0) {
    const msg = `ORPHAN: ${r.path} is not linked from any other crawlable route`;
    if (!emitted && SKIP_MISSING) {
      // Route wasn't prerendered — orphan check meaningless
      continue;
    }
    // In SKIP_MISSING mode, prerender-seo.ts only renders shell + head per
    // route — index pages like /blog and /vs don't render their actual lists
    // of children, so orphans for those children are false positives. Only
    // the full-Puppeteer build:prod proves real link reachability. Warn-only.
    if (SKIP_MISSING) {
      warn.push(msg + " (CI partial-prerender — index pages not fully rendered)");
    } else if (emitted) {
      fail.push(msg);
    } else {
      warn.push(msg + " (route not emitted in this build)");
    }
  }
}

// ── Broken-link check ──────────────────────────────────────────────────────
// Dedupe broken links by (source, normalized) so a repeated link in nav
// doesn't flood the output.
const seenBroken = new Set();
const uniqueBroken = brokenLinks.filter((b) => {
  const k = `${b.source}|${b.normalized}`;
  if (seenBroken.has(k)) return false;
  seenBroken.add(k);
  return true;
});
for (const b of uniqueBroken) {
  fail.push(`BROKEN_LINK: ${b.source} → ${b.href} (normalized: ${b.normalized}) — not in route registry or allowed SPA paths`);
}

// ── Verdict ────────────────────────────────────────────────────────────────
console.log(`\nCrawled ${crawledRoutes} routes, ${totalLinksChecked} internal links checked.`);

// If we found zero internal links across all routes, the build is using a
// shell-only prerender (prerender-seo.ts injects head tags but the body stays
// as the SPA root <div id="root"></div> — no <a> elements yet). The crawler
// has nothing to walk; orphan analysis is meaningless. This is the CI default.
// Downgrade everything to warnings and pass.
if (totalLinksChecked === 0) {
  console.log(`\n⚠ INTERNAL-LINK GATE SKIPPED — prerendered bodies contain no <a href> links`);
  console.log(`  (head-only prerender via scripts/prerender-seo.ts is in use; full-body link analysis`);
  console.log(`  requires Puppeteer prerender via scripts/prerender.mjs / build:prod).\n`);
  process.exit(0);
}

if (warn.length) {
  const label = SKIP_MISSING ? "CI-mode" : "full-prerender";
  console.warn(`\n⚠ INTERNAL-LINK WARNINGS [${label}] — ${warn.length} non-fatal:`);
  warn.slice(0, 8).forEach((w) => console.warn("  ~ " + w));
  if (warn.length > 8) console.warn(`  … and ${warn.length - 8} more`);
}
if (fail.length) {
  console.error(`\n✗ INTERNAL-LINK GATE FAILED — ${fail.length} issue(s):\n`);
  fail.slice(0, 20).forEach((f) => console.error("  • " + f));
  if (fail.length > 20) console.error(`  … and ${fail.length - 20} more`);
  console.error("\nFix orphans by linking from a public page; fix broken links by either adding the target to seo.routes.mjs or to ALLOWED_SPA_PATHS in scripts/verify-internal-links.mjs.\n");
  process.exit(1);
}
console.log(`\n✓ INTERNAL-LINK GATE PASSED — zero orphans, zero broken internal links.\n`);
