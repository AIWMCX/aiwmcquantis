import { useEffect } from 'react';

const SITE_URL = 'https://aiwmcquantis.com';
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
 * PageSEO - Dynamic SEO component for page-specific meta tags
 * 
 * Usage:
 * <PageSEO 
 *   title="Page Title - AIWMC Quantis"
 *   description="Page description under 160 characters"
 *   canonical="/page-path"
 *   noindex={false}
 * />
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
  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper to update or create meta tags
    const updateMetaTag = (selector: string, content: string, createAttrs?: Record<string, string>) => {
      let element = document.querySelector(selector) as HTMLMetaElement | null;
      if (element) {
        element.setAttribute('content', content);
      } else if (createAttrs) {
        element = document.createElement('meta');
        Object.entries(createAttrs).forEach(([key, value]) => {
          element!.setAttribute(key, value);
        });
        element.setAttribute('content', content);
        document.head.appendChild(element);
      }
    };

    // Helper to update or create link tags
    const updateLinkTag = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (element) {
        element.setAttribute('href', href);
      } else {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        element.setAttribute('href', href);
        document.head.appendChild(element);
      }
    };

    // Update meta description
    updateMetaTag('meta[name="description"]', description, { name: 'description' });

    // Update robots meta tag
    const robotsContent = noindex ? 'noindex, nofollow' : 'index, follow';
    updateMetaTag('meta[name="robots"]', robotsContent, { name: 'robots' });

    // Update canonical URL
    const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : SITE_URL;
    updateLinkTag('canonical', canonicalUrl);

    // Update Open Graph tags
    updateMetaTag('meta[property="og:title"]', title, { property: 'og:title' });
    updateMetaTag('meta[property="og:description"]', description, { property: 'og:description' });
    updateMetaTag('meta[property="og:url"]', canonicalUrl, { property: 'og:url' });
    updateMetaTag('meta[property="og:type"]', ogType, { property: 'og:type' });
    updateMetaTag('meta[property="og:image"]', ogImage, { property: 'og:image' });

    // Update Twitter Card tags
    updateMetaTag('meta[name="twitter:card"]', twitterCard, { name: 'twitter:card' });
    updateMetaTag('meta[name="twitter:title"]', title, { name: 'twitter:title' });
    updateMetaTag('meta[name="twitter:description"]', description, { name: 'twitter:description' });
    updateMetaTag('meta[name="twitter:image"]', ogImage, { name: 'twitter:image' });

    // Inject custom JSON-LD if provided
    if (jsonLd) {
      const existingScript = document.getElementById('page-jsonld');
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement('script');
      script.id = 'page-jsonld';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    // Cleanup custom JSON-LD on unmount
    return () => {
      if (jsonLd) {
        const script = document.getElementById('page-jsonld');
        if (script) {
          script.remove();
        }
      }
    };
  }, [title, description, canonical, noindex, ogImage, ogType, twitterCard, jsonLd]);

  return null;
}

export default PageSEO;
