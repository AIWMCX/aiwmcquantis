import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://aiwmcquantis.com';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface StructuredDataProps {
  includeFAQ?: boolean;
  faqItems?: Array<{ question: string; answer: string }>;
  includeBreadcrumbs?: boolean;
  breadcrumbs?: BreadcrumbItem[];
}

export function StructuredData({ 
  includeFAQ = false, 
  faqItems = [],
  includeBreadcrumbs = false,
  breadcrumbs = []
}: StructuredDataProps) {
  const location = useLocation();

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

    // SoftwareApplication Schema - Without unverified ratings
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
          description: 'Unlimited analyses with advanced financial modeling, document intelligence, PDF export, and custom branding'
        }
      ],
      featureList: [
        'Financial Projections',
        'Market Analysis',
        'Business Plan Generation',
        'Document Intelligence',
        'Location-Based Insights',
        'PDF Export',
        'Custom Branding'
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

    // Cleanup on unmount
    return () => {
      scripts.forEach(script => script.remove());
    };
  }, [includeFAQ, faqItems, includeBreadcrumbs, breadcrumbs, location.pathname]);

  return null;
}

export default StructuredData;
