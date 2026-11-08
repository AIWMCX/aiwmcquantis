import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  PSI_CATEGORIES,
  cruxCategory,
  cwvCategory,
  fetchPsi,
  mapPsiResponse,
  psiRequestUrl,
  runPsi,
  type PsiResponse,
} from '../../supabase/functions/_shared/growth/psi';
import {
  GoogleApiError,
  URL_INSPECTION_ENDPOINT,
  buildInspectionRequest,
  combineIndexingStatus,
  isPermissionDenied,
  mapInspection,
  mapSitemaps,
  runIndexing,
  sitemapsListUrl,
  type InspectionResponse,
  type SitemapsResponse,
} from '../../supabase/functions/_shared/growth/indexing';
import {
  BING_SITE_URL,
  bingRequestUrl,
  fetchBing,
  mapBingCrawl,
  mapBingTraffic,
  parseBingDate,
  runBing,
} from '../../supabase/functions/_shared/growth/bing';
import { indexNowRow, parseIndexNowPing } from '../../supabase/functions/_shared/growth/indexnow';
import {
  INSPECTION_PATHS,
  KEY_PATHS,
  PSI_DEVICES,
  URL_INSPECTION_DAILY_QUOTA,
  dailyCallBudget,
} from '../../supabase/functions/_shared/growth/targets';
import { GROWTH_REPORTS, GROWTH_SOURCES } from '../../supabase/functions/_shared/growth/rows';
import { parseMode, planRun } from '../../supabase/functions/_shared/growth/plan';

// Every fixture below is hand-written from the public API docs. No real data.
// Keys are generated at runtime; none is written in this file.
const runtimeKey = () => crypto.randomUUID().replace(/-/g, '');

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const PSI_FULL: PsiResponse = {
  id: 'https://www.aiwmcquantis.com/pricing',
  loadingExperience: {
    id: 'https://www.aiwmcquantis.com/pricing',
    metrics: {
      LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2300, category: 'FAST' },
      INTERACTION_TO_NEXT_PAINT: { percentile: 260, category: 'AVERAGE' },
      CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 31, category: 'SLOW' },
    },
    overall_category: 'AVERAGE',
    initial_url: 'https://www.aiwmcquantis.com/pricing',
  },
  lighthouseResult: {
    lighthouseVersion: '12.0.0',
    categories: {
      performance: { score: 0.72 },
      seo: { score: 1 },
      accessibility: { score: 0.95 },
      'best-practices': { score: 0.96 },
    },
    audits: {
      'largest-contentful-paint': { numericValue: 3123.456 },
      'cumulative-layout-shift': { numericValue: 0.04321 },
      'total-blocking-time': { numericValue: 187.2 },
    },
  },
};

describe('PageSpeed Insights mapping', () => {
  it('asks for all four Lighthouse categories, the strategy and the key only when given', () => {
    const key = runtimeKey();
    const withKey = new URL(psiRequestUrl('https://www.aiwmcquantis.com/', 'mobile', key));
    expect(withKey.origin + withKey.pathname).toBe('https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed');
    expect(withKey.searchParams.get('url')).toBe('https://www.aiwmcquantis.com/');
    expect(withKey.searchParams.get('strategy')).toBe('MOBILE');
    expect(withKey.searchParams.getAll('category')).toEqual([...PSI_CATEGORIES]);
    expect(withKey.searchParams.get('key')).toBe(key);
    const keyless = new URL(psiRequestUrl('https://www.aiwmcquantis.com/', 'desktop', null));
    expect(keyless.searchParams.get('strategy')).toBe('DESKTOP');
    expect(keyless.searchParams.has('key')).toBe(false);
  });

  it('maps scores x100, lab LCP/CLS/TBT and CrUX p75 with categories (CLS percentile / 100)', () => {
    const row = mapPsiResponse(PSI_FULL, { path: '/pricing', device: 'mobile', day: '2026-11-08' });
    expect(row).toMatchObject({ source: 'psi', report: 'psi_url', day: '2026-11-08', dims: { path: '/pricing', device: 'mobile' } });
    expect(row.dims_key).toBe('{"device":"mobile","path":"/pricing"}');
    expect(row.metrics).toEqual({
      perf_score: 72,
      seo_score: 100,
      accessibility_score: 95,
      best_practices_score: 96,
      lab_lcp_ms: 3123,
      lab_cls: 0.043,
      lab_tbt_ms: 187,
      field_scope: 'url',
      field_lcp_p75_ms: 2300,
      field_lcp_category: 'good',
      field_inp_p75_ms: 260,
      field_inp_category: 'needs-improvement',
      field_cls_p75: 0.31,
      field_cls_category: 'poor',
      field_overall_category: 'needs-improvement',
      lighthouse_version: '12.0.0',
      runtime_error: null,
    });
  });

  it('stores "no field data" as field_scope none with every field value null, never invented', () => {
    const res: PsiResponse = {
      ...PSI_FULL,
      loadingExperience: { initial_url: 'https://www.aiwmcquantis.com/consultant-pilot' },
    };
    const m = mapPsiResponse(res, { path: '/consultant-pilot', device: 'desktop', day: '2026-11-08' }).metrics;
    expect(m.field_scope).toBe('none');
    for (const k of ['field_lcp_p75_ms', 'field_lcp_category', 'field_inp_p75_ms', 'field_inp_category', 'field_cls_p75', 'field_cls_category', 'field_overall_category']) {
      expect(m[k]).toBeNull();
    }
    expect(m.perf_score).toBe(72); // lab data is still there
    const noLe = mapPsiResponse({ lighthouseResult: PSI_FULL.lighthouseResult }, { path: '/', device: 'mobile', day: '2026-11-08' });
    expect(noLe.metrics.field_scope).toBe('none');
  });

  it('labels origin fallback as origin, not as this page', () => {
    const res: PsiResponse = { ...PSI_FULL, loadingExperience: { ...PSI_FULL.loadingExperience, origin_fallback: true } };
    expect(mapPsiResponse(res, { path: '/', device: 'mobile', day: '2026-11-08' }).metrics.field_scope).toBe('origin');
  });

  it('a Lighthouse runtime error keeps scores null instead of 0', () => {
    const res: PsiResponse = { lighthouseResult: { lighthouseVersion: '12.0.0', runtimeError: { code: 'NO_FCP', message: 'x' }, categories: { performance: { score: null } } } };
    const m = mapPsiResponse(res, { path: '/', device: 'mobile', day: '2026-11-08' }).metrics;
    expect(m.perf_score).toBeNull();
    expect(m.seo_score).toBeNull();
    expect(m.lab_lcp_ms).toBeNull();
    expect(m.runtime_error).toBe('NO_FCP');
  });

  it('CrUX categories and lab thresholds use the published Core Web Vitals bands', () => {
    expect([cruxCategory('FAST'), cruxCategory('AVERAGE'), cruxCategory('SLOW'), cruxCategory('NONE'), cruxCategory(undefined)])
      .toEqual(['good', 'needs-improvement', 'poor', null, null]);
    expect([cwvCategory('lcp', 2500), cwvCategory('lcp', 2501), cwvCategory('lcp', 4001)]).toEqual(['good', 'needs-improvement', 'poor']);
    expect([cwvCategory('inp', 200), cwvCategory('inp', 500), cwvCategory('inp', 501)]).toEqual(['good', 'needs-improvement', 'poor']);
    expect([cwvCategory('cls', 0.1), cwvCategory('cls', 0.25), cwvCategory('cls', 0.26), cwvCategory('cls', null)]).toEqual(['good', 'needs-improvement', 'poor', null]);
  });

  it('errors name the page and device and never contain the key', async () => {
    const key = runtimeKey();
    const fetchImpl = vi.fn(async (url: string | URL | Request) => json({ error: { status: 'RESOURCE_EXHAUSTED', message: `Quota exceeded; request was ${String(url)}` } }, 429));
    await expect(fetchPsi('/pricing', 'mobile', key, fetchImpl as unknown as typeof fetch)).rejects.toThrow(/^PSI \/pricing mobile: HTTP 429 RESOURCE_EXHAUSTED/);
    const err = await fetchPsi('/pricing', 'mobile', key, fetchImpl as unknown as typeof fetch).catch((e: Error) => e);
    expect(String((err as Error).message)).not.toContain(key);
  });

  it('runs all 10 targets, keeps going after one failure, and starts nothing after the deadline', async () => {
    const targets = KEY_PATHS.flatMap((path) => PSI_DEVICES.map((device) => ({ path, device })));
    expect(targets).toHaveLength(10);
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes(encodeURIComponent('/pricing'))) return json({ error: { message: 'boom' } }, 500);
      return json(PSI_FULL);
    });
    const res = await runPsi(targets, '2026-11-08', null, { concurrency: 5, deadline: Date.now() + 60_000, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(res.calls).toBe(10);
    expect(fetchImpl).toHaveBeenCalledTimes(10);
    expect(res.rows).toHaveLength(8);
    expect(res.errors).toHaveLength(2);
    const late = await runPsi(targets, '2026-11-08', null, { concurrency: 5, deadline: 0, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(late.calls).toBe(0);
    expect(late.not_started).toHaveLength(10);
  });
});

const INSPECTION_OK: InspectionResponse = {
  inspectionResult: {
    inspectionResultLink: 'https://search.google.com/search-console/inspect?resource_id=sc-domain:example',
    indexStatusResult: {
      verdict: 'PASS',
      coverageState: 'Submitted and indexed',
      robotsTxtState: 'ALLOWED',
      indexingState: 'INDEXING_ALLOWED',
      lastCrawlTime: '2026-11-05T08:12:34.123456789Z',
      pageFetchState: 'SUCCESSFUL',
      googleCanonical: 'https://www.aiwmcquantis.com/pricing',
      userCanonical: 'https://www.aiwmcquantis.com/pricing',
      crawledAs: 'MOBILE',
    },
  },
};

const SITEMAPS: SitemapsResponse = {
  sitemap: [{
    path: 'https://www.aiwmcquantis.com/sitemap.xml',
    lastSubmitted: '2026-10-01T10:00:00.000Z',
    isPending: false,
    isSitemapsIndex: false,
    type: 'sitemap',
    lastDownloaded: '2026-11-06T03:04:05.000Z',
    warnings: '1',
    errors: '0',
    contents: [{ type: 'web', submitted: '42', indexed: '0' }, { type: 'image', submitted: '3', indexed: '0' }],
  }],
};

describe('Search Console URL Inspection + sitemaps mapping', () => {
  it('builds the documented request', () => {
    expect(URL_INSPECTION_ENDPOINT).toBe('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect');
    expect(buildInspectionRequest('https://www.aiwmcquantis.com/', 'sc-domain:aiwmcquantis.com'))
      .toEqual({ inspectionUrl: 'https://www.aiwmcquantis.com/', siteUrl: 'sc-domain:aiwmcquantis.com', languageCode: 'en-US' });
    expect(sitemapsListUrl('sc-domain:aiwmcquantis.com'))
      .toBe('https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Aaiwmcquantis.com/sitemaps');
  });

  it('maps verdict, coverageState, indexingState, lastCrawlTime, googleCanonical and robotsTxtState', () => {
    const row = mapInspection(INSPECTION_OK, '/pricing', '2026-11-08');
    expect(row).toMatchObject({ source: 'indexing', report: 'indexing_url', day: '2026-11-08', dims: { path: '/pricing' }, dims_key: '{"path":"/pricing"}' });
    expect(row.metrics).toMatchObject({
      verdict: 'PASS',
      coverage_state: 'Submitted and indexed',
      indexing_state: 'INDEXING_ALLOWED',
      robots_txt_state: 'ALLOWED',
      last_crawl_time: '2026-11-05T08:12:34.123456789Z',
      google_canonical: 'https://www.aiwmcquantis.com/pricing',
      page_fetch_state: 'SUCCESSFUL',
    });
  });

  it('a never-crawled URL keeps absent fields null', () => {
    const m = mapInspection({ inspectionResult: { indexStatusResult: { verdict: 'NEUTRAL', coverageState: 'URL is unknown to Google' } } }, '/how-it-works', '2026-11-08').metrics;
    expect(m.verdict).toBe('NEUTRAL');
    expect(m.last_crawl_time).toBeNull();
    expect(m.google_canonical).toBeNull();
  });

  it('maps sitemaps.list: int64 strings to numbers, contents summed, indexed kept as returned', () => {
    const [row] = mapSitemaps(SITEMAPS, '2026-11-08');
    expect(row).toMatchObject({ source: 'indexing', report: 'indexing_sitemap', dims: { path: 'https://www.aiwmcquantis.com/sitemap.xml' } });
    expect(row.metrics).toEqual({
      type: 'sitemap',
      is_pending: 0,
      is_index: 0,
      last_submitted: '2026-10-01T10:00:00.000Z',
      last_downloaded: '2026-11-06T03:04:05.000Z',
      errors: 0,
      warnings: 1,
      submitted: 45,
      indexed: 0,
    });
    expect(mapSitemaps({}, '2026-11-08')).toEqual([]);
    expect(mapSitemaps({ sitemap: [{ path: 'https://www.aiwmcquantis.com/s.xml' }] }, '2026-11-08')[0].metrics.submitted).toBeNull();
  });
});

describe('Restricted permission: permission_denied path', () => {
  const DENIED = "User does not have sufficient permission for site 'sc-domain:aiwmcquantis.com'. See also: https://support.google.com/webmasters/answer/2451999.";

  it('a 403 is permission_denied, but "API not enabled" is a setup error', () => {
    expect(isPermissionDenied(new GoogleApiError('x', 403, 'PERMISSION_DENIED', DENIED))).toBe(true);
    expect(isPermissionDenied(new GoogleApiError('x', 403, 'PERMISSION_DENIED', 'Google Search Console API has not been used in project 123 before or it is disabled.'))).toBe(false);
    expect(isPermissionDenied(new GoogleApiError('x', 429, 'RESOURCE_EXHAUSTED', 'quota'))).toBe(false);
    expect(isPermissionDenied(new Error('403'))).toBe(false);
  });

  it('sitemaps still store rows, inspection stops after the first 403 and keeps Google\'s exact message', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes('/sitemaps')) return json(SITEMAPS);
      return json({ error: { code: 403, message: DENIED, status: 'PERMISSION_DENIED' } }, 403);
    });
    const res = await runIndexing('sc-domain:aiwmcquantis.com', 'test-token', INSPECTION_PATHS, '2026-11-08', {
      deadline: Date.now() + 60_000, fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.endpoints.sitemaps).toMatchObject({ status: 'ok', rows: 1 });
    expect(res.endpoints.url_inspection).toMatchObject({ status: 'permission_denied', calls: 1, rows: 0, google_message: DENIED });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(res.rows.map((r) => r.report)).toEqual(['indexing_sitemap']);
    expect(combineIndexingStatus(res.endpoints)).toBe('permission_denied');
  });

  it('all 8 inspections run when permitted', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => (String(url).includes('/sitemaps') ? json(SITEMAPS) : json(INSPECTION_OK)));
    const res = await runIndexing('sc-domain:aiwmcquantis.com', 'test-token', INSPECTION_PATHS, '2026-11-08', {
      deadline: Date.now() + 60_000, fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.endpoints.url_inspection).toMatchObject({ status: 'ok', calls: 8, rows: 8 });
    expect(combineIndexingStatus(res.endpoints)).toBe('ok');
    const init = (fetchImpl.mock.calls[1] as unknown[])[1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body).toEqual({ inspectionUrl: 'https://www.aiwmcquantis.com/', siteUrl: 'sc-domain:aiwmcquantis.com', languageCode: 'en-US' });
  });

  it('combines endpoint statuses', () => {
    const ok = { status: 'ok' as const, calls: 1, rows: 1 };
    const err = { status: 'error' as const, calls: 1, rows: 0 };
    expect(combineIndexingStatus({ sitemaps: ok, url_inspection: err })).toBe('partial');
    expect(combineIndexingStatus({ sitemaps: err, url_inspection: err })).toBe('error');
  });
});

describe('Bing Webmaster mapping', () => {
  it('builds the documented JSON endpoint with siteUrl and the key as query parameters', () => {
    const key = runtimeKey();
    const u = new URL(bingRequestUrl('GetRankAndTrafficStats', BING_SITE_URL, key));
    expect(u.origin + u.pathname).toBe('https://ssl.bing.com/webmaster/api.svc/json/GetRankAndTrafficStats');
    expect(u.searchParams.get('siteUrl')).toBe('https://www.aiwmcquantis.com/');
    expect(u.searchParams.get('apikey')).toBe(key);
  });

  it('parses WCF dates in the offset Bing sent', () => {
    expect(parseBingDate('/Date(1316156400000-0700)/')).toBe('2011-09-16');
    expect(parseBingDate('/Date(1762588800000)/')).toBe('2025-11-08');
    expect(parseBingDate('2011-09-16T00:00:00-07:00')).toBe('2011-09-16');
    expect(parseBingDate('nope')).toBeNull();
  });

  it('maps GetRankAndTrafficStats and GetCrawlStats to one row per day', () => {
    const traffic = mapBingTraffic({ d: [
      { Clicks: 15, Date: '/Date(1316156400000-0700)/', Impressions: 100 },
      { Clicks: 2, Date: '/Date(1316242800000-0700)/', Impressions: 30 },
    ] });
    expect(traffic.map((r) => [r.day, r.report, r.metrics])).toEqual([
      ['2011-09-16', 'bing_traffic', { clicks: 15, impressions: 100 }],
      ['2011-09-17', 'bing_traffic', { clicks: 2, impressions: 30 }],
    ]);
    const [crawl] = mapBingCrawl({ d: [{
      AllOtherCodes: 0, BlockedByRobotsTxt: 0, Code2xx: 9998, Code301: 0, Code302: 0, Code4xx: 1, Code5xx: 1,
      ContainsMalware: 5, CrawlErrors: 0, CrawledPages: 0, Date: '/Date(1316156400000-0700)/', InIndex: 1000, InLinks: 2048,
    }] });
    expect(crawl).toMatchObject({ source: 'bing', report: 'bing_crawl', day: '2011-09-16', dims_key: '{}' });
    expect(crawl.metrics).toMatchObject({ in_index: 1000, in_links: 2048, crawled_pages: 0, code_2xx: 9998, code_4xx: 1, contains_malware: 5 });
  });

  it('not configured: no key means no network call', async () => {
    const fetchImpl = vi.fn();
    for (const k of [undefined, null, '', '   ']) {
      const res = await runBing(k, BING_SITE_URL, fetchImpl as unknown as typeof fetch);
      expect(res).toEqual({ status: 'not_configured', rows: [], errors: ['BING_WEBMASTER_API_KEY is not set'] });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('with a key: both calls; one failure is partial and the error never contains the key', async () => {
    const key = runtimeKey();
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes('GetCrawlStats')) return new Response(JSON.stringify({ ErrorCode: 3, Message: `InvalidApiKey ${key}` }), { status: 400 });
      return json({ d: [{ Clicks: 1, Impressions: 9, Date: '/Date(1316156400000-0700)/' }] });
    });
    const res = await runBing(key, BING_SITE_URL, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(res.status).toBe('partial');
    expect(res.rows).toHaveLength(1);
    expect(res.errors[0]).toMatch(/^Bing GetCrawlStats: HTTP 400 ErrorCode 3 InvalidApiKey/);
    expect(res.errors.join(' ')).not.toContain(key);
    await expect(fetchBing('GetCrawlStats', BING_SITE_URL, key, fetchImpl as unknown as typeof fetch)).rejects.toThrow('[redacted]');
  });
});

describe('IndexNow ping summary', () => {
  const now = new Date('2026-11-08T13:00:00Z');

  it('accepts a real ping and writes one row keyed by its time', () => {
    const parsed = parseIndexNowPing({ ping: { http_status: 202, url_count: 41, pinged_at: '2026-11-08T12:59:00.000Z', duration_ms: 350, commit_sha: 'abc1234' } }, now);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const row = indexNowRow(parsed.ping);
    expect(row).toMatchObject({ source: 'indexnow', report: 'indexnow_ping', day: '2026-11-08', dims: { pinged_at: '2026-11-08T12:59:00.000Z' } });
    expect(row.metrics).toEqual({ http_status: 202, url_count: 41, accepted: 1, duration_ms: 350, commit_sha: 'abc1234' });
    const rejected = parseIndexNowPing({ ping: { http_status: 403, url_count: 41, pinged_at: '2026-11-08T12:59:00Z' } }, now);
    expect(rejected.ok && indexNowRow(rejected.ping).metrics.accepted).toBe(0);
  });

  it('rejects junk: missing ping, bad status, bad count, stale or future time', () => {
    const bad = [
      {},
      { ping: { http_status: 'ok', url_count: 1, pinged_at: '2026-11-08T12:00:00Z' } },
      { ping: { http_status: 200, url_count: 20_000, pinged_at: '2026-11-08T12:00:00Z' } },
      { ping: { http_status: 200, url_count: 1, pinged_at: '2026-11-01T12:00:00Z' } },
      { ping: { http_status: 200, url_count: 1, pinged_at: '2026-11-08T14:00:00Z' } },
      { ping: { http_status: 200, url_count: 1, pinged_at: 'yesterday' } },
    ];
    for (const b of bad) expect(parseIndexNowPing(b, now).ok).toBe(false);
  });
});

describe('plan and quota counts', () => {
  it('a daily run makes 10 PSI calls, 8 inspections, 1 sitemaps call and 2 Bing calls (0 without a key)', () => {
    expect(dailyCallBudget()).toEqual({ psi: 10, url_inspection: 8, sitemaps: 1, bing: 2 });
    expect(dailyCallBudget(false).bing).toBe(0);
    expect(KEY_PATHS).toEqual(['/', '/pricing', '/decision-review', '/demo/hiring-decision', '/consultant-pilot']);
    expect(INSPECTION_PATHS).toEqual([...KEY_PATHS, '/consultants', '/how-it-works', '/demo/founder-decision-review']);
    expect(dailyCallBudget().url_inspection).toBeLessThan(URL_INSPECTION_DAILY_QUOTA / 100);
  });

  it('daily runs PSI, indexing and Bing; backfill skips them with a reason; ping is a mode', () => {
    const daily = planRun('daily', '2026-11-08');
    expect([daily.psi.call, daily.indexing.call, daily.bing.call]).toEqual([true, true, true]);
    const back = planRun('backfill', '2026-11-08');
    expect([back.psi.call, back.indexing.call, back.bing.call]).toEqual([false, false, false]);
    expect(back.psi.skip).toMatch(/PageSpeed Insights/);
    expect(back.indexing.skip).toMatch(/current state/);
    expect(parseMode('ping')).toBe('ping');
    expect(parseMode('indexnow')).toBeNull();
  });

  it('every source has at least one report whose prefix is the source (DB pairing constraint)', () => {
    for (const s of GROWTH_SOURCES) expect(GROWTH_REPORTS.some((r) => r.split('_')[0] === s)).toBe(true);
    for (const r of GROWTH_REPORTS) expect(GROWTH_SOURCES).toContain(r.split('_')[0]);
  });
});

describe('phase-2 migration and IndexNow wiring', () => {
  const dir = resolve(process.cwd(), 'supabase/migrations');
  const file = readdirSync(dir).find((f) => f.endsWith('_growth_sync_seo_sources.sql'));
  const sql = file ? readFileSync(resolve(dir, file), 'utf8').replace(/\r\n/g, '\n') : '';

  it('widens the source, report, status and mode CHECKs to exactly the code lists', () => {
    expect(file).toBeDefined();
    const list = (name: string) => {
      const m = new RegExp(`ADD CONSTRAINT ${name} CHECK \\((?:source|report|status|mode) IN \\(([^)]*)\\)\\)`).exec(sql);
      return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : null;
    };
    expect(list('ext_metrics_daily_report_check')).toEqual([...GROWTH_REPORTS]);
    expect(list('ext_metrics_daily_source_check')).toEqual([...GROWTH_SOURCES]);
    expect(list('ext_sync_runs_source_check')).toEqual([...GROWTH_SOURCES]);
    expect(list('ext_sync_runs_status_check')).toContain('permission_denied');
    expect(list('ext_sync_runs_mode_check')).toEqual(['daily', 'backfill', 'ping']);
    expect(sql).not.toMatch(/GRANT /);
    expect(sql).not.toMatch(/cron\.schedule/);
  });

  it('the deploy step passes CRON_SECRET from GitHub secrets and the script sends it only as a header', () => {
    const wf = readFileSync(resolve(process.cwd(), '.github/workflows/production-deploy.yml'), 'utf8').replace(/\r\n/g, '\n');
    const step = wf.slice(wf.indexOf('- name: IndexNow ping (non-blocking)'), wf.indexOf('run: node scripts/indexnow-ping.mjs'));
    expect(step).toContain('continue-on-error: true');
    expect(step).toContain('CRON_SECRET: ${{ secrets.CRON_SECRET }}');
    const script = readFileSync(resolve(process.cwd(), 'scripts/indexnow-ping.mjs'), 'utf8');
    expect(script).toContain('"x-cron-secret": secret');
    expect(script).toContain('mode: "ping", source: "indexnow"');
    expect(script).not.toMatch(/console\.[a-z]+\([^)]*secret\b/);
  });
});
