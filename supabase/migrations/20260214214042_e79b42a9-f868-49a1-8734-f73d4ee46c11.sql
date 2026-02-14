
-- =============================================
-- BATCH 1: Fix document_downloads RLS
-- The "Deny anonymous access" RESTRICTIVE policy uses USING(false) on ALL commands
-- for role PUBLIC, which blocks authenticated users too (AND logic).
-- Fix: Drop it and recreate targeting only the 'anon' role.
-- =============================================

-- Drop the broken policy
DROP POLICY IF EXISTS "Deny anonymous access to document_downloads" ON public.document_downloads;

-- Recreate it targeting only the anon role
CREATE POLICY "Deny anonymous access to document_downloads"
ON public.document_downloads
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- =============================================
-- BATCH 3: Seed location_data from embedded data
-- =============================================

INSERT INTO public.location_data (city_id, city, country, region, overall_cost_index, salary_multiplier, rent_multiplier, utility_multiplier, tax_burden, regulatory_complexity, market_maturity, currency_code, currency_symbol, locale_code, timezone, primary_language, keywords, source, confidence_score)
VALUES
  ('new_york', 'New York', 'USA', 'north_america', 1.87, 1.45, 2.50, 1.25, 0.35, 4, 5, 'USD', '$', 'en-US', 'America/New_York', 'English', ARRAY['nyc','ny','manhattan'], 'proprietary', 85),
  ('san_francisco', 'San Francisco', 'USA', 'north_america', 1.95, 1.60, 2.80, 1.30, 0.38, 4, 5, 'USD', '$', 'en-US', 'America/Los_Angeles', 'English', ARRAY['sf','bay area'], 'proprietary', 85),
  ('los_angeles', 'Los Angeles', 'USA', 'north_america', 1.55, 1.30, 1.90, 1.15, 0.33, 3, 5, 'USD', '$', 'en-US', 'America/Los_Angeles', 'English', ARRAY['la'], 'proprietary', 85),
  ('chicago', 'Chicago', 'USA', 'north_america', 1.25, 1.15, 1.40, 1.10, 0.32, 3, 4, 'USD', '$', 'en-US', 'America/Chicago', 'English', ARRAY['chi'], 'proprietary', 85),
  ('boston', 'Boston', 'USA', 'north_america', 1.45, 1.35, 1.80, 1.20, 0.30, 3, 4, 'USD', '$', 'en-US', 'America/New_York', 'English', ARRAY[]::text[], 'proprietary', 85),
  ('seattle', 'Seattle', 'USA', 'north_america', 1.50, 1.40, 1.75, 1.05, 0.25, 3, 4, 'USD', '$', 'en-US', 'America/Los_Angeles', 'English', ARRAY[]::text[], 'proprietary', 85),
  ('austin', 'Austin', 'USA', 'north_america', 1.20, 1.15, 1.30, 1.00, 0.22, 2, 4, 'USD', '$', 'en-US', 'America/Chicago', 'English', ARRAY[]::text[], 'proprietary', 85),
  ('miami', 'Miami', 'USA', 'north_america', 1.30, 1.10, 1.50, 1.15, 0.22, 2, 4, 'USD', '$', 'en-US', 'America/New_York', 'English', ARRAY[]::text[], 'proprietary', 85),
  ('denver', 'Denver', 'USA', 'north_america', 1.15, 1.10, 1.25, 0.95, 0.28, 2, 3, 'USD', '$', 'en-US', 'America/Denver', 'English', ARRAY[]::text[], 'proprietary', 85),
  ('toronto', 'Toronto', 'Canada', 'north_america', 1.35, 1.10, 1.60, 1.00, 0.30, 3, 4, 'CAD', 'C$', 'en-CA', 'America/Toronto', 'English', ARRAY[]::text[], 'proprietary', 85),
  ('vancouver', 'Vancouver', 'Canada', 'north_america', 1.40, 1.05, 1.70, 0.90, 0.28, 3, 4, 'CAD', 'C$', 'en-CA', 'America/Vancouver', 'English', ARRAY[]::text[], 'proprietary', 85),
  ('london', 'London', 'UK', 'europe', 1.75, 1.30, 2.20, 1.40, 0.35, 4, 5, 'GBP', '£', 'en-GB', 'Europe/London', 'English', ARRAY[]::text[], 'proprietary', 85),
  ('paris', 'Paris', 'France', 'europe', 1.55, 1.20, 1.80, 1.25, 0.42, 5, 5, 'EUR', '€', 'fr-FR', 'Europe/Paris', 'French', ARRAY[]::text[], 'proprietary', 85),
  ('berlin', 'Berlin', 'Germany', 'europe', 1.15, 1.00, 1.10, 1.30, 0.40, 4, 4, 'EUR', '€', 'de-DE', 'Europe/Berlin', 'German', ARRAY[]::text[], 'proprietary', 85),
  ('munich', 'Munich', 'Germany', 'europe', 1.35, 1.15, 1.50, 1.30, 0.40, 4, 5, 'EUR', '€', 'de-DE', 'Europe/Berlin', 'German', ARRAY[]::text[], 'proprietary', 85),
  ('amsterdam', 'Amsterdam', 'Netherlands', 'europe', 1.40, 1.10, 1.60, 1.20, 0.38, 3, 4, 'EUR', '€', 'nl-NL', 'Europe/Amsterdam', 'Dutch', ARRAY[]::text[], 'proprietary', 85),
  ('zurich', 'Zurich', 'Switzerland', 'europe', 2.10, 1.80, 2.40, 1.20, 0.22, 3, 5, 'CHF', 'CHF', 'de-CH', 'Europe/Zurich', 'German', ARRAY[]::text[], 'proprietary', 85),
  ('dublin', 'Dublin', 'Ireland', 'europe', 1.45, 1.20, 1.70, 1.15, 0.25, 2, 4, 'EUR', '€', 'en-IE', 'Europe/Dublin', 'English', ARRAY[]::text[], 'proprietary', 85),
  ('stockholm', 'Stockholm', 'Sweden', 'europe', 1.50, 1.15, 1.55, 1.10, 0.45, 3, 4, 'SEK', 'kr', 'sv-SE', 'Europe/Stockholm', 'Swedish', ARRAY[]::text[], 'proprietary', 85),
  ('barcelona', 'Barcelona', 'Spain', 'europe', 1.10, 0.80, 1.20, 1.10, 0.35, 4, 4, 'EUR', '€', 'es-ES', 'Europe/Madrid', 'Spanish', ARRAY[]::text[], 'proprietary', 85),
  ('lisbon', 'Lisbon', 'Portugal', 'europe', 0.95, 0.60, 1.00, 1.00, 0.32, 3, 3, 'EUR', '€', 'pt-PT', 'Europe/Lisbon', 'Portuguese', ARRAY[]::text[], 'proprietary', 85),
  ('warsaw', 'Warsaw', 'Poland', 'europe', 0.70, 0.45, 0.65, 0.80, 0.25, 3, 3, 'PLN', 'zł', 'pl-PL', 'Europe/Warsaw', 'Polish', ARRAY[]::text[], 'proprietary', 85),
  ('prague', 'Prague', 'Czech Republic', 'europe', 0.75, 0.50, 0.70, 0.85, 0.28, 3, 3, 'CZK', 'Kč', 'cs-CZ', 'Europe/Prague', 'Czech', ARRAY[]::text[], 'proprietary', 85),
  ('moscow', 'Moscow', 'Russia', 'cis', 0.85, 0.40, 1.10, 0.50, 0.20, 4, 4, 'RUB', '₽', 'ru-RU', 'Europe/Moscow', 'Russian', ARRAY[]::text[], 'proprietary', 80),
  ('saint_petersburg', 'Saint Petersburg', 'Russia', 'cis', 0.70, 0.35, 0.80, 0.45, 0.20, 4, 3, 'RUB', '₽', 'ru-RU', 'Europe/Moscow', 'Russian', ARRAY['spb'], 'proprietary', 80),
  ('kyiv', 'Kyiv', 'Ukraine', 'cis', 0.50, 0.25, 0.45, 0.35, 0.22, 4, 3, 'UAH', '₴', 'uk-UA', 'Europe/Kyiv', 'Ukrainian', ARRAY['kiev'], 'proprietary', 80),
  ('astana', 'Astana', 'Kazakhstan', 'cis', 0.55, 0.30, 0.50, 0.30, 0.20, 3, 2, 'KZT', '₸', 'kk-KZ', 'Asia/Almaty', 'Kazakh', ARRAY[]::text[], 'proprietary', 80),
  ('almaty', 'Almaty', 'Kazakhstan', 'cis', 0.50, 0.28, 0.45, 0.25, 0.20, 3, 3, 'KZT', '₸', 'kk-KZ', 'Asia/Almaty', 'Kazakh', ARRAY[]::text[], 'proprietary', 80),
  ('tashkent', 'Tashkent', 'Uzbekistan', 'cis', 0.40, 0.15, 0.30, 0.20, 0.18, 4, 2, 'UZS', 'сўм', 'uz-UZ', 'Asia/Tashkent', 'Uzbek', ARRAY[]::text[], 'proprietary', 80),
  ('tbilisi', 'Tbilisi', 'Georgia', 'cis', 0.45, 0.22, 0.40, 0.25, 0.15, 2, 2, 'GEL', '₾', 'ka-GE', 'Asia/Tbilisi', 'Georgian', ARRAY[]::text[], 'proprietary', 80),
  ('minsk', 'Minsk', 'Belarus', 'cis', 0.55, 0.25, 0.50, 0.30, 0.18, 4, 2, 'BYN', 'Br', 'be-BY', 'Europe/Minsk', 'Belarusian', ARRAY[]::text[], 'proprietary', 80),
  ('yerevan', 'Yerevan', 'Armenia', 'cis', 0.45, 0.20, 0.35, 0.25, 0.18, 3, 2, 'AMD', '֏', 'hy-AM', 'Asia/Yerevan', 'Armenian', ARRAY[]::text[], 'proprietary', 80),
  ('baku', 'Baku', 'Azerbaijan', 'cis', 0.50, 0.25, 0.45, 0.20, 0.20, 3, 2, 'AZN', '₼', 'az-AZ', 'Asia/Baku', 'Azerbaijani', ARRAY[]::text[], 'proprietary', 80),
  ('singapore', 'Singapore', 'Singapore', 'asia_pacific', 1.65, 1.25, 2.00, 1.10, 0.17, 2, 5, 'SGD', 'S$', 'en-SG', 'Asia/Singapore', 'English', ARRAY[]::text[], 'proprietary', 85),
  ('hong_kong', 'Hong Kong', 'Hong Kong', 'asia_pacific', 1.70, 1.20, 2.50, 1.15, 0.16, 2, 5, 'HKD', 'HK$', 'zh-HK', 'Asia/Hong_Kong', 'Cantonese', ARRAY[]::text[], 'proprietary', 85),
  ('tokyo', 'Tokyo', 'Japan', 'asia_pacific', 1.55, 1.10, 1.80, 1.25, 0.35, 4, 5, 'JPY', '¥', 'ja-JP', 'Asia/Tokyo', 'Japanese', ARRAY[]::text[], 'proprietary', 85),
  ('sydney', 'Sydney', 'Australia', 'asia_pacific', 1.50, 1.30, 1.70, 1.20, 0.30, 3, 4, 'AUD', 'A$', 'en-AU', 'Australia/Sydney', 'English', ARRAY[]::text[], 'proprietary', 85),
  ('melbourne', 'Melbourne', 'Australia', 'asia_pacific', 1.40, 1.20, 1.50, 1.15, 0.30, 3, 4, 'AUD', 'A$', 'en-AU', 'Australia/Melbourne', 'English', ARRAY[]::text[], 'proprietary', 85),
  ('shanghai', 'Shanghai', 'China', 'asia_pacific', 0.90, 0.55, 1.20, 0.60, 0.25, 5, 5, 'CNY', '¥', 'zh-CN', 'Asia/Shanghai', 'Mandarin', ARRAY[]::text[], 'proprietary', 85),
  ('beijing', 'Beijing', 'China', 'asia_pacific', 0.85, 0.50, 1.10, 0.55, 0.25, 5, 5, 'CNY', '¥', 'zh-CN', 'Asia/Shanghai', 'Mandarin', ARRAY[]::text[], 'proprietary', 85),
  ('shenzhen', 'Shenzhen', 'China', 'asia_pacific', 0.80, 0.48, 1.00, 0.55, 0.22, 4, 5, 'CNY', '¥', 'zh-CN', 'Asia/Shanghai', 'Mandarin', ARRAY[]::text[], 'proprietary', 85),
  ('seoul', 'Seoul', 'South Korea', 'asia_pacific', 1.15, 0.85, 1.30, 1.00, 0.28, 3, 5, 'KRW', '₩', 'ko-KR', 'Asia/Seoul', 'Korean', ARRAY[]::text[], 'proprietary', 85),
  ('mumbai', 'Mumbai', 'India', 'asia_pacific', 0.45, 0.20, 0.60, 0.30, 0.30, 4, 4, 'INR', '₹', 'hi-IN', 'Asia/Kolkata', 'Hindi', ARRAY[]::text[], 'proprietary', 85),
  ('bangalore', 'Bangalore', 'India', 'asia_pacific', 0.40, 0.22, 0.50, 0.25, 0.30, 4, 4, 'INR', '₹', 'en-IN', 'Asia/Kolkata', 'English', ARRAY[]::text[], 'proprietary', 85),
  ('delhi', 'Delhi', 'India', 'asia_pacific', 0.42, 0.18, 0.55, 0.28, 0.30, 4, 4, 'INR', '₹', 'hi-IN', 'Asia/Kolkata', 'Hindi', ARRAY[]::text[], 'proprietary', 85),
  ('jakarta', 'Jakarta', 'Indonesia', 'asia_pacific', 0.50, 0.18, 0.55, 0.35, 0.25, 4, 3, 'IDR', 'Rp', 'id-ID', 'Asia/Jakarta', 'Indonesian', ARRAY[]::text[], 'proprietary', 85),
  ('bangkok', 'Bangkok', 'Thailand', 'asia_pacific', 0.55, 0.25, 0.60, 0.40, 0.20, 3, 4, 'THB', '฿', 'th-TH', 'Asia/Bangkok', 'Thai', ARRAY[]::text[], 'proprietary', 85),
  ('manila', 'Manila', 'Philippines', 'asia_pacific', 0.48, 0.20, 0.50, 0.45, 0.30, 4, 3, 'PHP', '₱', 'en-PH', 'Asia/Manila', 'English', ARRAY[]::text[], 'proprietary', 85),
  ('ho_chi_minh', 'Ho Chi Minh City', 'Vietnam', 'asia_pacific', 0.45, 0.15, 0.45, 0.30, 0.20, 4, 3, 'VND', '₫', 'vi-VN', 'Asia/Ho_Chi_Minh', 'Vietnamese', ARRAY[]::text[], 'proprietary', 85),
  ('dubai', 'Dubai', 'UAE', 'middle_east', 1.35, 1.00, 1.50, 1.00, 0.05, 2, 4, 'AED', 'د.إ', 'ar-AE', 'Asia/Dubai', 'Arabic', ARRAY[]::text[], 'proprietary', 85),
  ('abu_dhabi', 'Abu Dhabi', 'UAE', 'middle_east', 1.25, 0.95, 1.35, 0.90, 0.05, 2, 4, 'AED', 'د.إ', 'ar-AE', 'Asia/Dubai', 'Arabic', ARRAY[]::text[], 'proprietary', 85),
  ('tel_aviv', 'Tel Aviv', 'Israel', 'middle_east', 1.45, 1.10, 1.60, 1.15, 0.32, 3, 5, 'ILS', '₪', 'he-IL', 'Asia/Jerusalem', 'Hebrew', ARRAY[]::text[], 'proprietary', 85),
  ('riyadh', 'Riyadh', 'Saudi Arabia', 'middle_east', 0.85, 0.80, 0.90, 0.40, 0.05, 4, 3, 'SAR', '﷼', 'ar-SA', 'Asia/Riyadh', 'Arabic', ARRAY[]::text[], 'proprietary', 85),
  ('doha', 'Doha', 'Qatar', 'middle_east', 1.20, 0.95, 1.40, 0.50, 0.05, 3, 3, 'QAR', 'ر.ق', 'ar-QA', 'Asia/Qatar', 'Arabic', ARRAY[]::text[], 'proprietary', 85),
  ('mexico_city', 'Mexico City', 'Mexico', 'latin_america', 0.55, 0.30, 0.50, 0.45, 0.30, 4, 4, 'MXN', '$', 'es-MX', 'America/Mexico_City', 'Spanish', ARRAY[]::text[], 'proprietary', 85),
  ('sao_paulo', 'São Paulo', 'Brazil', 'latin_america', 0.65, 0.35, 0.60, 0.50, 0.40, 5, 4, 'BRL', 'R$', 'pt-BR', 'America/Sao_Paulo', 'Portuguese', ARRAY[]::text[], 'proprietary', 85),
  ('buenos_aires', 'Buenos Aires', 'Argentina', 'latin_america', 0.45, 0.22, 0.40, 0.35, 0.35, 5, 3, 'ARS', '$', 'es-AR', 'America/Argentina/Buenos_Aires', 'Spanish', ARRAY[]::text[], 'proprietary', 85),
  ('bogota', 'Bogotá', 'Colombia', 'latin_america', 0.50, 0.25, 0.45, 0.40, 0.32, 4, 3, 'COP', '$', 'es-CO', 'America/Bogota', 'Spanish', ARRAY[]::text[], 'proprietary', 85),
  ('santiago', 'Santiago', 'Chile', 'latin_america', 0.60, 0.35, 0.55, 0.45, 0.27, 3, 4, 'CLP', '$', 'es-CL', 'America/Santiago', 'Spanish', ARRAY[]::text[], 'proprietary', 85),
  ('lima', 'Lima', 'Peru', 'latin_america', 0.50, 0.25, 0.45, 0.40, 0.30, 4, 3, 'PEN', 'S/', 'es-PE', 'America/Lima', 'Spanish', ARRAY[]::text[], 'proprietary', 85),
  ('lagos', 'Lagos', 'Nigeria', 'africa', 0.45, 0.15, 0.50, 0.60, 0.25, 5, 3, 'NGN', '₦', 'en-NG', 'Africa/Lagos', 'English', ARRAY[]::text[], 'proprietary', 80),
  ('nairobi', 'Nairobi', 'Kenya', 'africa', 0.42, 0.15, 0.40, 0.45, 0.30, 4, 3, 'KES', 'KSh', 'en-KE', 'Africa/Nairobi', 'English', ARRAY[]::text[], 'proprietary', 80),
  ('cape_town', 'Cape Town', 'South Africa', 'africa', 0.55, 0.30, 0.50, 0.45, 0.28, 3, 4, 'ZAR', 'R', 'en-ZA', 'Africa/Johannesburg', 'English', ARRAY[]::text[], 'proprietary', 80),
  ('johannesburg', 'Johannesburg', 'South Africa', 'africa', 0.52, 0.28, 0.45, 0.40, 0.28, 3, 4, 'ZAR', 'R', 'en-ZA', 'Africa/Johannesburg', 'English', ARRAY[]::text[], 'proprietary', 80),
  ('cairo', 'Cairo', 'Egypt', 'africa', 0.40, 0.12, 0.35, 0.25, 0.22, 5, 3, 'EGP', 'E£', 'ar-EG', 'Africa/Cairo', 'Arabic', ARRAY[]::text[], 'proprietary', 80)
ON CONFLICT (city_id) DO NOTHING;
