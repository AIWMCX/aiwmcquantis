// =============================================================================
// scripts/generate-sitemap.mjs — Emits dist/sitemap.xml + dist/robots.txt
// from the single route manifest. Submit sitemap.xml in Google Search Console.
// =============================================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLIC_ROUTES, ORIGIN } from "./seo.routes.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "..", "dist");
const today = new Date().toISOString().split("T")[0];

const priority = (p) =>
  p === "/" ? "1.0" : p.startsWith("/examples/") || p.startsWith("/blog/") ? "0.7" : "0.8";

const urls = PUBLIC_ROUTES.map((r) => {
  const loc = `${ORIGIN}${r.path === "/" ? "/" : r.path}`;
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${priority(r.path)}</priority>\n  </url>`;
}).join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
fs.writeFileSync(path.join(DIST, "sitemap.xml"), sitemap, "utf8");

const robots = `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`;
fs.writeFileSync(path.join(DIST, "robots.txt"), robots, "utf8");

console.log(`✓ sitemap.xml (${PUBLIC_ROUTES.length} urls) + robots.txt written to dist/`);
