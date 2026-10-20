import { describe, it, expect } from 'vitest';
import { resolveTouches, touchFromLocation, referrerHost, FIRST_TOUCH_KEY } from '@/lib/attribution';

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};
const NOW = new Date('2026-10-18T12:00:00Z');

describe('attribution capture', () => {
  it('captures all utm fields and click ids from a tagged landing', () => {
    const t = touchFromLocation('?utm_source=linkedin&utm_medium=social&utm_campaign=oct&utm_content=post1&utm_term=cash&gclid=G1&fbclid=F1', null, '/pricing', NOW);
    expect(t).toMatchObject({ utm_source: 'linkedin', utm_medium: 'social', utm_campaign: 'oct', utm_content: 'post1', utm_term: 'cash', gclid: 'G1', fbclid: 'F1', landing_path: '/pricing' });
  });

  it('records an external referrer host, ignoring our own domain', () => {
    expect(referrerHost('https://www.google.com/search?q=x')).toBe('google.com');
    expect(referrerHost('https://www.aiwmcquantis.com/pricing')).toBeUndefined();
    expect(referrerHost('not a url')).toBeUndefined();
  });

  it('a direct visit carries no touch (never guessed)', () => {
    expect(touchFromLocation('', null, '/', NOW)).toBeNull();
    expect(touchFromLocation('', 'https://aiwmcquantis.com/', '/', NOW)).toBeNull();
  });

  it('keeps the first touch across sessions and later tagged visits', () => {
    const local = mem();
    resolveTouches({ search: '', referrer: 'https://l.instagram.com/', path: '/', now: NOW }, mem(), local);
    const later = resolveTouches({ search: '?utm_source=email&utm_medium=outreach', referrer: null, path: '/', now: new Date('2026-10-25T00:00:00Z') }, mem(), local);
    expect(later.first?.referrer_host).toBe('l.instagram.com');
    expect(later.session?.utm_source).toBe('email');
  });

  it('a new tab with no source still reports the stored first touch', () => {
    const local = mem();
    resolveTouches({ search: '?utm_source=linkedin&utm_medium=social', referrer: null, path: '/', now: NOW }, mem(), local);
    const newTab = resolveTouches({ search: '', referrer: null, path: '/auth', now: NOW }, mem(), local);
    expect(newTab.session).toBeNull();
    expect(newTab.first?.utm_source).toBe('linkedin');
  });

  it('expires the first touch after 90 days', () => {
    const local = mem();
    local.setItem(FIRST_TOUCH_KEY, JSON.stringify({ utm_source: 'old', ts: '2026-06-01T00:00:00Z' }));
    const r = resolveTouches({ search: '', referrer: null, path: '/', now: NOW }, mem(), local);
    expect(r.first).toBeNull();
  });

  it('a tagged visit replaces the session touch; a plain reload keeps it', () => {
    const session = mem();
    resolveTouches({ search: '?utm_source=a', referrer: null, path: '/', now: NOW }, session, mem());
    const reload = resolveTouches({ search: '', referrer: 'https://www.aiwmcquantis.com/', path: '/app', now: NOW }, session, mem());
    expect(reload.session?.utm_source).toBe('a');
    const retag = resolveTouches({ search: '?utm_source=b', referrer: null, path: '/', now: NOW }, session, mem());
    expect(retag.session?.utm_source).toBe('b');
  });

  it('survives blocked storage', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(() => resolveTouches({ search: '?utm_source=x', referrer: null, path: '/', now: NOW }, broken, broken)).not.toThrow();
  });
});
