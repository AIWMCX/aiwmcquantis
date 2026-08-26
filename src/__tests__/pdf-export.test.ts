/**
 * PDF export pipeline regression tests
 * ------------------------------------
 * The unified pipeline lives in `src/hooks/usePdfExport.ts` and uses
 * `@react-pdf/renderer`. These tests guard against:
 *   - the deleted `html2pdf.js` stack creeping back in
 *   - font drift away from built-in Helvetica (cross-browser safe)
 *   - the canonical export hook being renamed or removed
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const HOOK = readFileSync(
  resolve(__dirname, '../hooks/usePdfExport.ts'),
  'utf8'
);
const PKG = JSON.parse(
  readFileSync(resolve(__dirname, '../../package.json'), 'utf8')
);

describe('usePdfExport — canonical PDF pipeline', () => {
  it('exports a usePdfExport hook with generatePdf + isGenerating', () => {
    expect(HOOK).toMatch(/export function usePdfExport\(/);
    expect(HOOK).toMatch(/return\s*{[^}]*generatePdf[^}]*isGenerating/);
  });

  it('uses @react-pdf/renderer (not html2pdf.js)', () => {
    expect(HOOK).toMatch(/from ['"]@react-pdf\/renderer['"]/);
    expect(HOOK).not.toMatch(/html2pdf/i);
  });

  it('uses built-in Helvetica fonts for cross-browser stability', () => {
    expect(HOOK).toMatch(/fontFamily = ['"]Helvetica['"]/);
    expect(HOOK).toMatch(/Helvetica-Bold/);
  });

  it('registers a hyphenation callback to prevent text-wrap regressions', () => {
    expect(HOOK).toMatch(/Font\.registerHyphenationCallback/);
  });

  it('clips PDF page-header idea and section text so labels never collide', () => {
    expect(HOOK).toMatch(/pageHeaderTitleWrap:[\s\S]*width: 230[\s\S]*overflow: 'hidden'/);
    expect(HOOK).toMatch(/pageHeaderSectionWrap:[\s\S]*width: 118[\s\S]*overflow: 'hidden'/);
    expect(HOOK.match(/maxLines: 1/g)?.length ?? 0).toBeGreaterThanOrEqual(8);
    expect(HOOK).not.toMatch(/style: styles\.pageHeaderTitle }, result\.metadata\.idea/);
  });

  it('enforces a generation timeout to prevent UI lock-ups', () => {
    expect(HOOK).toMatch(/PDF_TIMEOUT|Promise\.race/);
  });

  it('package.json no longer ships html2pdf.js', () => {
    const all = { ...(PKG.dependencies ?? {}), ...(PKG.devDependencies ?? {}) };
    expect(all['html2pdf.js']).toBeUndefined();
  });

  it('still ships @react-pdf/renderer as the single PDF stack', () => {
    expect(PKG.dependencies?.['@react-pdf/renderer']).toBeTruthy();
  });

  // GTM-audit item #3 (2026-08-25): real production PDF ("15 physical
  // pages but footers describe 10") had hardcoded 'Page N of 10' strings
  // that never accounted for react-pdf's own content-overflow pagination,
  // and were already internally wrong before any overflow (jumped 8 -> 10,
  // never printing "9"). Fixed via react-pdf's render+fixed contract, the
  // only mechanism that reflects the ACTUAL physical page count.
  it('never hardcodes a literal page-count string in a page footer', () => {
    expect(HOOK).not.toMatch(/'Page \d+ of \d+'/);
  });

  it('uses react-pdf\'s render+fixed contract for a truly dynamic page footer', () => {
    expect(HOOK).toMatch(/render:\s*\(\{\s*pageNumber,\s*totalPages\s*\}/);
    expect(HOOK).toMatch(/`Page \$\{pageNumber\} of \$\{totalPages\}`/);
    expect(HOOK).toMatch(/fixed:\s*true/);
  });

  // GTM-audit item #2 (2026-08-25): real production incident where the UI
  // showed "AI narrative unavailable" yet the exported PDF carried a full
  // narrative and a plain "VIABLE" verdict with no indication anything had
  // failed. Fixed by reading used_fallback/report_integrity (already set
  // server-side in analyze-business/index.ts) and refusing to present a
  // clean verdict when either is tripped.
  it('never lets a report_integrity BLOCK produce a clean verdict', () => {
    expect(HOOK).toMatch(/integrityBlocked/);
    expect(HOOK).toMatch(/report_integrity['"]?\)?\s*===\s*['"]BLOCK['"]/);
    expect(HOOK).toMatch(/REVIEW REQUIRED/);
  });

  it('labels a degraded (AI-fallback) analysis distinctly from a full one', () => {
    expect(HOOK).toMatch(/isDegraded/);
    expect(HOOK).toMatch(/used_fallback/);
    expect(HOOK).toMatch(/DETERMINISTIC ONLY/);
  });
});
