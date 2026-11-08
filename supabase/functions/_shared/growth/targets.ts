/**
 * Which pages the phase-2 SEO sources watch, and how many API calls a daily
 * run makes (pure; imported by vitest and /admin/growth).
 *
 *   PSI:            5 key pages x 2 devices        = 10 calls a day
 *   URL Inspection: 5 key pages + 3 more           =  8 calls a day (quota 2,000/day)
 *   Sitemaps:       1 sitemaps.list call
 *   Bing:           GetRankAndTrafficStats + GetCrawlStats = 2 calls (only with a key)
 */

export const SITE_ORIGIN = 'https://www.aiwmcquantis.com';

/** The pages that sell: PageSpeed Insights runs on each of them, mobile and desktop. */
export const KEY_PATHS = [
  '/',
  '/pricing',
  '/decision-review',
  '/demo/hiring-decision',
  '/consultant-pilot',
] as const;

/** URL Inspection covers the key pages plus three supporting pages. */
export const INSPECTION_PATHS = [
  ...KEY_PATHS,
  '/consultants',
  '/how-it-works',
  '/demo/founder-decision-review',
] as const;

export const PSI_DEVICES = ['mobile', 'desktop'] as const;
export type PsiDevice = (typeof PSI_DEVICES)[number];

/** Published Search Console URL Inspection quota per property. */
export const URL_INSPECTION_DAILY_QUOTA = 2_000;
/** Published PageSpeed Insights quota with an API key (none is published without one). */
export const PSI_DAILY_QUOTA_WITH_KEY = 25_000;

export function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path}`;
}

export interface DailyCallBudget {
  psi: number;
  url_inspection: number;
  sitemaps: number;
  bing: number;
}

/** API calls one daily run makes per source (Bing only when its key is set). */
export function dailyCallBudget(bingConfigured = true): DailyCallBudget {
  return {
    psi: KEY_PATHS.length * PSI_DEVICES.length,
    url_inspection: INSPECTION_PATHS.length,
    sitemaps: 1,
    bing: bingConfigured ? 2 : 0,
  };
}
