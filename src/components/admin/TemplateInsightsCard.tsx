import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, TrendingUp, TrendingDown, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface TemplateSuggestion {
  id: string;
  template_id: string;
  template_name: string;
  suggestion_type: string;
  description: string;
  expected_impact: number;
  status: string;
  created_at: string;
}

interface TemplatePerformance {
  template_id: string;
  template_name: string;
  total_signals: number;
  avg_rating: number | null;
  download_count: number;
  share_count: number;
}

export function TemplateInsightsCard() {
  const [suggestions, setSuggestions] = useState<TemplateSuggestion[]>([]);
  const [performance, setPerformance] = useState<TemplatePerformance[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch performance signals aggregated by template
      const { data: signals } = await supabase
        .from('doc_performance_signals')
        .select('signal_type, signal_value, context')
        .order('created_at', { ascending: false })
        .limit(1000);

      // Aggregate by template
      const templateMap = new Map<string, TemplatePerformance>();

      (signals ?? []).forEach((s: any) => {
        const templateId = s.context?.template_id || 'unknown';
        const templateName = s.context?.template_name || s.context?.title || templateId;

        if (!templateMap.has(templateId)) {
          templateMap.set(templateId, {
            template_id: templateId,
            template_name: templateName,
            total_signals: 0,
            avg_rating: null,
            download_count: 0,
            share_count: 0,
          });
        }

        const entry = templateMap.get(templateId)!;
        entry.total_signals += 1;

        if (s.signal_type === 'downloaded') entry.download_count += 1;
        if (s.signal_type === 'shared') entry.share_count += 1;
        if (s.signal_type === 'rated' && s.signal_value != null) {
          const prevTotal = entry.avg_rating != null
            ? entry.avg_rating * (entry.total_signals - 1)
            : 0;
          entry.avg_rating = (prevTotal + s.signal_value) / entry.total_signals;
        }
      });

      setPerformance(
        Array.from(templateMap.values()).sort((a, b) => b.total_signals - a.total_signals),
      );

      // Generate suggestions from performance data
      const generatedSuggestions: TemplateSuggestion[] = [];
      templateMap.forEach((perf) => {
        if (perf.avg_rating != null && perf.avg_rating < 3 && perf.total_signals >= 5) {
          generatedSuggestions.push({
            id: `suggest-${perf.template_id}`,
            template_id: perf.template_id,
            template_name: perf.template_name,
            suggestion_type: 'quality',
            description: `Average rating is ${perf.avg_rating.toFixed(1)}/5 — consider revising template structure or content quality.`,
            expected_impact: Math.round((3 - perf.avg_rating) * 20),
            status: 'pending',
            created_at: new Date().toISOString(),
          });
        }
        if (perf.download_count > 0 && perf.share_count === 0 && perf.total_signals >= 10) {
          generatedSuggestions.push({
            id: `suggest-share-${perf.template_id}`,
            template_id: perf.template_id,
            template_name: perf.template_name,
            suggestion_type: 'engagement',
            description: `${perf.download_count} downloads but 0 shares — add share prompts or improve visual quality for sharing.`,
            expected_impact: 15,
            status: 'pending',
            created_at: new Date().toISOString(),
          });
        }
      });

      setSuggestions(generatedSuggestions);
    } catch (err) {
      console.error('Failed to fetch template insights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="w-5 h-5 text-primary" />
          Template Intelligence
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Improvement Suggestions</h4>
                {suggestions.map((s) => (
                  <div key={s.id} className="p-3 rounded-lg border bg-muted/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{s.template_name}</span>
                      <Badge
                        variant={s.suggestion_type === 'quality' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {s.suggestion_type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                    <p className="text-xs text-primary">
                      Expected impact: +{s.expected_impact}% improvement
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Performance table */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Template Performance</h4>
              {performance.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No signal data collected yet. Signals will appear as users download, share, and rate documents.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {performance.slice(0, 10).map((p) => (
                    <div
                      key={p.template_id}
                      className="flex items-center gap-3 p-2 rounded-md border text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{p.template_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.total_signals} signals · {p.download_count} downloads · {p.share_count} shares
                        </p>
                      </div>
                      {p.avg_rating != null && (
                        <div className="flex items-center gap-1 shrink-0">
                          {p.avg_rating >= 3.5 ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-destructive" />
                          )}
                          <span className="text-xs font-medium">
                            {p.avg_rating.toFixed(1)}/5
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {suggestions.length === 0 && performance.length > 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                ✓ All templates performing well — no suggestions at this time.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
