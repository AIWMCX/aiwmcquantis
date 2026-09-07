import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

describe('complimentary decision pre-mortem', () => {
  let dom: JSDOM;
  beforeEach(() => {
    dom = new JSDOM(readFileSync('public/decision-premortem.html', 'utf8'), {
      runScripts: 'dangerously',
      url: 'https://www.aiwmcquantis.com/decision-premortem.html',
    });
  });
  afterEach(() => dom.window.close());
  const element = (id: string) => dom.window.document.getElementById(id)!;
  const fill = (id: string, value: string) => {
    (element(id) as HTMLInputElement).value = value;
    element(id).dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  };
  const submit = () => element('worksheet').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  const complete = () => {
    fill('decision', 'Accept two Q4 clients');
    fill('consequence', 'Delivery capacity could be insufficient.');
    fill('test', 'Compare scope with actual project hours.');
  };

  it('delivers a useful anonymous brief with honest unknowns before any offer', () => {
    expect(element('next').hidden).toBe(true);
    complete();
    submit();
    expect(element('result').hidden).toBe(false);
    expect(element('brief').textContent).toContain('Assumption: Unknown');
    expect(element('brief').textContent).toContain('Compare scope with actual project hours.');
    expect(element('next').hidden).toBe(false);
    expect(dom.window.localStorage.length).toBe(0);
  });

  it('does not turn a claim of confirmation into evidence', () => {
    complete();
    fill('state-0', 'Confirmed by evidence');
    submit();
    expect(element('result').hidden).toBe(true);
    expect(element('status').textContent).toContain('Add both');
    fill('assumption-0', 'Two signed scopes');
    fill('evidence-0', 'Contracts dated September 7');
    submit();
    expect(element('result').hidden).toBe(false);
    expect(element('brief').textContent).toContain('Contracts dated September 7');
  });

  it('renders input as text rather than executable HTML', () => {
    complete();
    fill('decision', '<img src=x onerror=alert(1)>');
    submit();
    expect(element('brief').querySelector('img')).toBeNull();
    expect(element('brief').textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('invalidates an old brief when an answer changes', () => {
    complete();
    submit();
    fill('consequence', 'A different consequence');
    expect(element('result').hidden).toBe(true);
    expect(element('next').hidden).toBe(true);
    submit();
    expect(element('brief').textContent).toContain('A different consequence');
  });

  it('requires the decision, consequence and next test', () => {
    submit();
    expect(element('result').hidden).toBe(true);
  });
});
