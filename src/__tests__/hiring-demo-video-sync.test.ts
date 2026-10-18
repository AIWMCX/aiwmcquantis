import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { runHiringDemo, HIRING_DEMO_FIXTURE as F } from '@/lib/demo/hiring-decision-demo';

const SRC = readFileSync('marketing/2026-10-hiring-demo-video/index.html', 'utf8');
const series = (name: string) => JSON.parse(SRC.match(new RegExp(`const ${name} = (\\[[^\\]]+\\])`))![1]) as number[];

describe('hiring demo video stays in sync with the live demo engine', () => {
  const r = runHiringDemo(F.base);

  it('the cash series drawn in the video equal the engine output', () => {
    expect(series('WITH')).toEqual(r.months.map((m) => Math.round(m.cashWith)));
    expect(series('WITHOUT')).toEqual(r.months.map((m) => Math.round(m.cashWithout)));
  });

  it('the figures stated in the video match the engine', () => {
    expect(SRC).toContain(`Month ${r.paybackMonth}`);
    expect(SRC).toContain(`$${(r.lowestCash / 1000).toFixed(1)}K · month ${r.lowestCashMonth}`);
    expect(SRC).toContain(`$${Math.round(r.revenueToCoverHire).toLocaleString('en-US')}`);
    expect(SRC).toContain(`month ${runHiringDemo({ ...F.base, collectionLagMonths: 2 }).paybackMonth}`);
    expect(runHiringDemo({ ...F.base, newClientsPerMonth: 0.7 }).paybackMonth).toBeNull();
  });

  it('the rendered video and poster are published', () => {
    expect(statSync('public/video/hiring-decision-demo.mp4').size).toBeGreaterThan(500_000);
    expect(statSync('public/video/hiring-decision-demo-poster.jpg').size).toBeGreaterThan(10_000);
  });
});
