import { describe, expect, it } from 'vitest';
import { extractLocationFromText, isHiringDecision, locationInputValue, normalizeLocation } from '@/lib/location-input';

describe('location input', () => {
  it('repairs the "Global" prefix the old pre-filled field produced', () => {
    expect(normalizeLocation('GlobalColumbus, OH')).toBe('Columbus, OH');
    expect(normalizeLocation('  Austin, TX ')).toBe('Austin, TX');
    expect(normalizeLocation('')).toBe('Global');
    expect(normalizeLocation('Global')).toBe('Global');
  });

  it('shows an empty box instead of the internal default', () => {
    expect(locationInputValue('Global')).toBe('');
    expect(locationInputValue('Denver, CO')).toBe('Denver, CO');
  });

  it('reads a US "City, ST" from the idea text', () => {
    expect(extractLocationFromText('Mobile dog-grooming van in Columbus, OH, $85 per groom')).toBe('Columbus, OH');
    expect(extractLocationFromText('Second coffee shop in Fort Collins, CO for $80K')).toBe('Fort Collins, CO');
    expect(extractLocationFromText('A bakery with 3 staff')).toBeNull();
  });

  it('recognises hiring decisions', () => {
    for (const t of ['Hire a 2nd technician at $5,500/mo', 'hire another stylist', 'Should we hire a sales rep for $60K?', 'Add a second technician']) {
      expect(isHiringDecision(t)).toBe(true);
    }
    for (const t of ['Mobile dog-grooming van in Columbus, OH', 'Open a second location for $80K', 'HVAC company with 3 technicians in Phoenix, AZ']) {
      expect(isHiringDecision(t)).toBe(false);
    }
  });
});
