import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { POPUP_TRIGGERS } from '@/lib/leadMagnets';

// Buy-blockers #108: the homepage interrupted visitors with a 50%-scroll and a
// 30-second email popup before they tried an analysis (2 of 164 homepage
// sessions started one in 30 days). Only exit intent remains.
describe('homepage capture points', () => {
  it('has exit intent only: no scroll or time-delay popup', () => {
    expect(POPUP_TRIGGERS.map((t) => t.type)).toEqual(['exit_intent']);
  });

  it('the remaining popup claims no users and no investor knowledge', () => {
    for (const f of ['src/components/marketing/ExitIntentPopup.tsx', 'src/lib/leadMagnets.ts']) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/used by early|investors look for/i);
    }
  });
});
