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

function unwrap<T>(resp: SpecApiResponse<T>): T {
  if (resp.success) return resp.data;
  if (resp.required_tier) {
    toast.error(resp.message ?? 'Upgrade required', {
      description: resp.cta ?? `Upgrade to ${resp.required_tier}`,
      action: resp.upgrade_url
        ? { label: 'View pricing', onClick: () => window.open(resp.upgrade_url!, '_self') }
        : undefined,
    });
  } else {
    toast.error(resp.message ?? resp.error ?? 'Request failed');
  }
  throw new Error(resp.message ?? resp.error);
}

export function usePlusAnalysis() {
  return useMutation<PlusAnalysisJson, Error, {
    idea: string;
    location: string;
    industry?: string;
    stage?: 'IDEA' | 'EARLY' | 'GROWTH' | 'ESTABLISHED';
    monteCarlo: MonteCarloResult;
  }>({
    mutationFn: async (args) => unwrap(await analyzePlus(args)),
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
