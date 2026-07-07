/**
 * Build/CI gate: asserts the canonical Quantis business-logic spec
 * (`docs/QUANTIS_BUSINESS_LOGIC.md`) is present in release artifacts and
 * matches the expected MD5 hash. Also asserts the public-served copy
 * (`public/docs/QUANTIS_BUSINESS_LOGIC.md`) is byte-identical so the
 * deployed app can link directly to the spec without drift.
 *
 * To intentionally bump the spec, update `EXPECTED_MD5` and
 * `EXPECTED_VERSION` in lockstep with the doc + business-logic constants.
 */
import { readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const EXPECTED_MD5 = "678bcb87d247e05ff83cc407780d7104";
const EXPECTED_VERSION = "4.0.0";
const ROOT = resolve(import.meta.dirname ?? ".", "..");
const TARGETS = [
  "docs/QUANTIS_BUSINESS_LOGIC.md",
  "public/docs/QUANTIS_BUSINESS_LOGIC.md",
];

// Hash content, not bytes: a developer's local `core.autocrlf` setting can
// check this file out with CRLF line endings, which would otherwise change
// the MD5 despite zero actual content change. Normalize CRLF->LF first so
// this gate reflects real drift, not a checkout artifact.
function md5(buf: Buffer): string {
  const normalized = buf.toString("utf8").replace(/\r\n/g, "\n");
  return createHash("md5").update(normalized, "utf8").digest("hex");
}

let failed = false;
for (const rel of TARGETS) {
  const abs = resolve(ROOT, rel);
  try {
    statSync(abs);
  } catch {
    console.error(`❌ MISSING required spec file: ${rel}`);
    failed = true;
    continue;
  }
  const buf = readFileSync(abs);
  const hash = md5(buf);
  if (hash !== EXPECTED_MD5) {
    console.error(
      `❌ HASH MISMATCH for ${rel}\n   expected ${EXPECTED_MD5}\n   actual   ${hash}`
    );
    failed = true;
    continue;
  }
  const text = buf.toString("utf8");
  if (!text.includes(`Version:** ${EXPECTED_VERSION}`)) {
    console.error(
      `❌ Spec ${rel} does not declare Version ${EXPECTED_VERSION} on its header.`
    );
    failed = true;
    continue;
  }
  console.log(`✅ ${rel} — ${hash} (v${EXPECTED_VERSION})`);
}

if (failed) {
  console.error(
    "\nQuantis business-logic spec verification failed. Update docs/QUANTIS_BUSINESS_LOGIC.md, copy it to public/docs/, then bump EXPECTED_MD5 in scripts/verify-business-logic-hash.ts."
  );
  process.exit(1);
}
console.log("All Quantis business-logic spec artifacts verified.");
