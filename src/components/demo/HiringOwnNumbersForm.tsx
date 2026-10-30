import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  validateHiringOwn,
  type HiringOwnField,
  type HiringOwnInputs,
} from '@/lib/demo/hiring-own-numbers';

type Unit = 'usd' | 'count' | 'hours' | 'pct' | 'months';

const GROUPS: { title: string; fields: { key: HiringOwnField; label: string; unit: Unit; hint?: string }[] }[] = [
  {
    title: 'Your business today',
    fields: [
      { key: 'startingClients', label: 'Active clients', unit: 'count' },
      { key: 'avgMonthlyFee', label: 'Average monthly fee per client', unit: 'usd' },
      { key: 'hoursPerClientMonthly', label: 'Delivery hours per client per month', unit: 'hours' },
      { key: 'currentHoursMonthly', label: 'Delivery hours your team has per month', unit: 'hours' },
      { key: 'fixedCostsMonthly', label: 'Monthly costs today (payroll, rent, tools)', unit: 'usd', hint: 'Before the new hire.' },
      { key: 'startingCash', label: 'Cash in the bank', unit: 'usd' },
      { key: 'churnMonthly', label: 'Clients lost per month', unit: 'pct' },
    ],
  },
  {
    title: 'The hire',
    fields: [
      { key: 'hireMonthlyCost', label: 'Fully loaded cost per month', unit: 'usd', hint: 'Salary, taxes, benefits, tools.' },
      { key: 'hireAddsHoursMonthly', label: 'Client hours the hire adds per month', unit: 'hours' },
      { key: 'hireOneTimeCost', label: 'One-time recruiting and onboarding', unit: 'usd' },
    ],
  },
  {
    title: 'Demand and payment',
    fields: [
      { key: 'newClientsPerMonth', label: 'New clients you can win per month', unit: 'count' },
      { key: 'collectionLagMonths', label: 'Months until clients pay', unit: 'months', hint: '0 = paid on delivery.' },
      { key: 'grossMargin', label: 'Gross margin on client work', unit: 'pct' },
    ],
  },
  {
    title: 'Your rule for "safe"',
    fields: [
      { key: 'cashFloor', label: 'Never let cash fall below', unit: 'usd' },
      { key: 'maxPaybackMonths', label: 'The hire must pay for itself within', unit: 'months' },
    ],
  },
];

const SUFFIX: Record<Unit, string> = { usd: '$', count: '', hours: 'h', pct: '%', months: 'mo' };

/** Percent fields are typed as 25 for 25%. */
function toDisplay(unit: Unit, v: number): string {
  return unit === 'pct' ? String(Math.round(v * 1000) / 10) : String(v);
}

function fromDisplay(unit: Unit, s: string): number {
  const n = Number(s.replace(/[$,\s%]/g, ''));
  if (s.trim() === '' || !Number.isFinite(n)) return Number.NaN;
  return unit === 'pct' ? n / 100 : n;
}

interface Props {
  initial: HiringOwnInputs;
  onRun: (inputs: HiringOwnInputs) => void;
  onCancel: () => void;
}

export function HiringOwnNumbersForm({ initial, onRun, onCancel }: Props) {
  const unitOf = Object.fromEntries(GROUPS.flatMap((g) => g.fields.map((f) => [f.key, f.unit]))) as Record<HiringOwnField, Unit>;
  const [draft, setDraft] = useState<Record<HiringOwnField, string>>(
    () => Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, toDisplay(unitOf[k as HiringOwnField], v)])) as Record<HiringOwnField, string>,
  );
  const [errors, setErrors] = useState<Partial<Record<HiringOwnField, string>>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Object.fromEntries(
      Object.entries(draft).map(([k, s]) => [k, fromDisplay(unitOf[k as HiringOwnField], s)]),
    ) as unknown as HiringOwnInputs;
    const errs = validateHiringOwn(parsed);
    setErrors(errs);
    if (Object.keys(errs).length === 0) onRun(parsed);
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Your hiring decision numbers">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {GROUPS.map((g) => (
          <fieldset key={g.title} className="space-y-3">
            <legend className="text-sm font-semibold text-foreground mb-1">{g.title}</legend>
            {g.fields.map((f) => {
              const id = `hiring-own-${f.key}`;
              const err = errors[f.key];
              return (
                <div key={f.key} className="space-y-1">
                  <Label htmlFor={id} className="text-xs text-muted-foreground">
                    {f.label}{SUFFIX[f.unit] && ` (${SUFFIX[f.unit]})`}
                  </Label>
                  <Input
                    id={id}
                    inputMode="decimal"
                    value={draft[f.key]}
                    onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                    aria-invalid={!!err}
                    aria-describedby={err ? `${id}-err` : f.hint ? `${id}-hint` : undefined}
                  />
                  {err
                    ? <p id={`${id}-err`} className="text-xs text-destructive">{err}</p>
                    : f.hint && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{f.hint}</p>}
                </div>
              );
            })}
          </fieldset>
        ))}
      </div>
      {Object.keys(errors).length > 0 && (
        <p className="mt-4 text-sm text-destructive" role="alert">Fix the highlighted fields to run the model.</p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="submit">Run on my numbers</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
