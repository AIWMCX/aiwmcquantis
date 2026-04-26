/**
 * MyStats — per-user activation breakdown ("My Stats").
 *
 * Shows the founder their score, band, event counts, and the next-best step.
 * Mirrors the admin KPI logic but scoped to `auth.uid()` via the same RPC.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageSEO } from '@/components/seo/PageSEO';
import { useActivation } from '@/hooks/useActivation';
import { BAND_META, EVENT_WEIGHTS, type ActivationEventType } from '@/lib/activationTracking';
import { ContextualUpgradeBanner } from '@/components/engagement/ContextualUpgradeBanner';
import { Sparkles, ArrowLeft, Trophy, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const EVENT_LABELS: Record<ActivationEventType, string> = {
  idea_entered: 'Business idea entered',
  location_entered: 'Location entered',
  calculation_completed: 'Analysis completed',
  pdf_exported: 'PDF exported',
  return_visit: 'Return visit',
  doc_generated: 'Document generated',
  scenario_edited: 'Scenario edited',
  invoice_created: 'Invoice created',
};

export default function MyStats() {
  const { score, loading, refetch } = useActivation();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const meta = BAND_META[score.band];
  const eventTypes = Object.keys(EVENT_WEIGHTS) as ActivationEventType[];

  return (
    <AppLayout>
      <PageSEO
        title="My Stats | AIWMC Quantis"
        description="Your activation progress, event history, and next-best steps."
        canonical="/app/stats"
        noindex={true}
      />
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
              <Link to="/app">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to dashboard
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              My Stats
            </h1>
            <p className="text-sm text-muted-foreground">
              Your activation progress and what to do next.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setRefreshing(true);
              await refetch();
              setRefreshing(false);
            }}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>

        {/* Contextual upgrade banner (auto-hides for Plus) */}
        <ContextualUpgradeBanner />

        {/* Score hero */}
        <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-6">
          {loading ? (
            <Skeleton className="h-32" />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                    Activation Score
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold tabular-nums text-foreground">
                      {score.score}
                    </span>
                    <span className="text-lg text-muted-foreground">/ 100</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${meta.tone}`}>{meta.label}</div>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-4">
                <div
                  className="h-full bg-primary transition-all duration-700"
                  style={{ width: `${score.score}%` }}
                />
              </div>
              <div className="flex items-start gap-2 rounded-md bg-card border border-border p-3">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-foreground mb-0.5">Next step</div>
                  <p className="text-sm text-muted-foreground">{score.next_step}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Event breakdown */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground mb-1 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Activity breakdown
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Each event contributes to your score (capped at 3 occurrences per type).
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {eventTypes.map((type) => {
              const count = score.event_counts?.[type] ?? 0;
              const weight = EVENT_WEIGHTS[type];
              const capped = Math.min(count, 3);
              const contribution = capped * weight;
              return (
                <div
                  key={type}
                  className="flex items-center justify-between rounded-md border border-border bg-background p-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {EVENT_LABELS[type]}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {count} event{count === 1 ? '' : 's'} · {weight} pts each (max 3)
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-sm font-bold tabular-nums text-foreground">
                      +{contribution}
                    </div>
                    <div className="text-[10px] text-muted-foreground">pts</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Your score updates as you use Quantis. Aim for the Champion band (75+).
        </p>
      </div>
    </AppLayout>
  );
}
