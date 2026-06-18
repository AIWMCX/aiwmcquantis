/**
 * Genesis Protocol P2 — LLM determinism helper.
 *
 * Returns the canonical `temperature=0 · top_p=1 · seed=<request_id_hash>`
 * parameter triple to pin into any validator / consensus / structured-output
 * LLM call. The triple is what makes the SAME input produce the SAME output
 * across two consecutive runs, which is the P2 acceptance gate.
 *
 * Usage:
 *   import { deterministicLlmParams } from '../_shared/llm-determinism.ts';
 *   const params = deterministicLlmParams(requestId);
 *   const res = await aiCall({ ...body, ...params }, { task, requestId });
 *
 * Hash function is a small, stable FNV-1a 32-bit. Same request_id → same seed.
 */

export interface DeterministicLlmParams {
  temperature: 0;
  top_p: 1;
  seed: number;
}

export function deterministicSeed(requestId: string | null | undefined): number {
  const s = (requestId ?? '').toString();
  // FNV-1a 32-bit.
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Keep it positive + DeepSeek/OpenAI compatible (int32).
  return hash >>> 0;
}

export function deterministicLlmParams(requestId: string | null | undefined): DeterministicLlmParams {
  return {
    temperature: 0,
    top_p: 1,
    seed: deterministicSeed(requestId),
  };
}
