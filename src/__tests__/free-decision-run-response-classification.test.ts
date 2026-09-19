import { describe, expect, it } from 'vitest';
import { isLegacyFreeTierResponse } from '@/services/analysisApi';

describe('free Decision Run response classification', () => {
  it('keeps a complete complimentary report on the full-result path', () => {
    expect(
      isLegacyFreeTierResponse({
        success: true,
        data: {
          _tier: 'free',
          financial_analysis: {
            scenarios: {
              base: { revenue: 10000, net_profit: 2000 },
            },
          },
          metadata: {
            access: { decision_bundle: 'complimentary' },
          },
        },
      } as any),
    ).toBe(false);
  });

  it('still recognizes the retired slim payload for backward compatibility', () => {
    expect(
      isLegacyFreeTierResponse({
        success: true,
        data: {
          _tier: 'free',
          verdict: 'HIGH_RISK',
          top_risks: ['Demand is unproven'],
        },
      } as any),
    ).toBe(true);
  });

  it('does not classify a paid or failed response as a legacy free summary', () => {
    expect(
      isLegacyFreeTierResponse({
        success: true,
        data: { _tier: 'plus', verdict: 'CAUTION' },
      } as any),
    ).toBe(false);
    expect(isLegacyFreeTierResponse({ success: false, error: 'failed' } as any)).toBe(false);
  });
});
