import { INDUSTRY_OPTIONS } from '@/types/analysis';

/** Display name for a detected industry slug: the option name, else the slug in words. */
export function industryLabel(slug: string | undefined | null): string | null {
  if (!slug || slug === 'auto') return null;
  const option = INDUSTRY_OPTIONS.find((o) => o.id === slug);
  if (option) return option.name;
  return slug.replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
