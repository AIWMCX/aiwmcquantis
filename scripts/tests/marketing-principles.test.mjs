import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MARKETING_PRINCIPLES, reviewMarketingClaims } from '../../supabase/functions/_shared/marketing-principles.ts';

test('unsupported urgency and example social proof require review', () => {
  for (const text of ['Ends tonight', 'Only 3 spots left', 'Diwali sale', 'Rated 4.2 stars', '10,000 reviews', 'ten thousand reviews', 'Только сегодня', 'Осталось 2 места']) {
    assert.ok(reviewMarketingClaims(text).length, text);
  }
});
test('useful financial copy and canonical prices stay usable', () => {
  for (const text of ['See a worked decision.', 'Plus is $17/month.', 'Illustrative example: $120K expansion.', 'Revenue is not cash. Try the free example.', 'Compare 3 scenarios and replace one assumption.']) {
    assert.deepEqual(reviewMarketingClaims(text), [], text);
  }
});
test('all requested principles have a shared rule', () => {
  assert.equal(MARKETING_PRINCIPLES.length, 16);
  assert.equal(new Set(MARKETING_PRINCIPLES.map(x => x[0])).size, 16);
});
test('policy reaches all generators and checks precede autoposter persistence', () => {
  const root = new URL('../../supabase/functions/', import.meta.url);
  for (const file of ['content-studio-generate/index.ts', 'autoposter-generate-content/index.ts', '_shared/commercial/agent-runtime.ts']) {
    const s = readFileSync(new URL(file, root), 'utf8');
    assert.match(s, /MARKETING_SYSTEM_PROMPT/);
  }
  const s = readFileSync(new URL('autoposter-generate-content/index.ts', root), 'utf8');
  assert.ok(s.indexOf('reviewMarketingClaims(content)') < s.indexOf('.upsert('));
});
