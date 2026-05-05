import { describe, it, expect } from 'vitest';
import { sanitizePreviewHTML, escapeHTML } from '@/lib/htmlSanitizer';

describe('htmlSanitizer — XSS regression suite', () => {
  it('strips <script> tags', () => {
    const out = sanitizePreviewHTML('<div>ok<script>alert(1)</script></div>');
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toMatch(/alert/);
  });

  it('strips inline event handlers (onerror, onload, onclick)', () => {
    const out = sanitizePreviewHTML(
      '<img src=x onerror="alert(1)"><div onclick="alert(2)">x</div>',
    );
    expect(out).not.toMatch(/onerror/i);
    expect(out).not.toMatch(/onclick/i);
  });

  it('strips <svg onload> mutation XSS payload', () => {
    const out = sanitizePreviewHTML('<svg onload=alert(1)></svg>');
    expect(out).not.toMatch(/onload/i);
    expect(out).not.toMatch(/<svg/i);
  });

  it('blocks javascript: URLs', () => {
    const out = sanitizePreviewHTML('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toMatch(/javascript:/i);
  });

  it('strips <iframe srcdoc> namespace confusion payload', () => {
    const out = sanitizePreviewHTML(
      '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
    );
    expect(out).not.toMatch(/<iframe/i);
    expect(out).not.toMatch(/srcdoc/i);
  });

  it('strips <style> tag injection', () => {
    const out = sanitizePreviewHTML('<style>body{display:none}</style><p>x</p>');
    expect(out).not.toMatch(/<style/i);
    expect(out).toMatch(/<p>x<\/p>/);
  });

  it('preserves safe formatting tags', () => {
    const out = sanitizePreviewHTML(
      '<h1>T</h1><p><strong>bold</strong> <em>em</em></p><table><tr><td>1</td></tr></table>',
    );
    expect(out).toMatch(/<h1>T<\/h1>/);
    expect(out).toMatch(/<strong>/);
    expect(out).toMatch(/<table>/);
  });
});

describe('escapeHTML', () => {
  it('escapes HTML metacharacters', () => {
    expect(escapeHTML('<script>&"\'</script>')).toBe(
      '&lt;script&gt;&amp;&quot;&#039;&lt;/script&gt;',
    );
  });
  it('handles null/undefined safely', () => {
    expect(escapeHTML(null)).toBe('');
    expect(escapeHTML(undefined)).toBe('');
  });
});
