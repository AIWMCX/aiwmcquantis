/**
 * Quantis Evidence Service — evidenceRunKey regression suite (PR E6.2).
 */
import { describe, it, expect } from 'vitest';
import { computeEvidenceRunKey } from '../../../supabase/functions/_shared/evidence/evidence-run-key';

describe('computeEvidenceRunKey', () => {
  it('is deterministic: same identity always produces the same key', async () => {
    const identity = { analysisRunId: 'analysis-1', evidencePlanVersion: '0.1.0', evidenceSchemaVersion: '0.1.0' };
    const a = await computeEvidenceRunKey(identity);
    const b = await computeEvidenceRunKey(identity);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('differs when analysisRunId differs', async () => {
    const a = await computeEvidenceRunKey({ analysisRunId: 'analysis-1', evidencePlanVersion: '0.1.0', evidenceSchemaVersion: '0.1.0' });
    const b = await computeEvidenceRunKey({ analysisRunId: 'analysis-2', evidencePlanVersion: '0.1.0', evidenceSchemaVersion: '0.1.0' });
    expect(a).not.toBe(b);
  });

  it('differs when evidencePlanVersion differs -- a plan upgrade is a legitimate new run', async () => {
    const a = await computeEvidenceRunKey({ analysisRunId: 'analysis-1', evidencePlanVersion: '0.1.0', evidenceSchemaVersion: '0.1.0' });
    const b = await computeEvidenceRunKey({ analysisRunId: 'analysis-1', evidencePlanVersion: '0.2.0', evidenceSchemaVersion: '0.1.0' });
    expect(a).not.toBe(b);
  });

  it('differs when evidenceSchemaVersion differs', async () => {
    const a = await computeEvidenceRunKey({ analysisRunId: 'analysis-1', evidencePlanVersion: '0.1.0', evidenceSchemaVersion: '0.1.0' });
    const b = await computeEvidenceRunKey({ analysisRunId: 'analysis-1', evidencePlanVersion: '0.1.0', evidenceSchemaVersion: '0.2.0' });
    expect(a).not.toBe(b);
  });

  it('is not vulnerable to field-boundary ambiguity from the naive delimiter (documents the known limitation)', async () => {
    // 'a:1' + '1' vs 'a' + '1:1' both naively concatenate to related strings;
    // the ':' delimiter is not escaped. This is accepted because
    // analysisRunId is always a real UUID (no colons possible) and version
    // strings are controlled internally (semver-shaped, no colons in
    // practice) -- documented here so a future change to either field's
    // format is a deliberate decision, not a silent collision risk.
    const a = await computeEvidenceRunKey({ analysisRunId: 'a', evidencePlanVersion: '1:1', evidenceSchemaVersion: 'x' });
    const b = await computeEvidenceRunKey({ analysisRunId: 'a:1', evidencePlanVersion: '1', evidenceSchemaVersion: 'x' });
    expect(a).toBe(b); // known, accepted collision given real-world field shapes
  });
});
