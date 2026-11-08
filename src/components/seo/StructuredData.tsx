import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ENGAGEMENT_OFFERS, type EngagementOfferCode } from '@/config/engagement-offers';
import { ORGANIZATION_ID, SITE_URL } from '@/lib/seo/site-schema';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface StructuredDataProps {
  includeFAQ?: boolean;
  faqItems?: Array<{ question: string; answer: string }>;
  includeBreadcrumbs?: boolean;
  breadcrumbs?: BreadcrumbItem[];
  /** Paid one-time offers sold on this page, emitted as Service + Offer. */
  services?: EngagementOfferCode[];
}

export function StructuredData({ 
  includeFAQ = false, 
  faqItems = [],
  includeBreadcrumbs = false,
  breadcrumbs = [],
  services = []
}: StructuredDataProps) {
  const location = useLocation();

  useEffect(() => {
    // Organization, SoftwareApplication and WebSite are NOT injected here:
    // they ship once, linked by @id, in the static <head> of every page
    // (index.html, built from src/lib/seo/site-schema.ts). Injecting them
    // again after hydration created a second SoftwareApplication entity.

    // Create and inject script tags
    const scripts: HTMLScriptElement[] = [];

    const injectSchema = (schema: object, id: string) => {
      const existing = document.getElementById(id);
      if (existing) existing.remove();

      const script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
      scripts.push(script);
    };

    // FAQ Schema if provided
    if (includeFAQ && faqItems.length > 0) {
      const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map(item => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer
          }
        }))
      };
      injectSchema(faqSchema, 'schema-faq');
    }

    // BreadcrumbList Schema if provided
    if (includeBreadcrumbs && breadcrumbs.length > 0) {
      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`
        }))
      };
      injectSchema(breadcrumbSchema, 'schema-breadcrumb');
    }

    // Service + Offer for the one-time offers this page sells. Name, price
    // and scope come from engagement-offers.ts, the same source the page shows.
    if (services.length > 0) {
      const pageUrl = `${SITE_URL}${location.pathname}`;
      const serviceSchema = ENGAGEMENT_OFFERS.filter((o) => services.includes(o.code)).map((o) => ({
        '@context': 'https://schema.org',
        '@type': 'Service',
        '@id': `${pageUrl}#${o.code}`,
        name: o.name,
        serviceType: 'Business decision review',
        description: `${o.cases}: ${o.included.join('; ')}.`,
        audience: { '@type': 'Audience', audienceType: o.audience },
        provider: { '@id': ORGANIZATION_ID },
        offers: {
          '@type': 'Offer',
          price: String(o.price),
          priceCurrency: 'USD',
          url: pageUrl,
          availability: 'https://schema.org/InStock',
        },
      }));
      injectSchema(serviceSchema, 'schema-services');
    }

    // Cleanup on unmount
    return () => {
      scripts.forEach(script => script.remove());
    };
  }, [includeFAQ, faqItems, includeBreadcrumbs, breadcrumbs, services, location.pathname]);

  return null;
}

export default StructuredData;
