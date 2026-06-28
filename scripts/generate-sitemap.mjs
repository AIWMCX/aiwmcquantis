// =============================================================================
// scripts/generate-sitemap.mjs — Emits dist/sitemap.xml from the single route
// manifest, with real per-route <lastmod> derived from git history.
//
// IMPORTANT: This script does NOT write dist/robots.txt anymore. Vite copies
// public/robots.txt → dist/robots.txt during `vite build`, and that file
// already contains the canonical Allow/Disallow rules. Overwriting it here
// was a latent regression (only fires from build:prod, not bun run build).
// =============================================================================

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PUBLIC_ROUTES, ORIGIN } from "./seo.routes.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DIST = path.resolve(REPO_ROOT, "dist");
const TODAY = new Date().toISOString().split("T")[0];

const priority = (p) =>
  p === "/" ? "1.0" : p.startsWith("/examples/") || p.startsWith("/blog/") ? "0.7" : "0.8";

// ── Map every public route to its source file(s) so we can derive a real
// last-modified date from git. A route may be served by either a Page component
// (e.g. /pricing → src/pages/Pricing.tsx) or a data row (e.g. /examples/[slug]
// → src/pages/examples/exampleData.ts). We try a few likely paths and fall back
// to today's date if nothing matches. This is conservative — wrong-but-recent
// lastmod is the failure mode, not stale data crawlers learn to ignore.
function sourceFilesFor(routePath) {
  if (routePath === "/") return ["src/pages/Landing.tsx", "src/App.tsx"];

  const candidates = [];
  const seg = routePath.slice(1); // strip leading /
  const parts = seg.split("/");

  // /foo → src/pages/Foo.tsx, src/pages/foo.tsx
  if (parts.length === 1) {
    const pascal = parts[0].split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("");
    candidates.push(`src/pages/${pascal}.tsx`);
    candidates.push(`src/pages/${parts[0]}.tsx`);
  }

  // /examples/<slug> → exampleData(Expanded).ts files
  if (parts[0] === "examples" && parts.length === 2) {
    candidates.push("src/pages/examples/exampleData.ts");
    candidates.push("src/pages/examples/exampleDataExpanded.ts");
    candidates.push("src/pages/examples/ExampleAnalysis.tsx");
  }

  // /blog/<slug> → blogPosts data + BlogArticle component
  if (parts[0] === "blog" && parts.length === 2) {
    candidates.push("src/data/blogPosts.ts");
    candidates.push("src/pages/BlogArticle.tsx");
  }

  // /vs/<slug> → vsData
  if (parts[0] === "vs" && parts.length === 2) {
    candidates.push("src/pages/vs/vsData.ts");
    candidates.push("src/pages/vs/VsComparePage.tsx");
  }

  return candidates;
}

function gitLastModified(relPath) {
  try {
    const out = execSync(`git log -1 --format=%cs -- "${relPath}"`, {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "ignore"],
    }).toString().trim();
    return out || null;
  } catch {
    return null;
  }
}

function lastmodFor(routePath) {
  const files = sourceFilesFor(routePath);
  let newest = null;
  for (const f of files) {
    const full = path.join(REPO_ROOT, f);
    if (!fs.existsSync(full)) continue;
    const d = gitLastModified(f);
    if (d && (!newest || d > newest)) newest = d;
  }
  return newest || TODAY;
}

const urls = PUBLIC_ROUTES.map((r) => {
  const loc = `${ORIGIN}${r.path === "/" ? "/" : r.path}`;
  const lastmod = lastmodFor(r.path);
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${priority(r.path)}</priority>\n  </url>`;
}).join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, "sitemap.xml"), sitemap, "utf8");

console.log(`✓ sitemap.xml written: ${PUBLIC_ROUTES.length} urls with real git-derived lastmod (fallback today=${TODAY} for routes with no git history match)`);
