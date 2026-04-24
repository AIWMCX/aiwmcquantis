import { supabase } from "@/integrations/supabase/client";

import { logger } from '@/lib/logger';
export interface FreshnessReport {
  totalBenchmarks: number;
  staleCount: number;
  healthyCount: number;
  staleList: { industry_name: string; last_updated: string; days_old: number }[];
  validationErrors: { industry_name: string; error: string }[];
}

export class BenchmarkGovernance {
  static STALE_THRESHOLD_DAYS = 180; // 6 months

  static async getFreshnessReport(): Promise<FreshnessReport> {
    const { data: benchmarks, error } = await supabase
      .from('industry_benchmarks')
      .select('industry_name, last_updated, gross_margin_min, gross_margin_max, cac_min');

    if (error) {
      logger.error("Error fetching benchmarks for governance:", error);
      throw error;
    }

    const report: FreshnessReport = {
      totalBenchmarks: benchmarks?.length || 0,
      staleCount: 0,
      healthyCount: 0,
      staleList: [],
      validationErrors: []
    };

    if (!benchmarks) return report;

    const now = new Date();

    benchmarks.forEach(b => {
      // Freshness check
      const lastUpdated = b.last_updated ? new Date(b.last_updated) : null;
      let isStale = false;
      
      if (!lastUpdated) {
        isStale = true;
        report.staleCount++;
        report.staleList.push({
          industry_name: b.industry_name,
          last_updated: 'Never',
          days_old: 999
        });
      } else {
        const daysOld = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
        if (daysOld > this.STALE_THRESHOLD_DAYS) {
          isStale = true;
          report.staleCount++;
          report.staleList.push({
            industry_name: b.industry_name,
            last_updated: b.last_updated!,
            days_old: daysOld
          });
        }
      }

      if (!isStale) {
        report.healthyCount++;
      }

      // Validation check
      if (b.gross_margin_min !== null && b.gross_margin_max !== null && b.gross_margin_min > b.gross_margin_max) {
        report.validationErrors.push({
          industry_name: b.industry_name,
          error: 'gross_margin_min > gross_margin_max'
        });
      }

      if (b.cac_min !== null && b.cac_min < 0) {
        report.validationErrors.push({
          industry_name: b.industry_name,
          error: 'cac_min < 0'
        });
      }
    });

    return report;
  }
}
