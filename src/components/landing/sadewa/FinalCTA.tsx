import React from 'react';
import { trackCtaClick } from '@/lib/analytics';
import { Img3D, InView, SplitButton } from '@/components/sadewa/primitives';

export function FinalCTA() {
  return (
    <section aria-labelledby="final-cta-heading" className="sdw-dark sdw-stars sdw-chamfer relative overflow-hidden" style={{ ['--sdw-cut' as string]: '72px' }}>
      <div className="sdw-container py-20 md:py-28 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
        <InView>
          <h2 id="final-cta-heading" className="sdw-h2" style={{ fontSize: 'clamp(2.6rem, 5.6vw, 4.75rem)' }}>
            Ready to test the decision before you fund it?
          </h2>
          <p className="mt-6 sdw-lead max-w-[520px]" style={{ color: 'var(--sdw-ink-2)' }}>
            Your first Decision Run is free. No credit card, no spreadsheet — just the assumptions that decide whether the money comes back.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            <SplitButton variant="accent" to="/app" onClick={() => trackCtaClick('final_cta_run_free', 'final_cta')}>Run a free decision</SplitButton>
            <SplitButton variant="ghost-dark" to="/pricing" onClick={() => trackCtaClick('final_cta_pricing', 'final_cta')}>See pricing</SplitButton>
          </div>
        </InView>

        <InView delay={160} className="relative flex justify-center lg:justify-end" aria-hidden="true">
          <div className="relative w-[280px] sm:w-[340px] aspect-square">
            <span className="absolute inset-[-12%] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(79,134,255,0.45), transparent 65%)' }} />
            <div className="absolute inset-0 rounded-[28px]" style={{ background: 'linear-gradient(160deg, #0f1c44, #070d22)', boxShadow: '0 0 0 1px #22305e inset, 0 40px 80px -30px rgba(42,98,255,0.55)' }} />
            {[18, 36, 54, 72].map((y) => (
              <span key={y} className="absolute h-px left-[-38%] w-[38%]" style={{ top: `${y}%`, background: 'linear-gradient(90deg, transparent, #34437c)' }} />
            ))}
            {[26, 62].map((y) => (
              <span key={y} className="absolute h-px right-[-34%] w-[34%]" style={{ top: `${y}%`, background: 'linear-gradient(90deg, #34437c, transparent)' }} />
            ))}
            <Img3D name="code-window" bob className="absolute inset-[10%] w-[80%] drop-shadow-[0_0_40px_rgba(79,134,255,0.55)]" />
          </div>
        </InView>
      </div>
    </section>
  );
}
