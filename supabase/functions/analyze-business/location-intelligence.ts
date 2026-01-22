/**
 * QUANTIS LOCATION INTELLIGENCE SYSTEM
 * 
 * Provides granular cost-of-living and business expense adjustments
 * for 50+ major global cities. This replaces the crude 3-tier system
 * with precise, data-driven multipliers.
 * 
 * Data Sources:
 * - Numbeo Cost of Living Index (2024)
 * - Glassdoor Salary Data
 * - Commercial Real Estate Reports
 * - Tax Foundation Data
 */

// ========== LOCATION DATA INTERFACE ==========

export interface LocationData {
  city: string;
  country: string;
  region: 'north_america' | 'europe' | 'asia_pacific' | 'middle_east' | 'latin_america' | 'africa' | 'cis';
  
  // Cost indices (1.0 = US average)
  costIndex: number;           // Overall cost of doing business
  salaryMultiplier: number;    // Relative to US average salary
  rentMultiplier: number;      // Commercial rent relative to US average
  utilityMultiplier: number;   // Utilities relative to US average
  
  // Business environment
  taxBurden: number;           // 0-1 scale (effective business tax rate)
  regulatoryComplexity: number; // 1-5 scale (1=easy, 5=complex)
  marketMaturity: number;      // 1-5 scale (1=emerging, 5=saturated)
  
  // Currency & locale
  currencyCode: string;
  currencySymbol: string;
  locale: string;
  
  // Additional context
  timezone: string;
  primaryLanguage: string;
}

export interface LocationMultiplierResult {
  overall: number;
  salary: number;
  rent: number;
  utility: number;
  marketing: number;  // CAC adjustment
  matched: boolean;
  matchedCity: string | null;
  region: string;
  confidence: number;
}

// ========== CITY DATABASE ==========

export const LOCATION_DATABASE: Record<string, LocationData> = {
  // ===== NORTH AMERICA - TIER 1 =====
  'new_york': {
    city: 'New York',
    country: 'USA',
    region: 'north_america',
    costIndex: 1.87,
    salaryMultiplier: 1.45,
    rentMultiplier: 2.50,
    utilityMultiplier: 1.25,
    taxBurden: 0.35,
    regulatoryComplexity: 4,
    marketMaturity: 5,
    currencyCode: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    timezone: 'America/New_York',
    primaryLanguage: 'English'
  },
  'san_francisco': {
    city: 'San Francisco',
    country: 'USA',
    region: 'north_america',
    costIndex: 1.95,
    salaryMultiplier: 1.60,
    rentMultiplier: 2.80,
    utilityMultiplier: 1.30,
    taxBurden: 0.38,
    regulatoryComplexity: 4,
    marketMaturity: 5,
    currencyCode: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    timezone: 'America/Los_Angeles',
    primaryLanguage: 'English'
  },
  'los_angeles': {
    city: 'Los Angeles',
    country: 'USA',
    region: 'north_america',
    costIndex: 1.55,
    salaryMultiplier: 1.30,
    rentMultiplier: 1.90,
    utilityMultiplier: 1.15,
    taxBurden: 0.33,
    regulatoryComplexity: 3,
    marketMaturity: 5,
    currencyCode: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    timezone: 'America/Los_Angeles',
    primaryLanguage: 'English'
  },
  'chicago': {
    city: 'Chicago',
    country: 'USA',
    region: 'north_america',
    costIndex: 1.25,
    salaryMultiplier: 1.15,
    rentMultiplier: 1.40,
    utilityMultiplier: 1.10,
    taxBurden: 0.32,
    regulatoryComplexity: 3,
    marketMaturity: 4,
    currencyCode: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    timezone: 'America/Chicago',
    primaryLanguage: 'English'
  },
  'boston': {
    city: 'Boston',
    country: 'USA',
    region: 'north_america',
    costIndex: 1.45,
    salaryMultiplier: 1.35,
    rentMultiplier: 1.80,
    utilityMultiplier: 1.20,
    taxBurden: 0.30,
    regulatoryComplexity: 3,
    marketMaturity: 4,
    currencyCode: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    timezone: 'America/New_York',
    primaryLanguage: 'English'
  },
  'seattle': {
    city: 'Seattle',
    country: 'USA',
    region: 'north_america',
    costIndex: 1.50,
    salaryMultiplier: 1.40,
    rentMultiplier: 1.75,
    utilityMultiplier: 1.05,
    taxBurden: 0.25,
    regulatoryComplexity: 3,
    marketMaturity: 4,
    currencyCode: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    timezone: 'America/Los_Angeles',
    primaryLanguage: 'English'
  },
  'austin': {
    city: 'Austin',
    country: 'USA',
    region: 'north_america',
    costIndex: 1.20,
    salaryMultiplier: 1.15,
    rentMultiplier: 1.30,
    utilityMultiplier: 1.00,
    taxBurden: 0.22,
    regulatoryComplexity: 2,
    marketMaturity: 4,
    currencyCode: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    timezone: 'America/Chicago',
    primaryLanguage: 'English'
  },
  'miami': {
    city: 'Miami',
    country: 'USA',
    region: 'north_america',
    costIndex: 1.30,
    salaryMultiplier: 1.10,
    rentMultiplier: 1.50,
    utilityMultiplier: 1.15,
    taxBurden: 0.22,
    regulatoryComplexity: 2,
    marketMaturity: 4,
    currencyCode: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    timezone: 'America/New_York',
    primaryLanguage: 'English'
  },
  'denver': {
    city: 'Denver',
    country: 'USA',
    region: 'north_america',
    costIndex: 1.15,
    salaryMultiplier: 1.10,
    rentMultiplier: 1.25,
    utilityMultiplier: 0.95,
    taxBurden: 0.28,
    regulatoryComplexity: 2,
    marketMaturity: 3,
    currencyCode: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    timezone: 'America/Denver',
    primaryLanguage: 'English'
  },
  'toronto': {
    city: 'Toronto',
    country: 'Canada',
    region: 'north_america',
    costIndex: 1.35,
    salaryMultiplier: 1.10,
    rentMultiplier: 1.60,
    utilityMultiplier: 1.00,
    taxBurden: 0.30,
    regulatoryComplexity: 3,
    marketMaturity: 4,
    currencyCode: 'CAD',
    currencySymbol: 'C$',
    locale: 'en-CA',
    timezone: 'America/Toronto',
    primaryLanguage: 'English'
  },
  'vancouver': {
    city: 'Vancouver',
    country: 'Canada',
    region: 'north_america',
    costIndex: 1.40,
    salaryMultiplier: 1.05,
    rentMultiplier: 1.70,
    utilityMultiplier: 0.90,
    taxBurden: 0.28,
    regulatoryComplexity: 3,
    marketMaturity: 4,
    currencyCode: 'CAD',
    currencySymbol: 'C$',
    locale: 'en-CA',
    timezone: 'America/Vancouver',
    primaryLanguage: 'English'
  },

  // ===== EUROPE - TIER 1 =====
  'london': {
    city: 'London',
    country: 'UK',
    region: 'europe',
    costIndex: 1.75,
    salaryMultiplier: 1.30,
    rentMultiplier: 2.20,
    utilityMultiplier: 1.40,
    taxBurden: 0.35,
    regulatoryComplexity: 4,
    marketMaturity: 5,
    currencyCode: 'GBP',
    currencySymbol: '£',
    locale: 'en-GB',
    timezone: 'Europe/London',
    primaryLanguage: 'English'
  },
  'paris': {
    city: 'Paris',
    country: 'France',
    region: 'europe',
    costIndex: 1.55,
    salaryMultiplier: 1.20,
    rentMultiplier: 1.80,
    utilityMultiplier: 1.25,
    taxBurden: 0.42,
    regulatoryComplexity: 5,
    marketMaturity: 5,
    currencyCode: 'EUR',
    currencySymbol: '€',
    locale: 'fr-FR',
    timezone: 'Europe/Paris',
    primaryLanguage: 'French'
  },
  'berlin': {
    city: 'Berlin',
    country: 'Germany',
    region: 'europe',
    costIndex: 1.15,
    salaryMultiplier: 1.00,
    rentMultiplier: 1.10,
    utilityMultiplier: 1.30,
    taxBurden: 0.40,
    regulatoryComplexity: 4,
    marketMaturity: 4,
    currencyCode: 'EUR',
    currencySymbol: '€',
    locale: 'de-DE',
    timezone: 'Europe/Berlin',
    primaryLanguage: 'German'
  },
  'munich': {
    city: 'Munich',
    country: 'Germany',
    region: 'europe',
    costIndex: 1.35,
    salaryMultiplier: 1.15,
    rentMultiplier: 1.50,
    utilityMultiplier: 1.30,
    taxBurden: 0.40,
    regulatoryComplexity: 4,
    marketMaturity: 5,
    currencyCode: 'EUR',
    currencySymbol: '€',
    locale: 'de-DE',
    timezone: 'Europe/Berlin',
    primaryLanguage: 'German'
  },
  'amsterdam': {
    city: 'Amsterdam',
    country: 'Netherlands',
    region: 'europe',
    costIndex: 1.40,
    salaryMultiplier: 1.10,
    rentMultiplier: 1.60,
    utilityMultiplier: 1.20,
    taxBurden: 0.38,
    regulatoryComplexity: 3,
    marketMaturity: 4,
    currencyCode: 'EUR',
    currencySymbol: '€',
    locale: 'nl-NL',
    timezone: 'Europe/Amsterdam',
    primaryLanguage: 'Dutch'
  },
  'zurich': {
    city: 'Zurich',
    country: 'Switzerland',
    region: 'europe',
    costIndex: 2.10,
    salaryMultiplier: 1.80,
    rentMultiplier: 2.40,
    utilityMultiplier: 1.20,
    taxBurden: 0.22,
    regulatoryComplexity: 3,
    marketMaturity: 5,
    currencyCode: 'CHF',
    currencySymbol: 'CHF',
    locale: 'de-CH',
    timezone: 'Europe/Zurich',
    primaryLanguage: 'German'
  },
  'dublin': {
    city: 'Dublin',
    country: 'Ireland',
    region: 'europe',
    costIndex: 1.45,
    salaryMultiplier: 1.20,
    rentMultiplier: 1.70,
    utilityMultiplier: 1.15,
    taxBurden: 0.25,
    regulatoryComplexity: 2,
    marketMaturity: 4,
    currencyCode: 'EUR',
    currencySymbol: '€',
    locale: 'en-IE',
    timezone: 'Europe/Dublin',
    primaryLanguage: 'English'
  },
  'stockholm': {
    city: 'Stockholm',
    country: 'Sweden',
    region: 'europe',
    costIndex: 1.50,
    salaryMultiplier: 1.15,
    rentMultiplier: 1.55,
    utilityMultiplier: 1.10,
    taxBurden: 0.45,
    regulatoryComplexity: 3,
    marketMaturity: 4,
    currencyCode: 'SEK',
    currencySymbol: 'kr',
    locale: 'sv-SE',
    timezone: 'Europe/Stockholm',
    primaryLanguage: 'Swedish'
  },
  'barcelona': {
    city: 'Barcelona',
    country: 'Spain',
    region: 'europe',
    costIndex: 1.10,
    salaryMultiplier: 0.80,
    rentMultiplier: 1.20,
    utilityMultiplier: 1.10,
    taxBurden: 0.35,
    regulatoryComplexity: 4,
    marketMaturity: 4,
    currencyCode: 'EUR',
    currencySymbol: '€',
    locale: 'es-ES',
    timezone: 'Europe/Madrid',
    primaryLanguage: 'Spanish'
  },
  'lisbon': {
    city: 'Lisbon',
    country: 'Portugal',
    region: 'europe',
    costIndex: 0.95,
    salaryMultiplier: 0.60,
    rentMultiplier: 1.00,
    utilityMultiplier: 1.00,
    taxBurden: 0.32,
    regulatoryComplexity: 3,
    marketMaturity: 3,
    currencyCode: 'EUR',
    currencySymbol: '€',
    locale: 'pt-PT',
    timezone: 'Europe/Lisbon',
    primaryLanguage: 'Portuguese'
  },
  'warsaw': {
    city: 'Warsaw',
    country: 'Poland',
    region: 'europe',
    costIndex: 0.70,
    salaryMultiplier: 0.45,
    rentMultiplier: 0.65,
    utilityMultiplier: 0.80,
    taxBurden: 0.25,
    regulatoryComplexity: 3,
    marketMaturity: 3,
    currencyCode: 'PLN',
    currencySymbol: 'zł',
    locale: 'pl-PL',
    timezone: 'Europe/Warsaw',
    primaryLanguage: 'Polish'
  },
  'prague': {
    city: 'Prague',
    country: 'Czech Republic',
    region: 'europe',
    costIndex: 0.75,
    salaryMultiplier: 0.50,
    rentMultiplier: 0.70,
    utilityMultiplier: 0.85,
    taxBurden: 0.28,
    regulatoryComplexity: 3,
    marketMaturity: 3,
    currencyCode: 'CZK',
    currencySymbol: 'Kč',
    locale: 'cs-CZ',
    timezone: 'Europe/Prague',
    primaryLanguage: 'Czech'
  },

  // ===== CIS REGION =====
  'moscow': {
    city: 'Moscow',
    country: 'Russia',
    region: 'cis',
    costIndex: 0.85,
    salaryMultiplier: 0.40,
    rentMultiplier: 1.10,
    utilityMultiplier: 0.50,
    taxBurden: 0.20,
    regulatoryComplexity: 4,
    marketMaturity: 4,
    currencyCode: 'RUB',
    currencySymbol: '₽',
    locale: 'ru-RU',
    timezone: 'Europe/Moscow',
    primaryLanguage: 'Russian'
  },
  'saint_petersburg': {
    city: 'Saint Petersburg',
    country: 'Russia',
    region: 'cis',
    costIndex: 0.70,
    salaryMultiplier: 0.35,
    rentMultiplier: 0.80,
    utilityMultiplier: 0.45,
    taxBurden: 0.20,
    regulatoryComplexity: 4,
    marketMaturity: 3,
    currencyCode: 'RUB',
    currencySymbol: '₽',
    locale: 'ru-RU',
    timezone: 'Europe/Moscow',
    primaryLanguage: 'Russian'
  },
  'kyiv': {
    city: 'Kyiv',
    country: 'Ukraine',
    region: 'cis',
    costIndex: 0.50,
    salaryMultiplier: 0.25,
    rentMultiplier: 0.45,
    utilityMultiplier: 0.35,
    taxBurden: 0.22,
    regulatoryComplexity: 4,
    marketMaturity: 3,
    currencyCode: 'UAH',
    currencySymbol: '₴',
    locale: 'uk-UA',
    timezone: 'Europe/Kyiv',
    primaryLanguage: 'Ukrainian'
  },
  'astana': {
    city: 'Astana',
    country: 'Kazakhstan',
    region: 'cis',
    costIndex: 0.55,
    salaryMultiplier: 0.30,
    rentMultiplier: 0.50,
    utilityMultiplier: 0.30,
    taxBurden: 0.20,
    regulatoryComplexity: 3,
    marketMaturity: 2,
    currencyCode: 'KZT',
    currencySymbol: '₸',
    locale: 'kk-KZ',
    timezone: 'Asia/Almaty',
    primaryLanguage: 'Kazakh'
  },
  'almaty': {
    city: 'Almaty',
    country: 'Kazakhstan',
    region: 'cis',
    costIndex: 0.50,
    salaryMultiplier: 0.28,
    rentMultiplier: 0.45,
    utilityMultiplier: 0.25,
    taxBurden: 0.20,
    regulatoryComplexity: 3,
    marketMaturity: 3,
    currencyCode: 'KZT',
    currencySymbol: '₸',
    locale: 'kk-KZ',
    timezone: 'Asia/Almaty',
    primaryLanguage: 'Kazakh'
  },
  'tashkent': {
    city: 'Tashkent',
    country: 'Uzbekistan',
    region: 'cis',
    costIndex: 0.40,
    salaryMultiplier: 0.15,
    rentMultiplier: 0.30,
    utilityMultiplier: 0.20,
    taxBurden: 0.18,
    regulatoryComplexity: 4,
    marketMaturity: 2,
    currencyCode: 'UZS',
    currencySymbol: 'сўм',
    locale: 'uz-UZ',
    timezone: 'Asia/Tashkent',
    primaryLanguage: 'Uzbek'
  },
  'tbilisi': {
    city: 'Tbilisi',
    country: 'Georgia',
    region: 'cis',
    costIndex: 0.45,
    salaryMultiplier: 0.22,
    rentMultiplier: 0.40,
    utilityMultiplier: 0.25,
    taxBurden: 0.15,
    regulatoryComplexity: 2,
    marketMaturity: 2,
    currencyCode: 'GEL',
    currencySymbol: '₾',
    locale: 'ka-GE',
    timezone: 'Asia/Tbilisi',
    primaryLanguage: 'Georgian'
  },
  'minsk': {
    city: 'Minsk',
    country: 'Belarus',
    region: 'cis',
    costIndex: 0.55,
    salaryMultiplier: 0.25,
    rentMultiplier: 0.50,
    utilityMultiplier: 0.30,
    taxBurden: 0.18,
    regulatoryComplexity: 4,
    marketMaturity: 2,
    currencyCode: 'BYN',
    currencySymbol: 'Br',
    locale: 'be-BY',
    timezone: 'Europe/Minsk',
    primaryLanguage: 'Belarusian'
  },
  'yerevan': {
    city: 'Yerevan',
    country: 'Armenia',
    region: 'cis',
    costIndex: 0.45,
    salaryMultiplier: 0.20,
    rentMultiplier: 0.35,
    utilityMultiplier: 0.25,
    taxBurden: 0.18,
    regulatoryComplexity: 3,
    marketMaturity: 2,
    currencyCode: 'AMD',
    currencySymbol: '֏',
    locale: 'hy-AM',
    timezone: 'Asia/Yerevan',
    primaryLanguage: 'Armenian'
  },
  'baku': {
    city: 'Baku',
    country: 'Azerbaijan',
    region: 'cis',
    costIndex: 0.50,
    salaryMultiplier: 0.25,
    rentMultiplier: 0.45,
    utilityMultiplier: 0.20,
    taxBurden: 0.20,
    regulatoryComplexity: 3,
    marketMaturity: 2,
    currencyCode: 'AZN',
    currencySymbol: '₼',
    locale: 'az-AZ',
    timezone: 'Asia/Baku',
    primaryLanguage: 'Azerbaijani'
  },

  // ===== ASIA PACIFIC =====
  'singapore': {
    city: 'Singapore',
    country: 'Singapore',
    region: 'asia_pacific',
    costIndex: 1.65,
    salaryMultiplier: 1.25,
    rentMultiplier: 2.00,
    utilityMultiplier: 1.10,
    taxBurden: 0.17,
    regulatoryComplexity: 2,
    marketMaturity: 5,
    currencyCode: 'SGD',
    currencySymbol: 'S$',
    locale: 'en-SG',
    timezone: 'Asia/Singapore',
    primaryLanguage: 'English'
  },
  'hong_kong': {
    city: 'Hong Kong',
    country: 'Hong Kong',
    region: 'asia_pacific',
    costIndex: 1.70,
    salaryMultiplier: 1.20,
    rentMultiplier: 2.50,
    utilityMultiplier: 1.15,
    taxBurden: 0.16,
    regulatoryComplexity: 2,
    marketMaturity: 5,
    currencyCode: 'HKD',
    currencySymbol: 'HK$',
    locale: 'zh-HK',
    timezone: 'Asia/Hong_Kong',
    primaryLanguage: 'Cantonese'
  },
  'tokyo': {
    city: 'Tokyo',
    country: 'Japan',
    region: 'asia_pacific',
    costIndex: 1.55,
    salaryMultiplier: 1.10,
    rentMultiplier: 1.80,
    utilityMultiplier: 1.25,
    taxBurden: 0.35,
    regulatoryComplexity: 4,
    marketMaturity: 5,
    currencyCode: 'JPY',
    currencySymbol: '¥',
    locale: 'ja-JP',
    timezone: 'Asia/Tokyo',
    primaryLanguage: 'Japanese'
  },
  'sydney': {
    city: 'Sydney',
    country: 'Australia',
    region: 'asia_pacific',
    costIndex: 1.50,
    salaryMultiplier: 1.30,
    rentMultiplier: 1.70,
    utilityMultiplier: 1.20,
    taxBurden: 0.30,
    regulatoryComplexity: 3,
    marketMaturity: 4,
    currencyCode: 'AUD',
    currencySymbol: 'A$',
    locale: 'en-AU',
    timezone: 'Australia/Sydney',
    primaryLanguage: 'English'
  },
  'melbourne': {
    city: 'Melbourne',
    country: 'Australia',
    region: 'asia_pacific',
    costIndex: 1.40,
    salaryMultiplier: 1.20,
    rentMultiplier: 1.50,
    utilityMultiplier: 1.15,
    taxBurden: 0.30,
    regulatoryComplexity: 3,
    marketMaturity: 4,
    currencyCode: 'AUD',
    currencySymbol: 'A$',
    locale: 'en-AU',
    timezone: 'Australia/Melbourne',
    primaryLanguage: 'English'
  },
  'shanghai': {
    city: 'Shanghai',
    country: 'China',
    region: 'asia_pacific',
    costIndex: 0.90,
    salaryMultiplier: 0.55,
    rentMultiplier: 1.20,
    utilityMultiplier: 0.60,
    taxBurden: 0.25,
    regulatoryComplexity: 5,
    marketMaturity: 5,
    currencyCode: 'CNY',
    currencySymbol: '¥',
    locale: 'zh-CN',
    timezone: 'Asia/Shanghai',
    primaryLanguage: 'Mandarin'
  },
  'beijing': {
    city: 'Beijing',
    country: 'China',
    region: 'asia_pacific',
    costIndex: 0.85,
    salaryMultiplier: 0.50,
    rentMultiplier: 1.10,
    utilityMultiplier: 0.55,
    taxBurden: 0.25,
    regulatoryComplexity: 5,
    marketMaturity: 5,
    currencyCode: 'CNY',
    currencySymbol: '¥',
    locale: 'zh-CN',
    timezone: 'Asia/Shanghai',
    primaryLanguage: 'Mandarin'
  },
  'shenzhen': {
    city: 'Shenzhen',
    country: 'China',
    region: 'asia_pacific',
    costIndex: 0.80,
    salaryMultiplier: 0.48,
    rentMultiplier: 1.00,
    utilityMultiplier: 0.55,
    taxBurden: 0.22,
    regulatoryComplexity: 4,
    marketMaturity: 5,
    currencyCode: 'CNY',
    currencySymbol: '¥',
    locale: 'zh-CN',
    timezone: 'Asia/Shanghai',
    primaryLanguage: 'Mandarin'
  },
  'seoul': {
    city: 'Seoul',
    country: 'South Korea',
    region: 'asia_pacific',
    costIndex: 1.15,
    salaryMultiplier: 0.85,
    rentMultiplier: 1.30,
    utilityMultiplier: 1.00,
    taxBurden: 0.28,
    regulatoryComplexity: 3,
    marketMaturity: 5,
    currencyCode: 'KRW',
    currencySymbol: '₩',
    locale: 'ko-KR',
    timezone: 'Asia/Seoul',
    primaryLanguage: 'Korean'
  },
  'mumbai': {
    city: 'Mumbai',
    country: 'India',
    region: 'asia_pacific',
    costIndex: 0.45,
    salaryMultiplier: 0.20,
    rentMultiplier: 0.60,
    utilityMultiplier: 0.30,
    taxBurden: 0.30,
    regulatoryComplexity: 4,
    marketMaturity: 4,
    currencyCode: 'INR',
    currencySymbol: '₹',
    locale: 'hi-IN',
    timezone: 'Asia/Kolkata',
    primaryLanguage: 'Hindi'
  },
  'bangalore': {
    city: 'Bangalore',
    country: 'India',
    region: 'asia_pacific',
    costIndex: 0.40,
    salaryMultiplier: 0.22,
    rentMultiplier: 0.50,
    utilityMultiplier: 0.25,
    taxBurden: 0.30,
    regulatoryComplexity: 4,
    marketMaturity: 4,
    currencyCode: 'INR',
    currencySymbol: '₹',
    locale: 'en-IN',
    timezone: 'Asia/Kolkata',
    primaryLanguage: 'English'
  },
  'delhi': {
    city: 'Delhi',
    country: 'India',
    region: 'asia_pacific',
    costIndex: 0.42,
    salaryMultiplier: 0.18,
    rentMultiplier: 0.55,
    utilityMultiplier: 0.28,
    taxBurden: 0.30,
    regulatoryComplexity: 4,
    marketMaturity: 4,
    currencyCode: 'INR',
    currencySymbol: '₹',
    locale: 'hi-IN',
    timezone: 'Asia/Kolkata',
    primaryLanguage: 'Hindi'
  },
  'jakarta': {
    city: 'Jakarta',
    country: 'Indonesia',
    region: 'asia_pacific',
    costIndex: 0.50,
    salaryMultiplier: 0.18,
    rentMultiplier: 0.55,
    utilityMultiplier: 0.35,
    taxBurden: 0.25,
    regulatoryComplexity: 4,
    marketMaturity: 3,
    currencyCode: 'IDR',
    currencySymbol: 'Rp',
    locale: 'id-ID',
    timezone: 'Asia/Jakarta',
    primaryLanguage: 'Indonesian'
  },
  'bangkok': {
    city: 'Bangkok',
    country: 'Thailand',
    region: 'asia_pacific',
    costIndex: 0.55,
    salaryMultiplier: 0.25,
    rentMultiplier: 0.60,
    utilityMultiplier: 0.40,
    taxBurden: 0.20,
    regulatoryComplexity: 3,
    marketMaturity: 4,
    currencyCode: 'THB',
    currencySymbol: '฿',
    locale: 'th-TH',
    timezone: 'Asia/Bangkok',
    primaryLanguage: 'Thai'
  },
  'manila': {
    city: 'Manila',
    country: 'Philippines',
    region: 'asia_pacific',
    costIndex: 0.48,
    salaryMultiplier: 0.20,
    rentMultiplier: 0.50,
    utilityMultiplier: 0.45,
    taxBurden: 0.30,
    regulatoryComplexity: 4,
    marketMaturity: 3,
    currencyCode: 'PHP',
    currencySymbol: '₱',
    locale: 'en-PH',
    timezone: 'Asia/Manila',
    primaryLanguage: 'English'
  },
  'ho_chi_minh': {
    city: 'Ho Chi Minh City',
    country: 'Vietnam',
    region: 'asia_pacific',
    costIndex: 0.45,
    salaryMultiplier: 0.15,
    rentMultiplier: 0.45,
    utilityMultiplier: 0.30,
    taxBurden: 0.20,
    regulatoryComplexity: 4,
    marketMaturity: 3,
    currencyCode: 'VND',
    currencySymbol: '₫',
    locale: 'vi-VN',
    timezone: 'Asia/Ho_Chi_Minh',
    primaryLanguage: 'Vietnamese'
  },

  // ===== MIDDLE EAST =====
  'dubai': {
    city: 'Dubai',
    country: 'UAE',
    region: 'middle_east',
    costIndex: 1.35,
    salaryMultiplier: 1.00,
    rentMultiplier: 1.50,
    utilityMultiplier: 1.00,
    taxBurden: 0.05,
    regulatoryComplexity: 2,
    marketMaturity: 4,
    currencyCode: 'AED',
    currencySymbol: 'د.إ',
    locale: 'ar-AE',
    timezone: 'Asia/Dubai',
    primaryLanguage: 'Arabic'
  },
  'abu_dhabi': {
    city: 'Abu Dhabi',
    country: 'UAE',
    region: 'middle_east',
    costIndex: 1.25,
    salaryMultiplier: 0.95,
    rentMultiplier: 1.35,
    utilityMultiplier: 0.90,
    taxBurden: 0.05,
    regulatoryComplexity: 2,
    marketMaturity: 4,
    currencyCode: 'AED',
    currencySymbol: 'د.إ',
    locale: 'ar-AE',
    timezone: 'Asia/Dubai',
    primaryLanguage: 'Arabic'
  },
  'tel_aviv': {
    city: 'Tel Aviv',
    country: 'Israel',
    region: 'middle_east',
    costIndex: 1.45,
    salaryMultiplier: 1.10,
    rentMultiplier: 1.60,
    utilityMultiplier: 1.15,
    taxBurden: 0.32,
    regulatoryComplexity: 3,
    marketMaturity: 5,
    currencyCode: 'ILS',
    currencySymbol: '₪',
    locale: 'he-IL',
    timezone: 'Asia/Jerusalem',
    primaryLanguage: 'Hebrew'
  },
  'riyadh': {
    city: 'Riyadh',
    country: 'Saudi Arabia',
    region: 'middle_east',
    costIndex: 0.85,
    salaryMultiplier: 0.80,
    rentMultiplier: 0.90,
    utilityMultiplier: 0.40,
    taxBurden: 0.05,
    regulatoryComplexity: 4,
    marketMaturity: 3,
    currencyCode: 'SAR',
    currencySymbol: '﷼',
    locale: 'ar-SA',
    timezone: 'Asia/Riyadh',
    primaryLanguage: 'Arabic'
  },
  'doha': {
    city: 'Doha',
    country: 'Qatar',
    region: 'middle_east',
    costIndex: 1.20,
    salaryMultiplier: 0.95,
    rentMultiplier: 1.40,
    utilityMultiplier: 0.50,
    taxBurden: 0.05,
    regulatoryComplexity: 3,
    marketMaturity: 3,
    currencyCode: 'QAR',
    currencySymbol: 'ر.ق',
    locale: 'ar-QA',
    timezone: 'Asia/Qatar',
    primaryLanguage: 'Arabic'
  },

  // ===== LATIN AMERICA =====
  'mexico_city': {
    city: 'Mexico City',
    country: 'Mexico',
    region: 'latin_america',
    costIndex: 0.55,
    salaryMultiplier: 0.30,
    rentMultiplier: 0.50,
    utilityMultiplier: 0.45,
    taxBurden: 0.30,
    regulatoryComplexity: 4,
    marketMaturity: 4,
    currencyCode: 'MXN',
    currencySymbol: '$',
    locale: 'es-MX',
    timezone: 'America/Mexico_City',
    primaryLanguage: 'Spanish'
  },
  'sao_paulo': {
    city: 'São Paulo',
    country: 'Brazil',
    region: 'latin_america',
    costIndex: 0.65,
    salaryMultiplier: 0.35,
    rentMultiplier: 0.60,
    utilityMultiplier: 0.50,
    taxBurden: 0.40,
    regulatoryComplexity: 5,
    marketMaturity: 4,
    currencyCode: 'BRL',
    currencySymbol: 'R$',
    locale: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    primaryLanguage: 'Portuguese'
  },
  'buenos_aires': {
    city: 'Buenos Aires',
    country: 'Argentina',
    region: 'latin_america',
    costIndex: 0.45,
    salaryMultiplier: 0.22,
    rentMultiplier: 0.40,
    utilityMultiplier: 0.35,
    taxBurden: 0.35,
    regulatoryComplexity: 5,
    marketMaturity: 3,
    currencyCode: 'ARS',
    currencySymbol: '$',
    locale: 'es-AR',
    timezone: 'America/Argentina/Buenos_Aires',
    primaryLanguage: 'Spanish'
  },
  'bogota': {
    city: 'Bogotá',
    country: 'Colombia',
    region: 'latin_america',
    costIndex: 0.50,
    salaryMultiplier: 0.25,
    rentMultiplier: 0.45,
    utilityMultiplier: 0.40,
    taxBurden: 0.32,
    regulatoryComplexity: 4,
    marketMaturity: 3,
    currencyCode: 'COP',
    currencySymbol: '$',
    locale: 'es-CO',
    timezone: 'America/Bogota',
    primaryLanguage: 'Spanish'
  },
  'santiago': {
    city: 'Santiago',
    country: 'Chile',
    region: 'latin_america',
    costIndex: 0.60,
    salaryMultiplier: 0.35,
    rentMultiplier: 0.55,
    utilityMultiplier: 0.45,
    taxBurden: 0.27,
    regulatoryComplexity: 3,
    marketMaturity: 4,
    currencyCode: 'CLP',
    currencySymbol: '$',
    locale: 'es-CL',
    timezone: 'America/Santiago',
    primaryLanguage: 'Spanish'
  },
  'lima': {
    city: 'Lima',
    country: 'Peru',
    region: 'latin_america',
    costIndex: 0.50,
    salaryMultiplier: 0.25,
    rentMultiplier: 0.45,
    utilityMultiplier: 0.40,
    taxBurden: 0.30,
    regulatoryComplexity: 4,
    marketMaturity: 3,
    currencyCode: 'PEN',
    currencySymbol: 'S/',
    locale: 'es-PE',
    timezone: 'America/Lima',
    primaryLanguage: 'Spanish'
  },

  // ===== AFRICA =====
  'lagos': {
    city: 'Lagos',
    country: 'Nigeria',
    region: 'africa',
    costIndex: 0.45,
    salaryMultiplier: 0.15,
    rentMultiplier: 0.50,
    utilityMultiplier: 0.60,
    taxBurden: 0.25,
    regulatoryComplexity: 5,
    marketMaturity: 3,
    currencyCode: 'NGN',
    currencySymbol: '₦',
    locale: 'en-NG',
    timezone: 'Africa/Lagos',
    primaryLanguage: 'English'
  },
  'nairobi': {
    city: 'Nairobi',
    country: 'Kenya',
    region: 'africa',
    costIndex: 0.42,
    salaryMultiplier: 0.15,
    rentMultiplier: 0.40,
    utilityMultiplier: 0.45,
    taxBurden: 0.30,
    regulatoryComplexity: 4,
    marketMaturity: 3,
    currencyCode: 'KES',
    currencySymbol: 'KSh',
    locale: 'en-KE',
    timezone: 'Africa/Nairobi',
    primaryLanguage: 'English'
  },
  'cape_town': {
    city: 'Cape Town',
    country: 'South Africa',
    region: 'africa',
    costIndex: 0.55,
    salaryMultiplier: 0.30,
    rentMultiplier: 0.50,
    utilityMultiplier: 0.45,
    taxBurden: 0.28,
    regulatoryComplexity: 3,
    marketMaturity: 4,
    currencyCode: 'ZAR',
    currencySymbol: 'R',
    locale: 'en-ZA',
    timezone: 'Africa/Johannesburg',
    primaryLanguage: 'English'
  },
  'johannesburg': {
    city: 'Johannesburg',
    country: 'South Africa',
    region: 'africa',
    costIndex: 0.52,
    salaryMultiplier: 0.28,
    rentMultiplier: 0.45,
    utilityMultiplier: 0.40,
    taxBurden: 0.28,
    regulatoryComplexity: 3,
    marketMaturity: 4,
    currencyCode: 'ZAR',
    currencySymbol: 'R',
    locale: 'en-ZA',
    timezone: 'Africa/Johannesburg',
    primaryLanguage: 'English'
  },
  'cairo': {
    city: 'Cairo',
    country: 'Egypt',
    region: 'africa',
    costIndex: 0.40,
    salaryMultiplier: 0.12,
    rentMultiplier: 0.35,
    utilityMultiplier: 0.25,
    taxBurden: 0.22,
    regulatoryComplexity: 5,
    marketMaturity: 3,
    currencyCode: 'EGP',
    currencySymbol: 'E£',
    locale: 'ar-EG',
    timezone: 'Africa/Cairo',
    primaryLanguage: 'Arabic'
  },
};

// ========== CITY ALIASES ==========

const CITY_ALIASES: Record<string, string> = {
  // English aliases
  'nyc': 'new_york',
  'ny': 'new_york',
  'manhattan': 'new_york',
  'sf': 'san_francisco',
  'la': 'los_angeles',
  'chi': 'chicago',
  'spb': 'saint_petersburg',
  'st petersburg': 'saint_petersburg',
  'saigon': 'ho_chi_minh',
  'hcmc': 'ho_chi_minh',
  
  // Russian aliases
  'москва': 'moscow',
  'мск': 'moscow',
  'санкт-петербург': 'saint_petersburg',
  'питер': 'saint_petersburg',
  'спб': 'saint_petersburg',
  'киев': 'kyiv',
  'київ': 'kyiv',
  'астана': 'astana',
  'нур-султан': 'astana',
  'алматы': 'almaty',
  'ташкент': 'tashkent',
  'тбилиси': 'tbilisi',
  'минск': 'minsk',
  'ереван': 'yerevan',
  'баку': 'baku',
  
  // Other language aliases
  'лондон': 'london',
  'париж': 'paris',
  'берлин': 'berlin',
  'токио': 'tokyo',
  'пекин': 'beijing',
  'шанхай': 'shanghai',
  'дубай': 'dubai',
  'сингапур': 'singapore',
  'гонконг': 'hong_kong',
};

// ========== REGION DEFAULTS ==========

const REGION_DEFAULTS: Record<string, LocationMultiplierResult> = {
  north_america: {
    overall: 1.20,
    salary: 1.15,
    rent: 1.30,
    utility: 1.05,
    marketing: 1.10,
    matched: false,
    matchedCity: null,
    region: 'north_america',
    confidence: 60
  },
  europe: {
    overall: 1.15,
    salary: 1.00,
    rent: 1.20,
    utility: 1.15,
    marketing: 1.00,
    matched: false,
    matchedCity: null,
    region: 'europe',
    confidence: 60
  },
  asia_pacific: {
    overall: 0.85,
    salary: 0.65,
    rent: 0.90,
    utility: 0.75,
    marketing: 0.80,
    matched: false,
    matchedCity: null,
    region: 'asia_pacific',
    confidence: 55
  },
  middle_east: {
    overall: 1.10,
    salary: 0.90,
    rent: 1.15,
    utility: 0.70,
    marketing: 0.95,
    matched: false,
    matchedCity: null,
    region: 'middle_east',
    confidence: 55
  },
  latin_america: {
    overall: 0.55,
    salary: 0.30,
    rent: 0.50,
    utility: 0.45,
    marketing: 0.60,
    matched: false,
    matchedCity: null,
    region: 'latin_america',
    confidence: 55
  },
  africa: {
    overall: 0.48,
    salary: 0.20,
    rent: 0.45,
    utility: 0.45,
    marketing: 0.50,
    matched: false,
    matchedCity: null,
    region: 'africa',
    confidence: 50
  },
  cis: {
    overall: 0.60,
    salary: 0.30,
    rent: 0.55,
    utility: 0.35,
    marketing: 0.50,
    matched: false,
    matchedCity: null,
    region: 'cis',
    confidence: 60
  },
  global: {
    overall: 1.00,
    salary: 1.00,
    rent: 1.00,
    utility: 1.00,
    marketing: 1.00,
    matched: false,
    matchedCity: null,
    region: 'global',
    confidence: 40
  }
};

// ========== MAIN FUNCTIONS ==========

/**
 * Normalizes a location string for matching
 */
function normalizeLocation(location: string): string {
  return location
    .toLowerCase()
    .replace(/[^\w\s\u0400-\u04FF]/g, '') // Keep Latin, Cyrillic, spaces
    .replace(/\s+/g, '_')
    .trim();
}

/**
 * Gets the location data for a given location string
 * Tries exact match, then aliases, then fuzzy matching
 */
export function getLocationData(location: string): LocationData | null {
  const normalized = normalizeLocation(location);
  
  // Try exact match
  if (LOCATION_DATABASE[normalized]) {
    return LOCATION_DATABASE[normalized];
  }
  
  // Try aliases
  if (CITY_ALIASES[normalized]) {
    return LOCATION_DATABASE[CITY_ALIASES[normalized]];
  }
  
  // Try partial match (city name contains input)
  for (const [key, data] of Object.entries(LOCATION_DATABASE)) {
    const cityLower = data.city.toLowerCase();
    if (cityLower.includes(normalized.replace(/_/g, ' ')) || 
        normalized.includes(key)) {
      return data;
    }
  }
  
  // Try country match
  for (const [_, data] of Object.entries(LOCATION_DATABASE)) {
    if (data.country.toLowerCase().includes(normalized.replace(/_/g, ' '))) {
      return data;
    }
  }
  
  return null;
}

/**
 * Enhanced location multiplier that returns granular multipliers
 * for different cost categories
 */
export function getEnhancedLocationMultiplier(location: string): LocationMultiplierResult {
  const locationData = getLocationData(location);
  
  if (locationData) {
    // Calculate marketing multiplier based on market maturity
    // Higher maturity = more expensive to acquire customers
    const marketingMultiplier = 0.7 + (locationData.marketMaturity * 0.1);
    
    return {
      overall: locationData.costIndex,
      salary: locationData.salaryMultiplier,
      rent: locationData.rentMultiplier,
      utility: locationData.utilityMultiplier,
      marketing: marketingMultiplier,
      matched: true,
      matchedCity: locationData.city,
      region: locationData.region,
      confidence: 90
    };
  }
  
  // Try to detect region from location string
  const locationLower = location.toLowerCase();
  
  // Region detection patterns
  const regionPatterns: [string[], string][] = [
    [['usa', 'united states', 'america', 'canada', 'сша', 'америка', 'канада'], 'north_america'],
    [['europe', 'eu', 'uk', 'germany', 'france', 'spain', 'italy', 'европа', 'германия', 'франция'], 'europe'],
    [['asia', 'china', 'japan', 'india', 'korea', 'азия', 'китай', 'япония', 'индия'], 'asia_pacific'],
    [['middle east', 'uae', 'saudi', 'israel', 'qatar', 'ближний восток', 'эмираты'], 'middle_east'],
    [['latam', 'latin', 'brazil', 'mexico', 'argentina', 'латинская', 'бразилия', 'мексика'], 'latin_america'],
    [['africa', 'nigeria', 'kenya', 'south africa', 'egypt', 'африка', 'нигерия', 'египет'], 'africa'],
    [['russia', 'russia', 'cis', 'kazakhstan', 'ukraine', 'беларусь', 'казахстан', 'узбекистан', 'россия', 'снг'], 'cis'],
  ];
  
  for (const [keywords, region] of regionPatterns) {
    if (keywords.some(kw => locationLower.includes(kw))) {
      return { ...REGION_DEFAULTS[region] };
    }
  }
  
  // Global default
  return { ...REGION_DEFAULTS.global };
}

/**
 * Legacy compatibility function - returns single multiplier
 * Maps to the new enhanced system
 */
export function getLocationMultiplier(location: string): number {
  const result = getEnhancedLocationMultiplier(location);
  return result.overall;
}

/**
 * Gets all available cities for a given region
 */
export function getCitiesByRegion(region: string): LocationData[] {
  return Object.values(LOCATION_DATABASE)
    .filter(data => data.region === region)
    .sort((a, b) => b.costIndex - a.costIndex);
}

/**
 * Gets currency information for a location
 */
export function getLocationCurrency(location: string): { code: string; symbol: string } {
  const locationData = getLocationData(location);
  return locationData 
    ? { code: locationData.currencyCode, symbol: locationData.currencySymbol }
    : { code: 'USD', symbol: '$' };
}

/**
 * Calculates adjusted costs based on location
 */
export function calculateLocationAdjustedCosts(
  baseCosts: { salaries: number; rent: number; utilities: number; other: number; marketing: number },
  location: string
): { 
  adjusted: typeof baseCosts; 
  multipliers: LocationMultiplierResult;
  savings: number;
} {
  const multipliers = getEnhancedLocationMultiplier(location);
  
  const adjusted = {
    salaries: Math.round(baseCosts.salaries * multipliers.salary),
    rent: Math.round(baseCosts.rent * multipliers.rent),
    utilities: Math.round(baseCosts.utilities * multipliers.utility),
    other: Math.round(baseCosts.other * multipliers.overall),
    marketing: Math.round(baseCosts.marketing * multipliers.marketing),
  };
  
  const baseTotal = Object.values(baseCosts).reduce((a, b) => a + b, 0);
  const adjustedTotal = Object.values(adjusted).reduce((a, b) => a + b, 0);
  const savings = baseTotal - adjustedTotal;
  
  return { adjusted, multipliers, savings };
}
