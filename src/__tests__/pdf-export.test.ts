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
});
