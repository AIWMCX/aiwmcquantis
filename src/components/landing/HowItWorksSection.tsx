import React, { useEffect, useRef, useState } from 'react';
import { BENCHMARK_COUNT_DISPLAY } from '@/config/canonical-facts';
import { Img3D, InView, SectionLabel, SplitButton } from '@/components/sadewa/primitives';
import { trackCtaClick } from '@/lib/analytics';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    num: '01',
    title: 'Describe',
    img: 'notebook' as const,
    body: `Tell Quantis what you know — industry, city, a few numbers. Blanks are filled with labeled defaults from a ${BENCHMARK_COUNT_DISPLAY}-cell modeled benchmark grid, and you can replace any of them.`,
  },
  {
    num: '02',
    title: 'Stress-test',
    img: 'magnifier' as const,
    body: 'The engine computes cash, break-even and payback, then runs downside scenarios and a failure pre-mortem against your assumptions.',
  },
  {
    num: '03',
    title: 'Compare',
    img: 'code-window' as const,
    body: 'See conservative, realistic and optimistic cases side by side — and which single assumption moves the result the most.',
  },
  {
    num: '04',
    title: 'Decide',
    img: 'cursor' as const,
    body: 'Get a verdict and a saveable report. Change one assumption and see exactly what breaks before you commit the money.',
  },
];

export function HowItWorksSection() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const i = stepRefs.current.indexOf(e.target as HTMLLIElement);
            if (i >= 0) setActive(i);
          }
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="how-it-works" aria-labelledby="how-it-works-heading" className="sdw-section">
      <div className="sdw-container">
        <SectionLabel>Our approach</SectionLabel>
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-6 lg:gap-16 lg:items-end">
          <h2 id="how-it-works-heading" className="sdw-h2">Describe it once. See what has to be true.</h2>
          <p className="sdw-lead text-[17px] lg:justify-self-end max-w-[460px]">
            Four steps, one Decision Run. No spreadsheet to build, and every number traceable to an input or a labeled default.
          </p>
        </div>

        <div className="mt-12 lg:mt-4 grid grid-cols-1 lg:grid-cols-2 gap-x-16">
          {/* Pinned visual (desktop) */}
          <div className="hidden lg:block">
            <div className="sticky top-[72px] h-[calc(100vh-72px)] flex items-center">
              <div className="relative w-full h-[440px]">
                <span
                  className="absolute left-0 bottom-6 font-bold sdw-num"
                  style={{ fontSize: '96px', letterSpacing: '-0.05em', color: 'var(--sdw-line-strong)', lineHeight: 1 }}
                  aria-hidden="true"
                >
                  /{STEPS[active].num}
                </span>
                {STEPS.map((s, i) => (
                  <Img3D
                    key={s.num}
                    name={s.img}
                    className={cn(
                      'absolute left-[22%] top-0 w-[400px] transition-all duration-700 ease-[cubic-bezier(.2,.7,.2,1)]',
                      i === active ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-90 -rotate-6',
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          <ol>
            {STEPS.map((s, i) => (
              <li
                key={s.num}
                ref={(el) => { stepRefs.current[i] = el; }}
                aria-current={i === active ? 'step' : undefined}
                className="lg:min-h-[78vh] flex flex-col justify-center py-10 lg:py-0 border-b lg:border-b-0"
                style={{ borderColor: 'var(--sdw-line)' }}
              >
                <div className="lg:hidden flex items-end gap-4 mb-6">
                  <Img3D name={s.img} className="w-40" />
                  <span className="font-bold sdw-num" style={{ fontSize: '56px', letterSpacing: '-0.05em', color: 'var(--sdw-line-strong)', lineHeight: 1 }}>/{s.num}</span>
                </div>
                <div className={cn('transition-opacity duration-500', 'lg:opacity-30', i === active && 'lg:opacity-100')}>
                  <h3 className="font-bold" style={{ fontSize: 'clamp(2.75rem, 5vw, 4.5rem)', letterSpacing: '-0.045em', lineHeight: 1, color: 'var(--sdw-ink)' }}>
                    {s.title}
                  </h3>
                  <p className="mt-5 text-[18px] leading-relaxed max-w-[520px]" style={{ color: 'var(--sdw-ink-2)' }}>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <InView className="mt-10 lg:mt-0 flex flex-col sm:flex-row sm:items-center gap-4">
          <SplitButton to="/app" onClick={() => trackCtaClick('how_it_works_run_free', 'how_it_works')}>Run my first analysis free</SplitButton>
          <span className="sdw-label text-[12px]" style={{ color: 'var(--sdw-muted)' }}>/Results in under 90 seconds</span>
        </InView>
      </div>
    </section>
  );
}
