/**
 * UTM auto-tagging utility.
 *
 * Use `withUtm(url, { source, medium, campaign, content })` to append/merge
 * UTM params on any outbound or referral link so every signup and checkout
 * source is measurable in /admin/conversion-by-source.
 *
 * Conventions (keep consistent — admin dashboard groups by these):
 *   source   = where the click originates (e.g. 'homepage', 'pricing',
 *              'analysis_result', 'social_linkedin', 'referral', 'producthunt')
 *   medium   = channel type ('internal_cta', 'social', 'referral',
 *              'directory', 'email', 'share')
 *   campaign = optional logical grouping ('hero', 'pricing_table',
 *              'sample_report', 'pdf_export', 'invite')
 *   content  = optional A/B variant or CTA label
 */
export type UtmParams = {
  source: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
};

const DEFAULT_MEDIUM = 'internal_cta';

/**
 * Append/merge UTM params onto a URL. Existing utm_* on the URL win — we
 * never overwrite explicit attribution that a marketer set.
 */
export function withUtm(url: string, p: UtmParams): string {
  try {
    const isAbsolute = /^https?:\/\//i.test(url);
    const base =
      typeof window !== 'undefined' ? window.location.origin : 'https://aiwmcquantis.com';
    const u = new URL(url, isAbsolute ? undefined : base);

    const set = (k: string, v: string | undefined) => {
      if (!v) return;
      if (!u.searchParams.has(k)) u.searchParams.set(k, v);
    };
    set('utm_source', p.source);
    set('utm_medium', p.medium ?? DEFAULT_MEDIUM);
    set('utm_campaign', p.campaign ?? '');
    set('utm_content', p.content ?? '');
    set('utm_term', p.term ?? '');

    // Strip empty trailing values we may have just added
    for (const k of ['utm_campaign', 'utm_content', 'utm_term']) {
      if (u.searchParams.get(k) === '') u.searchParams.delete(k);
    }

    return isAbsolute ? u.toString() : u.pathname + u.search + u.hash;
  } catch {
    return url;
  }
}

/**
 * Build a shareable absolute URL with UTM — for social, email, referral.
 */
export function shareUrl(path: string, p: UtmParams): string {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://aiwmcquantis.com';
  const abs = path.startsWith('http') ? path : `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
  return withUtm(abs, p);
}
