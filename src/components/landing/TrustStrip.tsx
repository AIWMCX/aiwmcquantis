import React from 'react';
import { BENCHMARK_COUNT_DISPLAY, BENCHMARK_SOURCE_DETAILS } from '@/config/canonical-facts';
import { InView, SectionLabel } from '@/components/sadewa/primitives';

/**
 * TrustStrip — stands in for testimonials until real, linkable founder
 * profiles exist. Trust comes from named public data sources and
 * verifiable posture statements, not stock quotes.
 */

const METRICS = [
  { value: BENCHMARK_COUNT_DISPLAY, label: 'Modeled benchmark cells' },
  { value: 'Multi-model', label: 'Consensus cross-check' },
  { value: 'SOC 2', label: 'Security posture in prep' },
  { value: 'GDPR', label: '& CCPA rights supported' },
];

export function TrustStrip() {
  return (
    <section aria-labelledby="trust-strip-heading" className="sdw-section sdw-white">
      <div className="sdw-container">
        <SectionLabel>Where the numbers come from</SectionLabel>
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-6 lg:gap-16 lg:items-end">
          <h2 id="trust-strip-heading" className="sdw-h2">Trust the math, not the marketing.</h2>
          <p className="sdw-lead text-[17px] lg:justify-self-end max-w-[460px]">
            Every projection is anchored in public, citeable data. When we can't back a number responsibly, we say so.
          </p>
        </div>

        <ol className="mt-12 md:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t" style={{ borderColor: 'var(--sdw-line)' }}>
          {BENCHMARK_SOURCE_DETAILS.map((s, i) => (
            <InView
              as="li"
              key={s.name}
              delay={i * 90}
              className="py-8 pr-6 border-b sm:[&:nth-child(odd)]:border-r lg:border-r lg:[&:last-child]:border-r-0 sm:pl-0 lg:pl-6 lg:first:pl-0"
              style={{ borderColor: 'var(--sdw-line)' }}
            >
              <span className="sdw-label text-[12px]" style={{ color: 'var(--sdw-muted)' }}>/{String(i + 1).padStart(2, '0')}</span>
              <p className="mt-6 text-[24px] font-bold" style={{ letterSpacing: '-0.03em', color: 'var(--sdw-ink)' }}>{s.name}</p>
              <p className="sdw-body mt-2 text-[15px]">{s.full}</p>
            </InView>
          ))}
        </ol>

        <dl className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-2">
          {METRICS.map((m, i) => (
            <InView key={m.label} delay={i * 80} className="sdw-card p-6">
              <dt className="sdw-label text-[12px]" style={{ color: 'var(--sdw-muted)' }}>{m.label}</dt>
              <dd className="mt-3 text-[30px] font-bold sdw-num" style={{ letterSpacing: '-0.03em', color: 'var(--sdw-ink)' }}>{m.value}</dd>
            </InView>
          ))}
        </dl>

        <p className="mt-8 text-[14px] max-w-2xl" style={{ color: 'var(--sdw-muted)' }}>
          Named founder case studies are being verified with real, linkable profiles and will appear here when public consent is confirmed. We don't ship stock quotes.
        </p>
      </div>
    </section>
  );
}
