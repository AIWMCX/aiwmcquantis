// The no-JavaScript bodies of the demo pages are computed from the demo
// engines (src/lib/demo/static-bodies.ts) and committed as JSON, because the
// build step that injects them runs as plain Node. This test fails when the
// JSON drifts from the engine. Regenerate with:
//   UPDATE_DEMO_BODIES=1 npx vitest run src/__tests__/demo-static-bodies.test.ts
import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { buildDemoStaticBodies, memoScenarios } from '@/lib/demo/static-bodies';
import { MEMO_SCENARIOS } from '@/pages/SampleDecisionMemo';

const JSON_PATH = 'scripts/static-bodies/demo-bodies.json';

describe('demo static bodies', () => {
  const built = buildDemoStaticBodies();

  it('committed JSON matches the demo engines', () => {
    const serialized = `${JSON.stringify(built, null, 2)}\n`;
    if (process.env.UPDATE_DEMO_BODIES) writeFileSync(JSON_PATH, serialized, 'utf8');
    // Windows checkouts may turn LF into CRLF; compare content, not line endings.
    expect(readFileSync(JSON_PATH, 'utf8').replace(/\r\n/g, '\n')).toBe(serialized);
  });

  it('uses the same memo scenarios as the Sample Decision Memo page', () => {
    expect(memoScenarios()).toEqual(MEMO_SCENARIOS);
  });

  it('has no placeholder, no extra <h1>, no template leftovers, and real prices', () => {
    for (const [route, { h1, body }] of Object.entries(built)) {
      expect(h1.length, route).toBeGreaterThan(10);
      expect(body, route).not.toMatch(/<h1|renders? after JavaScript|undefined|NaN|\$\{/);
    }
    expect(built['/demo/sample-decision-memo'].body).toContain('$349');
    expect(built['/demo/consultant-founding-pilot'].body).toContain('$499');
  });

  it('states the hiring example numbers the page shows on first load', () => {
    const b = built['/demo/hiring-decision'].body;
    expect(b).toContain('18 clients at $3,000/month');
    expect(b).toMatch(/Hire pays for itself: Month \d+/);
    expect(b).toContain('Illustrative example.');
  });
});
