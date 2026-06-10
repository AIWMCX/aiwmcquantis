/**
 * Single source of truth for AI model identifiers.
 *
 * Why this file exists:
 *   - DeepSeek retired the legacy aliases `deepseek-chat` and `deepseek-reasoner`
 *     on 2026-07-24 15:59 UTC. Any code that still ships those strings will
 *     start failing on that date with no fallback.
 *   - Hardcoding model strings across edge functions made past migrations error-
 *     prone. From now on, every call site imports from here.
 *
 * Invariant I-6 (mega prompt): DeepSeek is its own endpoint. Never proxy it
 * through the Lovable AI gateway.
 */

export const MODELS = {
  // Free tier — DeepSeek direct (api.deepseek.com)
  DEEPSEEK_FLASH: 'deepseek-v4-flash',
  DEEPSEEK_PRO: 'deepseek-v4-pro',

  // Plus tier — Anthropic Claude pipeline
  CLAUDE_CLASSIFY: 'claude-haiku-4-5',
  CLAUDE_NARRATIVE: 'claude-sonnet-4-6',
  CLAUDE_ACTIONS: 'claude-sonnet-4-6',
  CLAUDE_ADVERSARIAL: 'claude-sonnet-4-6',

  // RVCE Layer 8 web-search cross-check
  RVCE_SEARCH: 'claude-haiku-4-5',
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];
