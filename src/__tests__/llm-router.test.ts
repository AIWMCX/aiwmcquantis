/**
 * Phase 1 test — LLM router task matrix parity.
 *
 * Edge code is Deno (uses `Deno.env`), so we parse the source as text and
 * assert the locked routing decisions from the master spec:
 *
 *   - DeepSeek is primary for: analyze-business, analyze-preview, analyze-plus,
 *     analyze-pro-worker, analyze-pro-extension, ai-narrator, rvce-validate,
 *     generate-document*, parse-document, generate-idea
 *   - Anthropic is primary for: ai-consensus, hybrid-validator
 *   - Every task with DeepSeek primary has an explicit fallback
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROUTER_PATH = resolve(__dirname, '../../supabase/functions/_shared/llm-router.ts');
const src = readFileSync(ROUTER_PATH, 'utf8');

function blockFor(task: string): string {
  // grab the literal between `'<task>': {` ... `},`
  const re = new RegExp(`'${task}':\\s*\\{[\\s\\S]*?\\n\\s*\\},`, 'm');
  const m = src.match(re);
  return m?.[0] ?? '';
}

describe('llm-router task matrix', () => {
  const deepseekPrimaryTasks = [
    'analyze-business',
    'analyze-preview',
    'analyze-plus',
    'analyze-pro-worker',
    'analyze-pro-extension',
    'ai-narrator',
    'rvce-validate',
    'generate-document',
    'parse-document',
    'generate-idea',
  ];

  for (const task of deepseekPrimaryTasks) {
    it(`${task} → DeepSeek primary with fallback`, () => {
      const blk = blockFor(task);
      expect(blk, `task ${task} missing`).not.toBe('');
      expect(blk).toMatch(/primary:\s*\{\s*provider:\s*'deepseek'/);
      expect(blk).toMatch(/fallback:\s*\{\s*provider:\s*'(anthropic|lovable_gateway)'/);
    });
  }

  it('ai-consensus stays on Anthropic primary (diversity)', () => {
    const blk = blockFor('ai-consensus');
    expect(blk).toMatch(/primary:\s*\{\s*provider:\s*'anthropic'/);
    expect(blk).toMatch(/fallback:\s*\{\s*provider:\s*'deepseek'/);
  });

  it('hybrid-validator stays on Anthropic Opus primary', () => {
    const blk = blockFor('hybrid-validator');
    expect(blk).toMatch(/primary:\s*\{\s*provider:\s*'anthropic',\s*model:\s*'claude-opus-4-5'/);
  });

  it('exposes circuit breaker primitives', () => {
    expect(src).toMatch(/export function recordSuccess/);
    expect(src).toMatch(/export function recordFailure/);
    expect(src).toMatch(/export function isBreakerOpen/);
  });

  it('honors explicit model prefix routing', () => {
    expect(src).toMatch(/providerFromModel/);
    expect(src).toMatch(/explicit_model:/);
  });

  it('estimateCost knows DeepSeek + Anthropic pricing', () => {
    expect(src).toMatch(/'deepseek-chat':\s*\{\s*in:/);
    expect(src).toMatch(/'deepseek-reasoner':\s*\{\s*in:/);
    expect(src).toMatch(/'claude-haiku-4-5':\s*\{\s*in:/);
    expect(src).toMatch(/'claude-sonnet-4-5':\s*\{\s*in:/);
  });
});
