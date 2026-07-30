/**
 * QuoteGen is only auto-offered for the three service trades it can
 * actually price today: HVAC, Electrical (electrician), and general Handyman
 * work. Every other industry gets no QuoteGen entry point at all — offering
 * it generically would point users at a tool with no relevant pricing
 * assemblies for their business.
 *
 * Handyman jobs commonly span electrical/HVAC/plumbing scope, so they route
 * into the same trade picker rather than a dedicated "handyman" trade_id.
 */
export type QuoteGenTrade = 'hvac' | 'electrical' | 'handyman';

const HVAC_KEYWORDS = ['hvac', 'heating', 'air condition', 'ac repair', 'furnace'];
const ELECTRICAL_KEYWORDS = ['electrician', 'electrical'];
const HANDYMAN_KEYWORDS = ['handyman', 'handywoman', 'home repair', 'odd job'];

function matches(haystack: string, keywords: string[]): boolean {
  return keywords.some((k) => haystack.includes(k));
}

/**
 * Detect whether an analyzed business idea is QuoteGen-eligible, and which
 * trade to preselect. Checks the free-text idea and the engine's detected
 * industry label — either is sufficient since users phrase ideas loosely
 * ("I fix furnaces" should match HVAC even if industry_detected doesn't).
 */
export function detectQuoteGenTrade(
  idea: string | undefined,
  industryDetected: string | undefined,
): QuoteGenTrade | null {
  const haystack = `${idea ?? ''} ${industryDetected ?? ''}`.toLowerCase();
  if (matches(haystack, HVAC_KEYWORDS)) return 'hvac';
  if (matches(haystack, ELECTRICAL_KEYWORDS)) return 'electrical';
  if (matches(haystack, HANDYMAN_KEYWORDS)) return 'handyman';
  return null;
}
