import React from 'react';
import { Img3D, InView, SectionLabel, SplitButton } from '@/components/sadewa/primitives';
import { trackCtaClick } from '@/lib/analytics';

/**
 * What Quantis does — Sadewa services grid. Copy is limited to capabilities
 * the product and the rest of the site already state (deterministic engine,
 * failure pre-mortem, labeled assumptions, scenario comparison, PDF).
 */

type Card = { title: string; body: string; img: 'code-window' | 'notebook' | 'magnifier' | 'cursor' };

const BIG: Card[] = [
  {
    title: 'Deterministic financial engine',
    body: 'Cash, break-even and payback are calculated from your inputs — the same inputs always return the same numbers.',
    img: 'code-window',
  },
  {
    title: 'Failure pre-mortem',
    body: 'Quantis assumes the plan failed, then traces which assumption most likely caused it and when cash would run short.',
    img: 'notebook',
  },
];

const SMALL: Card[] = [
  {
    title: 'Labeled assumptions',
    body: 'Every metric is tagged computed, benchmark or estimated — replace any default with your own number.',
    img: 'magnifier',
  },
  {
    title: 'Scenario comparison',
    body: 'Conservative, realistic and optimistic cases side by side, so you see what changes and what holds.',
    img: 'cursor',
  },
];

export function QuantisOutputs() {
  return (
    <section aria-labelledby="quantis-outputs-heading" className="sdw-section sdw-white">
      <div className="sdw-container">
        <SectionLabel>What Quantis does</SectionLabel>
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-6 lg:gap-16 lg:items-end">
          <h2 id="quantis-outputs-heading" className="sdw-h2">One engine. Every number explained.</h2>
          <p className="sdw-lead text-[17px] lg:justify-self-end max-w-[460px]">
            Each Decision Run returns the same set of outputs — computed from your inputs, with every assumption labeled so you can see what drives the result.
          </p>
        </div>

        <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-2 gap-2">
          {BIG.map((c, i) => (
            <InView key={c.title} delay={i * 100} className="sdw-card relative overflow-hidden min-h-[320px] md:min-h-[360px] p-6 md:p-8 flex flex-col justify-end">
              <Img3D name={c.img} className="absolute -right-6 -top-10 w-[220px] md:w-[260px] transition-transform duration-700 hover:scale-105" />
              <h3 className="text-[26px] md:text-[30px] font-bold leading-tight" style={{ letterSpacing: '-0.03em', color: 'var(--sdw-ink)' }}>{c.title}</h3>
              <p className="sdw-body mt-3 max-w-[460px]" style={{ color: 'var(--sdw-ink-2)' }}>{c.body}</p>
            </InView>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
          {SMALL.map((c, i) => (
            <InView key={c.title} delay={200 + i * 100} className="sdw-card relative overflow-hidden min-h-[300px] p-6 md:p-8 flex flex-col justify-end">
              <Img3D name={c.img} className="absolute left-5 top-4 w-[150px]" />
              <h3 className="text-[24px] md:text-[26px] font-bold leading-tight" style={{ letterSpacing: '-0.03em', color: 'var(--sdw-ink)' }}>{c.title}</h3>
              <p className="sdw-body mt-3" style={{ color: 'var(--sdw-ink-2)' }}>{c.body}</p>
            </InView>
          ))}
          <InView delay={400} className="sdw-dark sdw-stars sdw-chamfer relative min-h-[300px] p-6 md:p-8 flex flex-col justify-between">
            <p className="sdw-label text-[12px]" style={{ color: 'var(--sdw-blue-hi)' }}>/Saveable report</p>
            <div>
              <h3 className="text-[24px] md:text-[26px] font-bold leading-tight" style={{ letterSpacing: '-0.03em' }}>All of it in one PDF you can share.</h3>
              <div className="mt-6">
                <SplitButton variant="accent" size="sm" to="/app" onClick={() => trackCtaClick('outputs_run_free', 'outputs')}>Run one free</SplitButton>
              </div>
            </div>
          </InView>
        </div>
      </div>
    </section>
  );
}
