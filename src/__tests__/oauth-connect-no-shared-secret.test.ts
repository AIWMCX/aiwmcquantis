import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// 2026-11-06: the shared cron secret used to start autoposter OAuth via
// GET ?init=1 (header or ?secret= in the URL). Whoever finished the provider
// login then owned autoposter_credentials. Connecting is now admin-JWT only.

const root = resolve(process.cwd(), 'supabase/functions');
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return tsFiles(p);
    return p.endsWith('.ts') ? [p] : [];
  });
}

const oauthDirs = readdirSync(root).filter((d) => d.startsWith('oauth-') && statSync(join(root, d)).isDirectory());
const oauthSources = oauthDirs.flatMap((d) => tsFiles(join(root, d)))
  .concat(join(root, '_shared/autoposter-oauth.ts'))
  .map((file) => ({ file, src: readFileSync(file, 'utf8') }));

describe('autoposter OAuth connect never accepts a shared secret', () => {
  it('finds both OAuth functions (the guard is not vacuous)', () => {
    expect(oauthDirs).toEqual(expect.arrayContaining(['oauth-linkedin-callback', 'oauth-twitter-callback']));
  });

  it.each(oauthSources.map((s) => [s.file.slice(root.length + 1), s.src]))('%s reads no cron secret and no ?secret= / ?init= param', (_file, src) => {
    expect(src).not.toMatch(/CRON_SECRET/);
    expect(src).not.toMatch(/x-cron-secret/i);
    expect(src).not.toMatch(/searchParams\.get\(\s*['"`]secret['"`]\s*\)/);
    expect(src).not.toMatch(/searchParams\.get\(\s*['"`]init['"`]\s*\)/);
  });
});

describe('X connect mirrors LinkedIn (admin-JWT POST API, PKCE)', () => {
  const fn = read('supabase/functions/oauth-twitter-callback/index.ts');
  const api = fn.slice(fn.indexOf('async function handleApi'), fn.indexOf('Deno.serve('));

  it('checks the admin before any action runs', () => {
    const guard = api.indexOf('adminUserId(req)');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(api.indexOf("action === 'status'"));
    expect(guard).toBeLessThan(api.indexOf("action === 'start'"));
    expect(fn).toContain(".from('user_roles').select('role').eq('user_id', data.user.id).eq('role', 'admin')");
  });

  it('start stores a PKCE verifier and sends only its S256 challenge', () => {
    const start = api.slice(api.indexOf("action === 'start'"));
    expect(start).toContain('randomCodeVerifier()');
    expect(start).toContain("platform: 'twitter', code_verifier: verifier");
    expect(start).toContain('pkceS256Challenge(verifier)');
    expect(start).toContain('twitterAuthUrl(');
  });

  it('status goes through connectionStatus (never token secret ids)', () => {
    const status = api.slice(api.indexOf("action === 'status'"), api.indexOf("action === 'start'"));
    expect(status).toContain('connectionStatus(cred, configured, REDIRECT_URI)');
    expect(status).not.toMatch(/access_token_secret_id\s*:/);
  });

  it('keeps the callback: single-use state that must carry a verifier', () => {
    expect(fn).toContain("if (!st || st.platform !== 'twitter' || !st.code_verifier)");
    expect(fn).toContain(".from('autoposter_oauth_state').delete().eq('state', state)");
    expect(fn).toContain('code_verifier: st.code_verifier');
  });

  it('X can reach the callback without a Supabase JWT (config + deploy agree)', () => {
    expect(read('supabase/config.toml')).toMatch(/\[functions\.oauth-twitter-callback\]\s*\nverify_jwt = false/);
    expect(read('.github/workflows/production-deploy.yml')).toMatch(/NO_VERIFY_JWT_FNS="[^"]*\boauth-twitter-callback\b/);
  });

  it('the Connections panel starts X through the admin API', () => {
    const panel = read('src/components/autoposter/ConnectionsPanel.tsx');
    expect(panel).toContain("fn: 'oauth-twitter-callback'");
    expect(panel).toContain('<ProviderCard provider="twitter" />');
    expect(panel).not.toMatch(/init=1|[?&]secret=/);
  });
});
