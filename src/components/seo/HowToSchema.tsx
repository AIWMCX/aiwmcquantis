import React from 'react';
import { Helmet } from 'react-helmet-async';

interface HowToStep {
  name: string;
  text: string;
  image?: string;
  url?: string;
}

interface HowToSchemaProps {
  name: string;
  description: string;
  steps: HowToStep[];
  estimatedTime?: string; // ISO 8601 duration format, e.g., "PT2M" for 2 minutes
  image?: string;
  totalCost?: {
    currency: string;
    value: string;
  };
  supply?: string[];
  tool?: string[];
}

/**
 * HowTo Schema Component
 * 
 * Generates structured data for step-by-step guides.
 * Used for the analysis flow to help Google understand and
 * potentially display rich snippets in search results.
 * 
 * @see https://schema.org/HowTo
 * @see https://developers.google.com/search/docs/appearance/structured-data/how-to
 */
export const HowToSchema = React.memo(function HowToSchema({
  name,
  description,
  steps,
  estimatedTime,
  image,
  totalCost,
  supply,
  tool,
}: HowToSchemaProps) {
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    ...(estimatedTime && { totalTime: estimatedTime }),
    ...(image && { image }),
    ...(totalCost && {
      estimatedCost: {
        '@type': 'MonetaryAmount',
        currency: totalCost.currency,
        value: totalCost.value,
      },
    }),
    ...(supply && supply.length > 0 && {
      supply: supply.map((item) => ({
        '@type': 'HowToSupply',
        name: item,
      })),
    }),
    ...(tool && tool.length > 0 && {
      tool: tool.map((item) => ({
        '@type': 'HowToTool',
        name: item,
      })),
    }),
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && { image: step.image }),
      ...(step.url && { url: step.url }),
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
 * Pre-configured HowTo schema for the Quantis analysis flow
 */
export const QuantisAnalysisHowTo = React.memo(function QuantisAnalysisHowTo() {
  const steps: HowToStep[] = [
    {
      name: 'Describe Your Business Idea',
      text: 'Enter a detailed description of your business idea, including the product or service you want to offer, your target market, and any unique value propositions. The more detail you provide, the more accurate your analysis will be.',
    },
    {
      name: 'Select Your Target Location',
      text: 'Choose the city or region where you plan to operate your business. Our AI adjusts all cost estimates, salary benchmarks, and market conditions based on your selected location from 50+ cities worldwide.',
    },
    {
      name: 'Review Financial Projections',
      text: 'Within 2 minutes, receive comprehensive financial projections including startup investment requirements, monthly operating costs, revenue forecasts, ROI calculations, and payback period estimates across three scenarios.',
    },
    {
      name: 'Explore Your Business Plan',
      text: 'Access your AI-generated business plan with executive summary, market analysis, competitive landscape, marketing strategy, and operational roadmap tailored to your specific business idea.',
    },
    {
      name: 'Export and Share',
      text: 'Download your analysis as a professional PDF report or share it with your team, advisors, or potential investors using secure share links.',
    },
  ];

  return (
    <HowToSchema
      name="How to Get AI Business Analysis in 2 Minutes with AIWMC Quantis"
      description="Complete guide to validating your business idea using AIWMC Quantis AI-powered business analysis platform. Get financial projections, market analysis, and a complete business plan in under 2 minutes."
      steps={steps}
      estimatedTime="PT2M"
      image="https://aiwmcquantis.com/og-image.png"
      tool={['Web browser', 'AIWMC Quantis account']}
    />
  );
});
