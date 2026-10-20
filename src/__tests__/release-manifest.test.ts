import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

describe('release manifest (generated, never hand-written)', () => {
  it('build runs the generator first', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(pkg.scripts.build.startsWith('node scripts/generate-release-evidence.mjs &&')).toBe(true);
  });
  it('produces internally consistent facts from the repo', () => {
    execFileSync('node', ['scripts/generate-release-evidence.mjs'], { encoding: 'utf8' });
    const m = JSON.parse(readFileSync('public/release.json', 'utf8'));
    expect(m.git_sha).toMatch(/^[0-9a-f]{40}$/);
    expect(m.engine_version).toBeTruthy();
    expect(m.edge_functions.deployed + m.edge_functions.excluded).toBe(m.edge_functions.total);
    expect(m.migration_head).toMatch(/^\d{14}_/);
    expect(m.test_files).toBeGreaterThan(100);
  });
  it('README points at the manifest instead of hand-typed counts and describes the real deploy path', () => {
    const readme = readFileSync('README.md', 'utf8');
    expect(readme).toContain('release.json');
    expect(readme).not.toMatch(/Vercel's native Git integration/);
    expect(readme).not.toMatch(/1,114 tests|1,089 tests|65 edge functions|65 Deno edge functions/);
  });
});
