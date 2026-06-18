/**
 * Native HTML rendering of the Quantis sample executive report.
 *
 * This replaces the rasterized JPG page stack that produced unreadable text
 * (broken kerning like "D raftLab", "m em bership") with crisp, zoomable,
 * accessibility-friendly typography rendered by the browser itself.
 *
 * Reading-mode controls (zoom + high contrast) are handled by the parent.
 */

import React from 'react';
import { SAMPLE_REPORT } from '@/data/sampleReport';

type Theme = 'dark' | 'highContrast' | 'sepia';
export type Density = 'compact' | 'comfort' | 'spacious';

interface SampleReportPagesProps {
  /** 1.0 = baseline (~16px body). Reading-mode zoom multiplies font/line-height. */
  zoom: number;
  theme: Theme;
  /** Line-height / vertical-rhythm preset. Defaults to 'comfort'. */
  density?: Density;
  /** Ref array so the parent scroller can scroll to a specific page. */
  pageRefs: React.MutableRefObject<Array<HTMLElement | null>>;
}

const DENSITY_LINE_HEIGHT: Record<Density, { base: number; body: number }> = {
  compact:  { base: 1.45, body: 1.55 },
  comfort:  { base: 1.65, body: 1.75 },
  spacious: { base: 1.9,  body: 2.0  },
};

const themeStyles: Record<Theme, {
  page: React.CSSProperties;
  title: string;
  body: string;
  muted: string;
  rule: string;
  kpiBg: string;
  kpiBorder: string;
  accent: string;
}> = {
  dark: {
    page: { background: '#0F1A2E', color: '#E6EEFF' },
    title: '#FFFFFF',
    body: 'rgba(230,238,255,0.86)',
    muted: 'rgba(230,238,255,0.55)',
    rule: 'rgba(143,255,42,0.35)',
    kpiBg: 'rgba(255,255,255,0.04)',
    kpiBorder: 'rgba(255,255,255,0.08)',
    accent: '#8FFF2A',
  },
  highContrast: {
    page: { background: '#000000', color: '#FFFFFF' },
    title: '#FFFFFF',
    body: '#FFFFFF',
    muted: '#FFE800',
    rule: '#FFE800',
    kpiBg: '#000000',
    kpiBorder: '#FFFFFF',
    accent: '#FFE800',
  },
  sepia: {
    page: { background: '#F6EFE0', color: '#2A1F12' },
    title: '#1A120B',
    body: '#2A1F12',
    muted: '#7A6748',
    rule: '#B8995D',
    kpiBg: 'rgba(0,0,0,0.04)',
    kpiBorder: 'rgba(0,0,0,0.12)',
    accent: '#7A4A12',
  },
};

export function SampleReportPages({ zoom, theme, pageRefs }: SampleReportPagesProps) {
  const t = themeStyles[theme];

  // Typography that always renders crisply — system stack with widely-available web faces.
  const fontFamily =
    '"Sora", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const monoFamily =
    '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

  // Base size scales with reading-mode zoom (1.0 → ~16px body).
  const basePx = Math.round(16 * zoom * 100) / 100;

  return (
    <>
      {SAMPLE_REPORT.pages.map((p, i) => (
        <article
          key={p.id}
          ref={(el) => { pageRefs.current[i] = el; }}
          aria-label={`Page ${p.id} of ${SAMPLE_REPORT.pages.length} — ${p.title}`}
          className="relative w-full max-w-[920px] rounded-[8px] overflow-hidden group"
          style={{
            ...t.page,
            fontFamily,
            fontSize: `${basePx}px`,
            lineHeight: 1.65,
            letterSpacing: '-0.005em',
            fontFeatureSettings: '"kern" 1, "liga" 1, "calt" 1, "tnum" 1',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'optimizeLegibility',
            border: `1px solid ${t.kpiBorder}`,
            boxShadow:
              theme === 'sepia'
                ? '0 12px 30px -12px rgba(0,0,0,0.25)'
                : '0 1px 0 rgba(255,255,255,0.06) inset, 0 24px 60px -20px rgba(0,0,0,0.75)',
          }}
        >
          <div className="px-7 sm:px-10 py-8 sm:py-10">
            {/* Kicker */}
            <div className="flex items-center justify-between mb-4">
              <span
                style={{
                  color: t.muted,
                  fontSize: `${0.66 * basePx}px`,
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  fontFamily,
                }}
              >
                {p.kicker}
              </span>
              <span
                style={{
                  color: t.muted,
                  fontSize: `${0.66 * basePx}px`,
                  fontFamily: monoFamily,
                  letterSpacing: '0.12em',
                }}
              >
                {String(p.id).padStart(2, '0')} / {String(SAMPLE_REPORT.pages.length).padStart(2, '0')}
              </span>
            </div>

            {/* Title */}
            <h3
              style={{
                color: t.title,
                fontSize: `${1.65 * basePx}px`,
                lineHeight: 1.18,
                letterSpacing: '-0.022em',
                fontWeight: 700,
                fontFamily,
              }}
            >
              {p.title}
            </h3>
            <div
              aria-hidden="true"
              style={{
                marginTop: `${0.9 * basePx}px`,
                marginBottom: `${1.25 * basePx}px`,
                height: 1,
                background: `linear-gradient(to right, ${t.rule}, transparent)`,
              }}
            />

            {/* Body paragraphs */}
            {'body' in p && p.body && (
              <div className="space-y-4">
                {p.body.map((para, idx) => (
                  <p
                    key={idx}
                    style={{
                      color: t.body,
                      fontSize: `${basePx}px`,
                      lineHeight: 1.7,
                      fontFamily,
                    }}
                  >
                    {para}
                  </p>
                ))}
              </div>
            )}

            {/* KPI grid */}
            {'kpis' in p && p.kpis && (
              <dl
                className="grid grid-cols-2 sm:grid-cols-2 gap-3 mt-5"
                style={{ fontFamily }}
              >
                {p.kpis.map((k) => (
                  <div
                    key={k.label}
                    style={{
                      background: t.kpiBg,
                      border: `1px solid ${t.kpiBorder}`,
                      borderRadius: 6,
                      padding: `${0.75 * basePx}px ${0.9 * basePx}px`,
                    }}
                  >
                    <dt
                      style={{
                        color: t.muted,
                        fontSize: `${0.66 * basePx}px`,
                        fontWeight: 600,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {k.label}
                    </dt>
                    <dd
                      style={{
                        marginTop: 4,
                        color: t.title,
                        fontSize: `${1.4 * basePx}px`,
                        fontFamily: monoFamily,
                        fontWeight: 600,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {k.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {/* Bullets */}
            {'bullets' in p && p.bullets && (
              <ul className="mt-2 space-y-2" style={{ fontFamily }}>
                {p.bullets.map((b, idx) => (
                  <li
                    key={idx}
                    style={{
                      color: t.body,
                      fontSize: `${basePx}px`,
                      lineHeight: 1.65,
                      paddingLeft: `${1.4 * basePx}px`,
                      position: 'relative',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: `${0.55 * basePx}px`,
                        width: `${0.55 * basePx}px`,
                        height: 1.5,
                        background: t.accent,
                      }}
                    />
                    {b}
                  </li>
                ))}
              </ul>
            )}

            {/* Two-column table */}
            {'table' in p && p.table && (
              <table
                className="w-full mt-3 border-collapse"
                style={{ fontFamily, fontSize: `${0.92 * basePx}px` }}
              >
                <tbody>
                  {p.table.map(([k, v], idx) => {
                    const isTotal = k.toLowerCase() === 'total';
                    return (
                      <tr key={idx} style={{ borderBottom: `1px dashed ${t.kpiBorder}` }}>
                        <td
                          style={{
                            color: isTotal ? t.title : t.body,
                            padding: `${0.55 * basePx}px ${0.4 * basePx}px`,
                            fontWeight: isTotal ? 700 : 400,
                          }}
                        >
                          {k}
                        </td>
                        <td
                          style={{
                            color: isTotal ? t.accent : t.title,
                            padding: `${0.55 * basePx}px ${0.4 * basePx}px`,
                            fontFamily: monoFamily,
                            fontWeight: isTotal ? 700 : 500,
                            textAlign: 'right',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {v}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {'footer' in p && p.footer && (
              <p
                className="mt-8"
                style={{
                  color: t.muted,
                  fontSize: `${0.78 * basePx}px`,
                  fontStyle: 'italic',
                  fontFamily,
                }}
              >
                {p.footer}
              </p>
            )}
          </div>
        </article>
      ))}
    </>
  );
}
