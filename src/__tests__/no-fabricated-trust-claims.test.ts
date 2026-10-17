import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { getLatestAuditInfo } from '@/services/safety-evaluation-service';

describe('no fabricated trust claims', () => {
  it('audit badge data is null (render nothing) unless a real audit source is enabled', async () => {
    expect(await getLatestAuditInfo()).toBeNull();
  });
  it('never falls back to an invented "audited today" record', () => {
    const svc = readFileSync('src/services/safety-evaluation-service.ts', 'utf8');
    expect(svc).not.toMatch(/return DEFAULT_AUDIT_INFO/);
    expect(svc).not.toMatch(/new Date\(data\.evaluated_at \|\| new Date\(\)\)/);
    const badge = readFileSync('src/components/analysis/LastAuditedBadge.tsx', 'utf8');
    expect(badge).not.toContain('auditInfo || DEFAULT_AUDIT_INFO');
    expect(badge).not.toContain("setLabel('today')");
  });
  it('footer makes no unsupported subscriber count', () => {
    const footer = readFileSync('src/components/layout/FooterEmailSignup.tsx', 'utf8');
    expect(footer).not.toMatch(/\d+\+\s*entrepreneurs/);
  });
});
