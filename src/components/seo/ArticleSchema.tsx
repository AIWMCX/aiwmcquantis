import React from 'react';
import { Helmet } from 'react-helmet-async';

interface ArticleAuthor {
  name: string;
  url?: string;
}

interface ArticleSchemaProps {
  headline: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author: ArticleAuthor;
  publisher?: {
    name: string;
    logo: string;
  };
  url: string;
  keywords?: string[];
  articleSection?: string;
  wordCount?: number;
}

/**
 * Article Schema Component
 * 
 * Generates structured data for blog posts and articles.
 * Helps Google display rich snippets for articles in search results.
 * 
 * @see https://schema.org/Article
 * @see https://developers.google.com/search/docs/appearance/structured-data/article
 */
export const ArticleSchema = React.memo(function ArticleSchema({
  headline,
  description,
  image,
  datePublished,
  dateModified,
  author,
  publisher,
  url,
  keywords,
  articleSection,
  wordCount,
}: ArticleSchemaProps) {
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    image,
    datePublished,
    ...(dateModified && { dateModified }),
    author: {
      '@type': 'Person',
      name: author.name,
      ...(author.url && { url: author.url }),
    },
    publisher: publisher
      ? {
          '@type': 'Organization',
          name: publisher.name,
          logo: {
            '@type': 'ImageObject',
            url: publisher.logo,
          },
        }
      : {
          '@type': 'Organization',
          name: 'AIWMC™ LLC',
          logo: {
            '@type': 'ImageObject',
            url: 'https://aiwmcquantis.com/icon-512.png',
          },
        },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    ...(keywords && keywords.length > 0 && { keywords: keywords.join(', ') }),
    ...(articleSection && { articleSection }),
    ...(wordCount && { wordCount }),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schemaData)}
      </script>
    </Helmet>
  );
});

/**
 * FAQ Schema for product pages
 */
interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSchemaProps {
  items: FAQItem[];
}

export const FAQSchema = React.memo(function FAQSchema({ items }: FAQSchemaProps) {
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schemaData)}
      </script>
    </Helmet>
  );
});

/**
 * Pre-configured FAQ schema for common Quantis questions
 */
export const QuantisFAQ = React.memo(function QuantisFAQ() {
  const faqItems: FAQItem[] = [
    {
      question: 'How long does AIWMC Quantis take to analyze a business idea?',
      answer: 'AIWMC Quantis generates complete business analysis including financial projections, market analysis, and business plans in under 2 minutes. The AI processes your business idea description and target location to provide instant, actionable insights.',
    },
    {
      question: 'Is AIWMC Quantis free to use?',
      answer: 'Yes — your first analysis is free and shows your viability score plus the top 3 critical risks. To unlock the full report (Monte Carlo, P&L, competitive analysis, action plan) and unlimited analyses, upgrade to Plus for $17/month.',
    },
    {
      question: 'How accurate are the financial projections?',
      answer: 'AIWMC Quantis uses data from 97,500 industry benchmarks and adjusts calculations based on your specific location. While projections are estimates for planning purposes, they are based on real market data and validated financial models with location-specific cost adjustments for 50+ cities worldwide.',
    },
    {
      question: 'Can I export my business analysis?',
      answer: 'Yes! Plus subscribers can export their complete analysis as professional PDF reports. You can also share your analysis with team members or advisors using secure share links.',
    },
    {
      question: 'What locations does AIWMC Quantis support?',
      answer: 'AIWMC Quantis supports business analysis for 50+ cities worldwide, with location-specific cost adjustments for salaries, rent, utilities, and other operating expenses. This ensures your financial projections accurately reflect your target market.',
    },
  ];

  return <FAQSchema items={faqItems} />;
});
