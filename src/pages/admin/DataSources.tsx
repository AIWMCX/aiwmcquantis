import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, ExternalLink, Shield, Clock, FileCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface ProvenanceRecord {
  id: string;
  source_name: string;
  source_url: string | null;
  license_type: string;
  allowed_uses: string[];
  restricted_uses: string[];
  dataset_type: string;
  coverage_description: string | null;
  record_count: number | null;
  date_range_start: string | null;
  date_range_end: string | null;
  last_ingested_at: string | null;
  notes: string | null;
  created_at: string;
  benchmark_count?: number;
}

const LICENSE_COLORS: Record<string, string> = {
  public_domain: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  cc0: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  'cc_by_4.0': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  public_reference: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  academic_reference: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
};

const DATASET_ICONS: Record<string, string> = {
  financial_statements: '📊',
  sme_survey: '🏢',
  industry_benchmark: '📈',
  case_study: '☕',
};

export default function DataSources() {
  const queryClient = useQueryClient();
  const [ingestingAll, setIngestingAll] = useState(false);

  const triggerIngest = async (sourceKey: 'all' | 'projectionhub' | 'sec_xbrl', label: string) => {
    if (sourceKey === 'all') setIngestingAll(true);
    const t = toast.loading(`Ingesting ${label}…`);
    try {
      const { data, error } = await supabase.functions.invoke('ingest-data-sources', {
        body: { source: sourceKey, triggered_by: 'admin_manual' },
      });
      if (error) throw error;
      toast.success(`Ingestion complete: ${label}`, { id: t, description: JSON.stringify(data?.results?.map((r: any) => `${r.source}:${r.status}`)) });
      queryClient.invalidateQueries({ queryKey: ['admin-data-provenance'] });
    } catch (e: any) {
      toast.error(`Ingestion failed`, { id: t, description: e.message });
    } finally {
      if (sourceKey === 'all') setIngestingAll(false);
    }
  };

  const { data: sources, isLoading } = useQuery({
    queryKey: ['admin-data-provenance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_provenance')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get benchmark counts per provenance
      const { data: linkCounts } = await supabase
        .from('benchmark_sources')
        .select('provenance_id');

      const countMap: Record<string, number> = {};
      linkCounts?.forEach((link: { provenance_id: string }) => {
        countMap[link.provenance_id] = (countMap[link.provenance_id] || 0) + 1;
      });

      return (data || []).map((s: ProvenanceRecord) => ({
        ...s,
        benchmark_count: countMap[s.id] || 0,
      }));
    },
  });

  const { data: totalBenchmarks } = useQuery({
    queryKey: ['admin-benchmark-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('industry_benchmarks')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: totalCases } = useQuery({
    queryKey: ['admin-training-cases-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('training_cases')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  return (
    <AppLayout title="Data Sources">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Database className="w-8 h-8 text-primary" />
            Data Provenance Registry
          </h1>
          <p className="text-muted-foreground">
            Tracks every external dataset's license, allowed uses, and freshness for audit compliance.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{sources?.length ?? '—'}</div>
              <div className="text-xs text-muted-foreground">Data Sources</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{totalBenchmarks ?? '—'}</div>
              <div className="text-xs text-muted-foreground">Benchmarks</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{totalCases ?? '—'}</div>
              <div className="text-xs text-muted-foreground">Training Cases</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {sources?.filter((s: ProvenanceRecord) => ['public_domain', 'cc0', 'cc_by_4.0'].includes(s.license_type)).length ?? '—'}
              </div>
              <div className="text-xs text-muted-foreground">Open Licensed</div>
            </CardContent>
          </Card>
        </div>

        {/* Source Cards */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {sources?.map((source: ProvenanceRecord) => (
              <Card key={source.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{DATASET_ICONS[source.dataset_type] || '📁'}</span>
                      <div>
                        <CardTitle className="text-lg">{source.source_name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={LICENSE_COLORS[source.license_type] || ''}>
                            <Shield className="w-3 h-3 mr-1" />
                            {source.license_type.replace(/_/g, ' ')}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {source.dataset_type.replace(/_/g, ' ')}
                          </Badge>
                          {source.benchmark_count > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {source.benchmark_count} linked benchmarks
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {source.source_url && (
                      <a
                        href={source.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {source.coverage_description && (
                    <p className="text-sm text-muted-foreground">{source.coverage_description}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {source.record_count && (
                      <span className="flex items-center gap-1">
                        <FileCheck className="w-3 h-3" />
                        {source.record_count.toLocaleString()} records
                      </span>
                    )}
                    {source.date_range_start && source.date_range_end && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {source.date_range_start} → {source.date_range_end}
                      </span>
                    )}
                    {source.last_ingested_at ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <FileCheck className="w-3 h-3" />
                        Ingested {formatDistanceToNow(new Date(source.last_ingested_at), { addSuffix: true })}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="w-3 h-3" />
                        Not yet ingested
                      </span>
                    )}
                  </div>

                  {/* Allowed / Restricted Uses */}
                  <div className="flex flex-wrap gap-1.5">
                    {source.allowed_uses?.map((use: string) => (
                      <Badge key={use} variant="outline" className="text-xs bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400">
                        ✓ {use.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                    {source.restricted_uses?.map((use: string) => (
                      <Badge key={use} variant="outline" className="text-xs bg-red-500/5 border-red-500/20 text-red-700 dark:text-red-400">
                        ✗ {use.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>

                  {source.notes && (
                    <p className="text-xs text-muted-foreground/70 italic border-t border-border/50 pt-2 mt-2">
                      {source.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
