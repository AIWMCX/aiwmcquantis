import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://www.aiwmcquantis.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

interface PageSEOProps {
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
  ogImage?: string;
  ogType?: 'website' | 'article';
  twitterCard?: 'summary' | 'summary_large_image';
  jsonLd?: object;
}

/**
 * PageSEO — per-route SEO via react-helmet-async.
 *
 * Renders <title>, canonical, robots, OpenGraph, Twitter, and optional JSON-LD
 * during render (not in useEffect) so that prerendered HTML and crawlers see
 * the correct per-page metadata BEFORE hydration.
 *
 * This fixes the canonical-collapse bug where every prerendered route inherited
 * the static <link rel="canonical"> from index.html and Google consolidated the
 * entire site to the homepage.
 */
export function PageSEO({
  title,
  description,
  canonical,
  noindex = false,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  twitterCard = 'summary_large_image',
  jsonLd,
}: PageSEOProps) {
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : SITE_URL;
  const robotsContent = noindex ? 'noindex, nofollow' : 'index, follow';

  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robotsContent} />
      <link rel="canonical" href={canonicalUrl} />

      {/* OpenGraph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="AIWMC Quantis" />

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}

export default PageSEO;
