import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const fn = read('supabase/functions/oauth-linkedin-callback/index.ts');
const config = read('supabase/config.toml');
const workflow = read('.github/workflows/production-deploy.yml');
const panel = read('src/components/autoposter/ConnectionsPanel.tsx');

describe('Autoposter LinkedIn connect UI (2026-10-15)', () => {
  it('the POST API requires an admin before any action runs', () => {
    const api = fn.slice(fn.indexOf('async function handleApi'), fn.indexOf('Deno.serve('));
    const guard = api.indexOf('adminUserId(req)');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(api.indexOf("body.action === 'status'"));
    expect(guard).toBeLessThan(api.indexOf("body.action === 'start'"));
  });

  it('status never returns token secrets', () => {
    const status = fn.slice(fn.indexOf("body.action === 'status'"), fn.indexOf("body.action === 'start'"));
    expect(status).not.toMatch(/access_token_secret_id\s*:/);
    expect(status).not.toMatch(/refresh_token_secret_id\s*:/);
  });

  it('LinkedIn can reach the callback without a Supabase JWT (config + deploy agree)', () => {
    expect(config).toMatch(/\[functions\.oauth-linkedin-callback\]\s*\nverify_jwt = false/);
    expect(workflow).toMatch(/NO_VERIFY_JWT_FNS="[^"]*\boauth-linkedin-callback\b/);
  });

  it('the callback returns the browser to Autoposter instead of a dead-end page', () => {
    expect(fn).toContain("backToApp({ linkedin: 'connected'");
    expect(fn).toContain("backToApp({ linkedin: 'error'");
    expect(panel).toContain("params.get('linkedin')");
  });
});
