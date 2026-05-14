import { describe, it, expect, beforeEach } from 'vitest';
import {
  sweepAnonymousResults,
  ANON_RESULT_PREFIX,
  ANON_RECENT_KEY,
  MAX_ITEMS,
  MAX_AGE_MS,
} from '@/lib/anonResultsCleanup';

function seed(id: string, ageMs: number) {
  const cached_at = new Date(Date.now() - ageMs).toISOString();
  localStorage.setItem(
    ANON_RESULT_PREFIX + id,
    JSON.stringify({ idea: 'x', location: 'y', result: {}, cached_at }),
  );
}

describe('anonResultsCleanup', () => {
  beforeEach(() => localStorage.clear());

  it('evicts entries older than MAX_AGE_MS', () => {
    seed('fresh', 1000);
    seed('stale', MAX_AGE_MS + 60_000);
    sweepAnonymousResults();
    expect(localStorage.getItem(ANON_RESULT_PREFIX + 'fresh')).not.toBeNull();
    expect(localStorage.getItem(ANON_RESULT_PREFIX + 'stale')).toBeNull();
  });

  it('caps total entries to MAX_ITEMS, keeping newest', () => {
    for (let i = 0; i < MAX_ITEMS + 5; i++) {
      seed(`id-${i}`, (MAX_ITEMS + 5 - i) * 1000); // id-0 oldest, id-N newest
    }
    sweepAnonymousResults();
    let kept = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(ANON_RESULT_PREFIX)) kept++;
    }
    expect(kept).toBe(MAX_ITEMS);
    // Newest (highest i) must survive
    expect(localStorage.getItem(ANON_RESULT_PREFIX + `id-${MAX_ITEMS + 4}`)).not.toBeNull();
    // Oldest must be gone
    expect(localStorage.getItem(ANON_RESULT_PREFIX + 'id-0')).toBeNull();
  });

  it('clears dangling recent-id pointer', () => {
    localStorage.setItem(ANON_RECENT_KEY, 'ghost');
    sweepAnonymousResults();
    expect(localStorage.getItem(ANON_RECENT_KEY)).toBeNull();
  });

  it('ignores unrelated localStorage keys', () => {
    localStorage.setItem('keep_me', 'yes');
    seed('stale', MAX_AGE_MS + 1000);
    sweepAnonymousResults();
    expect(localStorage.getItem('keep_me')).toBe('yes');
  });

  it('evicts unparseable entries (no cached_at)', () => {
    localStorage.setItem(ANON_RESULT_PREFIX + 'bad', 'not-json');
    sweepAnonymousResults();
    expect(localStorage.getItem(ANON_RESULT_PREFIX + 'bad')).toBeNull();
  });
});
