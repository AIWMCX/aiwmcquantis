// Pure formatting for the founder checkout-intent email (vitest imports this).

export type CheckoutClick = { created_at: string; offer: string; surface: string | null };
export type SessionEvent = { event_name: string; path: string | null; created_at: string };
export type IntentSession = {
  session_id: string;
  clicks: CheckoutClick[];
  events: SessionEvent[];
  channel: string;
  landing_path: string | null;
  referrer: string | null;
  utm: string | null;
  user_email: string | null;
  completed: string[]; // paid_engagements / subscriptions recorded after the first click
};

const OFFER_LABEL: Record<string, string> = {
  founder_decision_review: 'Founder Decision Review ($349)',
  consultant_founding_pilot: 'Consultant Founding Pilot ($499)',
  plus: 'Plus subscription',
  pro: 'Pro subscription',
};
export const offerLabel = (o: string) => OFFER_LABEL[o] ?? o;

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function denverTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { timeZone: 'America/Denver', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' MT';
}

export function subjectFor(sessions: IntentSession[]): string {
  const offers = [...new Set(sessions.flatMap((s) => s.clicks.map((c) => offerLabel(c.offer))))];
  const who = sessions.length === 1 ? 'A visitor' : `${sessions.length} visitors`;
  return `Checkout started: ${who} clicked ${offers.join(' + ')}`;
}

export function renderEmail(sessions: IntentSession[]): { subject: string; html: string; text: string } {
  const blocks = sessions.map((s) => {
    const first = s.clicks[0];
    const status = s.completed.length
      ? `<span style="color:#1f9d55;font-weight:700">Payment recorded: ${esc(s.completed.join(', '))}</span>`
      : `<span style="color:#d97706;font-weight:700">No payment recorded yet</span>`;
    const journey = s.events.slice(0, 14).map((e) => `<li>${esc(denverTime(e.created_at))} · ${esc(e.event_name)}${e.path ? ` <span style="color:#64748b">${esc(e.path)}</span>` : ''}</li>`).join('');
    return `
    <div style="border:1px solid #dbe4f0;border-radius:10px;padding:18px 20px;margin:0 0 16px">
      <div style="font-size:17px;font-weight:700;color:#0a1830">${esc(s.clicks.map((c) => offerLabel(c.offer)).join(' → '))}</div>
      <div style="margin:6px 0 12px;color:#334155">${esc(denverTime(first.created_at))} · ${status}</div>
      <table style="font-size:14px;color:#0f172a;border-collapse:collapse">
        <tr><td style="padding:3px 14px 3px 0;color:#64748b">Came from</td><td>${esc(s.channel)}${s.referrer ? ` (${esc(s.referrer)})` : ''}</td></tr>
        ${s.utm ? `<tr><td style="padding:3px 14px 3px 0;color:#64748b">Campaign</td><td>${esc(s.utm)}</td></tr>` : ''}
        <tr><td style="padding:3px 14px 3px 0;color:#64748b">Landed on</td><td>${esc(s.landing_path ?? 'unknown')}</td></tr>
        <tr><td style="padding:3px 14px 3px 0;color:#64748b">Clicked from</td><td>${esc(first.surface ?? 'unknown')}</td></tr>
        <tr><td style="padding:3px 14px 3px 0;color:#64748b">Signed-in email</td><td>${esc(s.user_email ?? 'anonymous visitor')}</td></tr>
      </table>
      <div style="margin-top:12px;font-size:13px;color:#334155">Session journey</div>
      <ol style="margin:6px 0 0;padding-left:18px;font-size:13px;color:#0f172a">${journey}</ol>
      <div style="margin-top:10px;font-size:12px;color:#94a3b8">Session ${esc(s.session_id)}</div>
    </div>`;
  }).join('');
  const html = `<!doctype html><html><body style="margin:0;background:#f5f7fb;font-family:Inter,Segoe UI,Arial,sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:28px 20px">
    <div style="font-size:12px;letter-spacing:3px;color:#2f6fdf;font-weight:700">AIWMC QUANTIS · CHECKOUT ALERT</div>
    <h1 style="font-size:22px;color:#0a1830;margin:8px 0 6px">Someone started checkout</h1>
    <p style="color:#334155;margin:0 0 18px;font-size:14px">Check the Stripe dashboard for the outcome. If no payment arrives, a personal follow-up within the hour is the highest-value action available. Anonymous visitors can't be contacted directly; the source tells you which channel is working.</p>
    ${blocks}
    <p style="color:#94a3b8;font-size:12px;margin-top:22px">Internal and test sessions are excluded (funnel_events_clean.is_internal). Each checkout click is reported once.</p>
  </div></body></html>`;
  const text = sessions.map((s) => `${s.clicks.map((c) => offerLabel(c.offer)).join(' -> ')} at ${denverTime(s.clicks[0].created_at)}; from ${s.channel}; landed ${s.landing_path ?? 'unknown'}; ${s.completed.length ? 'payment recorded' : 'no payment recorded yet'}; session ${s.session_id}`).join('\n');
  return { subject: subjectFor(sessions), html, text };
}
