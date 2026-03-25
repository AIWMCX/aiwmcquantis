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
    // Organization Schema — enriched
    const organizationSchema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'AIWMC AI Agency LLC',
      alternateName: 'AIWMC Quantis',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630
      },
      description: 'AI-powered business validation platform. Stress-test your startup idea before you commit capital.',
      slogan: 'AI-powered business validation. Stress-test your startup idea before you commit capital.',
      email: 'support@aiwmcquantis.com',
      foundingDate: '2024',
      founder: {
        '@type': 'Person',
        name: 'Bogdan Jeltov'
      },
      numberOfEmployees: {
        '@type': 'QuantitativeValue',
        minValue: 1,
        maxValue: 10
      },
      sameAs: [
        'https://www.linkedin.com/company/aiwmc-quantis',
        'https://twitter.com/aiwmcquantis'
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'support@aiwmcquantis.com',
        contactType: 'customer support',
        availableLanguage: ['English']
      },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Denver',
        addressRegion: 'CO',
        addressCountry: 'US'
      },
      keywords: 'Business Validation, Startup Tools, AI Financial Modeling, Risk Assessment, Scenario Analysis, Entrepreneurship, Solo Founder Tools, SaaS, Startup Strategy, Business Intelligence, Early-Stage Startups, Venture Validation'
    };

    // SoftwareApplication Schema — enriched per SEO v3
    const softwareSchema = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: 'AIWMC Quantis',
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Financial Analysis',
      operatingSystem: 'Web',
      browserRequirements: 'Requires JavaScript. Works in Chrome, Firefox, Safari, Edge.',
      softwareVersion: '2.0',
      description: 'AI-powered business validation platform that stress-tests startup ideas across 12 financial variables using 1,000+ industry benchmarks in 90 seconds.',
      url: SITE_URL,
      screenshot: `${SITE_URL}/og-image.png`,
      datePublished: '2024-06-01',
      dateModified: '2026-03-25',
      author: { '@id': `${SITE_URL}/#organization` },
      publisher: { '@id': `${SITE_URL}/#organization` },
      offers: [
        {
          '@type': 'Offer',
          name: 'Free',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          description: '3 analyses per month with financial projections and risk flags'
        },
        {
          '@type': 'Offer',
          name: 'Plus',
          price: '17',
          priceCurrency: 'USD',
          priceValidUntil: '2026-12-31',
          availability: 'https://schema.org/InStock',
          description: 'Unlimited analyses with PDF export, document studio, custom branding, and priority support'
        }
      ],
      featureList: [
        'Financial Pre-Mortem Analysis',
        '3-Scenario Revenue Projections',
        'Unit Economics Calculator (CAC, LTV, Payback)',
        'Monte Carlo Risk Simulation',
        'Industry Benchmark Comparison (1,000+ benchmarks)',
        'Location-Adjusted Cost Intelligence (50+ cities)',
        'Sensitivity & Tornado Analysis',
        'Document Studio (Business Plans, Pitch Decks, NDAs)',
        'PDF Export with Custom Branding',
        'Dual-AI Consensus Validation',
        'Real-Time Risk Flags & Anomaly Detection',
        'Collaborative Team Workspaces'
      ]
    };

    // WebSite Schema — enriched
    const websiteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'AIWMC Quantis',
      url: SITE_URL,
      description: 'AI-powered business validation platform — stress-test any startup idea in 90 seconds',
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en-US',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/blog?q={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      }
    };

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
