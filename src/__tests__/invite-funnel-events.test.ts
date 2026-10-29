import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// 2026-10-29: a community invite post was unmeasurable — /invite/<token>
// recorded nothing until a signup. Opens, sign-in emails and redemptions are
// now funnel events, shown on /admin/funnel. The token never goes in metadata.
describe('invite funnel events', () => {
  const page = readFileSync('src/pages/Invite.tsx', 'utf8');
  it('records open, magic-link request and redemption', () => {
    expect(page).toMatch(/recordFunnelEvent\('invite_page_view', \{ invite_status: status \}\)/);
    expect(page).toMatch(/recordFunnelEvent\('invite_magic_link_sent', \{ ok: true \}\)/);
    expect(page).toMatch(/recordFunnelEvent\('invite_redeemed', \{ result: row\.result \}\)/);
  });
  it('offers an example report before asking for an email, tracked, in a new tab', () => {
    expect(page).toContain('href="/demo/sample-decision-memo"');
    expect(page).toMatch(/recordFunnelEvent\('sample_cta_click', \{ surface: 'invite' \}\)/);
    expect(page).toMatch(/data-testid="invite-sample-link"/);
  });
  it('never sends the token', () => {
    for (const m of page.matchAll(/recordFunnelEvent\([^)]*\)/g)) expect(m[0]).not.toMatch(/token/);
  });
  it('admin funnel shows the three invite events', () => {
    const f = readFileSync('src/pages/admin/Funnel.tsx', 'utf8');
    for (const k of ['invite_page_view', 'invite_magic_link_sent', 'invite_redeemed']) expect(f).toContain(`key: '${k}'`);
  });
});
