// =============================================================================
// scripts/smoke-live.mjs — Runs AFTER deploy against the LIVE domain.
//
// Fetches a sample of live URLs and asserts each returns its OWN content
// (not the homepage) + Pro $49 is live.
//
// Run:  node scripts/smoke-live.mjs            (defaults to ORIGIN)
//       node scripts/smoke-live.mjs https://preview-url   (for preview deploys)
// =============================================================================

import { ORIGIN } from "./seo.routes.mjs";

const base = process.argv[2] || ORIGIN;

const SAMPLE = [
  "/pricing",
  "/examples/coffee-shop-denver",
  "/examples/dental-clinic-dubai",
  "/blog/unit-economics-explained-for-founders",
  "/methodology",
];

const norm = (html) => (html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || "")
  .replace(/[a-f0-9]{8,}\.(js|css)/gi, "").replace(/\s+/g, " ").trim();

const fail = [];

const home = norm(await (await fetch(base + "/")).text());

for (const p of SAMPLE) {
  try {
    const res = await fetch(base + p);
    if (!res.ok) { fail.push(`${p} → HTTP ${res.status}`); continue; }
    const body = norm(await res.text());
    if (body === home) fail.push(`${p} → LIVE serves homepage shell (not its own content)`);
    if (body.length < 500) fail.push(`${p} → suspiciously empty body (${body.length} chars)`);
  } catch (e) {
    fail.push(`${p} → ${e.message}`);
  }
}

const pricing = await (await fetch(base + "/pricing")).text();
if (!pricing.includes("$49") || !/\bPro\b/.test(pricing)) {
  fail.push("/pricing → Pro $49 tier NOT present in live HTML");
}

if (fail.length) {
  console.error(`\n✗ LIVE SMOKE FAILED against ${base} — ${fail.length} issue(s):\n`);
  fail.forEach((f) => console.error("  • " + f));
  process.exit(1);
}
console.log(`\n✓ LIVE SMOKE PASSED against ${base} — inner pages serve their own content; Pro $49 is live.\n`);
