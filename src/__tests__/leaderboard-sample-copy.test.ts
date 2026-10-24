// The leaderboard said "Real analyses from founders" above hard-coded samples.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('leaderboard copy', () => {
  it('only claims real analyses when it is not showing samples', () => {
    const src = readFileSync('src/pages/Leaderboard.tsx', 'utf8');
    expect(src).toMatch(/usingSamples\s*\?\s*'No shared analyses yet/);
    expect(src).toMatch(/usingSamples \? 'Leaderboard' : 'Live Leaderboard'/);
  });
});
