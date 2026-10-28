import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Founder rule 2026-10-27: every scheduled LinkedIn post carries an image.
const src = readFileSync('src/hooks/useAutoposter.ts', 'utf8');
const body = (name: string) => {
  const start = src.indexOf(`export function ${name}`);
  return src.slice(start, src.indexOf('\nexport function', start + 1));
};

describe('LinkedIn posts cannot be scheduled without an image', () => {
  it('approve & schedule checks asset_path before any update', () => {
    const fn = body('useApproveAndSchedule');
    const guard = fn.indexOf('!input.post.asset_path');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(fn.indexOf(".update({ status: 'scheduled'"));
  });

  it('reschedule checks the post image before scheduling', () => {
    const fn = body('useReschedulePlatform');
    const guard = fn.indexOf(".select('asset_path')");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(fn.indexOf(".update({ status: 'scheduled'"));
  });
});
