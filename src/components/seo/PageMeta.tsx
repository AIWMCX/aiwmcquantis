import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://aiwmcquantis.com';
const DEFAULT_OG = `${SITE_URL}/og-image.png`;

interface PageMetaProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
}

/**
 * Per-route SEO meta. Use on every public page so Googlebot and crawlers
 * see proper title/description/OpenGraph BEFORE JS hydration.
 *
 * Title: <60 chars. Description: <160 chars. Single H1 per page.
 */
export function PageMeta({
  title,
  description,
  path = '',
  image = DEFAULT_OG,
  type = 'website',
  noIndex = false,
}: PageMetaProps) {
  const url = `${SITE_URL}${path}`;
  const fullTitle = title.includes('Quantis') ? title : `${title} | AIWMC Quantis`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* OpenGraph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="AIWMC Quantis" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
