#!/usr/bin/env tsx
/**
 * Genesis Protocol P1 guard — verify per-call AI cost logging.
 *
 * Rule: any edge function that imports from `_shared/llm-call.ts` (i.e.
 * makes a paid AI call) MUST also import from `_shared/ai-logger.ts` so
 * the call is persisted to `ai_calls` for cost accounting.
 *
 * Exits non-zero on any violation. Wired into CI.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FN_DIR = 'supabase/functions';

function listFunctions(): string[] {
  return readdirSync(FN_DIR).filter((name) => {
    if (name.startsWith('.') || name.startsWith('_')) return false;
    const p = join(FN_DIR, name);
    try {
      return statSync(p).isDirectory();
    } catch {
      return false;
    }
  });
}

function readIndex(fn: string): string | null {
  const p = join(FN_DIR, fn, 'index.ts');
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function readAll(fn: string): string {
  const dir = join(FN_DIR, fn);
  let combined = '';
  try {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isFile() && (f.endsWith('.ts') || f.endsWith('.js'))) {
        combined += '\n' + readFileSync(p, 'utf8');
      }
    }
  } catch {
    /* ignore */
  }
  return combined;
}

const violations: string[] = [];

for (const fn of listFunctions()) {
  const idx = readIndex(fn);
  if (!idx) continue;
  const all = readAll(fn);

  const usesLlmCall = /from\s+['"][^'"]*_shared\/llm-call['"]/.test(all);
  const usesAiLogger = /from\s+['"][^'"]*_shared\/ai-logger['"]/.test(all);

  // Functions that wrap _shared/hybrid-validator.ts also call LLMs through it.
  const usesHybridValidator = /from\s+['"][^'"]*_shared\/hybrid-validator['"]/.test(all);

  if ((usesLlmCall || usesHybridValidator) && !usesAiLogger) {
    violations.push(
      `  • ${fn}: imports llm-call/hybrid-validator but does not import ai-logger`
    );
  }
}

if (violations.length > 0) {
  console.error('❌ verify-ai-cost-logging: edge functions making paid AI calls without cost logging:');
  console.error(violations.join('\n'));
  console.error('\nFix: import { logAiCall } from "../_shared/ai-logger.ts" and call it after every llm-call.');
  process.exit(1);
}

console.log('✅ verify-ai-cost-logging: every paid AI call is piped through ai-logger.');
