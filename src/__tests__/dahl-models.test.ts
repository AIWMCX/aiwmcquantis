import { describe, expect, it } from 'vitest';
import { MODELS } from '@/config/models';

describe('Dahl model catalog', () => {
  it('uses the exact live model IDs exposed by Dahl', () => {
    expect(MODELS.DAHL_MINIMAX).toBe('MiniMaxAI/MiniMax-M2.7');
    expect(MODELS.DAHL_KIMI).toBe('moonshotai/Kimi-K2.6');
  });

  it('does not expose the not-yet-available GLM model', () => {
    expect(Object.values(MODELS)).not.toContain('zai-org/GLM-5.2');
  });
});
