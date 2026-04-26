#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Codemod: migrate edge-function `console.*` calls to the shared `createLogger`.
 *
 * Strategy (intentionally conservative — we don't want to break working code):
 *
 * 1. For every `supabase/functions/<name>/*.ts` (excluding `_shared`, tests,
 *    and files that already import `createLogger`), inject:
 *      - `import { createLogger } from '<rel>/_shared/logger.ts';`
 *      - `import { getRequestId } from '<rel>/_shared/request-id.ts';` (if missing)
 *
 * 2. Inside the first `serve(async (req) => {` (or `Deno.serve`) handler we find,
 *    insert at the top:
 *      `const reqId = getRequestId(req);`
 *      `const log = createLogger('<function-name>', reqId);`
 *    (skipped if a `log`/`reqId` identifier already exists at top of handler).
 *
 * 3. Replace `console.error(...)` → `log.error(...)`, `console.warn(...)` → `log.warn(...)`,
 *    `console.log(...)` / `console.info(...)` → `log.info(...)`,
 *    `console.debug(...)` → `log.debug(...)`.
 *
 * 4. For helper modules (no `serve` block, e.g. `benchmark-cache.ts`,
 *    `prediction-engine.ts`) we cannot derive a request_id, so we skip the
 *    rewrite — those will be migrated manually if/when their callers pass a
 *    logger in.
 */

const ROOT = new URL('../supabase/functions/', import.meta.url).pathname;

const SKIP_DIRS = new Set(['_shared']);
const SKIP_FILES = new Set<string>([]); // populated below

interface FileResult {
  path: string;
  status: 'rewritten' | 'skipped' | 'no-change';
  reason?: string;
  consoleCallsBefore: number;
  consoleCallsAfter: number;
}

const results: FileResult[] = [];

async function* walkTs(dir: string): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(dir)) {
    const full = `${dir}${entry.name}`;
    if (entry.isDirectory) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walkTs(`${full}/`);
    } else if (
      entry.isFile &&
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('_test.ts')
    ) {
      yield full;
    }
  }
}

function countConsole(src: string): number {
  return (src.match(/\bconsole\.(log|info|debug|warn|error)\s*\(/g) || []).length;
}

function functionNameFromPath(path: string): string {
  // e.g. /.../supabase/functions/analyze-business/index.ts → analyze-business
  const m = path.match(/\/functions\/([^/]+)\//);
  return m ? m[1] : 'unknown';
}

function relImportPath(path: string): string {
  // depth from path inside `supabase/functions/<name>/...`
  const after = path.split('/functions/')[1] || '';
  const depth = after.split('/').length - 1; // number of dirs after `functions/`
  return `${'../'.repeat(depth)}_shared`;
}

function rewrite(path: string, src: string): { src: string; ok: boolean; reason?: string } {
  const fnName = functionNameFromPath(path);
  if (SKIP_FILES.has(path)) {
    return { src, ok: false, reason: 'in skip list' };
  }
  if (src.includes("from '../_shared/logger.ts'") || src.includes('createLogger(')) {
    // Already migrated.
    return { src, ok: false, reason: 'already migrated' };
  }

  // Only migrate the entry-point of each function (index.ts) — helper files
  // don't have access to the request, so they keep raw console for now.
  if (!path.endsWith('/index.ts')) {
    return { src, ok: false, reason: 'helper module (no serve handler)' };
  }

  // Detect a serve(async (req) => or Deno.serve(async (req) => handler.
  // Match: serve(async (req) => { OR serve(async (req: Request): Promise<Response> => {
  const serveMatch = src.match(
    /(serve|Deno\.serve)\s*\(\s*async\s*\(\s*([a-zA-Z_$][\w$]*)\s*(?::[^)]+)?\s*\)(?:\s*:\s*[^=]+?)?\s*=>\s*\{/,
  );
  if (!serveMatch) {
    return { src, ok: false, reason: 'no serve handler found' };
  }
  const reqArg = serveMatch[2];

  let next = src;

  // 1. Inject imports at the top (after last existing import).
  const importBlock = `import { createLogger } from '${relImportPath(path)}/logger.ts';\n` +
    (next.includes("from '../_shared/request-id.ts'") || next.includes('getRequestId')
      ? ''
      : `import { getRequestId } from '${relImportPath(path)}/request-id.ts';\n`);

  // Insert after last `import ... from '...';` line.
  const importRegex = /^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm;
  let lastImportEnd = 0;
  for (const m of next.matchAll(importRegex)) {
    lastImportEnd = m.index! + m[0].length;
  }
  if (lastImportEnd === 0) {
    return { src, ok: false, reason: 'no imports found (atypical)' };
  }
  next = next.slice(0, lastImportEnd) + '\n' + importBlock + next.slice(lastImportEnd);

  // 2. Inject reqId/log at the top of the serve handler. We re-find the handler
  // in `next` to account for the import insertion shifting offsets.
  const newServe = next.match(
    /(serve|Deno\.serve)\s*\(\s*async\s*\(\s*([a-zA-Z_$][\w$]*)\s*(?::[^)]+)?\s*\)\s*=>\s*\{/,
  );
  if (!newServe) {
    return { src, ok: false, reason: 'serve handler vanished after rewrite' };
  }
  const insertAt = newServe.index! + newServe[0].length;
  const handlerHead = next.slice(insertAt, insertAt + 400);
  const alreadyHas = /\b(reqId|requestId|log)\s*=/.test(handlerHead);
  if (!alreadyHas) {
    const inject =
      `\n  const reqId = getRequestId(${reqArg});\n` +
      `  const log = createLogger('${fnName}', reqId);\n`;
    next = next.slice(0, insertAt) + inject + next.slice(insertAt);
  }

  // 3. Replace console.* with log.*.
  next = next
    .replace(/\bconsole\.error\s*\(/g, 'log.error(')
    .replace(/\bconsole\.warn\s*\(/g, 'log.warn(')
    .replace(/\bconsole\.log\s*\(/g, 'log.info(')
    .replace(/\bconsole\.info\s*\(/g, 'log.info(')
    .replace(/\bconsole\.debug\s*\(/g, 'log.debug(');

  return { src: next, ok: true };
}

for await (const path of walkTs(ROOT)) {
  const original = await Deno.readTextFile(path);
  const before = countConsole(original);
  if (before === 0) {
    results.push({ path, status: 'no-change', consoleCallsBefore: 0, consoleCallsAfter: 0 });
    continue;
  }
  const { src: rewritten, ok, reason } = rewrite(path, original);
  if (!ok) {
    results.push({
      path,
      status: 'skipped',
      reason,
      consoleCallsBefore: before,
      consoleCallsAfter: before,
    });
    continue;
  }
  await Deno.writeTextFile(path, rewritten);
  const after = countConsole(rewritten);
  results.push({
    path,
    status: 'rewritten',
    consoleCallsBefore: before,
    consoleCallsAfter: after,
  });
}

console.log('\n=== Edge logger migration report ===');
const rewritten = results.filter((r) => r.status === 'rewritten');
const skipped = results.filter((r) => r.status === 'skipped');
console.log(`Rewritten: ${rewritten.length} files`);
console.log(`Skipped:   ${skipped.length} files (still using console)`);
for (const r of skipped) {
  if (r.consoleCallsBefore > 0) {
    console.log(`  - ${r.path.replace(ROOT, '')}: ${r.consoleCallsBefore} calls (${r.reason})`);
  }
}
console.log(`Console calls eliminated: ${rewritten.reduce(
  (s, r) => s + (r.consoleCallsBefore - r.consoleCallsAfter),
  0,
)}`);
