/**
 * useTier — thin wrapper around useSubscription that exposes only what
 * tier-aware UI needs. Keeps `useSubscription` as the single fetcher and
 * lets feature components avoid the full subscription surface.
 *
 * Mirrors the canonical `tier-spec.ts` (Master Spec v1.0).
 */

import { useMemo } from 'react';
import { useSubscription } from './useSubscription';
import {
  evaluateGate,
  hasFeature,
  type EndpointId,
  type FeatureKey,
  type FeatureManifest,
  type Tier,
  type TierGateResult,
  type UpgradeMessage,
  UPGRADE_TRIGGERS,
  buildUpgradeNudge,
} from '@/lib/tier-spec';

export interface UseTierResult {
  tier: Tier;
  manifest: FeatureManifest;
  isFree: boolean;
  isPlus: boolean;
  isPro: boolean;
  loading: boolean;
  /** Pure feature check (e.g. has('monte_carlo')) */
  has: (feature: FeatureKey) => boolean;
  /** Pre-flight gate evaluation against an endpoint id from ENDPOINTS. */
  preflight: (endpoint: EndpointId | string) => TierGateResult;
  /** Look up a canonical upgrade message by trigger key. */
  upgrade: (triggerKey: keyof typeof UPGRADE_TRIGGERS) => UpgradeMessage;
  /** The contextual upgrade nudge that ships in analysis JSON. */
  upgradeNudge: UpgradeMessage | null;
}

export function useTier(): UseTierResult {
  const {
    tier,
    manifest,
    isFree,
    isPlus,
    isPro,
    loading,
    analysesUsed,
  } = useSubscription();

  return useMemo<UseTierResult>(
    () => ({
      tier,
      manifest,
      isFree,
      isPlus,
      isPro,
      loading,
      has: (feature) => hasFeature(tier, feature),
      preflight: (endpoint) =>
        evaluateGate({ tier, endpoint, monthlyAnalysesUsed: analysesUsed }),
      upgrade: (triggerKey) => UPGRADE_TRIGGERS[triggerKey],
      upgradeNudge: buildUpgradeNudge(tier),
    }),
    [tier, manifest, isFree, isPlus, isPro, loading, analysesUsed],
  );
}

/**
 * useFeature — sugar for `const { allowed, requiredTier } = useFeature('monte_carlo')`.
 * Returns whether the current tier has access plus the upgrade target if not.
 */
export function useFeature(feature: FeatureKey) {
  const { tier, has } = useTier();
  const allowed = has(feature);
  return useMemo(
    () => ({
      allowed,
      tier,
      // Read the spec rank so callers can show "requires Plus" or "requires Pro"
      requiredTier: allowed ? null : (require('@/lib/tier-spec').FEATURE_TIER_REQUIREMENT[feature] as Tier),
    }),
    [allowed, tier, feature],
  );
}
