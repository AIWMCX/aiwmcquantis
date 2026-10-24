// /cases read 11 analysis_* tables that do not exist in production; it showed
// "No cases match" under a "440+ Reference Analyses" title. It now redirects.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('/cases', () => {
  it('redirects to /examples and is no longer linked or in the sitemap', () => {
    expect(readFileSync('src/App.tsx', 'utf8')).toContain('<Route path="/cases" element={<Navigate to="/examples" replace />} />');
    expect(readFileSync('src/components/layout/Footer.tsx', 'utf8')).not.toContain("to: '/cases'");
    expect(readFileSync('public/sitemap.xml', 'utf8')).not.toContain('aiwmcquantis.com/cases<');
    expect(readFileSync('scripts/generate-sitemap.ts', 'utf8')).not.toContain("path: '/cases'");
  });
});
