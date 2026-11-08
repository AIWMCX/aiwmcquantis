#!/usr/bin/env node
// =============================================================================
// scripts/indexnow-ping.mjs — tell IndexNow (Bing, Yandex, Seznam, Naver...)
// that the sitemap URLs changed, right after a production deploy.
//
// The key is public by design: IndexNow proves ownership by fetching
// https://www.aiwmcquantis.com/<key>.txt and comparing its body to the key.
// The key file lives in public/ (one file named <32 hex>.txt whose content is
// its own name).
//
// Runs as a non-blocking step in .github/workflows/production-deploy.yml after
// the post-deploy smoke test. It never fails a deploy: the workflow step is
// continue-on-error, and this script exits 0 when there is nothing safe to do.
//
//   node scripts/indexnow-ping.mjs            # POST every live sitemap URL
//   node scripts/indexnow-ping.mjs --dry-run  # print what it would send
// =============================================================================

import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST = "www.aiwmcquantis.com";
const ORIGIN = `https://${HOST}`;
const ENDPOINT = "https://api.indexnow.org/indexnow";
const DRY_RUN = process.argv.includes("--dry-run");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");

function findKey() {
  const keys = readdirSync(PUBLIC)
    .filter((f) => /^[a-f0-9]{32}\.txt$/.test(f))
    .map((f) => ({ file: f, key: f.slice(0, -4), body: readFileSync(path.join(PUBLIC, f), "utf8").trim() }))
    .filter((k) => k.body === k.key);
  if (keys.length !== 1) throw new Error(`expected exactly one IndexNow key file in public/, found ${keys.length}`);
  return keys[0].key;
}

async function sitemapUrls() {
  // The live sitemap is what was just deployed; fall back to the committed copy.
  let xml = "";
  try {
    const res = await fetch(`${ORIGIN}/sitemap.xml`, { headers: { "User-Agent": "aiwmc-indexnow-ping" } });
    if (res.ok) xml = await res.text();
  } catch { /* fall through */ }
  if (!xml && existsSync(path.join(PUBLIC, "sitemap.xml"))) xml = readFileSync(path.join(PUBLIC, "sitemap.xml"), "utf8");
  const urls = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  // IndexNow rejects URLs for any host other than the one in the payload.
  return [...new Set(urls.filter((u) => new URL(u).host === HOST))];
}

async function main() {
  const key = findKey();
  const keyLocation = `${ORIGIN}/${key}.txt`;
  const urlList = await sitemapUrls();
  if (urlList.length === 0) {
    console.warn("indexnow: no sitemap URLs found; nothing sent.");
    return;
  }
  if (urlList.length > 10_000) throw new Error(`indexnow: ${urlList.length} URLs exceeds the 10,000 per-request limit`);

  if (DRY_RUN) {
    console.log(`indexnow (dry run): would POST ${urlList.length} URLs for ${HOST}, keyLocation ${keyLocation}`);
    return;
  }

  // IndexNow fetches keyLocation to verify ownership; skip if it is not live yet.
  const keyRes = await fetch(keyLocation).catch(() => null);
  const keyBody = keyRes && keyRes.ok ? (await keyRes.text()).trim() : "";
  if (keyBody !== key) {
    console.warn(`indexnow: ${keyLocation} is not serving the key yet (HTTP ${keyRes ? keyRes.status : "error"}); nothing sent.`);
    return;
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key, keyLocation, urlList }),
  });
  const text = await res.text().catch(() => "");
  console.log(`indexnow: POST ${urlList.length} URLs → HTTP ${res.status}${text ? ` ${text.slice(0, 200)}` : ""}`);
  // 200 = accepted, 202 = accepted, key validation pending.
  if (res.status !== 200 && res.status !== 202) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`indexnow: ${err.message}`);
  process.exitCode = 1;
});
