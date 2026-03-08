/**
 * AI Consensus Service — Client-side orchestration
 * 
 * Invokes the ai-consensus edge function for dual-model analysis,
 * provides caching (5-min TTL) and health monitoring.
 */

import { supabase } from '@/integrations/supabase/client';

// ── Interfaces ──

export interface AIModelResult {
  modelId: 'gpt5-mini' | 'gemini';
  rawOutput: string;
  parsedData: Record<string, unknown>;
  confidence: number;
  latencyMs: number;
  tokensUsed: number;
  timestamp: string;
}

export interface ConsensusResult {
  gptResult: AIModelResult;
  geminiResult: AIModelResult;
  consensusScore: number;
  divergenceFields: string[];
  finalOutput: Record<string, unknown>;
  overallConfidence: number;
  consensusMethod: 'full_agreement' | 'weighted_merge' | 'primary_wins' | 'blocked';
  processingMs: number;
  fieldAgreements?: Record<string, number>;
}

interface ConsensusOptions {
  timeout?: number;
  forceModel?: 'gpt' | 'gemini';
}

// ── Cache ──

interface CacheEntry {
  result: ConsensusResult;
  expiresAt: Date;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class ConsensusCache {
  private store = new Map<string, CacheEntry>();

  private hash(prompt: string): string {
    let h = 0;
    for (let i = 0; i < prompt.length; i++) {
      h = ((h << 5) - h + prompt.charCodeAt(i)) | 0;
    }
    return String(h);
  }

  get(prompt: string): ConsensusResult | null {
    const key = this.hash(prompt);
    const entry = this.store.get(key);
    if (!entry) return null;
    if (new Date() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.result;
  }

  set(prompt: string, result: ConsensusResult): void {
    const key = this.hash(prompt);
    this.store.set(key, {
      result,
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    });
  }

  invalidate(prompt: string): void {
    this.store.delete(this.hash(prompt));
  }

  clear(): void {
    this.store.clear();
  }
}

export const consensusCache = new ConsensusCache();

// ── Health Monitor (ring buffer) ──

interface HealthEntry {
  consensusScore: number;
  latencyMs: number;
  blocked: boolean;
  timestamp: number;
}

const healthBuffer: HealthEntry[] = [];
const MAX_HEALTH_ENTRIES = 100;

function recordHealth(result: ConsensusResult): void {
  healthBuffer.push({
    consensusScore: result.consensusScore,
    latencyMs: result.processingMs,
    blocked: result.consensusMethod === 'blocked',
    timestamp: Date.now(),
  });
  if (healthBuffer.length > MAX_HEALTH_ENTRIES) {
    healthBuffer.shift();
  }
}

export function getConsensusHealth(): {
  avgScore24h: number;
  blockRate: number;
  avgLatency: number;
} {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recent = healthBuffer.filter((e) => e.timestamp > cutoff);
  if (recent.length === 0) {
    return { avgScore24h: 100, blockRate: 0, avgLatency: 0 };
  }
  const avgScore24h = recent.reduce((s, e) => s + e.consensusScore, 0) / recent.length;
  const blockRate = recent.filter((e) => e.blocked).length / recent.length;
  const avgLatency = recent.reduce((s, e) => s + e.latencyMs, 0) / recent.length;
  return {
    avgScore24h: Math.round(avgScore24h * 100) / 100,
    blockRate: Math.round(blockRate * 1000) / 1000,
    avgLatency: Math.round(avgLatency),
  };
}

// ── Main function ──

export async function runConsensusAnalysis(
  prompt: string,
  schema: object,
  options?: ConsensusOptions
): Promise<ConsensusResult> {
  // Check cache
  const cached = consensusCache.get(prompt);
  if (cached) return cached;

  const { data, error } = await supabase.functions.invoke<ConsensusResult>(
    'ai-consensus',
    {
      body: { prompt, schema, options },
    }
  );

  if (error) {
    const status = error.context?.status;
    if (status === 422) {
      // QE-007 blocked
      let body: Record<string, unknown> = {};
      try {
        const raw = error.context?.body;
        body = typeof raw === 'string' ? JSON.parse(raw) : raw || {};
      } catch { /* ignore */ }
      throw new Error(
        `QE-007: Model consensus failure (score: ${body.consensusScore ?? 'unknown'}). Divergent fields: ${
          (body.divergenceFields as string[])?.join(', ') || 'unknown'
        }`
      );
    }
    if (status === 429) {
      throw new Error('Rate limit exceeded for AI consensus. Please try again later.');
    }
    if (status === 402) {
      throw new Error('AI credits exhausted. Please add funds to continue.');
    }
    throw new Error(error.message || 'AI consensus analysis failed');
  }

  if (!data) {
    throw new Error('Empty response from AI consensus service');
  }

  // Record health & cache
  recordHealth(data);
  consensusCache.set(prompt, data);

  return data;
}
