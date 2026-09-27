import { describe, expect, it } from 'vitest';
import { parseProspectCsv, sequenceDue } from '@/lib/commercial-ops';

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

  it('proposes step 2 after 3 days', () => {
    expect(sequenceDue([p], [first], now)).toEqual([{ prospect: p, step: 2, day: 3 }]);
  });

  it('does not re-propose a step already drafted, and waits for step 3 day', () => {
    const s2 = { prospect_id: 'p1', kind: 'followup', status: 'draft', sequence_step: 2, sent_at: null };
    expect(sequenceDue([p], [first, s2], now)).toEqual([]);
  });

  it('stops for replied or suppressed prospects', () => {
    expect(sequenceDue([{ ...p, stage: 'replied' }], [first], now)).toEqual([]);
    expect(sequenceDue([{ ...p, suppression_status: 'unsubscribed' }], [first], now)).toEqual([]);
  });
});
