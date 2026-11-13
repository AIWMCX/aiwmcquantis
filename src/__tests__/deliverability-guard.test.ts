import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { deliverabilityGate, isRoleAddress, THRESHOLDS } from '../../supabase/functions/_shared/mail/deliverability-guard';

// 2026-11-13: 525 cold emails from the brand domain, 0 human replies,
// 69/130 audited sends to shared inboxes. These rules make that impossible.
const healthy = { sent7d: 50, bounces7d: 0, unsubscribes7d: 0, sent14d: 80, humanReplies14d: 2 };

describe('deliverability guard', () => {
  it('blocks cold mail from the brand domain and its subdomains', () => {
    expect(deliverabilityGate('hello@aiwmcquantis.com', healthy).ok).toBe(false);
    expect(deliverabilityGate('bogdan@mail.aiwmcquantis.com', healthy).ok).toBe(false);
    expect(deliverabilityGate('bogdan@separate-sending-domain.com', healthy).ok).toBe(true);
  });

  it('stops on a high bounce rate once there is a sample', () => {
    const r = deliverabilityGate('b@other.com', { ...healthy, sent7d: 40, bounces7d: 2 });
    expect(r.ok).toBe(false);
    expect(deliverabilityGate('b@other.com', { ...healthy, sent7d: 10, bounces7d: 1 }).ok).toBe(true);
  });

  it('stops on a high opt-out rate', () => {
    expect(deliverabilityGate('b@other.com', { ...healthy, sent7d: 50, unsubscribes7d: 1 }).ok).toBe(false);
  });

  it(`stops after ${THRESHOLDS.noReplyStopAfter} sends with zero human replies (the 8-month failure)`, () => {
    const r = deliverabilityGate('b@other.com', { ...healthy, sent14d: 164, humanReplies14d: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('0 human replies');
  });

  it('treats shared inboxes as not a named owner', () => {
    for (const e of ['info@firm.com', 'Contact@firm.com', 'sales@x.io', 'hello@x.co', 'office1@x.com', 'support@x.com']) {
      expect(isRoleAddress(e)).toBe(true);
    }
    for (const e of ['maria@firm.com', 'j.smith@firm.com', 'owner.name@x.io']) expect(isRoleAddress(e)).toBe(false);
  });

  it('is wired into the sender: account-level gate before sending, role check per recipient', () => {
    const src = readFileSync('supabase/functions/business-mail/pipeline.ts', 'utf8');
    const tick = src.slice(src.indexOf('export async function sendTick'));
    expect(tick.indexOf('deliverabilityGate(')).toBeGreaterThan(-1);
    expect(tick.indexOf('deliverabilityGate(')).toBeLessThan(tick.indexOf('sendFromMailbox('));
    expect(tick).toContain('isRoleAddress(gate.to)');
  });
});
