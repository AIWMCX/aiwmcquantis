/**
 * Site-wide structured data: one Organization, one SoftwareApplication and one
 * WebSite, linked by @id.
 *
 * This graph ships in the static <head> of every page (index.html, the
 * template for every prerendered route), so crawlers that do not run
 * JavaScript read it too. Nothing re-injects it at runtime: before 2026-11-08
 * StructuredData.tsx added a second SoftwareApplication after hydration, and
 * the static copy had no Organization sameAs.
 *
 * index.html cannot import TypeScript, so its JSON is a copy of siteGraph().
 * seo-schema-truth.test.ts fails if the two differ. Prices come only from
 * src/config/tiers.ts and src/config/engagement-offers.ts.
 */
import { BENCHMARK_COUNT_DISPLAY, FREE_ANALYSES_PER_MONTH, GEO_COVERAGE_DISPLAY } from '@/config/canonical-facts';
import { TIERS } from '@/config/tiers';
import { ENGAGEMENT_OFFERS } from '@/config/engagement-offers';

export const SITE_URL = 'https://www.aiwmcquantis.com';
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const SOFTWARE_ID = `${SITE_URL}/#software`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

const IN_STOCK = 'https://schema.org/InStock';

/** A recurring plan price with its billing period (P1M monthly, P1Y yearly). */
function planOffer(name: string, price: number, period: 'P1M' | 'P1Y', description: string) {
  return {
    '@type': 'Offer',
    name,
    price: String(price),
    priceCurrency: 'USD',
    url: `${SITE_URL}/pricing`,
    availability: IN_STOCK,
    description,
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: String(price),
      priceCurrency: 'USD',
      billingDuration: period,
      unitCode: period === 'P1M' ? 'MON' : 'ANN',
    },
  };
}

export function organizationSchema() {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: 'AIWMC Quantis',
    legalName: 'AIWMC LLC',
    url: SITE_URL,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/og-image.png`, width: 1200, height: 630 },
    description: 'Test a business decision before you fund it: explicit assumptions, deterministic cash, break-even and payback math, and downside scenarios.',
    email: 'support@aiwmcquantis.com',
    founder: { '@type': 'Person', name: 'Bogdan Jeltov' },
    numberOfEmployees: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 10 },
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
      'https://whop.com/aiwmc',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@aiwmcquantis.com',
      contactType: 'customer support',
      availableLanguage: ['English'],
    },
    address: { '@type': 'PostalAddress', addressLocality: 'Denver', addressRegion: 'CO', addressCountry: 'US' },
    keywords: 'Business Decision Analysis, Financial Modeling, Scenario Analysis, Break-Even, Payback, Hiring Decisions, Fractional CFO Tools',
  };
}

export function softwareSchema() {
  const plus = 'Unlimited analyses, PDF export, scenarios and decision tools';
  const pro = 'Everything in Plus, with investor-ready outputs';
  return {
    '@type': 'SoftwareApplication',
    '@id': SOFTWARE_ID,
    name: 'AIWMC Quantis',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Financial Analysis',
    operatingSystem: 'Web',
    description: `Tests a business decision with deterministic cash, break-even and payback calculations, base/downside/upside scenarios, and benchmark defaults from a ${BENCHMARK_COUNT_DISPLAY}-cell modeled coverage grid (modeled cells, not observed companies).`,
    url: SITE_URL,
    screenshot: `${SITE_URL}/og-image.png`,
    author: { '@id': ORGANIZATION_ID },
    publisher: { '@id': ORGANIZATION_ID },
    offers: [
      { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD', url: `${SITE_URL}/pricing`, availability: IN_STOCK, description: `${FREE_ANALYSES_PER_MONTH} complete Decision Runs per month` },
      planOffer('Plus', TIERS.plus.priceMonthly, 'P1M', `${plus} (per month)`),
      planOffer('Plus (yearly)', TIERS.plus.priceAnnual, 'P1Y', `${plus} (per year)`),
      planOffer('Pro', TIERS.pro.priceMonthly, 'P1M', `${pro} (per month)`),
      planOffer('Pro (yearly)', TIERS.pro.priceAnnual, 'P1Y', `${pro} (per year)`),
      ...ENGAGEMENT_OFFERS.map((o) => ({
        '@type': 'Offer',
        name: o.name,
        price: String(o.price),
        priceCurrency: 'USD',
        url: `${SITE_URL}/decision-review`,
        availability: IN_STOCK,
        description: `One-time, founder-assisted: ${o.cases}`,
      })),
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
      'PDF export',
    ],
  };
}

export function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: 'AIWMC Quantis',
    url: SITE_URL,
    description: 'Test a business decision before you fund it',
    publisher: { '@id': ORGANIZATION_ID },
    inLanguage: 'en-US',
  };
}

/** The exact object index.html carries as its site-wide JSON-LD block. */
export function siteGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [organizationSchema(), softwareSchema(), websiteSchema()],
  };
}
