import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import type { FounderDemoResult } from '@/lib/demo/founder-decision-demo';
import { fmtUsd } from './format';

const CHAIN = ['Growth spend', 'New customers', 'Total customers', 'Revenue', 'Gross profit', 'Cash'];

export function EconomicsStep({ result }: { result: FounderDemoResult }) {
  const chartData = result.months.slice(0, 12).map((m) => ({
    month: m.month,
    'With investment': Math.round(m.cashWith),
    'Without investment': Math.round(m.cashWithout),
  }));

  return (
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold mb-1">Make the model visible.</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Quantis calculates the financial model first, from the evidence you just saw. AI explains the result afterward — it never invents the numbers.
      </p>

      <div className="flex flex-wrap items-center gap-1.5 mb-6 text-xs">
        {CHAIN.map((label, i) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="rounded-md border border-border px-2.5 py-1 text-muted-foreground">{label}</span>
            {i < CHAIN.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" aria-hidden="true" />}
          </span>
        ))}
      </div>

      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 11 }} />
            <YAxis tickFormatter={fmtUsd} tick={{ fontSize: 11 }} width={54} />
            <Tooltip formatter={(v: number) => fmtUsd(v)} labelFormatter={(m) => `Month ${m}`} />
            <Line type="monotone" dataKey="With investment" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Without investment" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
