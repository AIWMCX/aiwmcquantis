import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLARITY_PROJECT_ID } from '@/lib/clarity';

// Microsoft Clarity project "AIWMC Quantis" (owner jeltovbogdan@gmail.com).
// A CSP that allowed only www.clarity.ms would silently block clarity.js, the
// same way a CSP blocked GA4 from 2026-06-12 to 2026-09-17.
describe('Microsoft Clarity config', () => {
  const vercel = readFileSync('vercel.json', 'utf8');
  const csp = (vercel.match(/script-src[^;"]*/) || [''])[0];
  const connect = (vercel.match(/connect-src[^;"]*/) || [''])[0];

  it('uses the AIWMC Quantis project', () => {
    expect(CLARITY_PROJECT_ID).toBe('za95ghijug');
  });

  it('CSP lets the tag and its script load', () => {
    expect(csp).toContain('https://www.clarity.ms');
    expect(csp).toContain('https://scripts.clarity.ms');
  });

  it('CSP lets Clarity send data', () => {
    expect(connect).toMatch(/https:\/\/\*\.clarity\.ms/);
  });
});
