import { describe, it, expect } from 'vitest';
import { directories } from '@/data/directorySubmissions';
import { FEATURED_IDS } from '@/components/landing/FeaturedDirectories';
import { FEATURED_DIRECTORY_NAMES } from '@/data/featuredDirectoryNames';

describe('FEATURED_DIRECTORY_NAMES', () => {
  it('matches the featured directories in the tracker', () => {
    const derived = FEATURED_IDS
      .map((id) => directories.find((d) => d.id === id))
      .filter((d): d is NonNullable<typeof d> => !!d)
      .map((d) => d.name.replace(/\s*\(.*\)\s*$/, ''));
    expect(FEATURED_DIRECTORY_NAMES).toEqual(derived);
  });
});
