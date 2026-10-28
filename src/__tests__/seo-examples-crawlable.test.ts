import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// SEO audit 2026-10-27 (Phase 2, item 9): /examples showed 12 cards behind a
// "Load more" button, so crawlers saw 12 of 51 examples. Both the live page and
// the no-JS fallback now link every example. Structured data uses the
// canonical www host (the apex 308-redirects).
describe('/examples is fully crawlable', () => {
  it('the page renders a link to every example, not only the visible cards', () => {
    const src = readFileSync('src/pages/examples/ExamplesIndex.tsx', 'utf8');
    expect(src).toMatch(/byIndustry\.map/);
    expect(src).toMatch(/list\.map\(\(ex\) => \(\s*<li key=\{ex\.slug\}>\s*<Link to=\{`\/examples\/\$\{ex\.slug\}`\}/);
  });

  it('the no-JS fallback for /examples lists every example link', () => {
    const src = readFileSync('scripts/generate-static-bodies.mjs', 'utf8');
    expect(src).toMatch(/"\/examples": `<p class="q-lede">[\s\S]*?Object\.entries\(EXAMPLES\)[\s\S]*?href="\/examples\/\$\{escapeHtml\(slug\)\}"/);
    expect(src).not.toMatch(/across 51 business types/);
  });

  it('structured data uses the www host', () => {
    for (const f of [
      'src/pages/examples/ExampleAnalysis.tsx',
      'src/pages/BlogArticle.tsx',
      'src/pages/Pricing.tsx',
      'src/pages/vs/VsComparePage.tsx',
    ]) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/https:\/\/aiwmcquantis\.com/);
    }
  });
});
