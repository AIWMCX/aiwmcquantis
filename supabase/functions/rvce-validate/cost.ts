/** DeepSeek list rate (USD per 1M tokens, cache-miss input), the same
 *  snapshot as COST_PRICING in _shared/llm-call.ts. */
const IN_PER_M = 0.27;
const OUT_PER_M = 1.10;

export function deepseekCostUsd(inputTokens: number, outputTokens: number): number {
  const cost = (inputTokens / 1_000_000) * IN_PER_M + (outputTokens / 1_000_000) * OUT_PER_M;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
