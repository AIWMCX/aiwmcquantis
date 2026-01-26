/**
 * Real-Time Web Vitals Dashboard Card
 * 
 * Displays Core Web Vitals metrics with color-coded ratings
 * for admin monitoring of site performance.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Gauge, RefreshCw, TrendingUp, Clock, Layers, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface WebVitalMetric {
  name: string;
  value: number | null;
  unit: string;
  rating: 'good' | 'needs-improvement' | 'poor' | 'unknown';
  threshold: { good: number; poor: number };
  icon: React.ElementType;
  description: string;
}

const getRating = (value: number | null, threshold: { good: number; poor: number }): 'good' | 'needs-improvement' | 'poor' | 'unknown' => {
  if (value === null) return 'unknown';
  if (value <= threshold.good) return 'good';
  if (value >= threshold.poor) return 'poor';
  return 'needs-improvement';
};

const getRatingColor = (rating: string): string => {
  switch (rating) {
    case 'good': return 'bg-success text-white';
    case 'needs-improvement': return 'bg-warning text-white';
    case 'poor': return 'bg-destructive text-white';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getProgressColor = (rating: string): string => {
  switch (rating) {
    case 'good': return 'bg-success';
    case 'needs-improvement': return 'bg-warning';
    case 'poor': return 'bg-destructive';
    default: return 'bg-muted';
  }
};

export function WebVitalsCard() {
  const [metrics, setMetrics] = useState<WebVitalMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const collectMetrics = useCallback(() => {
    setIsLoading(true);
    
    // Get navigation timing
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(e => e.name === 'first-contentful-paint') as PerformanceEntry & { startTime: number } | undefined;
    
    const ttfb = navEntry ? Math.round(navEntry.responseStart - navEntry.requestStart) : null;
    const fcp = fcpEntry ? Math.round(fcpEntry.startTime) : null;
    const domComplete = navEntry ? Math.round(navEntry.domComplete) : null;
    const loadComplete = navEntry ? Math.round(navEntry.loadEventEnd) : null;
    
    const metricsData: WebVitalMetric[] = [
      {
        name: 'TTFB',
        value: ttfb,
        unit: 'ms',
        rating: getRating(ttfb, { good: 200, poor: 600 }),
        threshold: { good: 200, poor: 600 },
        icon: Zap,
        description: 'Time to First Byte',
      },
      {
        name: 'FCP',
        value: fcp,
        unit: 'ms',
        rating: getRating(fcp, { good: 1800, poor: 3000 }),
        threshold: { good: 1800, poor: 3000 },
        icon: Clock,
        description: 'First Contentful Paint',
      },
      {
        name: 'DOM Complete',
        value: domComplete,
        unit: 'ms',
        rating: getRating(domComplete, { good: 2500, poor: 5000 }),
        threshold: { good: 2500, poor: 5000 },
        icon: Layers,
        description: 'DOM Complete Time',
      },
      {
        name: 'Page Load',
        value: loadComplete,
        unit: 'ms',
        rating: getRating(loadComplete, { good: 3000, poor: 6000 }),
        threshold: { good: 3000, poor: 6000 },
        icon: TrendingUp,
        description: 'Full Page Load',
      },
    ];
    
    setMetrics(metricsData);
    setLastUpdated(new Date());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Wait for page to be fully loaded
    if (document.readyState === 'complete') {
      setTimeout(collectMetrics, 100);
    } else {
      window.addEventListener('load', () => setTimeout(collectMetrics, 100));
    }
  }, [collectMetrics]);

  const calculateProgress = (value: number | null, threshold: { good: number; poor: number }): number => {
    if (value === null) return 0;
    // Invert so lower is better
    const maxBad = threshold.poor * 1.5;
    const progress = Math.max(0, Math.min(100, ((maxBad - value) / maxBad) * 100));
    return progress;
  };

  const overallScore = metrics.length > 0
    ? Math.round(
        (metrics.filter(m => m.rating === 'good').length / metrics.filter(m => m.value !== null).length) * 100
      )
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Web Vitals</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={collectMetrics}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <span className="text-sm font-medium">Performance Score</span>
          <Badge className={getRatingColor(overallScore >= 75 ? 'good' : overallScore >= 50 ? 'needs-improvement' : 'poor')}>
            {overallScore}%
          </Badge>
        </div>

        {/* Individual Metrics */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {metrics.map((metric) => (
              <div key={metric.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <metric.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{metric.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {metric.value !== null ? `${metric.value}${metric.unit}` : 'N/A'}
                    </span>
                    <Badge className={getRatingColor(metric.rating)} variant="secondary">
                      {metric.rating === 'unknown' ? '?' : metric.rating.charAt(0).toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="relative">
                  <Progress 
                    value={calculateProgress(metric.value, metric.threshold)} 
                    className="h-2"
                  />
                  <div 
                    className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(metric.rating)}`}
                    style={{ width: `${calculateProgress(metric.value, metric.threshold)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {metric.description} (good: &lt;{metric.threshold.good}ms)
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
