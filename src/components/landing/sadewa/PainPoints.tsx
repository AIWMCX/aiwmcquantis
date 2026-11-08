import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { InView } from '@/components/sadewa/primitives';

const PAINS = [
  { text: 'Break-even is assumed, never tested.', pos: 'lg:left-[4%] lg:top-[6%]', from: '-48px' },
  { text: 'One optimistic price hides the real risk.', pos: 'lg:right-[3%] lg:top-[20%]', from: '48px' },
  { text: 'Rent and payroll quietly eat the margin.', pos: 'lg:left-[8%] lg:bottom-[16%]', from: '-48px' },
  { text: 'The spreadsheet only shows the plan you hoped for.', pos: 'lg:right-[6%] lg:bottom-[4%]', from: '48px' },
];

export function PainPoints() {
  return (
    // overflow-hidden: the pills slide in from 48px outside the column; without it
    // they widened a phone page to ~440px and the browser zoomed the page out.
    <section aria-labelledby="pain-heading" className="sdw-white overflow-hidden">
      <div className="sdw-container">
        <div className="relative py-20 md:py-28 lg:min-h-[640px] lg:flex lg:items-center lg:justify-center">
          <InView className="relative z-10 text-center">
            <h2 id="pain-heading" className="sdw-h2 mx-auto max-w-[14ch]" style={{ fontSize: 'clamp(2.5rem, 5.6vw, 4.75rem)' }}>
              Find what breaks before your money does.
            </h2>
          </InView>

          <ul className="mt-12 flex flex-col items-center gap-3 lg:mt-0 lg:block" aria-label="Common reasons a business plan fails">
            {PAINS.map((p, i) => (
              <li key={p.text} className={`lg:absolute ${p.pos}`}>
                <InView delay={120 + i * 140} fromX={p.from} fromY="0px">
                  <span className="sdw-pill">
                    <AlertTriangle className="w-[18px] h-[18px]" aria-hidden="true" />
                    {p.text}
                  </span>
                </InView>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
