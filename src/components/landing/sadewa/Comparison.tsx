import React from 'react';
import { Check, X } from 'lucide-react';
import { InView } from '@/components/sadewa/primitives';

const QUANTIS = [
  'Deterministic math — same inputs, same numbers',
  'Every assumption labeled and replaceable',
  'Downside scenarios side by side',
  'Benchmark defaults with named sources',
  'A failure pre-mortem built into every run',
  'A saveable PDF report you can share',
];

const OTHER = [
  'Spreadsheet: you build and audit every formula',
  'AI chat: numbers can change each time you ask',
  'Usually one base case, no stress test',
  'Defaults with no source behind them',
  'The optimistic plan is the only plan',
  'Copy the results into a deck yourself',
];

export function Comparison() {
  return (
    <section aria-labelledby="difference-heading" className="sdw-section sdw-white">
      <div className="sdw-container">
        <InView className="text-center">
          <h2 id="difference-heading" className="sdw-h2" style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}>The difference is clear</h2>
        </InView>

        <div className="mt-12 md:mt-16 mx-auto max-w-[860px] grid grid-cols-1 md:grid-cols-2 gap-6">
          <InView className="sdw-dark sdw-chamfer relative p-7 md:p-8" style={{ ['--sdw-cut' as string]: '52px' }}>
            <span aria-hidden="true" className="absolute left-0 top-7 h-9 w-[5px]" style={{ background: 'var(--sdw-accent)' }} />
            <p className="text-center text-[28px] font-extrabold" style={{ letterSpacing: '-0.03em' }}>
              QUANTIS<span style={{ color: 'var(--sdw-accent)' }}>.</span>
            </p>
            <ul className="mt-8 space-y-6">
              {QUANTIS.map((t) => (
                <li key={t} className="flex items-start gap-3 text-[17px] leading-snug">
                  <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[3px]" style={{ background: 'var(--sdw-accent)' }}>
                    <Check className="h-3 w-3 text-white" strokeWidth={3} aria-hidden="true" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </InView>

          <InView delay={140} className="sdw-chamfer relative p-7 md:p-8" style={{ background: 'var(--sdw-card)', ['--sdw-cut' as string]: '52px' }}>
            <span aria-hidden="true" className="absolute left-0 top-7 h-9 w-[5px]" style={{ background: 'var(--sdw-line-strong)' }} />
            <p className="text-center text-[24px] font-bold" style={{ letterSpacing: '-0.03em', color: 'var(--sdw-ink)' }}>Spreadsheet or AI chat</p>
            <ul className="mt-9 space-y-6">
              {OTHER.map((t) => (
                <li key={t} className="flex items-start gap-3 text-[17px] leading-snug" style={{ color: 'var(--sdw-ink-2)' }}>
                  <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[3px]" style={{ background: 'var(--sdw-line)' }}>
                    <X className="h-3 w-3" strokeWidth={3} style={{ color: 'var(--sdw-ink-2)' }} aria-hidden="true" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </InView>
        </div>
      </div>
    </section>
  );
}
