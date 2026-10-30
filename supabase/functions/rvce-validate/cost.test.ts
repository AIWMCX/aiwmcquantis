import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { deepseekCostUsd } from './cost.ts';

Deno.test('deepseekCostUsd uses the per-1M rates', () => {
  assertEquals(deepseekCostUsd(1_000_000, 0), 0.27);
  assertEquals(deepseekCostUsd(0, 1_000_000), 1.1);
  assertEquals(deepseekCostUsd(0, 0), 0);
  assertEquals(deepseekCostUsd(2000, 500), 0.00109);
});
