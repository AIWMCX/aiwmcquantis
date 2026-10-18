import React from 'react';
import { Link } from 'react-router-dom';
import { trackCtaClick } from '@/lib/analytics';
import { InView, SectionLabel, SplitButton } from '@/components/sadewa/primitives';

const HREF = '/demo/hiring-decision';

/** Homepage entry to the interactive hiring-decision example. */
export function HiringDemoBand() {
  return (
    <section aria-labelledby="hiring-demo-heading" className="relative">
      <div className="sdw-container py-16 md:py-20 grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-10 lg:gap-16 items-center">
        <InView>
          <SectionLabel>Hiring next? · Interactive example</SectionLabel>
          <h2 id="hiring-demo-heading" className="sdw-h2 mt-4" style={{ fontSize: 'clamp(2.2rem, 4.6vw, 3.75rem)' }}>
            Before the next hire, understand the cash commitment.
          </h2>
          <p className="mt-5 sdw-lead max-w-[560px]" style={{ color: 'var(--sdw-ink-2)' }}>
            Compare payroll, revenue ramp-up and collection timing before committing. Explore an illustrative example,
            then discuss your own decision.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <SplitButton to={HREF} onClick={() => trackCtaClick('home_hiring_demo', 'hiring_demo_band')}>
              Explore the hiring example
            </SplitButton>
            <SplitButton variant="secondary" to="/decision-review" onClick={() => trackCtaClick('home_hiring_discuss', 'hiring_demo_band')}>
              Discuss my decision
            </SplitButton>
          </div>
        </InView>

        <InView delay={140} className="flex justify-center lg:justify-end">
          <Link
            to={HREF}
            onClick={() => trackCtaClick('home_hiring_demo_poster', 'hiring_demo_band')}
            className="block w-full max-w-[340px] rounded-xl overflow-hidden focus:outline-none focus-visible:ring-2"
            style={{ boxShadow: '0 0 0 1px rgba(74,163,255,0.25), 0 40px 80px -40px rgba(42,98,255,0.55)' }}
            aria-label="Open the interactive hiring example"
          >
            <img
              src="/video/hiring-decision-demo-poster.jpg"
              alt="Illustrative cash chart: with the hire, cash dips to $40.0K in month 4 and the hire pays for itself in month 11"
              width={1080}
              height={1350}
              loading="lazy"
              decoding="async"
              className="w-full h-auto block"
            />
          </Link>
        </InView>
      </div>
    </section>
  );
}
