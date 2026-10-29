import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Page 1 of the Decision Memo PDF shows the same "What has to be true" list
// as the result screen, built by the same pure function from the same figures.
describe('Decision Memo page 1 carries "What has to be true"', () => {
  const src = readFileSync('src/hooks/usePdfExport.ts', 'utf8');
  const memo = src.slice(src.indexOf('export const createDecisionMemoReport'));
  const page1 = memo.slice(0, memo.indexOf("pageFooter('Page 1')"));

  it('uses the shared whatHasToBeTrue() rather than new wording', () => {
    expect(src).toMatch(/import \{ whatHasToBeTrue \} from '@\/lib\/what-has-to-be-true'/);
    expect(memo).toMatch(/const memoConditions = whatHasToBeTrue\(/);
  });

  it('renders it on page 1, before the page-1 footer', () => {
    expect(page1).toMatch(/sectionHeading\('What Has To Be True'\)/);
    expect(page1).toMatch(/memoConditions\.map/);
  });
});
