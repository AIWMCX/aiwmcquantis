import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BENCHMARK_COUNT_DISPLAY, FREE_ANALYSES_PER_MONTH, GEO_COVERAGE_DISPLAY } from '@/config/canonical-facts';
import { TIERS } from '@/config/tiers';
import { ENGAGEMENT_OFFERS, type EngagementOfferCode } from '@/config/engagement-offers';

const SITE_URL = 'https://www.aiwmcquantis.com';

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
    // Organization Schema — enriched
    const organizationSchema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'AIWMC Quantis',
      legalName: 'AIWMC LLC',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630
      },
      description: 'Test a business decision before you fund it: explicit assumptions, deterministic cash, break-even and payback math, and downside scenarios.',
      email: 'support@aiwmcquantis.com',
      founder: {
        '@type': 'Person',
        name: 'Bogdan Jeltov'
      },
      numberOfEmployees: {
        '@type': 'QuantitativeValue',
        minValue: 1,
        maxValue: 10
      },
      // Official profiles (same as the footer). The Facebook link is a share
      // redirect, not a profile URL, so it is left out.
      sameAs: [
        'https://www.linkedin.com/company/aiwmc/',
        'https://x.com/aiwmcx1',
        'https://t.me/aiwmcx',
        'https://www.instagram.com/wmc.ai',
        'https://www.threads.com/@wmc.ai',
        'https://www.youtube.com/@AIWMCX',
        'https://github.com/AIWMCX',
        'https://whop.com/aiwmc'
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
      keywords: 'Business Decision Analysis, Financial Modeling, Scenario Analysis, Break-Even, Payback, Hiring Decisions, Fractional CFO Tools'
    };

    // SoftwareApplication Schema — every claim from config (SEO audit 2026-10-27
    // removed "12 financial variables", multi-model consensus, team workspaces).
    const softwareSchema = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: 'AIWMC Quantis',
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Financial Analysis',
      operatingSystem: 'Web',
      description: `Tests a business decision with deterministic cash, break-even and payback calculations, base/downside/upside scenarios, and benchmark defaults from a ${BENCHMARK_COUNT_DISPLAY}-cell modeled coverage grid (modeled cells, not observed companies).`,
      url: SITE_URL,
      screenshot: `${SITE_URL}/og-image.png`,
      author: { '@id': `${SITE_URL}/#organization` },
      publisher: { '@id': `${SITE_URL}/#organization` },
      offers: [
        { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD', description: `${FREE_ANALYSES_PER_MONTH} complete Decision Runs per month` },
        { '@type': 'Offer', name: 'Plus', price: String(TIERS.plus.priceMonthly), priceCurrency: 'USD', description: 'Unlimited analyses, PDF export, scenarios and decision tools (per month)' },
        { '@type': 'Offer', name: 'Pro', price: String(TIERS.pro.priceMonthly), priceCurrency: 'USD', description: 'Everything in Plus, with investor-ready outputs (per month)' },
        ...ENGAGEMENT_OFFERS.map((o) => ({ '@type': 'Offer', name: o.name, price: String(o.price), priceCurrency: 'USD', url: `${SITE_URL}/decision-review`, description: `One-time, founder-assisted: ${o.cases}` })),
      ],
      featureList: [
        'Financial pre-mortem',
        'Base, downside and upside scenarios',
        'Cash, break-even and payback reconciliation',
        'Unit economics (CAC, LTV, payback)',
        '1,000-iteration monthly profit range (P10/P50/P90)',
        `Benchmark defaults from a ${BENCHMARK_COUNT_DISPLAY}-cell modeled coverage grid`,
        `Location-adjusted cost estimates (${GEO_COVERAGE_DISPLAY})`,
        'Risk flags',
        'Document Studio',
        'PDF export'
      ]
    };

    // WebSite Schema — enriched
    const websiteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'AIWMC Quantis',
      url: SITE_URL,
      description: 'Test a business decision before you fund it',
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en-US'
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
        provider: { '@id': `${SITE_URL}/#organization` },
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
