import { useEffect } from 'react';

const SITE_URL = 'https://aiwmcquantis.com';

interface StructuredDataProps {
  includeFAQ?: boolean;
  faqItems?: Array<{ question: string; answer: string }>;
}

export function StructuredData({ includeFAQ = false, faqItems = [] }: StructuredDataProps) {
  useEffect(() => {
    // Organization Schema
    const organizationSchema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'AIWMC Quantis',
      url: SITE_URL,
      logo: `${SITE_URL}/og-image.png`,
      description: 'AI-powered business analysis platform for financial projections, market analysis, and comprehensive business planning.',
      email: 'support@aiwmcquantis.com',
      foundingDate: '2024',
      sameAs: []
    };

    // SoftwareApplication Schema
    const softwareSchema = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'AIWMC Quantis',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: 'AI-powered business analysis platform that generates financial projections, market analysis, and complete business plans in under 2 minutes.',
      offers: [
        {
          '@type': 'Offer',
          name: 'Free',
          price: '0',
          priceCurrency: 'USD',
          description: '3 analyses per month with basic financial projections'
        },
        {
          '@type': 'Offer',
          name: 'Plus',
          price: '17',
          priceCurrency: 'USD',
          priceValidUntil: '2026-12-31',
          description: 'Unlimited analyses with advanced financial modeling and PDF export'
        },
        {
          '@type': 'Offer',
          name: 'Pro',
          price: '29',
          priceCurrency: 'USD',
          priceValidUntil: '2026-12-31',
          description: 'Team collaboration, API access, and custom branding'
        }
      ],
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '50',
        bestRating: '5',
        worstRating: '1'
      },
      featureList: [
        'Financial Projections',
        'Market Analysis',
        'Business Plan Generation',
        'Document Intelligence',
        'Location-Based Insights',
        'PDF Export'
      ]
    };

    // WebSite Schema with SearchAction
    const websiteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'AIWMC Quantis',
      url: SITE_URL,
      description: 'AI-powered business analysis platform for entrepreneurs and startups',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/app?q={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      }
    };

    // Create and inject script tags
    const scripts: HTMLScriptElement[] = [];

    const injectSchema = (schema: object, id: string) => {
      // Remove existing if present
      const existing = document.getElementById(id);
      if (existing) existing.remove();

      const script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
      scripts.push(script);
    };

    injectSchema(organizationSchema, 'schema-organization');
    injectSchema(softwareSchema, 'schema-software');
    injectSchema(websiteSchema, 'schema-website');

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

    // Cleanup on unmount
    return () => {
      scripts.forEach(script => script.remove());
    };
  }, [includeFAQ, faqItems]);

  return null;
}

export default StructuredData;
