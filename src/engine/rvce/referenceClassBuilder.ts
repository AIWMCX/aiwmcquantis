import type { ReferenceClass } from './types';

function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildReferenceClasses(profile: {
  industry: string;
  location_city: string;
  location_country: string;
  business_model: string;
}): ReferenceClass[] {
  const { industry, location_city, location_country, business_model } = profile;
  const out: ReferenceClass[] = [];

  if (industry && location_city) {
    out.push({
      id: `rc-${slugify(industry)}-${slugify(location_city)}`,
      description: `${location_city} ${industry} businesses`,
      industry,
      geo_region: `${location_city}, ${location_country}`,
      business_model,
      sample_size: 0,
    });
  }
  if (industry && location_country) {
    out.push({
      id: `rc-${slugify(industry)}-${slugify(location_country)}`,
      description: `${location_country} ${industry} businesses`,
      industry,
      geo_region: location_country,
      business_model,
      sample_size: 0,
    });
  }
  if (business_model) {
    out.push({
      id: `rc-${slugify(business_model)}`,
      description: `${business_model} reference class`,
      business_model,
      sample_size: 0,
    });
  }
  return out;
}
