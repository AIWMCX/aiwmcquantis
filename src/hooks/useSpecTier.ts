/**
 * usePlusAnalysis / useProExtension / useCapacityCheck
 * ----------------------------------------------------
 * Thin React-Query mutations over `specTierApi`. Each surfaces 402
 * TierGateBlock errors as toasts that point to /pricing.
 */

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  analyzePlus,
  analyzeProExtension,
  checkCapacity,
  type CapacityCheckInput,
  type CapacityCheckJson,
  type PlusAnalysisJson,
  type ProExtensionJson,
  type SpecApiResponse,
} from '@/services/specTierApi';
import type { MonteCarloResult } from '@/lib/monte-carlo';
import { emitUpgradeNudge } from '@/lib/upgradeNudgeBus';

function unwrap<T>(resp: SpecApiResponse<T>): T {
  if (resp.success === true) return resp.data;
  // resp is SpecApiError here
  const err = resp;
  if (err.required_tier) {
    toast.error(err.message ?? 'Upgrade required', {
      description: err.cta ?? `Upgrade to ${err.required_tier}`,
      action: err.upgrade_url
        ? { label: 'View pricing', onClick: () => window.open(err.upgrade_url!, '_self') }
        : undefined,
    });
  } else {
    toast.error(err.message ?? err.error ?? 'Request failed');
  }
  throw new Error(err.message ?? err.error);
}

export function usePlusAnalysis() {
  return useMutation<PlusAnalysisJson, Error, {
    idea: string;
    location: string;
    industry?: string;
    stage?: 'IDEA' | 'EARLY' | 'GROWTH' | 'ESTABLISHED';
    monteCarlo: MonteCarloResult;
  }>({
    mutationFn: async (args) => {
      const result = unwrap(await analyzePlus(args));
      if (result?.upgrade_nudge) {
        emitUpgradeNudge({ ...result.upgrade_nudge, target_tier: 'PRO', source: 'analyze-plus' });
      }
      return result;
    },
  });
}

export function useProExtension() {
  return useMutation<ProExtensionJson, Error, {
    plusAnalysis: PlusAnalysisJson | Record<string, unknown>;
    marketData?: Record<string, unknown>;
  }>({
    mutationFn: async (args) => unwrap(await analyzeProExtension(args)),
  });
}

export function useCapacityCheck() {
  return useMutation<CapacityCheckJson, Error, CapacityCheckInput>({
    mutationFn: async (input) => unwrap(await checkCapacity(input)),
  });
}
