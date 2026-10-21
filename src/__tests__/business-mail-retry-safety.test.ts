import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('supabase/functions/business-mail/pipeline.ts', 'utf8').replace(/\r\n/g, '\n');

describe('business-mail ambiguous SMTP outcomes', () => {
  it('clears the automatic send request after SMTP begins, requiring reconciliation before retry', () => {
    expect(source).toContain('let smtpAttemptStarted = false;');
    expect(source).toContain('smtpAttemptStarted = true;');
    expect(source).toContain('held: SMTP delivery outcome must be reconciled before retry');
    expect(source).toMatch(/\.\.\.\(smtpAttemptStarted \|\| attempts >= 3 \? \{ send_requested_at: null \} : \{\}\)/);
  });
});
