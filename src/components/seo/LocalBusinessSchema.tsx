import React from 'react';
import { Helmet } from 'react-helmet-async';

interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

interface OpeningHoursSpec {
  dayOfWeek: string[];
  opens: string;
  closes: string;
}

interface LocalBusinessSchemaProps {
  name: string;
  description: string;
  url: string;
  logo?: string;
  image?: string;
  telephone?: string;
  email?: string;
  address: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  geo?: GeoCoordinates;
  openingHours?: OpeningHoursSpec[];
  priceRange?: string;
  sameAs?: string[];
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
}

/**
 * LocalBusiness Schema Component
 * 
 * Generates structured data for local business information.
 * Helps Google understand the business location and contact details
 * for local SEO and Google Business Profile integration.
 * 
 * @see https://schema.org/LocalBusiness
 * @see https://developers.google.com/search/docs/appearance/structured-data/local-business
 */
export const LocalBusinessSchema = React.memo(function LocalBusinessSchema({
  name,
  description,
  url,
  logo,
  image,
  telephone,
  email,
  address,
  geo,
  openingHours,
  priceRange,
  sameAs,
  aggregateRating,
}: LocalBusinessSchemaProps) {
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${url}#organization`,
    name,
    description,
    url,
    ...(logo && { logo }),
    ...(image && { image }),
    ...(telephone && { telephone }),
    ...(email && { email }),
    address: {
      '@type': 'PostalAddress',
      ...address,
    },
    ...(geo && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: geo.latitude,
        longitude: geo.longitude,
      },
    }),
    ...(openingHours && openingHours.length > 0 && {
      openingHoursSpecification: openingHours.map((hours) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: hours.dayOfWeek,
        opens: hours.opens,
        closes: hours.closes,
      })),
    }),
    ...(priceRange && { priceRange }),
    ...(sameAs && sameAs.length > 0 && { sameAs }),
    ...(aggregateRating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: aggregateRating.ratingValue,
        reviewCount: aggregateRating.reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    }),
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
 * Pre-configured LocalBusiness schema for AIWMC AI Agency
 */
export const AIWMCLocalBusiness = React.memo(function AIWMCLocalBusiness() {
  return (
    <LocalBusinessSchema
      name="AIWMC AI Agency LLC"
      description="AIWMC AI Agency is a Denver-based artificial intelligence consulting company specializing in AI-powered business intelligence tools, including AIWMC Quantis™ for instant business analysis and financial projections."
      url="https://aiwmcquantis.com"
      logo="https://aiwmcquantis.com/icon-512.png"
      image="https://aiwmcquantis.com/og-image.png"
      email="support@aiwmc.com"
      address={{
        streetAddress: '1234 Innovation Drive, Suite 100',
        addressLocality: 'Denver',
        addressRegion: 'CO',
        postalCode: '80202',
        addressCountry: 'US',
      }}
      geo={{
        latitude: 39.7392,
        longitude: -104.9903,
      }}
      openingHours={[
        {
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '09:00',
          closes: '18:00',
        },
      ]}
      priceRange="$$"
      sameAs={[
        'https://twitter.com/AIWMC_official',
        'https://www.linkedin.com/company/aiwmc',
      ]}
      aggregateRating={{
        ratingValue: 4.9,
        reviewCount: 127,
      }}
    />
  );
});
