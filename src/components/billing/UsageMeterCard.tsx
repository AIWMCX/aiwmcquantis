import { useEffect, useState } from 'react';
import { Activity, Download, Key, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

function getMonthYear(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatLimit(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '∞';
}

interface MeterRowProps {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number;
  unitLabel: string;
}

function MeterRow({ icon, label, used, limit, unitLabel }: MeterRowProps) {
  const isUnlimited = !Number.isFinite(limit);
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const isCritical = !isUnlimited && pct >= 90;
  const isWarning = !isUnlimited && pct >= 70 && pct < 90;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span
          className={
            isCritical
              ? 'font-semibold text-destructive'
              : isWarning
                ? 'font-semibold text-amber-500'
                : 'font-medium text-foreground'
          }
        >
          {used.toLocaleString('en-US')} / {formatLimit(limit)} {unitLabel}
        </span>
      </div>
      {!isUnlimited && (
        <Progress
          value={pct}
          className={isCritical ? '[&>div]:bg-destructive' : isWarning ? '[&>div]:bg-amber-500' : ''}
        />
      )}
    </div>
  );
}

/**
 * UsageMeterCard — renders live progress bars for the three quota dimensions
 * a Quantis user can hit: monthly analyses, daily PDF/document downloads,
 * and (Pro only) API calls. Shows a contextual upgrade CTA when ≥80% used.
 */
export function UsageMeterCard() {
  const { user, isAuthenticated } = useAuth();
  const sub = useSubscription();
  const [downloadsToday, setDownloadsToday] = useState<number>(0);
  const [apiCalls, setApiCalls] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) {
        setLoaded(true);
        return;
      }
      try {
        const monthYear = getMonthYear();
        const today = new Date().toISOString().slice(0, 10);
        const [{ data: usage }, { data: keys }] = await Promise.all([
          supabase
            .from('usage_tracking')
            .select('downloads_today, downloads_date')
            .eq('user_id', user.id)
            .eq('month_year', monthYear)
            .maybeSingle(),
          sub.manifest.api_access
            ? supabase.from('api_keys').select('usage_count').eq('user_id', user.id)
            : Promise.resolve({ data: [] as Array<{ usage_count: number }> }),
        ]);
        if (cancelled) return;
        const dl =
          usage && (usage as { downloads_date?: string }).downloads_date === today
            ? (usage as { downloads_today?: number }).downloads_today ?? 0
            : 0;
        setDownloadsToday(dl);
        const calls = (keys ?? []).reduce(
          (sum, k) => sum + ((k as { usage_count?: number }).usage_count ?? 0),
          0,
        );
        setApiCalls(calls);
      } catch (err) {
        logger.warn('UsageMeterCard load failed', err as Error);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, sub.manifest.api_access]);

  if (!isAuthenticated || sub.loading) return null;

  const analysesUsed = sub.analysesUsed;
  const analysesLimit = sub.manifest.monthly_analysis_limit;
  const downloadsLimit = sub.manifest.pdf_daily_limit;
  const apiAccess = sub.manifest.api_access;

  const analysesPct = Number.isFinite(analysesLimit)
    ? (analysesUsed / Math.max(analysesLimit, 1)) * 100
    : 0;
  const downloadsPct = Number.isFinite(downloadsLimit)
    ? (downloadsToday / Math.max(downloadsLimit, 1)) * 100
    : 0;
  const showUpgrade =
    sub.tier !== 'PRO' && (analysesPct >= 80 || downloadsPct >= 80);

  return (
    <Card className="mb-4 border-primary/20 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            Usage this period
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              {sub.tier}
            </Badge>
          </CardTitle>
          {!loaded && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <MeterRow
          icon={<Activity className="h-3.5 w-3.5" />}
          label="Analyses (monthly)"
          used={analysesUsed}
          limit={analysesLimit}
          unitLabel=""
        />
        <MeterRow
          icon={<Download className="h-3.5 w-3.5" />}
          label="Document downloads (today)"
          used={downloadsToday}
          limit={downloadsLimit}
          unitLabel=""
        />
        {apiAccess ? (
          <MeterRow
            icon={<Key className="h-3.5 w-3.5" />}
            label="API calls (lifetime)"
            used={apiCalls}
            limit={Number.POSITIVE_INFINITY}
            unitLabel=""
          />
        ) : (
          <div className="flex items-center justify-between rounded-md border border-dashed border-border px-2.5 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5" />
              API access
            </span>
            <Badge variant="secondary" className="text-[10px]">PRO only</Badge>
          </div>
        )}
        {showUpgrade && (
          <Button asChild size="sm" className="w-full mt-1">
            <Link to="/pricing">
              {sub.tier === 'FREE' ? 'Upgrade to Plus' : 'Upgrade to Pro'} — unlock unlimited
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
