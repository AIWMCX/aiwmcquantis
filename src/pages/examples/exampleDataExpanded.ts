import type { ExampleData } from './exampleData';

/**
 * 40 additional example analyses covering diverse cities × industries.
 * Each page serves as an organic landing page for high-intent search traffic.
 */
export const EXPANDED_EXAMPLES: Record<string, ExampleData> = {
  // ── BAKERIES ──
  'bakery-paris': {
    title: 'Artisan Bakery in Paris, France',
    description: 'A neighborhood boulangerie in the Marais offering sourdough, viennoiseries, and specialty cakes with a small café seating area.',
    industry: 'Bakery',
    location: 'Paris, France',
    seo: {
      title: 'Bakery Business Analysis — Paris, France | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled finances for opening an artisan bakery in Paris. €5,800/mo profit, €75K startup, 12.9-month payback. Modeled benchmark…',
    },
    metrics: { monthlyRevenue: '€22,000', monthlyProfit: '€5,800', paybackMonths: '12.9 months', roi: '93%', startupCost: '€75,000' },
    costBreakdown: [
      { label: 'Oven & bakery equipment', value: '€35,000' },
      { label: 'Shopfit & furniture', value: '€15,000' },
      { label: 'Licenses & health permits', value: '€3,000' },
      { label: 'Initial ingredients stock', value: '€5,000' },
      { label: 'Marketing launch', value: '€4,000' },
      { label: 'Working capital (3 months)', value: '€13,000' },
    ],
    risks: [
      { text: 'Paris rent in Marais averages €3,500+/mo for retail — compresses margins', severity: 'high' },
      { text: 'Intense competition: 1,200+ bakeries in Paris proper', severity: 'high' },
      { text: 'Flour & butter price volatility linked to EU commodity markets', severity: 'medium' },
      { text: 'Early-morning labor (3 AM starts) creates staffing challenges', severity: 'medium' },
      { text: 'Summer tourist surge vs. local lull in August', severity: 'low' },
    ],
    actionPlan: [
      'Differentiate with 3 signature items unavailable elsewhere in the arrondissement.',
      'Open by 6:30 AM to capture morning commuter traffic — critical revenue window.',
      'Partner with 5 local restaurants for wholesale bread supply as B2B revenue stream.',
      'Build Instagram presence with daily "fresh from the oven" stories.',
      'Offer a monthly subscription box for loyal customers at €29/mo.',
    ],
  },

  // ── GYMS ──
  'gym-london': {
    title: 'Boutique Gym in London, UK',
    description: 'A 3,000 sq ft boutique fitness studio in Shoreditch offering HIIT, strength, and yoga classes with a 150-member cap.',
    industry: 'Fitness / Gym',
    location: 'London, UK',
    seo: {
      title: 'Boutique Gym Business Analysis — London, UK | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled financial case for a boutique gym in London Shoreditch. £7,200/mo profit, £90K startup, 12.5-month payback.',
    },
    metrics: { monthlyRevenue: '£28,000', monthlyProfit: '£7,200', paybackMonths: '12.5 months', roi: '96%', startupCost: '£90,000' },
    costBreakdown: [
      { label: 'Equipment & installation', value: '£40,000' },
      { label: 'Buildout & flooring', value: '£20,000' },
      { label: 'Licenses & insurance', value: '£5,000' },
      { label: 'Marketing launch', value: '£8,000' },
      { label: 'Working capital', value: '£17,000' },
    ],
    risks: [
      { text: 'Shoreditch commercial rent £5,000+/mo with annual escalation', severity: 'high' },
      { text: 'High churn — boutique fitness sees 4-6% monthly member attrition', severity: 'high' },
      { text: 'Instructor poaching by competitors or their own brand launches', severity: 'medium' },
      { text: 'January spike then steep February drop requires cash reserves', severity: 'medium' },
      { text: 'Regulatory changes to health facility standards post-COVID', severity: 'low' },
    ],
    actionPlan: [
      'Pre-sell 80 founding memberships at 20% discount before opening day.',
      'Hire 2 instructors with existing social media followings (5K+ each).',
      'Implement a referral program: 1 free month per successful referral.',
      'Partner with 3 local corporate offices for corporate wellness packages.',
      'Launch a branded app with class booking, progress tracking, and community features.',
    ],
  },

  // ── DENTAL CLINICS ──
  'dental-clinic-dubai': {
    title: 'Dental Clinic in Dubai, UAE',
    description: 'A premium dental clinic in Business Bay offering cosmetic dentistry, orthodontics, and general dental care to expats and locals.',
    industry: 'Healthcare / Dental',
    location: 'Dubai, UAE',
    seo: {
      title: 'Dental Clinic Business Analysis — Dubai, UAE | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled business case for a dental clinic in Dubai. AED 85,000/mo revenue, AED 22,000/mo profit, 18-month payback.',
    },
    metrics: { monthlyRevenue: '$23,100', monthlyProfit: '$6,000', paybackMonths: '18 months', roi: '67%', startupCost: '$108,000' },
    costBreakdown: [
      { label: 'Dental chairs & equipment', value: '$50,000' },
      { label: 'Clinic buildout', value: '$25,000' },
      { label: 'DHA licensing & permits', value: '$8,000' },
      { label: 'Initial supplies', value: '$7,000' },
      { label: 'Marketing & branding', value: '$8,000' },
      { label: 'Working capital', value: '$10,000' },
    ],
    risks: [
      { text: 'DHA licensing timeline can delay opening by 3-6 months', severity: 'high' },
      { text: 'Insurance panel approvals take 60-90 days — cash-only until then', severity: 'high' },
      { text: 'Expat turnover: 20% of patient base leaves Dubai annually', severity: 'medium' },
      { text: 'Equipment servicing costs 30-40% higher than US/EU equivalents', severity: 'medium' },
      { text: 'Summer patient volume drops 25% during July-August exodus', severity: 'low' },
    ],
    actionPlan: [
      'Start DHA licensing 4 months before planned opening date.',
      'Focus on cosmetic dentistry — highest margin procedures (60%+ margin).',
      'Partner with 3 insurance providers covering largest expat employer groups.',
      'Offer teeth whitening as a loss-leader to drive clinic traffic.',
      'Build Google Reviews to 50+ in first 3 months — critical for Dubai discovery.',
    ],
  },

  // ── LAUNDROMATS ──
  'laundromat-tokyo': {
    title: 'Coin Laundromat in Tokyo, Japan',
    description: 'A modern self-service coin laundry in Shibuya with premium machines, a waiting lounge, and vending café area.',
    industry: 'Laundromat',
    location: 'Tokyo, Japan',
    seo: {
      title: 'Coin Laundromat Business Analysis — Tokyo, Japan | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled finances for a coin laundromat in Tokyo Shibuya. ¥1.2M/mo revenue, ¥380K/mo profit, 15-month payback.',
    },
    metrics: { monthlyRevenue: '$8,200', monthlyProfit: '$2,600', paybackMonths: '15 months', roi: '80%', startupCost: '$39,000' },
    costBreakdown: [
      { label: 'Commercial washers & dryers (8 units)', value: '$20,000' },
      { label: 'Store renovation', value: '$8,000' },
      { label: 'Vending machines & café area', value: '$4,000' },
      { label: 'POS & card payment system', value: '$2,000' },
      { label: 'Working capital', value: '$5,000' },
    ],
    risks: [
      { text: 'Tokyo rent escalation in Shibuya area — ¥350K+/mo', severity: 'high' },
      { text: 'Machine breakdowns: average repair cost ¥50K-100K per incident', severity: 'medium' },
      { text: 'Competition from apartment-building laundry rooms', severity: 'medium' },
      { text: 'Utility costs (water + electricity) can spike 20% in summer', severity: 'medium' },
      { text: 'Rainy season (June-July) actually boosts demand for dryers', severity: 'low' },
    ],
    actionPlan: [
      'Install cashless payment system — IC cards and QR codes are standard in Tokyo.',
      'Add premium large-capacity machines for bedding/curtains at 2x pricing.',
      'Install security cameras and maintain 24/7 operation for maximum utilization.',
      'Target single professionals in surrounding apartments with flyer campaigns.',
      'Add detergent vending and café drinks as ancillary revenue (15-20% of total).',
    ],
  },

  // ── DIGITAL MARKETING AGENCY ──
  'digital-agency-berlin': {
    title: 'Digital Marketing Agency in Berlin, Germany',
    description: 'A lean 4-person digital agency specializing in performance marketing for D2C e-commerce brands across DACH region.',
    industry: 'Digital Agency',
    location: 'Berlin, Germany',
    seo: {
      title: 'Digital Marketing Agency Analysis — Berlin | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled business case for a digital marketing agency in Berlin. €18,000/mo revenue, €7,200/mo profit, 4-month payback. Low…',
    },
    metrics: { monthlyRevenue: '€18,000', monthlyProfit: '€7,200', paybackMonths: '4 months', roi: '288%', startupCost: '€25,000' },
    costBreakdown: [
      { label: 'Laptops & software licenses', value: '€8,000' },
      { label: 'Office co-working (6 months)', value: '€6,000' },
      { label: 'Legal & GmbH registration', value: '€3,000' },
      { label: 'Marketing & portfolio site', value: '€4,000' },
      { label: 'Working capital', value: '€4,000' },
    ],
    risks: [
      { text: 'Client concentration: losing 1 of 4 clients = 25% revenue drop', severity: 'high' },
      { text: 'German freelancer regulations (Scheinselbständigkeit) may require employment', severity: 'medium' },
      { text: 'Ad platform algorithm changes can invalidate client strategies overnight', severity: 'medium' },
      { text: 'Berlin tech talent competition drives salaries up 10-15%/yr', severity: 'medium' },
      { text: 'Payment delays common in DACH — 60-90 day invoice cycles', severity: 'low' },
    ],
    actionPlan: [
      'Sign minimum 6 clients before hiring staff — maintain 3-month runway.',
      'Specialize in one vertical (e.g., beauty D2C) for positioning and referrals.',
      'Create 3 detailed case studies with ROI proof for sales conversations.',
      'Set retainer-based pricing (not project) to stabilize cash flow.',
      'Publish monthly DACH e-commerce insights on LinkedIn for inbound leads.',
    ],
  },

  // ── PHARMACY ──
  'pharmacy-toronto': {
    title: 'Independent Pharmacy in Toronto, Canada',
    description: 'A community pharmacy in Kensington Market offering prescriptions, compounding services, and health consultations.',
    industry: 'Pharmacy / Healthcare',
    location: 'Toronto, Canada',
    seo: {
      title: 'Pharmacy Business Analysis — Toronto, Canada | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled finances for an independent pharmacy in Toronto. CAD 45K/mo revenue, CAD 8,500/mo profit, 20-month payback.',
    },
    metrics: { monthlyRevenue: '$33,000', monthlyProfit: '$6,200', paybackMonths: '20 months', roi: '60%', startupCost: '$124,000' },
    costBreakdown: [
      { label: 'Inventory (initial stock)', value: '$50,000' },
      { label: 'Dispensing equipment & software', value: '$25,000' },
      { label: 'Store buildout & fixtures', value: '$20,000' },
      { label: 'Licensing & compliance', value: '$9,000' },
      { label: 'Marketing', value: '$5,000' },
      { label: 'Working capital', value: '$15,000' },
    ],
    risks: [
      { text: 'Ontario drug pricing regulations cap dispensing fees at $8.83', severity: 'high' },
      { text: 'Chain pharmacy competition (Shoppers, Rexall) within 500m radius', severity: 'high' },
      { text: 'Generic drug reimbursement cuts reduce margins 5-10% per policy change', severity: 'medium' },
      { text: 'Pharmacist salary requirements ($55-65/hr) are the largest cost center', severity: 'medium' },
      { text: 'Inventory spoilage and returns average 2-3% of stock value', severity: 'low' },
    ],
    actionPlan: [
      'Offer compounding services — 40%+ margins vs 15-20% on standard dispensing.',
      'Partner with 10 nearby family physicians for prescription referrals.',
      'Add immunization, blood pressure, and health screening services.',
      'Build a delivery service for seniors — capture loyalty and recurring revenue.',
      'Apply for Ontario government smoking cessation program billing.',
    ],
  },

  // ── AUTO REPAIR ──
  'auto-repair-dallas': {
    title: 'Auto Repair Shop in Dallas, Texas',
    description: 'A general auto repair and maintenance shop in a high-traffic suburban location serving daily commuters.',
    industry: 'Auto Repair',
    location: 'Dallas, TX',
    seo: {
      title: 'Auto Repair Shop Analysis — Dallas, TX | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled business case for an auto repair shop in Dallas. $42K/mo revenue, $9,800/mo profit, 10-month payback. 140% ROI.',
    },
    metrics: { monthlyRevenue: '$42,000', monthlyProfit: '$9,800', paybackMonths: '10 months', roi: '140%', startupCost: '$98,000' },
    costBreakdown: [
      { label: 'Lifts, tools & diagnostic equipment', value: '$40,000' },
      { label: 'Bay buildout (4 bays)', value: '$25,000' },
      { label: 'Inventory (parts & fluids)', value: '$12,000' },
      { label: 'Licensing & insurance', value: '$6,000' },
      { label: 'Marketing & signage', value: '$5,000' },
      { label: 'Working capital', value: '$10,000' },
    ],
    risks: [
      { text: 'Skilled mechanic shortage — ASE-certified techs command $28-35/hr', severity: 'high' },
      { text: 'Parts supply chain delays for specific makes/models', severity: 'medium' },
      { text: 'EV adoption long-term: fewer oil changes and brake jobs', severity: 'medium' },
      { text: 'Customer acquisition cost high without existing reputation', severity: 'medium' },
      { text: 'Liability insurance costs rising 8-12% annually', severity: 'low' },
    ],
    actionPlan: [
      'Focus on fleet maintenance contracts — 3 local businesses = stable base revenue.',
      'Implement digital vehicle inspections with photos sent to customer phones.',
      'Offer 24-month/24K-mile warranty on all repairs for trust differentiation.',
      'Build Google Reviews to 100+ in first 6 months — #1 local ranking factor.',
      'Add hybrid/EV service capability now to future-proof the business.',
    ],
  },

  // ── YOGA STUDIO ──
  'yoga-studio-bali': {
    title: 'Yoga & Wellness Studio in Bali, Indonesia',
    description: 'An open-air yoga studio in Ubud offering daily classes, retreats, and teacher training programs for international visitors.',
    industry: 'Wellness / Yoga',
    location: 'Ubud, Bali',
    seo: {
      title: 'Yoga Studio Business Analysis — Bali, Indonesia | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled finances for a yoga studio in Bali. $6,500/mo revenue, $2,800/mo profit, 7-month payback. Retreat-driven model.',
    },
    metrics: { monthlyRevenue: '$6,500', monthlyProfit: '$2,800', paybackMonths: '7 months', roi: '171%', startupCost: '$19,500' },
    costBreakdown: [
      { label: 'Studio construction (open-air shala)', value: '$8,000' },
      { label: 'Mats, props & sound system', value: '$ 3,000' },
      { label: 'Permits & KITAS visa', value: '$2,500' },
      { label: 'Website & booking system', value: '$2,000' },
      { label: 'Working capital', value: '$4,000' },
    ],
    risks: [
      { text: 'Foreign ownership restrictions — must use PT PMA structure', severity: 'high' },
      { text: 'Extreme seasonality: 60% revenue in Jul-Sep, 15% in Feb-Mar', severity: 'high' },
      { text: 'Ubud yoga market saturated — 80+ studios competing', severity: 'medium' },
      { text: 'Visa regulation changes can disrupt operations for foreign owners', severity: 'medium' },
      { text: 'Rainy season (Nov-Mar) reduces walk-in traffic significantly', severity: 'low' },
    ],
    actionPlan: [
      'Launch 7-day retreat packages at $800-1,200 — this is 60%+ of revenue potential.',
      'Partner with 5 Ubud hotels and villas for guest referral commissions.',
      'Build a 200hr teacher training program (YA certified) as premium offering.',
      'Create online content to drive bookings: YouTube channel + retreat landing pages.',
      'Hire local Balinese instructors to reduce costs and add cultural authenticity.',
    ],
  },

  // ── BOOKSTORE ──
  'bookstore-lisbon': {
    title: 'Independent Bookstore in Lisbon, Portugal',
    description: 'A curated English & Portuguese bookstore with café in Príncipe Real, hosting author events and literary salons.',
    industry: 'Bookstore / Retail',
    location: 'Lisbon, Portugal',
    seo: {
      title: 'Bookstore Business Analysis — Lisbon, Portugal | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled finances for an independent bookstore in Lisbon. €3,800/mo profit, €42K startup, 11-month payback.',
    },
    metrics: { monthlyRevenue: '€14,000', monthlyProfit: '€3,800', paybackMonths: '11 months', roi: '109%', startupCost: '€42,000' },
    costBreakdown: [
      { label: 'Initial book inventory', value: '€15,000' },
      { label: 'Store renovation & shelving', value: '€12,000' },
      { label: 'Café equipment', value: '€5,000' },
      { label: 'POS & e-commerce setup', value: '€3,000' },
      { label: 'Marketing & events', value: '€3,000' },
      { label: 'Working capital', value: '€4,000' },
    ],
    risks: [
      { text: 'Book margins thin (35-40%) — café must contribute 30%+ of revenue', severity: 'high' },
      { text: 'Amazon price competition on bestsellers', severity: 'medium' },
      { text: 'Tourism-dependent foot traffic fluctuates seasonally', severity: 'medium' },
      { text: 'Rising Lisbon rents in central neighborhoods', severity: 'medium' },
      { text: 'Local language requirements for signage and labeling', severity: 'low' },
    ],
    actionPlan: [
      'Make café revenue 35%+ of total — higher margin than book sales.',
      'Host 2 author events per month — drives foot traffic and community.',
      'Curate for the expat + digital nomad English-reading audience.',
      'Launch a book subscription box (€25/mo) for recurring revenue.',
      'Partner with Lisbon hotels for "recommended bookstore" placement.',
    ],
  },

  // ── NAIL SALON ──
  'nail-salon-sydney': {
    title: 'Nail Salon in Sydney, Australia',
    description: 'A modern nail bar in Bondi Junction offering gel manicures, nail art, and express services targeting busy professionals.',
    industry: 'Beauty / Nail Salon',
    location: 'Sydney, Australia',
    seo: {
      title: 'Nail Salon Business Analysis — Sydney, Australia | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled business case for a nail salon in Sydney. AUD 32K/mo revenue, AUD 8,500/mo profit, 9-month payback.',
    },
    metrics: { monthlyRevenue: '$21,000', monthlyProfit: '$5,600', paybackMonths: '9 months', roi: '133%', startupCost: '$50,000' },
    costBreakdown: [
      { label: 'Stations & salon fitout (6 chairs)', value: '$22,000' },
      { label: 'Products & initial inventory', value: '$ 8,000' },
      { label: 'Licensing & insurance', value: '$4,000' },
      { label: 'Marketing & branding', value: '$6,000' },
      { label: 'Working capital', value: '$10,000' },
    ],
    risks: [
      { text: 'High staff turnover in beauty industry — average tenure 8 months', severity: 'high' },
      { text: 'Bondi Junction rent AUD 5,000+/mo for retail space', severity: 'high' },
      { text: 'Price competition from discount nail bars ($20 vs $55 mani)', severity: 'medium' },
      { text: 'Product liability concerns with gel and acrylic chemicals', severity: 'medium' },
      { text: 'Seasonal dip in winter months (Jun-Aug) of 15-20%', severity: 'low' },
    ],
    actionPlan: [
      'Position as premium ($55+ mani) — margin is in quality, not volume.',
      'Implement online booking with 15-min express options for lunch crowds.',
      'Build Instagram portfolio with nail art content — key discovery channel.',
      'Offer loyalty program: 10th visit free to drive 40%+ repeat rate.',
      'Add retail product line (cuticle oil, hand cream) for ancillary revenue.',
    ],
  },

  // ── PIZZA RESTAURANT ──
  'pizzeria-naples': {
    title: 'Pizzeria in Naples, Italy',
    description: 'A traditional Neapolitan pizzeria in the historic center with wood-fired oven, takeaway focus, and tourist foot traffic.',
    industry: 'Restaurant / Pizza',
    location: 'Naples, Italy',
    seo: {
      title: 'Pizzeria Business Analysis — Naples, Italy | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled finances for a pizzeria in Naples. €12,000/mo revenue, €4,200/mo profit, 8-month payback. Classic model.',
    },
    metrics: { monthlyRevenue: '€12,000', monthlyProfit: '€4,200', paybackMonths: '8 months', roi: '150%', startupCost: '€34,000' },
    costBreakdown: [
      { label: 'Wood-fired oven installation', value: '€12,000' },
      { label: 'Kitchen equipment', value: '€8,000' },
      { label: 'Renovation & seating', value: '€6,000' },
      { label: 'Permits & health certificates', value: '€3,000' },
      { label: 'Working capital', value: '€5,000' },
    ],
    risks: [
      { text: 'Extreme competition — 800+ pizzerias in Naples proper', severity: 'high' },
      { text: 'Tourist seasonality: 40% revenue from Apr-Sep', severity: 'medium' },
      { text: 'Mozzarella di Bufala price spikes during supply shortages', severity: 'medium' },
      { text: 'Italian labor regulations increase employment costs 30-40%', severity: 'medium' },
      { text: 'TripAdvisor ranking dependency for tourist traffic', severity: 'low' },
    ],
    actionPlan: [
      'Price competitively (€5-7 per pizza) — volume model, not margin model.',
      'Get listed on TripAdvisor, Google Maps, and TheFork within week 1.',
      'Offer delivery via Glovo/Deliveroo for 30%+ incremental revenue.',
      'Focus lunch service on €8 pizza + drink combo for office workers.',
      'Apply for "Vera Pizza Napoletana" certification for authenticity marketing.',
    ],
  },

  // ── PET STORE ──
  'pet-store-vancouver': {
    title: 'Premium Pet Store in Vancouver, Canada',
    description: 'A boutique pet supply store in Kitsilano offering natural/organic pet food, accessories, and grooming services.',
    industry: 'Pet Retail',
    location: 'Vancouver, Canada',
    seo: {
      title: 'Pet Store Business Analysis — Vancouver, Canada | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled business case for a premium pet store in Vancouver. CAD 28K/mo revenue, CAD 6,400/mo profit, 11-month payback.',
    },
    metrics: { monthlyRevenue: '$20,500', monthlyProfit: '$4,700', paybackMonths: '11 months', roi: '109%', startupCost: '$52,000' },
    costBreakdown: [
      { label: 'Initial inventory', value: '$20,000' },
      { label: 'Store buildout & fixtures', value: '$15,000' },
      { label: 'Grooming station', value: '$5,000' },
      { label: 'POS & e-commerce', value: '$3,000' },
      { label: 'Marketing', value: '$4,000' },
      { label: 'Working capital', value: '$5,000' },
    ],
    risks: [
      { text: 'Competition from PetSmart/Amazon subscription deliveries', severity: 'high' },
      { text: 'Vancouver commercial rent $4,500+/mo in Kitsilano', severity: 'high' },
      { text: 'Natural pet food margins (25-35%) lower than conventional (40-50%)', severity: 'medium' },
      { text: 'Grooming liability — injury claims average $2K-5K per incident', severity: 'medium' },
      { text: 'Seasonal gift spending concentrated in Nov-Dec', severity: 'low' },
    ],
    actionPlan: [
      'Add grooming services — 50%+ margins and drives store foot traffic.',
      'Launch auto-ship subscription for pet food — 60% of customers will use it.',
      'Partner with local vets for referral cards and co-marketing.',
      'Host monthly adoption events with SPCA — community building + PR.',
      'Build loyalty program with birthday treats and milestone rewards.',
    ],
  },

  // ── CAR WASH ──
  'car-wash-riyadh': {
    title: 'Automated Car Wash in Riyadh, Saudi Arabia',
    description: 'A modern automated tunnel car wash on King Fahd Road with express and premium detailing options.',
    industry: 'Car Wash',
    location: 'Riyadh, Saudi Arabia',
    seo: {
      title: 'Car Wash Business Analysis — Riyadh, Saudi Arabia | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled finances for an automated car wash in Riyadh. SAR 120K/mo revenue, SAR 42K/mo profit, 14-month payback.',
    },
    metrics: { monthlyRevenue: '$32,000', monthlyProfit: '$11,200', paybackMonths: '14 months', roi: '86%', startupCost: '$157,000' },
    costBreakdown: [
      { label: 'Tunnel wash equipment', value: '$80,000' },
      { label: 'Site preparation & construction', value: '$35,000' },
      { label: 'Water recycling system', value: '$15,000' },
      { label: 'Licenses & municipality permits', value: '$7,000' },
      { label: 'Marketing & signage', value: '$5,000' },
      { label: 'Working capital', value: '$15,000' },
    ],
    risks: [
      { text: 'Water cost and scarcity — Saudi Arabia has highest desalination dependence', severity: 'high' },
      { text: 'Sandstorm frequency (30+ days/yr) increases demand but damages equipment', severity: 'medium' },
      { text: 'Municipality zoning restrictions on car wash locations', severity: 'medium' },
      { text: 'Visa/labor regulation for car wash attendants (Saudization quotas)', severity: 'medium' },
      { text: 'Competition from mobile car wash apps gaining market share', severity: 'low' },
    ],
    actionPlan: [
      'Install water recycling system — reduces water costs 60% and gets municipality approval.',
      'Offer unlimited monthly wash subscriptions at SAR 199 for loyalty lock-in.',
      'Add premium interior detailing as upsell — SAR 150+ per service.',
      'Location on a major commuter road is critical — traffic count > 30K/day.',
      'Partner with car dealerships for post-purchase wash packages.',
    ],
  },

  // ── DAYCARE ──
  'daycare-singapore': {
    title: 'Childcare Center in Singapore',
    description: 'A licensed childcare center for 60 children ages 18 months to 6 years in Tanjong Pagar, with bilingual curriculum.',
    industry: 'Childcare / Daycare',
    location: 'Singapore',
    seo: {
      title: 'Childcare Center Business Analysis — Singapore | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled finances for a childcare center in Singapore. SGD 80K/mo revenue, SGD 18K/mo profit, 22-month payback.',
    },
    metrics: { monthlyRevenue: '$59,000', monthlyProfit: '$13,300', paybackMonths: '22 months', roi: '55%', startupCost: '$293,000' },
    costBreakdown: [
      { label: 'Center buildout & safety compliance', value: '$120,000' },
      { label: 'Furniture, toys & learning materials', value: '$30,000' },
      { label: 'ECDA licensing & certifications', value: '$15,000' },
      { label: 'Staff training & hiring', value: '$25,000' },
      { label: 'Insurance & security systems', value: '$8,000' },
      { label: 'Marketing & enrollment', value: '$10,000' },
      { label: 'Working capital (6 months)', value: '$85,000' },
    ],
    risks: [
      { text: 'ECDA licensing takes 6-12 months — cash burn during setup', severity: 'high' },
      { text: 'Teacher-to-child ratios are strictly regulated (1:5 for toddlers)', severity: 'high' },
      { text: 'Staff costs are 55-65% of revenue in Singapore childcare', severity: 'high' },
      { text: 'Government subsidy competition — anchor operators get preferential funding', severity: 'medium' },
      { text: 'Birth rate declining — 1.04 TFR may reduce addressable market', severity: 'low' },
    ],
    actionPlan: [
      'Apply for ECDA license immediately — 6-month lead time minimum.',
      'Target Tanjong Pagar working parents — proximity to CBD is key differentiator.',
      'Register as ECDA partner to qualify families for government subsidies.',
      'Offer Mandarin-English bilingual curriculum — premium positioning.',
      'Build waitlist 4 months before opening with early-bird pricing.',
    ],
  },

  // ── ICE CREAM SHOP ──
  'ice-cream-barcelona': {
    title: 'Gelato Shop in Barcelona, Spain',
    description: 'An artisanal gelato shop on La Rambla area offering 24 rotating flavors made daily with local Catalan ingredients.',
    industry: 'Ice Cream / Gelato',
    location: 'Barcelona, Spain',
    seo: {
      title: 'Gelato Shop Business Analysis — Barcelona, Spain | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled finances for a gelato shop in Barcelona. €9,500/mo revenue, €3,200/mo profit, 9-month payback. Tourist-driven model.',
    },
    metrics: { monthlyRevenue: '€9,500', monthlyProfit: '€3,200', paybackMonths: '9 months', roi: '133%', startupCost: '€29,000' },
    costBreakdown: [
      { label: 'Gelato machines & display case', value: '€12,000' },
      { label: 'Shop renovation', value: '€7,000' },
      { label: 'Initial ingredients', value: '€3,000' },
      { label: 'Licenses & health permits', value: '€2,000' },
      { label: 'Working capital', value: '€5,000' },
    ],
    risks: [
      { text: 'Extreme seasonality: 65% revenue in May-September', severity: 'high' },
      { text: 'La Rambla rents €3,000+/mo even for small spaces', severity: 'high' },
      { text: 'Tourist foot traffic volatility linked to geopolitical events', severity: 'medium' },
      { text: 'Barcelona municipal regulations on food service hours', severity: 'medium' },
      { text: 'Competition from 200+ gelato/ice cream shops in central Barcelona', severity: 'low' },
    ],
    actionPlan: [
      'Add hot chocolate, crêpes, and waffles for winter revenue diversification.',
      'Get listed on TripAdvisor top 10 — drives 40%+ of tourist foot traffic.',
      'Launch a wholesale supply to 5-10 local restaurants and hotels.',
      'Create 3 "Instagram-worthy" signature flavors for social media virality.',
      'Negotiate lease with seasonal rent adjustment if possible.',
    ],
  },

  // ── TUTORING CENTER ──
  'tutoring-seoul': {
    title: 'Private Tutoring Academy (Hagwon) in Seoul, South Korea',
    description: 'A small hagwon in Gangnam specializing in SAT/university entrance prep for Korean high school students.',
    industry: 'Education / Tutoring',
    location: 'Seoul, South Korea',
    seo: {
      title: 'Tutoring Academy (Hagwon) Analysis — Seoul | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled business case for a hagwon in Seoul Gangnam. KRW 25M/mo revenue, KRW 8M/mo profit, 10-month payback.',
    },
    metrics: { monthlyRevenue: '$18,500', monthlyProfit: '$5,900', paybackMonths: '10 months', roi: '120%', startupCost: '$59,000' },
    costBreakdown: [
      { label: 'Classroom buildout (4 rooms)', value: '$20,000' },
      { label: 'Furniture & teaching materials', value: '$8,000' },
      { label: 'Hagwon registration & permits', value: '$5,000' },
      { label: 'Online learning platform', value: '$6,000' },
      { label: 'Marketing (KakaoTalk, Naver)', value: '$8,000' },
      { label: 'Working capital', value: '$12,000' },
    ],
    risks: [
      { text: 'Government regulations on hagwon operating hours (10 PM curfew)', severity: 'high' },
      { text: 'Gangnam parent expectations extremely high — any poor CSAT result = reputation damage', severity: 'high' },
      { text: 'Instructor talent wars — top tutors earn $100K+ and get poached', severity: 'medium' },
      { text: 'Declining birth rate reducing student pool long-term', severity: 'medium' },
      { text: 'Online tutoring platforms (Megastudy, etc.) compete on convenience', severity: 'low' },
    ],
    actionPlan: [
      'Hire 2 star instructors with proven CSAT score improvement track records.',
      'Guarantee score improvement or free re-enrollment — bold but converts.',
      'Limit class sizes to 8 students for premium positioning.',
      'Market through KakaoTalk parent groups — #1 channel for Gangnam parents.',
      'Track and publish student score improvement statistics monthly.',
    ],
  },

  // ── CRAFT BREWERY ──
  'brewery-melbourne': {
    title: 'Craft Brewery & Taproom in Melbourne, Australia',
    description: 'A 10-barrel craft brewery with taproom in Collingwood, brewing IPAs, lagers, and seasonal small-batch beers.',
    industry: 'Brewery / Craft Beer',
    location: 'Melbourne, Australia',
    seo: {
      title: 'Craft Brewery Business Analysis — Melbourne, Australia | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled finances for a craft brewery in Melbourne. AUD 55K/mo revenue, AUD 12K/mo profit, 19-month payback.',
    },
    metrics: { monthlyRevenue: '$36,000', monthlyProfit: '$7,800', paybackMonths: '19 months', roi: '63%', startupCost: '$148,000' },
    costBreakdown: [
      { label: 'Brewing equipment (10-barrel system)', value: '$ 65,000' },
      { label: 'Taproom buildout', value: '$30,000' },
      { label: 'Liquor licensing', value: '$8,000' },
      { label: 'Initial ingredients & packaging', value: '$10,000' },
      { label: 'Marketing & brand design', value: '$10,000' },
      { label: 'Working capital', value: '$25,000' },
    ],
    risks: [
      { text: 'Australian excise tax on beer is among highest globally — AUD 55+/L of alcohol', severity: 'high' },
      { text: 'Melbourne craft brewery saturation — 80+ in metro area', severity: 'high' },
      { text: 'Grain and hop prices subject to drought-related spikes', severity: 'medium' },
      { text: 'Licensing compliance complex — RSA requirements and inspections', severity: 'medium' },
      { text: 'Taproom revenue dependent on weekend foot traffic', severity: 'low' },
    ],
    actionPlan: [
      'Apply for excise refund scheme — small brewers get partial excise relief.',
      'Taproom should generate 60%+ of revenue — highest margin channel.',
      'Distribute to 10 local bars/restaurants within first 3 months.',
      'Host weekly events (trivia, live music) to drive midweek taproom traffic.',
      'Launch a "brewery member" program with exclusive releases and discounts.',
    ],
  },

  // ── FLOWER SHOP ──
  'flower-shop-amsterdam': {
    title: 'Flower Shop in Amsterdam, Netherlands',
    description: 'A modern florist in De Pijp offering bouquets, event floristry, and flower subscriptions with same-day delivery.',
    industry: 'Florist / Retail',
    location: 'Amsterdam, Netherlands',
    seo: {
      title: 'Flower Shop Business Analysis — Amsterdam | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled finances for a flower shop in Amsterdam. €11,000/mo revenue, €3,400/mo profit, 8-month payback.',
    },
    metrics: { monthlyRevenue: '€11,000', monthlyProfit: '€3,400', paybackMonths: '8 months', roi: '150%', startupCost: '€27,000' },
    costBreakdown: [
      { label: 'Refrigeration & display units', value: '€8,000' },
      { label: 'Shop renovation', value: '€6,000' },
      { label: 'Initial flower stock', value: '€4,000' },
      { label: 'Delivery cargo bike', value: '€3,000' },
      { label: 'Website & branding', value: '€3,000' },
      { label: 'Working capital', value: '€3,000' },
    ],
    risks: [
      { text: 'Flower spoilage rate 15-25% — perishability is the #1 margin killer', severity: 'high' },
      { text: 'Dutch flower auction (Aalsmeer) price volatility on peak days', severity: 'medium' },
      { text: "Valentine's/Mother's Day represent 25% of annual revenue — miss = devastating", severity: 'medium' },
      { text: 'Online flower delivery competitors (Bloomon, Greetz) with VC funding', severity: 'medium' },
      { text: 'Seasonal demand drops 30% in January and July', severity: 'low' },
    ],
    actionPlan: [
      'Launch flower subscription service (€35/bi-weekly) — predictable recurring revenue.',
      'Partner with 5 restaurants and hotels for weekly arrangements.',
      'Use cargo bike delivery to keep costs near zero within Amsterdam ring.',
      'Build wedding and event floristry pipeline — highest margin service (60%+).',
      'Minimize waste by using end-of-day flowers for discounted "surprise bouquets".',
    ],
  },

  // ── TECH STARTUP ──
  'saas-fintech-lagos': {
    title: 'Fintech SaaS Startup in Lagos, Nigeria',
    description: 'A B2B payment reconciliation platform for Nigerian SMEs handling mobile money, bank transfers, and POS transactions.',
    industry: 'Fintech / SaaS',
    location: 'Lagos, Nigeria',
    seo: {
      title: 'Fintech SaaS Business Analysis — Lagos, Nigeria | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled business case for a fintech startup in Lagos. $15K/mo MRR target, $4,200/mo profit, 16-month payback.',
    },
    metrics: { monthlyRevenue: '$15,000', monthlyProfit: '$4,200', paybackMonths: '16 months', roi: '75%', startupCost: '$67,000' },
    costBreakdown: [
      { label: 'Development (MVP)', value: '$25,000' },
      { label: 'CBN licensing & compliance', value: '$10,000' },
      { label: 'Cloud infrastructure', value: '$5,000' },
      { label: 'Team (3 developers, 3 months)', value: '$18,000' },
      { label: 'Marketing & sales', value: '$5,000' },
      { label: 'Working capital', value: '$4,000' },
    ],
    risks: [
      { text: 'CBN regulatory landscape changing rapidly — compliance costs unpredictable', severity: 'high' },
      { text: 'Naira volatility impacts pricing in USD-denominated infrastructure costs', severity: 'high' },
      { text: 'Developer talent retention — Lagos tech salaries rising 25%/yr', severity: 'medium' },
      { text: 'Internet reliability in customer locations affects product perception', severity: 'medium' },
      { text: 'Incumbent banks launching competing products', severity: 'low' },
    ],
    actionPlan: [
      'Focus on market traders and SMEs doing 50+ transactions/day — highest pain point.',
      'Build offline-first capability — essential for Nigerian infrastructure reality.',
      'Price in Naira with monthly plans (₦15K-50K) to match SME cash flow patterns.',
      'Partner with POS providers (Opay, Moniepoint) for data integration.',
      'Hire a dedicated compliance officer before scaling past 100 customers.',
    ],
  },

  // ── JUICE BAR ──
  'juice-bar-miami': {
    title: 'Juice & Smoothie Bar in Miami, FL',
    description: 'A health-focused juice bar in Brickell targeting fitness enthusiasts and office workers with cold-pressed juices and açaí bowls.',
    industry: 'Juice Bar / Health Food',
    location: 'Miami, FL',
    seo: {
      title: 'Juice Bar Business Analysis — Miami, FL | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled finances for a juice bar in Miami Brickell. $22K/mo revenue, $5,800/mo profit, 8-month payback.',
    },
    metrics: { monthlyRevenue: '$22,000', monthlyProfit: '$5,800', paybackMonths: '8 months', roi: '150%', startupCost: '$46,000' },
    costBreakdown: [
      { label: 'Cold-press equipment & blenders', value: '$15,000' },
      { label: 'Store buildout', value: '$ 12,000' },
      { label: 'Initial produce inventory', value: '$4,000' },
      { label: 'Permits & health inspection', value: '$3,000' },
      { label: 'Marketing launch', value: '$5,000' },
      { label: 'Working capital', value: '$7,000' },
    ],
    risks: [
      { text: 'Produce cost volatility — citrus and açaí prices swing 30-40% seasonally', severity: 'high' },
      { text: 'Brickell rent $5,500+/mo for small retail', severity: 'high' },
      { text: 'Competition from Pressed Juicery, Clean Juice franchise chains', severity: 'medium' },
      { text: 'Product spoilage — cold-pressed juice shelf life only 3-5 days', severity: 'medium' },
      { text: 'Summer heat drives demand but also increases AC costs significantly', severity: 'low' },
    ],
    actionPlan: [
      'Offer a $99/mo unlimited juice membership — locks in recurring revenue.',
      'Partner with 5 Brickell gyms for cross-promotion and post-workout delivery.',
      'Launch 3-day and 5-day juice cleanse programs for high-AOV sales.',
      'Use Instagram and TikTok — Miami fitness culture drives discovery.',
      'Add protein bowls and grab-and-go meals to increase average ticket to $15+.',
    ],
  },

  // ── TATTOO STUDIO ──
  'tattoo-studio-brooklyn': {
    title: 'Tattoo Studio in Brooklyn, New York',
    description: 'A custom tattoo studio in Williamsburg with 4 artists specializing in fine-line, traditional, and blackwork styles.',
    industry: 'Tattoo / Body Art',
    location: 'Brooklyn, NY',
    seo: {
      title: 'Tattoo Studio Business Analysis — Brooklyn, NY | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled business case for a tattoo studio in Brooklyn. $38K/mo revenue, $12K/mo profit, 6-month payback. High-margin model.',
    },
    metrics: { monthlyRevenue: '$38,000', monthlyProfit: '$12,000', paybackMonths: '6 months', roi: '200%', startupCost: '$72,000' },
    costBreakdown: [
      { label: 'Studio buildout (4 stations)', value: '$25,000' },
      { label: 'Equipment & autoclave', value: '$12,000' },
      { label: 'Health department permits', value: '$5,000' },
      { label: 'Art portfolio & website', value: '$8,000' },
      { label: 'Insurance & legal', value: '$7,000' },
      { label: 'Working capital', value: '$15,000' },
    ],
    risks: [
      { text: 'NYC health department inspections stringent — violations = closure', severity: 'high' },
      { text: 'Artist retention: top artists build followings then go independent', severity: 'high' },
      { text: 'Williamsburg rent $6,000+/mo and rising', severity: 'medium' },
      { text: 'Liability insurance costs $3K-5K/yr per artist', severity: 'medium' },
      { text: 'Trend-dependent demand — style preferences shift every 2-3 years', severity: 'low' },
    ],
    actionPlan: [
      'Recruit artists with 10K+ Instagram followings — they bring their own clients.',
      'Use booth rental model (60/40 split) to reduce fixed costs.',
      'Build a 6-week booking waitlist before opening — validates demand.',
      'Invest in professional photography for each piece — Instagram is the #1 channel.',
      'Add piercing services as walk-in revenue stream for off-peak hours.',
    ],
  },

  // ── MOVING COMPANY ──
  'moving-company-phoenix': {
    title: 'Moving Company in Phoenix, Arizona',
    description: 'A local residential moving company serving the Phoenix metro area with 2 trucks and a 6-person crew.',
    industry: 'Moving Services',
    location: 'Phoenix, AZ',
    seo: {
      title: 'Moving Company Business Analysis — Phoenix, AZ | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled finances for a moving company in Phoenix. $48K/mo revenue, $14K/mo profit, 5-month payback.',
    },
    metrics: { monthlyRevenue: '$48,000', monthlyProfit: '$14,000', paybackMonths: '5 months', roi: '240%', startupCost: '$70,000' },
    costBreakdown: [
      { label: '2 box trucks (used)', value: '$30,000' },
      { label: 'Moving equipment & supplies', value: '$8,000' },
      { label: 'Insurance & licensing', value: '$10,000' },
      { label: 'Marketing (Google Ads + Yelp)', value: '$8,000' },
      { label: 'Working capital', value: '$14,000' },
    ],
    risks: [
      { text: 'Summer heat (115°F+) creates worker safety issues and limits hours', severity: 'high' },
      { text: 'Damage claims average $800-2,000 per incident — 2-3 per month', severity: 'high' },
      { text: 'Labor availability — physical job with high turnover', severity: 'medium' },
      { text: 'Google Ads CPCs rising 15-20%/yr for "movers near me"', severity: 'medium' },
      { text: 'Seasonality: May-August accounts for 55% of annual revenue', severity: 'low' },
    ],
    actionPlan: [
      'Focus on May-August surge — hire 4 seasonal workers for peak months.',
      'Get 50 Google Reviews in first 3 months — #1 ranking factor for local movers.',
      'Offer "flat rate" pricing — customers hate hourly uncertainty.',
      'Partner with 10 apartment complexes for exclusive mover recommendation.',
      'Add packing services as upsell — increases average job value 40%.',
    ],
  },

  // ── EVENT PLANNING ──
  'event-planning-mumbai': {
    title: 'Wedding & Event Planning Agency in Mumbai, India',
    description: 'A boutique wedding planning agency in South Mumbai handling 30-40 weddings per year in the ₹15-50 lakh budget range.',
    industry: 'Event Planning / Weddings',
    location: 'Mumbai, India',
    seo: {
      title: 'Wedding Planning Business Analysis — Mumbai | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled business case for a wedding planning agency in Mumbai. ₹8L/mo revenue, ₹3.2L/mo profit, 6-month payback.',
    },
    metrics: { monthlyRevenue: '$9,600', monthlyProfit: '$3,800', paybackMonths: '6 months', roi: '200%', startupCost: '$23,000' },
    costBreakdown: [
      { label: 'Office setup & furniture', value: '$5,000' },
      { label: 'Portfolio & website', value: '$4,000' },
      { label: 'Initial vendor deposits', value: '$5,000' },
      { label: 'Marketing (WedMeGood, social)', value: '$4,000' },
      { label: 'Working capital', value: '$5,000' },
    ],
    risks: [
      { text: 'Indian wedding seasonality: 70% of revenue in Oct-Feb wedding season', severity: 'high' },
      { text: 'Client payment delays — couples defer final payments post-event', severity: 'high' },
      { text: 'Vendor reliability — last-minute cancellations common', severity: 'medium' },
      { text: 'Reputation risk: one bad wedding = negative viral reviews', severity: 'medium' },
      { text: 'Competition from family/friend "coordinators" at lower price points', severity: 'low' },
    ],
    actionPlan: [
      'Collect 50% upfront, 30% two weeks before event, 20% on wedding day.',
      'Build a portfolio of 10 high-quality wedding photo/video case studies.',
      'Register on WedMeGood and Shaadi.com — primary discovery channels.',
      'Specialize in destination weddings in Goa/Udaipur for higher margins.',
      'Create "wedding packages" at 3 tiers to simplify the sales conversation.',
    ],
  },

  // ── CLEANING SERVICE ──
  'cleaning-service-dubai': {
    title: 'Commercial Cleaning Service in Dubai, UAE',
    description: 'A B2B cleaning company serving offices, retail, and residential buildings in Dubai Marina and JLT with 15 staff.',
    industry: 'Cleaning Services',
    location: 'Dubai, UAE',
    seo: {
      title: 'Cleaning Service Business Analysis — Dubai | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled business case for a cleaning company in Dubai. AED 120K/mo revenue, AED 35K/mo profit, 8-month payback.',
    },
    metrics: { monthlyRevenue: '$32,700', monthlyProfit: '$9,500', paybackMonths: '8 months', roi: '150%', startupCost: '$76,000' },
    costBreakdown: [
      { label: 'Equipment & supplies', value: '$15,000' },
      { label: 'Vehicle (2 vans)', value: '$25,000' },
      { label: 'Trade license & visas', value: '$12,000' },
      { label: 'Uniforms & branding', value: '$4,000' },
      { label: 'Marketing', value: '$5,000' },
      { label: 'Working capital', value: '$15,000' },
    ],
    risks: [
      { text: 'Visa sponsorship costs AED 7-10K per employee — upfront cash requirement', severity: 'high' },
      { text: 'Building management company gatekeeping — approval needed for each property', severity: 'medium' },
      { text: 'Payment terms: corporate clients pay 45-60 days after invoice', severity: 'medium' },
      { text: 'Labor law changes and Emiratization requirements', severity: 'medium' },
      { text: 'Summer cleaning demand drops 15% as expats travel', severity: 'low' },
    ],
    actionPlan: [
      'Sign 5 long-term building management contracts — guaranteed monthly revenue.',
      'Offer deep-cleaning add-ons (carpet, windows) at 3x daily rate margins.',
      'Get listed on ServiceMarket and Justlife for residential client acquisition.',
      'Invest in eco-friendly cleaning products — differentiator in Dubai market.',
      'Implement a supervisor QC system with photo verification for each job.',
    ],
  },

  // ── PHOTOGRAPHY STUDIO ──
  'photography-studio-prague': {
    title: 'Photography Studio in Prague, Czech Republic',
    description: 'A portrait and commercial photography studio in Prague 1 offering headshots, product photography, and event coverage.',
    industry: 'Photography',
    location: 'Prague, Czech Republic',
    seo: {
      title: 'Photography Studio Business Analysis — Prague | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled finances for a photography studio in Prague. CZK 180K/mo revenue, CZK 65K/mo profit, 7-month payback.',
    },
    metrics: { monthlyRevenue: '$7,800', monthlyProfit: '$2,800', paybackMonths: '7 months', roi: '171%', startupCost: '$20,000' },
    costBreakdown: [
      { label: 'Camera equipment & lighting', value: '$ 8,000' },
      { label: 'Studio rental deposit & setup', value: '$4,000' },
      { label: 'Editing software & computer', value: '$3,000' },
      { label: 'Website & portfolio', value: '$2,000' },
      { label: 'Working capital', value: '$3,000' },
    ],
    risks: [
      { text: 'Smartphone cameras reducing demand for basic portrait photography', severity: 'high' },
      { text: 'Client concentration — losing one corporate client = 25%+ revenue drop', severity: 'medium' },
      { text: 'Equipment depreciation and upgrade cycles every 3-4 years', severity: 'medium' },
      { text: 'Seasonal demand: weddings in May-September, corporate in Q4', severity: 'medium' },
      { text: 'AI-generated imagery emerging as competition for product photography', severity: 'low' },
    ],
    actionPlan: [
      'Focus on corporate headshots and product photography — highest recurring value.',
      'Partner with 5 Prague co-working spaces for bulk headshot packages.',
      'Offer "LinkedIn upgrade" package for professionals at $150 — high-volume opportunity.',
      'Build a wedding photography portfolio for the Czech/expat wedding market.',
      'Create a drone photography add-on for real estate clients.',
    ],
  },

  // ── LANGUAGE SCHOOL ──
  'language-school-mexico-city': {
    title: 'Spanish Language School in Mexico City',
    description: 'An immersive Spanish school in Condesa for international students and remote workers, offering group and private classes.',
    industry: 'Education / Language School',
    location: 'Mexico City, Mexico',
    seo: {
      title: 'Language School Business Analysis — Mexico City | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled business case for a Spanish school in Mexico City. $12K/mo revenue, $4,800/mo profit, 5-month payback.',
    },
    metrics: { monthlyRevenue: '$12,000', monthlyProfit: '$4,800', paybackMonths: '5 months', roi: '240%', startupCost: '$24,000' },
    costBreakdown: [
      { label: 'Classroom space setup', value: '$8,000' },
      { label: 'Teaching materials & tech', value: '$4,000' },
      { label: 'Website & booking system', value: '$3,000' },
      { label: 'Marketing (Google, Instagram)', value: '$4,000' },
      { label: 'Working capital', value: '$5,000' },
    ],
    risks: [
      { text: 'Digital nomad market volatile — trend could shift away from Mexico City', severity: 'high' },
      { text: 'Online Spanish learning platforms (Duolingo, Preply) commoditize basic instruction', severity: 'medium' },
      { text: 'Student visa regulations changing — may affect enrollment from some countries', severity: 'medium' },
      { text: 'Seasonal enrollment dips in Dec-Jan and Apr-May', severity: 'medium' },
      { text: 'Earthquake risk in Mexico City — business continuity concern', severity: 'low' },
    ],
    actionPlan: [
      'Target remote workers: offer "work & study" packages with co-working space.',
      'Create 2-week and 4-week immersion programs for higher-value bookings.',
      'Partner with Airbnb hosts and hostels for student referrals.',
      'Build a community through weekly language exchange events — free marketing.',
      'Offer DELE exam preparation as premium course for serious students.',
    ],
  },

  // ── ACCOUNTING FIRM ──
  'accounting-firm-zurich': {
    title: 'Accounting & Tax Advisory Firm in Zurich, Switzerland',
    description: 'A boutique accounting firm in Zurich serving expats and SMEs with Swiss tax compliance, bookkeeping, and advisory services.',
    industry: 'Accounting / Professional Services',
    location: 'Zurich, Switzerland',
    seo: {
      title: 'Accounting Firm Business Analysis — Zurich | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled business case for an accounting firm in Zurich. CHF 35K/mo revenue, CHF 14K/mo profit, 8-month payback.',
    },
    metrics: { monthlyRevenue: '$38,500', monthlyProfit: '$15,400', paybackMonths: '8 months', roi: '150%', startupCost: '$123,000' },
    costBreakdown: [
      { label: 'Office setup & furniture', value: '$15,000' },
      { label: 'Accounting software licenses', value: '$8,000' },
      { label: 'Professional certifications & insurance', value: '$12,000' },
      { label: 'Legal & company formation', value: '$8,000' },
      { label: 'Marketing & networking', value: '$5,000' },
      { label: 'Working capital (6 months)', value: '$75,000' },
    ],
    risks: [
      { text: 'Swiss Treuhand certification required — 5+ years experience minimum', severity: 'high' },
      { text: 'Zurich office costs CHF 3,000+/mo even for small spaces', severity: 'high' },
      { text: 'Client acquisition slow — trust-based industry, 6-12 month sales cycle', severity: 'medium' },
      { text: 'Regulatory changes (international tax treaties) require constant upskilling', severity: 'medium' },
      { text: 'Automation/AI tools reducing demand for basic bookkeeping', severity: 'low' },
    ],
    actionPlan: [
      'Target expat professionals first — underserved, high-value, referral-driven.',
      'Offer fixed-fee tax return packages at CHF 500-1,500 for predictable revenue.',
      'Join 3 expat networking groups and chambers of commerce for referrals.',
      'Build bilingual (German/English) service capability — rare in Zurich market.',
      'Create free "Swiss Tax Guide for Expats" as a lead magnet.',
    ],
  },

  // ── FOOD DELIVERY (CLOUD KITCHEN) ──
  'cloud-kitchen-bangkok': {
    title: 'Cloud Kitchen in Bangkok, Thailand',
    description: 'A delivery-only ghost kitchen in Sukhumvit operating 3 virtual brands (Thai, Japanese, healthy bowls) on GrabFood and LINE MAN.',
    industry: 'Cloud Kitchen / Food Delivery',
    location: 'Bangkok, Thailand',
    seo: {
      title: 'Cloud Kitchen Business Analysis — Bangkok | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled finances for a cloud kitchen in Bangkok. ฿450K/mo revenue, ฿120K/mo profit, 10-month payback.',
    },
    metrics: { monthlyRevenue: '$12,800', monthlyProfit: '$3,400', paybackMonths: '10 months', roi: '120%', startupCost: '$34,000' },
    costBreakdown: [
      { label: 'Kitchen equipment', value: '$12,000' },
      { label: 'Kitchen rental deposit (6 months)', value: '$8,000' },
      { label: 'Initial inventory', value: '$3,000' },
      { label: 'Brand design & packaging (3 brands)', value: '$4,000' },
      { label: 'Marketing & platform fees', value: '$3,000' },
      { label: 'Working capital', value: '$4,000' },
    ],
    risks: [
      { text: 'Platform commission fees 25-35% — largest cost after food', severity: 'high' },
      { text: 'Review sensitivity: below 4.5 stars = algorithm demotion', severity: 'high' },
      { text: 'Kitchen sharing risks: fire, hygiene violations affect all brands', severity: 'medium' },
      { text: 'Food delivery market oversaturated in Sukhumvit', severity: 'medium' },
      { text: 'Thai food regulation changes for ghost kitchens', severity: 'low' },
    ],
    actionPlan: [
      'Optimize menu for delivery: items that travel well and maintain quality.',
      'Run aggressive new-user promotions on GrabFood for first 30 days per brand.',
      'Keep food cost below 30% — critical with 30% platform fees eating margin.',
      'Test demand by launching 1 brand first, then add 2nd and 3rd at 30-day intervals.',
      'Build LINE OC for direct orders to bypass platform fees (target 20% direct).',
    ],
  },

  // ── REAL ESTATE (SHORT-TERM RENTAL) ──
  'airbnb-management-lisbon': {
    title: 'Airbnb Property Management in Lisbon, Portugal',
    description: 'A short-term rental management company handling 15 apartments in Alfama and Bairro Alto for property owners.',
    industry: 'Property Management / Short-Term Rental',
    location: 'Lisbon, Portugal',
    seo: {
      title: 'Airbnb Management Business Analysis — Lisbon | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled business case for Airbnb management in Lisbon. €18K/mo revenue, €7,200/mo profit, 6-month payback.',
    },
    metrics: { monthlyRevenue: '€18,000', monthlyProfit: '€7,200', paybackMonths: '6 months', roi: '200%', startupCost: '€43,000' },
    costBreakdown: [
      { label: 'Property setup & styling (15 units)', value: '$18,000' },
      { label: 'Cleaning equipment & supplies', value: '$5,000' },
      { label: 'PMS software & smart locks', value: '$4,000' },
      { label: 'Photography & listings', value: '$3,000' },
      { label: 'Legal & AL licensing', value: '$5,000' },
      { label: 'Marketing', value: '$3,000' },
      { label: 'Working capital', value: '$5,000' },
    ],
    risks: [
      { text: 'Lisbon AL (Alojamento Local) licensing moratorium in some parishes', severity: 'high' },
      { text: 'Portuguese tax authorities increasing scrutiny on short-term rental income', severity: 'high' },
      { text: 'Seasonality: July-September is 50%+ of annual revenue', severity: 'medium' },
      { text: 'Property owner churn — switching to competitors or self-managing', severity: 'medium' },
      { text: 'Negative press on overtourism may lead to further restrictions', severity: 'low' },
    ],
    actionPlan: [
      'Only onboard properties with valid AL licenses — zero regulatory risk tolerance.',
      'Guarantee property owners 15% above self-management yield or free exit.',
      'Implement dynamic pricing (PriceLabs) for 20-30% revenue optimization.',
      'Build direct booking website to reduce Airbnb/Booking.com commission dependency.',
      'Offer "mid-term stays" (1-3 months) for digital nomads to smooth seasonality.',
    ],
  },

  // ── MUSIC SCHOOL ──
  'music-school-nashville': {
    title: 'Music School in Nashville, Tennessee',
    description: 'A modern music school in East Nashville offering guitar, piano, vocal, and songwriting lessons for all ages.',
    industry: 'Music Education',
    location: 'Nashville, TN',
    seo: {
      title: 'Music School Business Analysis — Nashville, TN | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled finances for a music school in Nashville. $16K/mo revenue, $5,200/mo profit, 8-month payback.',
    },
    metrics: { monthlyRevenue: '$16,000', monthlyProfit: '$5,200', paybackMonths: '8 months', roi: '150%', startupCost: '$42,000' },
    costBreakdown: [
      { label: 'Instruments & equipment', value: '$12,000' },
      { label: 'Studio buildout (4 rooms)', value: '$10,000' },
      { label: 'Soundproofing', value: '$8,000' },
      { label: 'Website & booking system', value: '$3,000' },
      { label: 'Marketing', value: '$4,000' },
      { label: 'Working capital', value: '$5,000' },
    ],
    risks: [
      { text: 'High instructor availability in Nashville suppresses teaching rates', severity: 'medium' },
      { text: 'Student retention: average music student stays 8-12 months', severity: 'medium' },
      { text: 'Competition from YouTube tutorials and online platforms', severity: 'medium' },
      { text: 'Summer enrollment drops 30% when kids are out of school', severity: 'medium' },
      { text: 'Noise complaints from neighboring businesses', severity: 'low' },
    ],
    actionPlan: [
      'Hire Nashville session musicians as instructors — unique selling proposition.',
      'Offer songwriting classes leveraging Nashville music industry connections.',
      'Launch summer camps for kids — fills the seasonal revenue gap.',
      'Host monthly student showcases at local venues — community building.',
      'Create a "Nashville Music Experience" package for tourists — 2-hour sessions.',
    ],
  },

  // ── COWORKING SPACE ──
  'coworking-cape-town': {
    title: 'Co-Working Space in Cape Town, South Africa',
    description: 'A 40-desk co-working space in Woodstock targeting remote workers, startups, and digital nomads.',
    industry: 'Co-Working Space',
    location: 'Cape Town, South Africa',
    seo: {
      title: 'Co-Working Space Business Analysis — Cape Town | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled business case for a co-working space in Cape Town. ZAR 180K/mo revenue, ZAR 55K/mo profit, 14-month payback.',
    },
    metrics: { monthlyRevenue: '$9,800', monthlyProfit: '$3,000', paybackMonths: '14 months', roi: '86%', startupCost: '$42,000' },
    costBreakdown: [
      { label: 'Furniture & desks', value: '$12,000' },
      { label: 'Renovation & design', value: '$10,000' },
      { label: 'IT infrastructure & WiFi', value: '$5,000' },
      { label: 'Deposit & legal', value: '$5,000' },
      { label: 'Marketing', value: '$3,000' },
      { label: 'Working capital', value: '$7,000' },
    ],
    risks: [
      { text: 'Load shedding (power outages) disrupts operations — UPS/generator essential', severity: 'high' },
      { text: 'Occupancy below 70% = cash flow negative at typical Cape Town rents', severity: 'high' },
      { text: 'Digital nomad market seasonal — peaks Jan-Apr, dips Jun-Aug', severity: 'medium' },
      { text: 'WeWork/Regus expansion in Cape Town increasing competition', severity: 'medium' },
      { text: 'Safety perception issues in some Woodstock blocks', severity: 'low' },
    ],
    actionPlan: [
      'Install UPS + solar panels — "load shedding proof" is a competitive moat.',
      'Target 15-20 anchor members on monthly plans before opening.',
      'Price at ZAR 2,500/mo for hot desks — competitive with home office costs.',
      'Host weekly community events to build sticky member relationships.',
      'Offer virtual office packages (mail, phone, address) as low-cost recurring revenue.',
    ],
  },

  // ── VET CLINIC ──
  'vet-clinic-madrid': {
    title: 'Veterinary Clinic in Madrid, Spain',
    description: 'A small-animal veterinary clinic in Chamberí offering consultations, vaccinations, surgery, and pet wellness plans.',
    industry: 'Veterinary / Pet Healthcare',
    location: 'Madrid, Spain',
    seo: {
      title: 'Veterinary Clinic Business Analysis — Madrid | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled finances for a vet clinic in Madrid. €28K/mo revenue, €7,500/mo profit, 16-month payback.',
    },
    metrics: { monthlyRevenue: '€28,000', monthlyProfit: '€7,500', paybackMonths: '16 months', roi: '75%', startupCost: '€120,000' },
    costBreakdown: [
      { label: 'Medical equipment & surgery suite', value: '€50,000' },
      { label: 'Clinic buildout', value: '€25,000' },
      { label: 'Licensing & insurance', value: '€8,000' },
      { label: 'Initial pharmacy stock', value: '€12,000' },
      { label: 'Marketing', value: '€5,000' },
      { label: 'Working capital', value: '€20,000' },
    ],
    risks: [
      { text: 'Veterinary equipment depreciation and maintenance costs high', severity: 'high' },
      { text: 'Staff costs: qualified vets in Madrid earn €35-45K/yr', severity: 'medium' },
      { text: 'Competition from Tiendanimal, Kivet franchise chains', severity: 'medium' },
      { text: 'Client price sensitivity for non-emergency services', severity: 'medium' },
      { text: 'Regulatory changes in pet medication dispensing', severity: 'low' },
    ],
    actionPlan: [
      'Launch "Pet Wellness Plans" — €25-45/mo covers annual care, vaccines, checkups.',
      'Build Google Maps reviews to 100+ — primary discovery for pet owners.',
      'Partner with local pet shops and dog walkers for referrals.',
      'Offer emergency hours (evenings/weekends) — command 50% premium pricing.',
      'Add pet grooming as ancillary service with separate pricing.',
    ],
  },

  // ── WINE BAR ──
  'wine-bar-buenos-aires': {
    title: 'Wine Bar in Buenos Aires, Argentina',
    description: 'A natural wine bar in Palermo Soho featuring Argentine and South American wines with small plates (picadas).',
    industry: 'Wine Bar / Hospitality',
    location: 'Buenos Aires, Argentina',
    seo: {
      title: 'Wine Bar Business Analysis — Buenos Aires | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled finances for a wine bar in Buenos Aires. ARS 3.5M/mo revenue, ARS 1.2M/mo profit, 7-month payback.',
    },
    metrics: { monthlyRevenue: '$3,500', monthlyProfit: '$1,200', paybackMonths: '7 months', roi: '171%', startupCost: '$8,400' },
    costBreakdown: [
      { label: 'Bar buildout & design', value: '$3,000' },
      { label: 'Initial wine inventory', value: '$2,000' },
      { label: 'Glassware & equipment', value: '$1,000' },
      { label: 'Permits & insurance', value: '$800' },
      { label: 'Marketing', value: '$600' },
      { label: 'Working capital', value: '$1,000' },
    ],
    risks: [
      { text: 'Argentine peso instability — costs in pesos but benchmark in USD shifts', severity: 'high' },
      { text: 'Import restrictions on non-Argentine wines', severity: 'medium' },
      { text: 'Palermo Soho nightlife competition intense — 200+ bars within 20 blocks', severity: 'medium' },
      { text: 'Inflation running 100%+ requires constant menu price adjustments', severity: 'medium' },
      { text: 'Regulatory inconsistency in alcohol licensing', severity: 'low' },
    ],
    actionPlan: [
      'Focus on Argentine natural/organic wines — lower cost, trending, storytelling angle.',
      'Host weekly wine tasting events at $15-20/person — community + revenue.',
      'Build Instagram around wine education content — Palermo audience is digitally native.',
      'Create a "wine club" with monthly selections for recurring revenue.',
      'Keep a lean menu (5 picadas) to minimize food waste and kitchen costs.',
    ],
  },

  // ── SAAS (HR TECH) ──
  'saas-hr-tech-bangalore': {
    title: 'HR Tech SaaS Platform in Bangalore, India',
    description: 'A cloud-based HRMS platform for Indian SMEs (50-500 employees) with payroll, attendance, leave management, and compliance.',
    industry: 'HR Tech / SaaS',
    location: 'Bangalore, India',
    seo: {
      title: 'HR Tech SaaS Business Analysis — Bangalore | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled business case for an HR tech platform in Bangalore. ₹12L/mo MRR, ₹5L/mo profit, 14-month payback.',
    },
    metrics: { monthlyRevenue: '$14,400', monthlyProfit: '$6,000', paybackMonths: '14 months', roi: '86%', startupCost: '$84,000' },
    costBreakdown: [
      { label: 'Development (MVP, 6 months)', value: '$40,000' },
      { label: 'Cloud infrastructure', value: '$8,000' },
      { label: 'Legal & compliance', value: '$5,000' },
      { label: 'Sales team (3 months)', value: '$15,000' },
      { label: 'Marketing', value: '$8,000' },
      { label: 'Working capital', value: '$8,000' },
    ],
    risks: [
      { text: 'Greythr, Keka, Zoho People dominate — established competitors with deep features', severity: 'high' },
      { text: 'Indian SME price sensitivity — ₹30-50 per employee per month is the ceiling', severity: 'high' },
      { text: 'Statutory compliance changes frequently — PF, ESI, tax law updates', severity: 'medium' },
      { text: 'Sales cycle for SMEs: 3-6 months from demo to close', severity: 'medium' },
      { text: 'Developer talent retention in Bangalore tech market', severity: 'low' },
    ],
    actionPlan: [
      'Focus on payroll compliance as entry wedge — highest pain point for Indian SMEs.',
      'Offer free tier for companies under 25 employees — build base, upsell at growth.',
      'Build WhatsApp notifications for leave approvals — matches Indian workflow.',
      'Partner with CA firms for referral pipeline — they influence HR tool selection.',
      'Ensure GST, PF, ESI auto-compliance from day 1 — table stakes in India.',
    ],
  },

  // ── PRINTING / CUSTOM MERCHANDISE ──
  'print-shop-warsaw': {
    title: 'Custom Print & Merch Shop in Warsaw, Poland',
    description: 'A print-on-demand and custom merchandise shop in Mokotów serving businesses, events, and e-commerce sellers.',
    industry: 'Printing / Custom Merchandise',
    location: 'Warsaw, Poland',
    seo: {
      title: 'Print Shop Business Analysis — Warsaw, Poland | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled business case for a custom print shop in Warsaw. PLN 45K/mo revenue, PLN 15K/mo profit, 9-month payback.',
    },
    metrics: { monthlyRevenue: '$11,500', monthlyProfit: '$3,800', paybackMonths: '9 months', roi: '133%', startupCost: '$34,000' },
    costBreakdown: [
      { label: 'DTG printer & heat press', value: '$15,000' },
      { label: 'Blank inventory (t-shirts, mugs, etc.)', value: '$5,000' },
      { label: 'Shop setup', value: '$5,000' },
      { label: 'E-commerce platform', value: '$2,000' },
      { label: 'Marketing', value: '$3,000' },
      { label: 'Working capital', value: '$4,000' },
    ],
    risks: [
      { text: 'DTG printer maintenance costs — head replacements at $2K+ each', severity: 'high' },
      { text: 'Competition from Printful, Printify online platforms', severity: 'medium' },
      { text: 'Client order size volatility — feast or famine with corporate orders', severity: 'medium' },
      { text: 'Blank garment supply chain from Turkey/Bangladesh subject to delays', severity: 'medium' },
      { text: 'Seasonal demand peaks around events, holidays, conference season', severity: 'low' },
    ],
    actionPlan: [
      'Target corporate clients for branded merchandise — recurring, high-volume orders.',
      'Build an online configurator for custom merch — reduce manual quoting time.',
      'Offer same-day/next-day turnaround for rush orders at 50% premium.',
      'Partner with event organizers for bulk merchandise production.',
      'Create merch bundles (t-shirt + mug + stickers) for higher average order value.',
    ],
  },

  // ── PLUMBING BUSINESS ──
  'plumbing-business-toronto': {
    title: 'Plumbing Business in Toronto, Canada',
    description: 'A residential plumbing service covering the GTA with 3 vans and 5 licensed plumbers offering repairs, installations, and emergency services.',
    industry: 'Plumbing / Home Services',
    location: 'Toronto, Canada',
    seo: {
      title: 'Plumbing Business Analysis — Toronto, Canada | AIWMC Quantis',
      description: 'Illustrative Quantis report. Modeled business case for a plumbing company in Toronto. CAD 65K/mo revenue, CAD 18K/mo profit, 7-month payback.',
    },
    metrics: { monthlyRevenue: '$47,500', monthlyProfit: '$13,300', paybackMonths: '7 months', roi: '171%', startupCost: '$93,000' },
    costBreakdown: [
      { label: '3 service vans (used)', value: '$35,000' },
      { label: 'Tools & equipment', value: '$15,000' },
      { label: 'Licensing & insurance', value: '$12,000' },
      { label: 'Marketing (Google Ads, HomeStars)', value: '$10,000' },
      { label: 'Inventory (parts & supplies)', value: '$8,000' },
      { label: 'Working capital', value: '$13,000' },
    ],
    risks: [
      { text: 'Licensed plumber shortage in Ontario — journeypersons command $35-45/hr', severity: 'high' },
      { text: 'Google Ads CPCs for "plumber Toronto" at $15-25/click', severity: 'high' },
      { text: 'Seasonal demand: frozen pipe emergencies in winter, drain issues in spring', severity: 'medium' },
      { text: 'WSIB premiums and compliance requirements', severity: 'medium' },
      { text: 'Customer trust issues — plumbing industry has reputation challenges', severity: 'low' },
    ],
    actionPlan: [
      'Offer 24/7 emergency service — commands 2x standard rates.',
      'Build HomeStars and Google Reviews to 200+ — primary lead gen channel.',
      'Implement flat-rate pricing book — customers prefer certainty over hourly billing.',
      'Add drain camera inspection as upsell service — $200-400 per job.',
      'Create maintenance membership ($19/mo) for annual inspections + priority service.',
    ],
  },
};
