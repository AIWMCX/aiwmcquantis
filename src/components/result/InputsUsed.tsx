import type { BusinessAnalysisResult } from '@/types/analysis';

type Row = NonNullable<BusinessAnalysisResult['inputs_used']>[number];

function formatValue(row: Row): string {
  const n = Math.round(row.value);
  if (row.unit === 'per_month') return `${n.toLocaleString('en-US')} / mo`;
  const usd = `$${n.toLocaleString('en-US')}`;
  return row.unit === 'usd_per_month' ? `${usd} / mo` : usd;
}

interface InputsUsedProps {
  rows?: BusinessAnalysisResult['inputs_used'];
  reused?: boolean;
}

/**
 * The key inputs behind the numbers, each with where it came from (your
 * input, AI estimate from your description, industry default, calculated).
 * 2026-11-03: the same idea gave two different reports and nothing on the
 * page showed which inputs the AI had guessed.
 */
export function InputsUsed({ rows, reused }: InputsUsedProps) {
  if (!rows || rows.length === 0) return null;
  return (
    <section className="mt-4 max-w-2xl text-xs text-muted-foreground" data-testid="inputs-used" aria-label="Inputs this report used">
      <p className="mb-1.5 font-medium text-foreground">Inputs this report used</p>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.key} className="flex items-baseline justify-between gap-3 border-b border-border/50 py-0.5">
            <dt>{row.label}</dt>
            <dd className="text-right">
              <span className="font-medium tabular-nums text-foreground">{formatValue(row)}</span>
              <span className="block text-[11px]">{row.origin_label}</span>
            </dd>
          </div>
        ))}
      </dl>
      {reused && (
        <p className="mt-1.5" data-testid="inputs-reused">
          You ran this description before, so the same inputs were used again and the numbers match.
        </p>
      )}
    </section>
  );
}
