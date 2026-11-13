/**
 * "Email me this result" [F3, M5]: pure validation and rendering for the
 * email-my-result function. A visitor asks for the numbers they just saw;
 * the email carries only those numbers, a link back, and an invitation to
 * reply (a real conversation, the thing 566 cold emails never produced).
 *
 * Abuse limits: this endpoint can mail any address, so the content is
 * locked down. Only short label/value rows (escaped, length-capped), a
 * fixed set of surfaces with fixed subjects, and a same-site path. No free
 * text, no HTML and no external links come from the caller.
 */

export const RESULT_SURFACES = {
  hire_afford: { subject: 'Your hiring check from AIWMC Quantis', heading: 'Can you afford this hire?' },
  hiring_demo: { subject: 'Your hiring decision from AIWMC Quantis', heading: 'Your hiring decision' },
  analysis: { subject: 'Your decision analysis from AIWMC Quantis', heading: 'Your decision analysis' },
} as const;

export type ResultSurface = keyof typeof RESULT_SURFACES;

export interface ResultRow { label: string; value: string }

export interface ResultEmailRequest {
  email: string;
  surface: ResultSurface;
  title?: string;
  rows: ResultRow[];
  /** Same-site path the visitor can open to see the result again. */
  path: string;
}

export const LIMITS = { rows: 8, label: 60, value: 48, title: 100, path: 600 } as const;

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
// Same-site path only: no scheme, no host, no protocol-relative "//".
const PATH_RE = /^\/(?!\/)[A-Za-z0-9\-._~/?&=%+,:]*$/;

const clean = (s: unknown, max: number): string =>
  String(s ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

export type ParseResult = { ok: true; value: ResultEmailRequest } | { ok: false; error: string };

export function parseResultEmailRequest(body: unknown): ParseResult {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid body' };
  const b = body as Record<string, unknown>;
  const email = String(b.email ?? '').trim();
  if (email.length > 254 || !EMAIL_RE.test(email)) return { ok: false, error: 'Invalid email address' };
  const surface = String(b.surface ?? '');
  if (!(surface in RESULT_SURFACES)) return { ok: false, error: 'Unknown surface' };
  if (!Array.isArray(b.rows) || b.rows.length === 0 || b.rows.length > LIMITS.rows) {
    return { ok: false, error: `Between 1 and ${LIMITS.rows} rows` };
  }
  const rows: ResultRow[] = [];
  for (const r of b.rows) {
    const row = r as Record<string, unknown>;
    const label = clean(row?.label, LIMITS.label);
    const value = clean(row?.value, LIMITS.value);
    if (!label || !value) return { ok: false, error: 'Every row needs a label and a value' };
    rows.push({ label, value });
  }
  const path = String(b.path ?? '');
  if (path.length > LIMITS.path || !PATH_RE.test(path)) return { ok: false, error: 'Invalid path' };
  const title = b.title === undefined ? undefined : clean(b.title, LIMITS.title) || undefined;
  return { ok: true, value: { email, surface: surface as ResultSurface, title, rows, path } };
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const SITE = 'https://www.aiwmcquantis.com';

export function resultEmailLink(path: string): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${SITE}${path}${sep}utm_source=result_email&utm_medium=email&utm_campaign=email_my_result`;
}

export function renderResultEmail(r: ResultEmailRequest): { subject: string; html: string; text: string } {
  const s = RESULT_SURFACES[r.surface];
  const link = resultEmailLink(r.path);
  const rowsHtml = r.rows
    .map((row) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#4b5563">${esc(row.label)}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#111827;text-align:right">${esc(row.value)}</td></tr>`)
    .join('');
  const html = `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb">
<tr><td style="padding:24px 24px 8px"><p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">AIWMC Quantis</p>
<h1 style="margin:0 0 4px;font-size:20px;color:#111827">${esc(s.heading)}</h1>
${r.title ? `<p style="margin:0;color:#4b5563;font-size:14px">${esc(r.title)}</p>` : ''}</td></tr>
<tr><td style="padding:8px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${rowsHtml}</table></td></tr>
<tr><td style="padding:16px 24px"><a href="${esc(link)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px;font-size:14px">Open it again or change the numbers</a></td></tr>
<tr><td style="padding:0 24px 16px;font-size:14px;color:#374151">If you want a person to look at this decision with you, reply to this email. The founder reads every reply.</td></tr>
<tr><td style="padding:12px 24px 24px;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb">These numbers come from the inputs you entered; they are not checked facts and not financial advice. You asked for this email on aiwmcquantis.com. We will not add you to a mailing list.</td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    `AIWMC Quantis: ${s.heading}`,
    ...(r.title ? [r.title] : []),
    '',
    ...r.rows.map((row) => `${row.label}: ${row.value}`),
    '',
    `Open it again or change the numbers: ${link}`,
    '',
    'If you want a person to look at this decision with you, reply to this email. The founder reads every reply.',
    '',
    'These numbers come from the inputs you entered; they are not checked facts and not financial advice. You asked for this email on aiwmcquantis.com. We will not add you to a mailing list.',
  ].join('\n');
  return { subject: s.subject, html, text };
}
