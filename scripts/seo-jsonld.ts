/**
 * JSON-LD blocks injected into prerendered HTML per route.
 *
 * Crawlers that don't execute JS (most preview bots, some Bing/DDG cycles)
 * read these directly from the static shell. Googlebot also prefers static
 * structured data because it's cheaper than running the SPA.
 *
 * Schema set per SEO_PACKAGE_V2.md §2:
 *   - Organization (every page, sitewide identity)
 *   - WebSite + SearchAction (homepage)
 *   - SoftwareApplication (homepage + /pricing)
 *   - FAQPage (homepage)
 *   - Article (blog posts)
 *   - BreadcrumbList (every inner page)
 *
 * Product schema for /examples/* is intentionally omitted until the example
 * pages emit machine-readable profit/margin metadata — v2 §1 forbids generic
 * Product schema with placeholder numbers.
 */

const SITE = 'https://aiwmcquantis.com';
const LOGO = `${SITE}/logo.png`;

const ORG = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE}/#organization`,
  name: 'AIWMC™ LLC',
  alternateName: 'AIWMC Quantis',
  url: SITE,
  logo: { '@type': 'ImageObject', url: LOGO, width: 512, height: 512 },
  description:
    'AIWMC™ LLC builds AI-powered business validation tools that help founders stress-test startup ideas with 95,500 real benchmarks, financial projections, risk flags, and action plans.',
  foundingDate: '2026-01-18',
  sameAs: [
    'https://twitter.com/aiwmcquantis',
    'https://www.linkedin.com/company/aiwmc',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'support@aiwmcquantis.com',
    availableLanguage: 'English',
  },
};

const WEBSITE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE}/#website`,
  name: 'AIWMC Quantis',
  url: SITE,
  description: 'AI-powered business validation and financial stress-testing for founders',
  publisher: { '@id': `${SITE}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/examples?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
  inLanguage: 'en-US',
};

const SOFTWARE = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': `${SITE}/#software`,
  name: 'AIWMC Quantis',
  url: SITE,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'AI-powered business validation SaaS that stress-tests startup models against 95,500 industry benchmarks with Monte Carlo simulation in 90 seconds.',
  featureList: [
    'Financial pre-mortem analysis',
    '12-variable financial projections',
    '3-scenario Monte Carlo modeling (P10/P50/P90)',
    'Risk flag identification with severity ratings',
    'Unit economics (CAC, LTV, LTV:CAC, payback period)',
    'Break-even timeline analysis',
    '95,500 verified industry benchmarks',
    '50+ city cost index adjustment',
    'PDF report export (Plus)',
    'Document Studio (Plus)',
    'Location comparison (Plus)',
  ],
  softwareVersion: '3.0',
  datePublished: '2026-01-18',
  dateModified: '2026-05-27',
  author: { '@id': `${SITE}/#organization` },
  publisher: { '@id': `${SITE}/#organization` },
  offers: [
    {
      '@type': 'Offer',
      name: 'Free Plan',
      price: '0',
      priceCurrency: 'USD',
      description: '3 analyses per month, full financial report, risk flags and action plan. No credit card required.',
      availability: 'https://schema.org/InStock',
      url: `${SITE}/pricing`,
    },
    {
      '@type': 'Offer',
      name: 'Plus Plan',
      price: '17',
      priceCurrency: 'USD',
      description: 'Unlimited analyses, PDF export, Document Studio, location comparison, custom branding, priority support.',
      availability: 'https://schema.org/InStock',
      url: `${SITE}/pricing`,
    },
  ],
};

const FAQ = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    ['What is AIWMC Quantis?',
      'AIWMC Quantis is an AI-powered business validation tool that runs a financial pre-mortem on your startup idea. In 90 seconds, it stress-tests your business model against 95,500 industry benchmarks and generates revenue projections, risk flags, unit economics, and a clear action plan.'],
    ['How long does a business validation take?',
      'A complete Quantis analysis takes approximately 90 seconds. You describe your business idea and target location in plain language, and the engine returns a full financial report with 3-scenario projections, risk flags, unit economics, and an action plan.'],
    ['Is Quantis free to use?',
      'Yes. Quantis offers a permanent free plan with 3 analyses per month, full financial reports, and risk flags — no credit card required. The Plus plan at $17/month adds unlimited analyses, PDF export, Document Studio, location comparison, and custom branding.'],
    ['What financial metrics does Quantis calculate?',
      'Quantis calculates 12 financial variables: revenue projections, COGS, gross margin, operating expenses, net profit, break-even month, startup investment, payback period, LTV, CAC, LTV:CAC ratio, and monthly burn rate — across P10, P50 and P90 scenarios.'],
    ['What industries and locations does Quantis support?',
      'Quantis covers 100+ industry types and adjusts projections for 50+ global cities using location-specific cost indices. The 95,500-row benchmark database is sourced from SBA, IBISWorld, Census Bureau, BLS, OECD, and proprietary datasets.'],
    ['How accurate are Quantis projections?',
      'Quantis uses a deterministic financial engine with 1,000 Monte Carlo simulations per analysis — not AI hallucination. Every metric is computed from real benchmarks with confidence scoring. Projections are stress-test estimates designed to identify risks before you invest.'],
    ['What is a financial pre-mortem?',
      'A financial pre-mortem imagines your business has already failed and works backward to identify the most likely causes. Quantis automates this by quantifying your key financial risks and flagging fatal assumptions — before you spend money building.'],
    ['Does Quantis replace a business plan or consultant?',
      'Quantis delivers the most critical financial intelligence — risk flags, projections, unit economics — in 90 seconds at a fraction of the cost. A consultant charges $1,500–$25,000 for equivalent analysis. Use Quantis first to validate whether your model is worth developing further.'],
  ].map(([q, a]) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

function breadcrumb(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${SITE}${it.path}`,
    })),
  };
}

function article(route: string, title: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${SITE}${route}#article`,
    headline: title,
    description,
    datePublished: '2026-03-01',
    dateModified: '2026-05-27',
    author: { '@type': 'Organization', name: 'AIWMC™ LLC', url: SITE },
    publisher: {
      '@type': 'Organization',
      name: 'AIWMC Quantis',
      logo: { '@type': 'ImageObject', url: LOGO, width: 512, height: 512 },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}${route}` },
    inLanguage: 'en-US',
  };
}

function titleize(slug: string) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildJsonLd(route: string, title: string, description: string): object[] {
  const blocks: object[] = [ORG];

  if (route === '/') {
    blocks.push(WEBSITE, SOFTWARE, FAQ);
    return blocks;
  }

  if (route === '/pricing') {
    blocks.push(SOFTWARE);
  }

  if (route.startsWith('/blog/')) {
    blocks.push(article(route, title, description));
    blocks.push(
      breadcrumb([
        { name: 'Home', path: '/' },
        { name: 'Blog', path: '/blog' },
        { name: title, path: route },
      ]),
    );
    return blocks;
  }

  if (route.startsWith('/examples/')) {
    const slug = route.slice('/examples/'.length);
    blocks.push(
      breadcrumb([
        { name: 'Home', path: '/' },
        { name: 'Examples', path: '/examples' },
        { name: titleize(slug), path: route },
      ]),
    );
    return blocks;
  }

  // Generic inner page
  const name = title.split(' — ')[0].split(' | ')[0];
  blocks.push(
    breadcrumb([
      { name: 'Home', path: '/' },
      { name, path: route },
    ]),
  );
  return blocks;
}
