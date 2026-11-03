import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseProspectCsv, sequenceDue, SEQUENCE_DAYS } from '@/lib/commercial-ops';
import { followupOrderCheck } from '../../supabase/functions/_shared/mail/followup-order';

describe('parseProspectCsv', () => {
  it('parses quoted CSV with aliases and multi-signal cells', () => {
    const { rows, errors } = parseProspectCsv(
      'Company,Name,Title,Email,Signals\n' +
        'Northline Advisory,Jane Doe,Fractional CFO,jane@northline.co,"Serves 6 dental groups | Posted about ""rebuilding"" models"\n' +
        ',Nobody,,,\n',
    );
    expect(errors).toEqual(['line 3: missing company']);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      company_name: 'Northline Advisory',
      contact_name: 'Jane Doe',
      contact_role: 'Fractional CFO',
      email: 'jane@northline.co',
      signals: 'Serves 6 dental groups | Posted about "rebuilding" models',
    });
  });

  it('accepts tab-separated rows pasted from a sheet', () => {
    const { rows } = parseProspectCsv('company_name\temail\nAcme\ta@acme.com');
    expect(rows).toEqual([{ company_name: 'Acme', email: 'a@acme.com' }]);
  });

  it('rejects a header without a company column', () => {
    expect(parseProspectCsv('email\na@b.co').errors[0]).toMatch(/company_name/);
  });
});

describe('sequenceDue', () => {
  const now = new Date('2026-10-05T12:00:00Z');
  const p = { id: 'p1', stage: 'contacted', suppression_status: 'active' };
  const first = { prospect_id: 'p1', kind: 'first_touch', status: 'sent', sequence_step: 1, sent_at: '2026-10-01T12:00:00Z' };

  it('proposes step 2 only after 6 days (4-5 business days), not before', () => {
    expect(sequenceDue([p], [first], now)).toEqual([]); // day 4
    const day6 = new Date('2026-10-07T12:00:00Z');
    expect(sequenceDue([p], [first], day6)).toEqual([{ prospect: p, step: 2, day: 6 }]);
  });

  it('does not re-propose a step already drafted', () => {
    const day6 = new Date('2026-10-07T12:00:00Z');
    const s2 = { prospect_id: 'p1', kind: 'followup', status: 'draft', sequence_step: 2, sent_at: null };
    expect(sequenceDue([p], [first, s2], day6)).toEqual([]);
  });

  it('stops for replied or suppressed prospects', () => {
    expect(sequenceDue([{ ...p, stage: 'replied' }], [first], now)).toEqual([]);
    expect(sequenceDue([{ ...p, suppression_status: 'unsubscribed' }], [first], now)).toEqual([]);
  });

  it('never proposes step 3 or 4: two touches in total (2026-11-03)', () => {
    const late = new Date('2026-11-30T12:00:00Z'); // long after the old step-3/4 days
    const s2sent = { prospect_id: 'p1', kind: 'followup', status: 'sent', sequence_step: 2, sent_at: '2026-10-07T12:00:00Z' };
    expect(sequenceDue([p], [first, s2sent], late)).toEqual([]);
    // An in-flight legacy sequence that already had step 3 gets no step 4 either.
    const s3sent = { ...s2sent, sequence_step: 3, sent_at: '2026-10-10T12:00:00Z' };
    expect(sequenceDue([p], [first, s2sent, s3sent], late)).toEqual([]);
    expect(Object.keys(SEQUENCE_DAYS)).toEqual(['2']);
  });
});

describe('followupOrderCheck (sender pre-send gate)', () => {
  const now = new Date('2026-10-09T12:00:00Z');
  const ft = { kind: 'first_touch', status: 'sent', sequence_step: 1, sent_at: '2026-10-01T12:00:00Z' };
  it('blocks a step whose previous step was never sent', () => {
    expect(followupOrderCheck(2, [], now)).toEqual({ ok: false, reason: 'step 1 not sent yet' });
  });
  it('blocks a second email within 2 days of the last one', () => {
    const recent = { ...ft, sent_at: '2026-10-09T08:00:00Z' };
    expect(followupOrderCheck(2, [recent], now).ok).toBe(false);
  });
  it('holds step 3 and later at send time, even when already drafted and approved (2026-11-03)', () => {
    const s2 = { kind: 'follow_up', status: 'sent', sequence_step: 2, sent_at: '2026-10-05T12:00:00Z' };
    expect(followupOrderCheck(3, [ft, s2], now)).toEqual({ ok: false, reason: 'the cold sequence is 2 touches; step 3 is never sent' });
    expect(followupOrderCheck(4, [ft, s2], now).ok).toBe(false);
  });
  it('allows the next step in order with spacing; first touch counts as step 1 even without a step number', () => {
    expect(followupOrderCheck(2, [{ ...ft, sequence_step: null }], now)).toEqual({ ok: true });
  });
  it('the sender gate uses it', () => {
    const src = readFileSync('supabase/functions/business-mail/pipeline.ts', 'utf8');
    expect(src).toMatch(/const order = followupOrderCheck\(/);
  });
});
