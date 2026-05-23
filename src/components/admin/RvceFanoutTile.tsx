/**
 * Phase 2 — RVCE Fan-out observability tile.
 *
 * Surfaces (last 24h):
 *   • Fan-out cost spent ($)
 *   • RVCE cache hit rate (%)
 *   • Cost-ceiling breaches
 *   • Total observations cached (rvce_cache row count)
 *
 * All numbers come straight from `ai_calls` + `rvce_cache` so the tile works
 * even before the fan-out flag is flipped (you'll just see zeros).
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, DollarSign, AlertTriangle, Database } from 'lucide-react';
import { logger } from '@/lib/logger';

interface FanoutStats {
  fanoutCost24h: number;
  fanoutCalls24h: number;
  cacheRows: number;
  cacheHitRate24h: number;
  ceilingBreaches24h: number;
}

export function RvceFanoutTile() {
  const [stats, setStats] = useState<FanoutStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const [callsRes, breachesRes, cacheRes] = await Promise.all([
          supabase
            .from('ai_calls')
            .select('cost_usd, metadata, model')
            .gte('created_at', since)
            .or('model.eq.deepseek-chat,model.eq.claude-haiku-4-5-20251001'),
          supabase
            .from('ai_calls')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', since)
            .eq('model', 'cost-guard'),
          supabase
            .from('rvce_cache')
            .select('id', { count: 'exact', head: true }),
        ]);

        const calls = callsRes.data ?? [];
        const fanoutCost = calls.reduce((s, r: any) => s + Number(r.cost_usd || 0), 0);
        // hit rate = #calls served from cache / total fan-out attempts.
        // We tag cache hits in metadata.cache_hit during fanoutVariable.
        const hits = calls.filter((r: any) => r?.metadata?.cache_hit === true).length;
        const hitRate = calls.length ? Math.round((hits / calls.length) * 100) : 0;

        if (cancelled) return;
        setStats({
          fanoutCost24h: Number(fanoutCost.toFixed(4)),
          fanoutCalls24h: calls.length,
          cacheRows: cacheRes.count ?? 0,
          cacheHitRate24h: hitRate,
          ceilingBreaches24h: breachesRes.count ?? 0,
        });
      } catch (err) {
        logger.error('RvceFanoutTile fetch failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4" /> RVCE Fan-out (24h)
          <Badge variant="outline" className="ml-auto text-xs">
            v0.3
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !stats ? (
          <p className="text-sm text-muted-foreground">No data</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat
              icon={<DollarSign className="w-4 h-4" />}
              label="Spend"
              value={`$${stats.fanoutCost24h.toFixed(2)}`}
            />
            <Stat
              icon={<Database className="w-4 h-4" />}
              label="Cache hit rate"
              value={`${stats.cacheHitRate24h}%`}
              good={stats.cacheHitRate24h >= 30}
            />
            <Stat
              icon={<Activity className="w-4 h-4" />}
              label="Cached rows"
              value={stats.cacheRows.toLocaleString()}
            />
            <Stat
              icon={<AlertTriangle className="w-4 h-4" />}
              label="Ceiling breaches"
              value={String(stats.ceilingBreaches24h)}
              good={stats.ceilingBreaches24h === 0}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
  good,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        {icon} {label}
      </div>
      <div
        className={`text-lg font-semibold ${
          good === undefined ? '' : good ? 'text-green-500' : 'text-yellow-500'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
