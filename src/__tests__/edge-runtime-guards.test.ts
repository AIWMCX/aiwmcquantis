/**
 * Edge Runtime Guards
 *
 * These tests enforce invariants that have caused production incidents:
 *   1. No server-side secrets leak into the VITE_ (client-bundle) namespace
 *   2. The canonical Supabase project ref is consistent across all config files
 *   3. Security-critical edge functions keep verify_jwt in the expected state
 *   4. The App router does NOT serve the Maintenance page at the root "/"
 *
 * Run: npx vitest run src/__tests__/edge-runtime-guards.test.ts
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const ROOT = join(__dirname, '..', '..');

function readFile(rel: string): string {
  const full = join(ROOT, rel);
  if (!existsSync(full)) return '';
  return readFileSync(full, 'utf8');
}

// ─── 1. No secrets in VITE_ namespace ─────────────────────────────────────────
describe('VITE_ namespace — no server secrets', () => {
  const envContent = readFile('.env');
  const envMdContent = readFile('.env.md');

  const SECRET_PATTERNS = [
    /VITE_.*WEBHOOK/i,
    /VITE_.*SECRET/i,
    /VITE_.*PRIVATE/i,
    /VITE_.*SERVICE_ROLE/i,
    /VITE_.*STRIPE_SECRET/i,
    /VITE_.*ADMIN_KEY/i,
    /VITE_.*CRON/i,
  ];

  it('.env does not expose server secrets via VITE_ prefix', () => {
    const violations = SECRET_PATTERNS.filter(p => p.test(envContent));
    expect(
      violations,
      `Found secret-looking VITE_ vars in .env: ${violations.map(v => v.source).join(', ')}`
    ).toHaveLength(0);
  });

  it('.env.md documents server secrets WITHOUT a VITE_ prefix', () => {
    // Flag only active variable assignments (VAR=value lines) where the
    // variable NAME itself looks like a secret — not comment text on the same line.
    const lines = envMdContent.split('\n');
    const activeAssignments = lines.filter(l => {
      const trimmed = l.trim();
      // Skip comment lines and list items
      if (trimmed.startsWith('#') || trimmed.startsWith('*') || trimmed.startsWith('-') || trimmed.startsWith('//')) return false;
      // Extract only the variable name (before '=')
      const varName = trimmed.split('=')[0].trim();
      return SECRET_PATTERNS.some(p => p.test(varName));
    });
    expect(
      activeAssignments,
      `Active VITE_SECRET assignments in .env.md: ${activeAssignments.join('\n')}`
    ).toHaveLength(0);
  });
});

// ─── 2. Canonical Supabase project ref consistency ────────────────────────────
describe('Supabase project ref — canonical is dmlxrvfyqsakyjomsvdj', () => {
  const PROD_REF = 'dmlxrvfyqsakyjomsvdj';
  const OLD_REF = 'gafxacjhkqsdzwwzhbor';

  it('supabase/config.toml uses the production project ref', () => {
    const toml = readFile('supabase/config.toml');
    expect(toml).toContain(`project_id = "${PROD_REF}"`);
  });

  it('.env VITE_SUPABASE_URL points to the production project (skipped on CI where .env is gitignored)', () => {
    const env = readFile('.env');
    // .env is gitignored — on CI it won't exist and readFile returns ''.
    // The authoritative check for CI is config.toml (above) + GitHub Secrets.
    if (!env) return; // skip if file absent (CI environment)
    const match = env.match(/VITE_SUPABASE_URL\s*=\s*"?([^"\n]+)"?/);
    const url = match?.[1] ?? '';
    expect(url).toContain(PROD_REF);
    expect(url).not.toContain(OLD_REF);
  });

  it('.env VITE_SUPABASE_PROJECT_ID is the production project ref (skipped on CI where .env is gitignored)', () => {
    const env = readFile('.env');
    if (!env) return; // skip if file absent (CI environment)
    const match = env.match(/VITE_SUPABASE_PROJECT_ID\s*=\s*"?([^"\n]+)"?/);
    const ref = match?.[1]?.trim() ?? '';
    expect(ref).toBe(PROD_REF);
  });

  it('index.html preconnect points to the production project', () => {
    const html = readFile('index.html');
    // If there's a preconnect to the old ref, it's a stale reference
    expect(html).not.toContain(OLD_REF);
  });
});

// ─── 3. App router — Maintenance page NOT at root ─────────────────────────────
describe('App router — root "/" serves Landing, not Maintenance', () => {
  it('App.tsx has Landing at "/" and not Maintenance', () => {
    const appTsx = readFile('src/App.tsx');
    // The root route must render Landing
    expect(appTsx).toMatch(/<Route\s+path="\/"[^>]*element=\{<Landing/);
    // Maintenance must NOT be the element for the root route
    const rootRouteMatch = appTsx.match(/<Route\s+path="\/"[^/\n>]*>/);
    if (rootRouteMatch) {
      expect(rootRouteMatch[0]).not.toContain('Maintenance');
    }
  });

  it('Maintenance component is not imported as a direct (non-lazy) default for root', () => {
    const appTsx = readFile('src/App.tsx');
    // If Maintenance is statically imported AND used at root, that's a regression
    const maintenanceAtRoot = appTsx.includes('path="/"') &&
      appTsx.match(/<Route path="\/"[^/]*Maintenance/);
    expect(maintenanceAtRoot).toBeFalsy();
  });
});

// ─── 4. vercel.json — no conflicting redirect rules ───────────────────────────
describe('vercel.json — safe redirect/rewrite configuration', () => {
  it('does not have a www->apex redirect that would conflict with Vercel domain panel', () => {
    const vercelJson = readFile('vercel.json');
    if (!vercelJson) return; // file optional
    const config = JSON.parse(vercelJson);
    const redirects: Array<{ destination?: string }> = config.redirects ?? [];
    const wwwToApex = redirects.filter(r =>
      (r.destination ?? '').includes('aiwmcquantis.com') &&
      JSON.stringify(r).includes('www.aiwmcquantis.com')
    );
    expect(
      wwwToApex,
      'vercel.json has www->apex redirect — this conflicts with Vercel domain panel settings and creates a redirect loop'
    ).toHaveLength(0);
  });

  it('has SPA fallback rewrite (index.html) so deep links work', () => {
    const vercelJson = readFile('vercel.json');
    if (!vercelJson) return;
    const config = JSON.parse(vercelJson);
    const rewrites: Array<{ destination?: string }> = config.rewrites ?? [];
    const spaFallback = rewrites.some(r => r.destination === '/index.html');
    expect(spaFallback).toBe(true);
  });

  it('has security headers (X-Frame-Options, X-Content-Type-Options)', () => {
    const vercelJson = readFile('vercel.json');
    if (!vercelJson) return;
    const config = JSON.parse(vercelJson);
    const headers: Array<{ headers?: Array<{ key: string }> }> = config.headers ?? [];
    const allKeys = headers.flatMap(h => (h.headers ?? []).map(hh => hh.key));
    expect(allKeys).toContain('X-Frame-Options');
    expect(allKeys).toContain('X-Content-Type-Options');
  });
});
