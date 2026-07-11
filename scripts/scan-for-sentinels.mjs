#!/usr/bin/env node
// Guards src/financial/** against reintroducing the raw 999/Infinity/NaN
// sentinel literals that Handbook Wave 0 removed from customer-facing
// payback output. Scoped to src/financial by default rather than the whole
// repo: an earlier repo-wide run of this pattern false-positived on
// legitimate `>= 999 ? 'N/A' : ...` display guards, an unrelated `Infinity`
// entry in a color-scale array, and a `$999,999` test fixture. A line can
// opt out with a trailing `// sentinel-scan-ignore` comment (used on the
// one legitimate definition of the forbidden values in result.ts).
import { promises as fs } from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? "src/financial");
const ignored = new Set(["node_modules", ".git", "dist", "coverage", ".next"]);
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".json"]);
const forbidden = [
  { code: "MAGIC_999", pattern: /\b999\s*(?:months?|mo)?\b/gi },
  { code: "INFINITY_TEXT", pattern: /\bInfinity\b/g },
  { code: "NAN_TEXT", pattern: /\bNaN\b/g },
];
const findings = [];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(target);
      continue;
    }
    if (!allowedExtensions.has(path.extname(entry.name))) continue;
    const text = await fs.readFile(target, "utf8");
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].includes("sentinel-scan-ignore")) continue;
      for (const rule of forbidden) {
        rule.pattern.lastIndex = 0;
        if (rule.pattern.test(lines[i])) {
          findings.push({ file: path.relative(root, target), line: i + 1, code: rule.code, text: lines[i].trim() });
        }
      }
    }
  }
}

// Files whose entire purpose is to define or document the forbidden
// literals (not to leak them into customer-facing output) are exempt.
// JSON can't carry the `sentinel-scan-ignore` line-comment convention, so
// formula-registry.v1.json is exempted by name, same as this script itself.
const DEFINITION_FILES = new Set(["scan-for-sentinels.mjs", "formula-registry.v1.json"]);

await walk(root);
const actionable = findings.filter((finding) => !DEFINITION_FILES.has(path.basename(finding.file)));
if (actionable.length > 0) {
  console.error(JSON.stringify({ status: "FAIL", findings: actionable }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: "PASS", findings: [] }, null, 2));
