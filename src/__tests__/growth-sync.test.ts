import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  GROWTH_SCOPES,
  base64UrlDecode,
  buildJwtClaims,
  importPrivateKey,
  parseServiceAccount,
  signJwt,
} from '../../supabase/functions/_shared/growth/google-auth';
import {
  GA4_REPORTS,
  buildGa4Request,
  finalizeGa4Rows,
  ga4Quality,
  mapGa4Response,
  type Ga4Response,
} from '../../supabase/functions/_shared/growth/ga4';
import {
  GSC_REPORTS,
  buildGscRequest,
  finalizeGscRows,
  gscQueryUrl,
  mapGscResponse,
  type GscResponse,
} from '../../supabase/functions/_shared/growth/gsc';
import { mapClarityResponse, clarityRequestUrl } from '../../supabase/functions/_shared/growth/clarity';
import { dedupeRows, dimsKey, type MetricRow } from '../../supabase/functions/_shared/growth/rows';
import { addMonths, dailyWindow, ga4DateToIso, monthChunks } from '../../supabase/functions/_shared/growth/dates';
import { planRun } from '../../supabase/functions/_shared/growth/plan';

// Every fixture below is hand-written from the public API docs. No real data.

async function generatedKeyPem(): Promise<{ pem: string; publicKey: CryptoKey }> {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  const b64 = Buffer.from(der).toString('base64').replace(/(.{64})/g, '$1\n');
  // Throwaway key generated above at test runtime; no key material is stored in this file.
  return { pem: `-----BEGIN PRIVATE KEY-----\n${b64}\n-----END PRIVATE KEY-----\n`, publicKey: pair.publicKey }; // gitleaks:allow
}

const spec = (report: string) => {
  const s = GA4_REPORTS.find((r) => r.report === report) ?? GSC_REPORTS.find((r) => r.report === report);
  if (!s) throw new Error(report);
  return s;
};

describe('google-auth: service account JWT (no network)', () => {
  it('parses the key JSON and rejects bad input without echoing key material', () => {
    expect(() => parseServiceAccount(undefined)).toThrow(/not set/);
    expect(() => parseServiceAccount('{not json')).toThrow(/not valid JSON/);
    expect(() => parseServiceAccount(JSON.stringify({ client_email: 'x@y' }))).toThrow(/lacks/);
    const sa = parseServiceAccount(JSON.stringify({
      client_email: 'growth@example-project.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\\nAAAA\\n-----END PRIVATE KEY-----\\n', // gitleaks:allow (placeholder "AAAA", not a key)
      private_key_id: 'kid-1',
    }));
    expect(sa.private_key).toContain('\n');
    expect(sa.private_key).not.toContain('\\n');
    expect(sa.private_key_id).toBe('kid-1');
  });

  it('builds the claim set Google expects', () => {
    const claims = buildJwtClaims(
      { client_email: 'growth@example-project.iam.gserviceaccount.com', private_key: 'unused' },
      GROWTH_SCOPES,
      1_700_000_000.7,
    );
    expect(claims).toEqual({
      iss: 'growth@example-project.iam.gserviceaccount.com',
      scope: 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: 1_700_000_000,
      exp: 1_700_003_600,
    });
  });

  it('signs an RS256 JWT that verifies with the matching public key', async () => {
    const { pem, publicKey } = await generatedKeyPem();
    const key = await importPrivateKey(pem);
    const claims = buildJwtClaims({ client_email: 'a@b.iam.gserviceaccount.com', private_key: pem }, GROWTH_SCOPES, 1_700_000_000);
    const jwt = await signJwt(claims, key, 'kid-1');
    const [h, p, s] = jwt.split('.');
    expect(JSON.parse(new TextDecoder().decode(base64UrlDecode(h)))).toEqual({ alg: 'RS256', typ: 'JWT', kid: 'kid-1' });
    expect(JSON.parse(new TextDecoder().decode(base64UrlDecode(p)))).toEqual(claims);
    expect(jwt).not.toMatch(/[+/=]/);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, base64UrlDecode(s), new TextEncoder().encode(`${h}.${p}`));
    expect(ok).toBe(true);
  });
});

describe('GA4 runReport mapping', () => {
  it('requests the date dimension plus the report dimension and its metrics', () => {
    const req = buildGa4Request(spec('ga4_landing_page') as (typeof GA4_REPORTS)[number], '2026-01-01', '2026-01-31');
    expect(req.dimensions).toEqual([{ name: 'date' }, { name: 'landingPagePlusQueryString' }]);
    expect(req.dateRanges).toEqual([{ startDate: '2026-01-01', endDate: '2026-01-31' }]);
    expect((req.metrics as Array<{ name: string }>).map((m) => m.name)).toEqual(
      ['activeUsers', 'sessions', 'engagedSessions', 'screenPageViews', 'keyEvents'],
    );
    const overview = buildGa4Request(spec('ga4_overview') as (typeof GA4_REPORTS)[number], '2026-01-01', '2026-01-31');
    expect(overview.dimensions).toEqual([{ name: 'date' }]);
    expect((overview.metrics as unknown[]).length).toBe(9);
  });

  it('maps rows by response header order, parses YYYYMMDD and numeric strings', () => {
    const res: Ga4Response = {
      // Headers deliberately in a different order from the request.
      dimensionHeaders: [{ name: 'sessionDefaultChannelGroup' }, { name: 'date' }],
      metricHeaders: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'keyEvents' }],
      rows: [
        { dimensionValues: [{ value: 'Organic Search' }, { value: '20260105' }], metricValues: [{ value: '12' }, { value: '10' }, { value: '1' }] },
        { dimensionValues: [{ value: 'Direct' }, { value: '20260105' }], metricValues: [{ value: '7' }, { value: '7' }, { value: '0' }] },
        { dimensionValues: [{ value: 'Direct' }, { value: '(other)' }], metricValues: [{ value: '1' }, { value: '1' }, { value: '0' }] },
      ],
      rowCount: 3,
      metadata: { subjectToThresholding: true, timeZone: 'America/Denver' },
      propertyQuota: { tokensPerDay: { consumed: 10, remaining: 199_990 } },
    };
    const rows = mapGa4Response(spec('ga4_channel') as (typeof GA4_REPORTS)[number], res);
    expect(rows).toEqual([
      {
        source: 'ga4', day: '2026-01-05', report: 'ga4_channel',
        dims: { sessionDefaultChannelGroup: 'Organic Search' },
        metrics: { sessions: 12, activeUsers: 10, keyEvents: 1 },
        dims_key: '{"sessionDefaultChannelGroup":"Organic Search"}',
      },
      {
        source: 'ga4', day: '2026-01-05', report: 'ga4_channel',
        dims: { sessionDefaultChannelGroup: 'Direct' },
        metrics: { sessions: 7, activeUsers: 7, keyEvents: 0 },
        dims_key: '{"sessionDefaultChannelGroup":"Direct"}',
      },
    ]);
    expect(ga4Quality(res)).toEqual({
      subjectToThresholding: true, dataLossFromOtherRow: false, sampled: false,
      timeZone: 'America/Denver', tokensPerDayRemaining: 199_990,
    });
  });

  it('overview rows have empty dims and dims_key "{}"', () => {
    const rows = mapGa4Response(spec('ga4_overview') as (typeof GA4_REPORTS)[number], {
      dimensionHeaders: [{ name: 'date' }],
      metricHeaders: [{ name: 'activeUsers' }, { name: 'bounceRate' }],
      rows: [{ dimensionValues: [{ value: '20260301' }], metricValues: [{ value: '4' }, { value: '0.5' }] }],
    });
    expect(rows).toEqual([{ source: 'ga4', day: '2026-03-01', report: 'ga4_overview', dims: {}, metrics: { activeUsers: 4, bounceRate: 0.5 }, dims_key: '{}' }]);
  });

  it('keeps the top 50 landing pages per day by sessions', () => {
    const s = spec('ga4_landing_page') as (typeof GA4_REPORTS)[number];
    const res: Ga4Response = {
      dimensionHeaders: [{ name: 'date' }, { name: 'landingPagePlusQueryString' }],
      metricHeaders: [{ name: 'sessions' }],
      rows: [
        ...Array.from({ length: 60 }, (_, i) => ({ dimensionValues: [{ value: '20260110' }, { value: `/p${i}` }], metricValues: [{ value: String(i) }] })),
        ...Array.from({ length: 3 }, (_, i) => ({ dimensionValues: [{ value: '20260111' }, { value: `/q${i}` }], metricValues: [{ value: '1' }] })),
      ],
    };
    const rows = finalizeGa4Rows(s, mapGa4Response(s, res));
    expect(rows.filter((r) => r.day === '2026-01-10')).toHaveLength(50);
    expect(rows.filter((r) => r.day === '2026-01-11')).toHaveLength(3);
    expect(rows[0].dims.landingPagePlusQueryString).toBe('/p59');
    expect(rows.some((r) => r.dims.landingPagePlusQueryString === '/p9')).toBe(false);
  });
});

describe('Search Console searchanalytics.query mapping', () => {
  it('builds a web request by date plus the dimension', () => {
    expect(buildGscRequest(spec('gsc_query') as (typeof GSC_REPORTS)[number], '2026-02-01', '2026-02-28')).toEqual({
      startDate: '2026-02-01', endDate: '2026-02-28', dimensions: ['date', 'query'],
      type: 'web', rowLimit: 25_000, startRow: 0, dataState: 'final',
    });
    expect(buildGscRequest(spec('gsc_overview') as (typeof GSC_REPORTS)[number], '2026-02-01', '2026-02-01').dimensions).toEqual(['date']);
    expect(gscQueryUrl('sc-domain:example.com')).toBe(
      'https://searchconsole.googleapis.com/webmasters/v3/sites/sc-domain%3Aexample.com/searchAnalytics/query',
    );
  });

  it('maps keys[] to day + dimension and keeps all four metrics', () => {
    const res: GscResponse = {
      rows: [
        { keys: ['2026-02-03', 'example query'], clicks: 3, impressions: 120, ctr: 0.025, position: 8.4 },
        { keys: ['not-a-date', 'x'], clicks: 1, impressions: 1, ctr: 1, position: 1 },
      ],
      responseAggregationType: 'byProperty',
    };
    expect(mapGscResponse(spec('gsc_query') as (typeof GSC_REPORTS)[number], res)).toEqual([{
      source: 'gsc', day: '2026-02-03', report: 'gsc_query',
      dims: { query: 'example query' },
      metrics: { clicks: 3, impressions: 120, ctr: 0.025, position: 8.4 },
      dims_key: '{"query":"example query"}',
    }]);
    const overview = mapGscResponse(spec('gsc_overview') as (typeof GSC_REPORTS)[number], {
      rows: [{ keys: ['2026-02-03'], clicks: 0, impressions: 5, ctr: 0, position: 30 }],
    });
    expect(overview[0]).toMatchObject({ dims: {}, dims_key: '{}', metrics: { clicks: 0, impressions: 5 } });
  });

  it('keeps the top 200 queries per day by clicks, then impressions', () => {
    const s = spec('gsc_query') as (typeof GSC_REPORTS)[number];
    const rows = mapGscResponse(s, {
      rows: Array.from({ length: 250 }, (_, i) => ({ keys: ['2026-02-04', `q${i}`], clicks: i % 2, impressions: i, ctr: 0, position: 10 })),
    });
    const kept = finalizeGscRows(s, rows);
    expect(kept).toHaveLength(200);
    expect(kept[0]).toMatchObject({ dims: { query: 'q249' } });
    expect(kept.slice(0, 125).every((r) => r.metrics.clicks === 1)).toBe(true);
  });
});

describe('Clarity mapping', () => {
  it('reads the Traffic metric and stores it on the day before the fetch', () => {
    const rows = mapClarityResponse([
      { metricName: 'Traffic', information: [{ totalSessionCount: '42', totalBotSessionCount: '5', distantUserCount: '30', PagesPerSessionPercentage: 1.5 }] },
      { metricName: 'ScrollDepth', information: [{ averageScrollDepth: 50 }] },
    ], '2026-11-08');
    expect(rows).toEqual([{
      source: 'clarity', day: '2026-11-07', report: 'clarity_overview', dims: {},
      metrics: { sessions: 42, bot_sessions: 5, distinct_users: 30, pages_per_session: 1.5 },
      dims_key: '{}',
    }]);
    expect(mapClarityResponse([], '2026-11-08')).toEqual([]);
    expect(clarityRequestUrl(9)).toMatch(/numOfDays=3$/);
  });
});

describe('dims_key stability', () => {
  it('is independent of key order and stable for empty dims', () => {
    expect(dimsKey({ b: '2', a: '1' })).toBe(dimsKey({ a: '1', b: '2' }));
    expect(dimsKey({ b: '2', a: '1' })).toBe('{"a":"1","b":"2"}');
    expect(dimsKey({})).toBe('{}');
    expect(dimsKey({ page: 'https://www.example.com/a?b=1' })).toBe('{"page":"https://www.example.com/a?b=1"}');
  });

  it('dedupeRows keeps one row per unique key', () => {
    const base: MetricRow = { source: 'gsc', day: '2026-01-01', report: 'gsc_query', dims: { query: 'x' }, metrics: { clicks: 1 }, dims_key: dimsKey({ query: 'x' }) };
    const out = dedupeRows([base, { ...base, metrics: { clicks: 2 } }, { ...base, day: '2026-01-02' }]);
    expect(out).toHaveLength(2);
    expect(out[0].metrics.clicks).toBe(2);
  });
});

describe('backfill month chunking and run plan', () => {
  it('splits a range into calendar months, inclusive', () => {
    expect(monthChunks('2026-01-15', '2026-03-02')).toEqual([
      { from: '2026-01-15', to: '2026-01-31' },
      { from: '2026-02-01', to: '2026-02-28' },
      { from: '2026-03-01', to: '2026-03-02' },
    ]);
    expect(monthChunks('2025-12-31', '2026-01-01')).toEqual([
      { from: '2025-12-31', to: '2025-12-31' },
      { from: '2026-01-01', to: '2026-01-01' },
    ]);
    expect(monthChunks('2028-02-01', '2028-02-29')).toEqual([{ from: '2028-02-01', to: '2028-02-29' }]);
    expect(monthChunks('2026-02-02', '2026-02-01')).toEqual([]);
    expect(monthChunks('2026-02-30', '2026-03-01')).toEqual([]);
  });

  it('date helpers', () => {
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(addMonths('2026-11-07', -16)).toBe('2025-07-07');
    expect(dailyWindow('2026-11-07')).toEqual({ from: '2026-11-03', to: '2026-11-07' });
    expect(ga4DateToIso('20260229')).toBeNull();
    expect(ga4DateToIso('20260228')).toBe('2026-02-28');
  });

  it('daily re-fetches the last 5 days for GA4 and GSC and calls Clarity once', () => {
    const plan = planRun('daily', '2026-11-07');
    expect(plan.ga4.chunks).toEqual([{ from: '2026-11-03', to: '2026-11-07' }]);
    expect(plan.gsc.chunks).toEqual([{ from: '2026-11-03', to: '2026-11-07' }]);
    expect(plan.clarity.call).toBe(true);
  });

  it('backfill defaults: GA4 from 2026-01-01, GSC from 16 months back, no Clarity', () => {
    const plan = planRun('backfill', '2026-11-07');
    expect(plan.ga4.chunks[0]).toEqual({ from: '2026-01-01', to: '2026-01-31' });
    expect(plan.ga4.chunks).toHaveLength(11);
    expect(plan.ga4.chunks[plan.ga4.chunks.length - 1]).toEqual({ from: '2026-11-01', to: '2026-11-07' });
    expect(plan.gsc.chunks[0]).toEqual({ from: '2025-07-07', to: '2025-07-31' });
    expect(plan.gsc.chunks).toHaveLength(17);
    expect(plan.clarity.call).toBe(false);
  });

  it('backfill clips a requested month per source and never goes past today', () => {
    const before = planRun('backfill', '2026-11-07', { from: '2025-09-01', to: '2025-09-30' });
    expect(before.ga4.chunks).toEqual([]);
    expect(before.ga4.skip).toMatch(/outside source range/);
    expect(before.gsc.chunks).toEqual([{ from: '2025-09-01', to: '2025-09-30' }]);
    const future = planRun('backfill', '2026-11-07', { from: '2026-11-01', to: '2027-01-01' });
    expect(future.ga4.chunks).toEqual([{ from: '2026-11-01', to: '2026-11-07' }]);
  });
});

describe('growth-sync cron migration', () => {
  const dir = resolve(process.cwd(), 'supabase/migrations');
  const file = readdirSync(dir).find((f) => f.endsWith('_growth_sync_ext_metrics.sql'));
  const sql = file ? readFileSync(resolve(dir, file), 'utf8').replace(/\r\n/g, '\n') : '';

  it('schedules growth-sync daily at 13:15 UTC with x-cron-secret read from Vault', () => {
    expect(file).toBeDefined();
    expect(sql).toContain("'growth-sync-daily',\n    '15 13 * * *'");
    expect(sql).toContain('functions/v1/growth-sync');
    expect(sql).toContain("'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'quantis_shared_cron_secret')");
    expect(sql).toContain('"mode":"daily"');
    expect(sql).not.toMatch(/["']x-cron-secret["']\s*[:,]\s*["'][^"'(]{8,}["']/i);
  });

  it('creates both tables with the unique key, admin-read RLS and admin-only RPCs', () => {
    expect(sql).toContain('CONSTRAINT ext_metrics_daily_unique UNIQUE (source, day, report, dims_key)');
    expect(sql).toContain('ON public.ext_metrics_daily (report, day)');
    expect(sql).toContain('ALTER TABLE public.ext_metrics_daily ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE public.ext_sync_runs ENABLE ROW LEVEL SECURITY');
    expect(sql.match(/USING \(public\.has_role\(auth\.uid\(\), 'admin'::app_role\)\)/g)).toHaveLength(2);
    expect(sql.match(/NOT public\.has_role\(auth\.uid\(\), 'admin'::app_role\)/g)).toHaveLength(2);
    expect(sql).not.toMatch(/GRANT (INSERT|UPDATE|DELETE|ALL)[^;]*TO (anon|authenticated)/);
  });
});
