-- Seed industry_benchmarks with core Kerry dataset benchmarks
-- This runs on deployment to ensure data is always available

INSERT INTO public.industry_benchmarks (
  industry_id, industry_name, region,
  gross_margin_min, gross_margin_max, gross_margin_avg,
  net_margin_min, net_margin_max, net_margin_avg,
  cogs_percent_avg, ltv_cac_ratio_min, ltv_cac_ratio_max,
  growth_rate_percent, cac_min, cac_max, cac_typical,
  average_check_min, average_check_max, client_lifetime_months,
  salaries_fixed, rent_fixed, utilities_fixed, other_fixed,
  keywords, sample_size, confidence_score, source, last_updated
) VALUES 
-- SaaS & Software
('saas_startup', 'SaaS Startup', 'global', 70, 85, 77, 10, 25, 15, 20, 3, 5, 20, 100, 500, 200, 50, 500, 24, 10000, 500, 200, 1500, ARRAY['saas', 'software', 'subscription', 'mrr', 'arr', 'churn', 'saas_startup', 'saas_metrics', 'retention', 'b2b'], 150, 85, 'kerry_dataset', NOW()),
('b2b_saas', 'B2B SaaS', 'global', 70, 85, 78, 12, 28, 18, 18, 3, 6, 18, 150, 600, 300, 100, 1000, 30, 12000, 600, 200, 2000, ARRAY['b2b', 'enterprise', 'software', 'platform', 'api', 'integration'], 80, 82, 'kerry_dataset', NOW()),

-- E-commerce
('ecommerce_retail', 'E-commerce Retail', 'global', 25, 50, 35, 5, 15, 8, 55, 2, 4, 15, 15, 80, 35, 30, 150, 12, 4000, 1500, 300, 1000, ARRAY['ecommerce', 'e-commerce', 'online store', 'shop', 'retail', 'products', 'selling', 'cart', 'checkout', 'conversion'], 120, 83, 'kerry_dataset', NOW()),
('dropshipping', 'Dropshipping', 'global', 15, 35, 22, 3, 12, 6, 65, 1.5, 3, 12, 10, 50, 25, 25, 100, 8, 2000, 500, 100, 500, ARRAY['dropshipping', 'dropship', 'supplier', 'aliexpress', 'fulfillment'], 60, 78, 'kerry_dataset', NOW()),
('marketplace', 'Online Marketplace', 'global', 30, 60, 45, 8, 20, 12, 40, 2, 5, 18, 20, 100, 50, 50, 200, 18, 6000, 800, 200, 1200, ARRAY['marketplace', 'platform', 'two-sided', 'commission', 'sellers', 'buyers'], 70, 80, 'kerry_dataset', NOW()),

-- Food & Beverage
('restaurant', 'Restaurant', 'global', 55, 70, 62, 3, 12, 6, 35, 2, 5, 8, 8, 30, 15, 15, 50, 8, 8000, 3500, 800, 1500, ARRAY['restaurant', 'ресторан', 'food', 'dining', 'menu', 'chef', 'cuisine'], 90, 82, 'kerry_dataset', NOW()),
('cafe_bakery', 'Cafe & Bakery', 'global', 60, 75, 68, 5, 15, 8, 30, 3, 6, 10, 5, 20, 10, 8, 25, 10, 5000, 2500, 600, 1000, ARRAY['cafe', 'bakery', 'coffee', 'кафе', 'пекарня', 'pastry', 'cake', 'dessert', 'breakfast'], 80, 81, 'kerry_dataset', NOW()),
('food_delivery', 'Food Delivery', 'global', 20, 40, 28, 2, 10, 5, 60, 2, 4, 15, 10, 40, 20, 15, 40, 6, 4000, 1000, 300, 800, ARRAY['delivery', 'доставка', 'food delivery', 'meal kit', 'ghost kitchen', 'dark kitchen'], 65, 79, 'kerry_dataset', NOW()),

-- Professional Services
('consulting', 'Consulting', 'global', 70, 90, 80, 20, 50, 32, 15, 3, 10, 12, 100, 1000, 400, 500, 5000, 24, 12000, 1500, 200, 800, ARRAY['consulting', 'consultant', 'advisory', 'strategy', 'management', 'professional services'], 100, 84, 'kerry_dataset', NOW()),
('agency', 'Digital Agency', 'global', 50, 75, 60, 15, 35, 22, 30, 3, 8, 15, 200, 1500, 600, 1000, 10000, 18, 15000, 2000, 300, 1500, ARRAY['agency', 'digital agency', 'marketing agency', 'creative agency', 'design agency', 'web agency'], 85, 82, 'kerry_dataset', NOW()),
('freelance', 'Freelance Services', 'global', 80, 95, 88, 40, 70, 55, 8, 4, 12, 10, 50, 300, 120, 100, 2000, 12, 0, 200, 100, 300, ARRAY['freelance', 'freelancer', 'contractor', 'independent', 'gig', 'self-employed'], 70, 80, 'kerry_dataset', NOW()),

-- Fitness & Wellness
('gym_fitness', 'Gym & Fitness', 'global', 55, 75, 65, 10, 25, 15, 25, 3, 6, 12, 30, 150, 70, 40, 150, 10, 6000, 4000, 800, 1000, ARRAY['gym', 'fitness', 'workout', 'training', 'crossfit', 'personal trainer', 'exercise'], 75, 81, 'kerry_dataset', NOW()),
('yoga_pilates', 'Yoga & Pilates Studio', 'global', 60, 80, 70, 15, 30, 20, 20, 3, 7, 15, 25, 100, 50, 50, 200, 12, 4000, 3000, 400, 600, ARRAY['yoga', 'pilates', 'wellness', 'meditation', 'mindfulness', 'stretch'], 55, 79, 'kerry_dataset', NOW()),
('spa_beauty', 'Spa & Beauty', 'global', 55, 75, 65, 12, 28, 18, 25, 3, 7, 10, 30, 120, 60, 60, 250, 14, 5000, 3500, 500, 800, ARRAY['spa', 'beauty', 'salon', 'massage', 'skincare', 'nails', 'hair'], 65, 80, 'kerry_dataset', NOW()),

-- Education
('online_education', 'Online Education', 'global', 70, 90, 80, 25, 50, 35, 15, 3, 8, 20, 30, 200, 80, 50, 500, 8, 4000, 300, 100, 500, ARRAY['online course', 'edtech', 'e-learning', 'tutorial', 'training', 'education', 'course'], 90, 83, 'kerry_dataset', NOW()),
('coaching', 'Coaching & Mentoring', 'global', 75, 95, 85, 35, 65, 48, 10, 4, 12, 15, 50, 400, 150, 200, 2000, 6, 2000, 500, 100, 400, ARRAY['coaching', 'coach', 'mentor', 'mentoring', 'life coach', 'business coach', 'executive coach'], 60, 80, 'kerry_dataset', NOW()),

-- Healthcare
('telehealth', 'Telehealth', 'global', 60, 80, 70, 15, 35, 22, 25, 3, 8, 25, 50, 250, 120, 50, 200, 18, 10000, 500, 200, 1500, ARRAY['telehealth', 'telemedicine', 'healthcare', 'medical', 'doctor', 'patient', 'health'], 50, 78, 'kerry_dataset', NOW()),
('dental_clinic', 'Dental Clinic', 'global', 55, 75, 65, 15, 35, 23, 30, 4, 10, 8, 50, 300, 150, 100, 500, 36, 15000, 4000, 600, 2000, ARRAY['dental', 'dentist', 'teeth', 'orthodontic', 'oral', 'clinic'], 45, 77, 'kerry_dataset', NOW()),

-- Fintech
('fintech', 'Fintech', 'global', 65, 85, 75, 15, 40, 25, 18, 3, 10, 25, 30, 200, 80, 10, 100, 36, 18000, 2000, 300, 3000, ARRAY['fintech', 'finance', 'banking', 'payment', 'wallet', 'money', 'trading', 'invest', 'crypto'], 70, 81, 'kerry_dataset', NOW()),

-- Media & Content
('content_creator', 'Content Creator', 'global', 75, 95, 85, 35, 70, 50, 10, 4, 15, 20, 2, 30, 10, 5, 50, 24, 1000, 200, 100, 500, ARRAY['creator', 'influencer', 'youtube', 'tiktok', 'instagram', 'content', 'blog', 'podcast', 'streaming'], 80, 82, 'kerry_dataset', NOW()),
('newsletter', 'Newsletter Business', 'global', 80, 95, 88, 40, 75, 55, 8, 5, 20, 25, 1, 15, 5, 5, 30, 18, 500, 0, 50, 200, ARRAY['newsletter', 'substack', 'email', 'subscription', 'paid newsletter', 'media'], 50, 79, 'kerry_dataset', NOW()),

-- Real Estate
('real_estate', 'Real Estate', 'global', 35, 60, 45, 10, 30, 18, 40, 3, 10, 8, 200, 2000, 700, 2000, 30000, 60, 8000, 2500, 400, 1500, ARRAY['real estate', 'property', 'rental', 'housing', 'apartment', 'realtor', 'broker', 'landlord'], 55, 79, 'kerry_dataset', NOW()),
('proptech', 'PropTech', 'global', 60, 80, 70, 15, 35, 22, 22, 3, 8, 18, 80, 500, 200, 100, 1000, 24, 12000, 1500, 200, 2000, ARRAY['proptech', 'property tech', 'real estate tech', 'rental platform', 'property management'], 40, 76, 'kerry_dataset', NOW()),

-- Logistics
('logistics', 'Logistics & Delivery', 'global', 20, 40, 28, 3, 12, 6, 60, 2, 5, 12, 30, 150, 70, 15, 80, 15, 8000, 5000, 1200, 3000, ARRAY['logistics', 'delivery', 'shipping', 'courier', 'freight', 'warehouse', 'supply chain', 'fulfillment'], 60, 80, 'kerry_dataset', NOW()),

-- Manufacturing
('manufacturing', 'Manufacturing', 'global', 25, 45, 32, 5, 15, 8, 58, 2, 6, 8, 100, 800, 350, 500, 10000, 36, 12000, 8000, 2500, 4000, ARRAY['manufacturing', 'production', 'factory', 'industrial', 'fabrication', 'assembly'], 50, 78, 'kerry_dataset', NOW()),
('d2c_brand', 'D2C Brand', 'global', 45, 70, 55, 8, 22, 13, 35, 2, 5, 20, 25, 120, 55, 40, 200, 18, 5000, 2000, 400, 1500, ARRAY['d2c', 'direct to consumer', 'brand', 'cpg', 'consumer brand', 'product'], 65, 80, 'kerry_dataset', NOW()),

-- Travel & Hospitality
('travel_booking', 'Travel & Booking', 'global', 15, 30, 22, 5, 15, 8, 70, 2, 5, 12, 20, 100, 45, 100, 1000, 24, 6000, 1500, 300, 1200, ARRAY['travel', 'booking', 'hotel', 'flight', 'vacation', 'tourism', 'trip', 'airbnb'], 55, 79, 'kerry_dataset', NOW()),
('hotel_hospitality', 'Hotel & Hospitality', 'global', 35, 55, 45, 8, 20, 12, 45, 2, 6, 8, 30, 150, 70, 80, 400, 30, 15000, 10000, 3000, 5000, ARRAY['hotel', 'hospitality', 'accommodation', 'resort', 'motel', 'hostel', 'lodging'], 45, 77, 'kerry_dataset', NOW()),

-- Gaming
('gaming', 'Gaming', 'global', 70, 90, 80, 15, 40, 25, 15, 2, 8, 18, 2, 30, 10, 5, 50, 12, 10000, 1000, 200, 2000, ARRAY['gaming', 'game', 'mobile game', 'video game', 'esports', 'game studio'], 55, 79, 'kerry_dataset', NOW()),

-- HR & Recruiting
('hr_recruiting', 'HR & Recruiting', 'global', 60, 80, 70, 15, 35, 22, 25, 3, 8, 12, 100, 600, 250, 500, 5000, 18, 8000, 1500, 200, 1000, ARRAY['hr', 'recruiting', 'staffing', 'hiring', 'talent', 'headhunter', 'recruitment', 'jobs'], 50, 78, 'kerry_dataset', NOW()),

-- Legal
('legal_services', 'Legal Services', 'global', 65, 85, 75, 25, 50, 35, 18, 4, 12, 8, 150, 1000, 400, 500, 10000, 24, 12000, 3000, 300, 1500, ARRAY['legal', 'law', 'lawyer', 'attorney', 'legaltech', 'contracts', 'litigation'], 45, 77, 'kerry_dataset', NOW()),

-- Insurance
('insurtech', 'InsurTech', 'global', 55, 75, 65, 12, 30, 18, 28, 3, 8, 20, 50, 300, 120, 50, 300, 36, 12000, 2000, 300, 2500, ARRAY['insurance', 'insurtech', 'insure', 'coverage', 'claims', 'policy'], 40, 76, 'kerry_dataset', NOW()),

-- Agriculture
('agritech', 'AgriTech', 'global', 35, 55, 42, 8, 20, 12, 48, 2, 6, 15, 80, 500, 200, 200, 2000, 24, 8000, 3000, 600, 2000, ARRAY['agritech', 'agriculture', 'farming', 'farm', 'crop', 'livestock', 'food production'], 35, 75, 'kerry_dataset', NOW()),

-- Services
('cleaning_services', 'Cleaning Services', 'global', 45, 65, 55, 10, 25, 15, 35, 4, 10, 10, 20, 100, 50, 50, 300, 18, 5000, 1000, 200, 600, ARRAY['cleaning', 'janitorial', 'housekeeping', 'maid', 'санитарный', 'уборка'], 50, 78, 'kerry_dataset', NOW()),
('event_planning', 'Event Planning', 'global', 30, 50, 38, 10, 25, 15, 52, 2, 6, 8, 50, 300, 120, 500, 10000, 24, 4000, 1500, 200, 800, ARRAY['event', 'wedding', 'party', 'conference', 'catering', 'venue', 'planner'], 45, 77, 'kerry_dataset', NOW()),
('pet_services', 'Pet Services', 'global', 50, 70, 60, 15, 30, 20, 30, 4, 10, 12, 15, 80, 35, 30, 150, 30, 4000, 2000, 300, 600, ARRAY['pet', 'dog', 'cat', 'grooming', 'pet sitting', 'veterinary', 'animal'], 55, 79, 'kerry_dataset', NOW()),
('photography', 'Photography', 'global', 60, 85, 72, 25, 50, 35, 20, 3, 8, 8, 30, 200, 80, 200, 2000, 12, 2000, 800, 100, 500, ARRAY['photography', 'photographer', 'photo', 'portrait', 'wedding photography', 'videography'], 50, 78, 'kerry_dataset', NOW()),
('security_services', 'Security Services', 'global', 35, 55, 45, 10, 22, 14, 45, 3, 8, 10, 100, 600, 280, 500, 5000, 24, 10000, 2000, 400, 1500, ARRAY['security', 'guard', 'cybersecurity', 'surveillance', 'protection', 'alarm'], 40, 76, 'kerry_dataset', NOW()),

-- General Fallback
('general_business', 'General Business', 'global', 35, 55, 45, 10, 25, 15, 45, 2, 5, 10, 50, 300, 120, 50, 300, 12, 5000, 1500, 300, 1000, ARRAY[]::text[], 500, 70, 'kerry_dataset', NOW())

ON CONFLICT (industry_id) DO UPDATE SET
  industry_name = EXCLUDED.industry_name,
  gross_margin_min = EXCLUDED.gross_margin_min,
  gross_margin_max = EXCLUDED.gross_margin_max,
  gross_margin_avg = EXCLUDED.gross_margin_avg,
  net_margin_min = EXCLUDED.net_margin_min,
  net_margin_max = EXCLUDED.net_margin_max,
  net_margin_avg = EXCLUDED.net_margin_avg,
  ltv_cac_ratio_min = EXCLUDED.ltv_cac_ratio_min,
  ltv_cac_ratio_max = EXCLUDED.ltv_cac_ratio_max,
  growth_rate_percent = EXCLUDED.growth_rate_percent,
  keywords = EXCLUDED.keywords,
  sample_size = EXCLUDED.sample_size,
  confidence_score = EXCLUDED.confidence_score,
  last_updated = NOW();