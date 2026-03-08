import React, { useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, TrendingUp, Percent, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MonteCarloResult } from '@/lib/monte-carlo';
import type { ScenarioComparison } from '@/services/scenario-engine';
import { generateCorridorData } from '@/lib/monte-carlo';

interface MonteCarloResultsProps {
  simulation?: MonteCarloResult;
  scenarios?: ScenarioComparison[];
  months?: number;
}

export function MonteCarloResults({ simulation, scenarios, months = 12 }: MonteCarloResultsProps) {
  const corridorData = useMemo(() => {
    if (!simulation) return [];
    return generateCorridorData(simulation, months);
  }, [simulation, months]);

  if (!simulation && (!scenarios || scenarios.length === 0)) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Enable range mode on financial inputs to run Monte Carlo simulation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Key Stats */}
      {simulation && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Monte Carlo Simulation ({simulation.iterations.toLocaleString()} iterations)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatCard label="Mean" value={`$${simulation.mean.toLocaleString()}`} />
            <StatCard label="Median" value={`$${simulation.median.toLocaleString()}`} />
            <StatCard label="P10 (Pessimistic)" value={`$${simulation.p10.toLocaleString()}`} muted />
            <StatCard label="P90 (Optimistic)" value={`$${simulation.p90.toLocaleString()}`} positive />
            <StatCard
              label="Prob. Positive"
              value={`${simulation.probabilityPositive.toFixed(1)}%`}
              positive={simulation.probabilityPositive >= 50}
            />
          </div>
        </div>
      )}

      {/* Probability Corridor Chart */}
      {corridorData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Profit Corridor (P10–P90)
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={corridorData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" label={{ value: 'Month', position: 'insideBottomRight', offset: -5, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                labelFormatter={(label: number) => `Month ${label}`}
              />
              <Area type="monotone" dataKey="p10" stackId="corridor" stroke="none" fill="hsl(var(--primary) / 0.08)" />
              <Area type="monotone" dataKey="p25" stackId="corridor2" stroke="none" fill="hsl(var(--primary) / 0.15)" />
              <Area type="monotone" dataKey="median" stroke="hsl(var(--primary))" strokeWidth={2} fill="hsl(var(--primary) / 0.25)" />
              <Area type="monotone" dataKey="p75" stackId="corridor3" stroke="none" fill="hsl(var(--primary) / 0.15)" />
              <Area type="monotone" dataKey="p90" stackId="corridor4" stroke="none" fill="hsl(var(--primary) / 0.08)" />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Histogram */}
      {simulation && simulation.histogram.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Distribution of Outcomes
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={simulation.histogram} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} className="fill-muted-foreground" tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value: number, name: string) => [name === 'pct' ? `${value}%` : value, name === 'pct' ? 'Probability' : 'Count']}
                labelFormatter={(label: number) => `~$${label.toLocaleString()}`}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Scenario Comparison Table */}
      {scenarios && scenarios.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 overflow-x-auto">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Percent className="w-4 h-4 text-primary" />
            Scenario Comparison
          </h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Scenario</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Revenue M12</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Profit M12</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Runway</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Break-even</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Survival</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => (
                <tr key={s.scenarioId} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-2 font-medium text-foreground">{s.scenarioName}</td>
                  <td className="py-2 px-2 text-right tabular-nums">${s.revenueMonth12.toLocaleString()}</td>
                  <td className={cn("py-2 px-2 text-right tabular-nums", s.profitMonth12 >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                    ${s.profitMonth12.toLocaleString()}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">{s.cashRunwayMonths} mo</td>
                  <td className="py-2 px-2 text-right tabular-nums">{s.breakEvenMonth ? `${s.breakEvenMonth} mo` : '—'}</td>
                  <td className={cn("py-2 px-2 text-right tabular-nums font-medium", s.survivalProbability >= 50 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                    {s.survivalProbability.toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, positive, muted }: { label: string; value: string; positive?: boolean; muted?: boolean }) {
  return (
    <div className="p-2.5 rounded-lg bg-muted/30 border border-border text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <p className={cn(
        "text-sm font-bold tabular-nums",
        positive ? "text-emerald-600 dark:text-emerald-400" : muted ? "text-muted-foreground" : "text-foreground"
      )}>
        {value}
      </p>
    </div>
  );
}
