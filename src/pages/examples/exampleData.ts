export interface ExampleData {
  title: string;
  description: string;
  industry: string;
  location: string;
  seo: { title: string; description: string };
  metrics: {
    monthlyRevenue: string;
    monthlyProfit: string;
    paybackMonths: string;
    roi: string;
    startupCost: string;
  };
  costBreakdown: { label: string; value: string }[];
  risks: { text: string; severity: 'high' | 'medium' | 'low' }[];
  actionPlan: string[];
}

export const EXAMPLE_ANALYSES: Record<string, ExampleData> = {
  'coffee-shop-denver': {
    title: 'Coffee Shop in Denver, Colorado',
    description: 'A specialty coffee shop targeting remote workers with high-speed WiFi, comfortable seating, and premium drinks in the LoHi neighborhood of Denver.',
    industry: 'Coffee Shop',
    location: 'Denver, CO',
    seo: {
      title: 'Coffee Shop Business Analysis — Denver, CO | AIWMC Quantis',
      description: 'Full financial analysis of opening a coffee shop in Denver. Revenue projections, startup costs, risk assessment, and action plan. $4,200/mo profit, 7.1 month payback.',
    },
    metrics: { monthlyRevenue: '$18,500', monthlyProfit: '$4,200', paybackMonths: '7.1 months', roi: '168%', startupCost: '$35,000' },
    costBreakdown: [
      { label: 'Equipment & buildout', value: '$18,000' },
      { label: 'Initial inventory', value: '$4,000' },
      { label: 'Licenses & permits', value: '$2,500' },
      { label: 'Marketing launch', value: '$3,000' },
      { label: 'Working capital (3 months)', value: '$7,500' },
    ],
    risks: [
      { text: 'High commercial rent in LoHi ($4,500+/mo) compresses margins', severity: 'high' },
      { text: 'Saturated Denver coffee market requires strong differentiation', severity: 'high' },
      { text: 'Seasonal tourism fluctuations impact Q1 revenue 15-20%', severity: 'medium' },
      { text: 'Staff retention challenges in competitive labor market', severity: 'medium' },
      { text: 'Supply chain for specialty beans may face price volatility', severity: 'low' },
    ],
    actionPlan: [
      'Secure lease in LoHi or RiNo with foot traffic data — negotiate 6-month reduced rent clause.',
      'Install 200 Mbps WiFi and add 20+ power outlets — position as "the remote work café".',
      'Launch with 3 signature drinks exclusive to your shop for social media virality.',
      'Partner with 5 local businesses for cross-promotion within first 60 days.',
      'Implement a loyalty app from day one — target 40% repeat customer rate by month 3.',
    ],
  },
  'saas-project-management': {
    title: 'SaaS Project Management Tool',
    description: 'A B2B SaaS tool for small agencies (5-50 people) combining project tracking, time logging, and client invoicing in one platform.',
    industry: 'B2B SaaS',
    location: 'Remote (US Market)',
    seo: {
      title: 'SaaS Project Management Tool Analysis | AIWMC Quantis',
      description: 'Business viability analysis for a B2B SaaS project management tool. $12,400/mo MRR projection, 78% gross margin, 14-month payback period.',
    },
    metrics: { monthlyRevenue: '$12,400', monthlyProfit: '$3,800', paybackMonths: '14 months', roi: '86%', startupCost: '$52,000' },
    costBreakdown: [
      { label: 'MVP development (3 months)', value: '$30,000' },
      { label: 'Infrastructure & hosting', value: '$3,000' },
      { label: 'Legal & incorporation', value: '$4,000' },
      { label: 'Initial marketing budget', value: '$8,000' },
      { label: 'Working capital', value: '$7,000' },
    ],
    risks: [
      { text: 'Crowded market with established players (Asana, Monday, ClickUp)', severity: 'high' },
      { text: 'Long B2B sales cycle (30-90 days) impacts initial cash flow', severity: 'high' },
      { text: 'Churn risk if product lacks deep integrations (Slack, QuickBooks)', severity: 'medium' },
      { text: 'Engineering hiring costs may exceed projections in 2026 market', severity: 'medium' },
      { text: 'SOC 2 compliance required for enterprise clients — $15K+ cost', severity: 'low' },
    ],
    actionPlan: [
      'Build MVP focused on ONE differentiator: combined time-tracking + invoicing workflow.',
      'Launch with a free tier (up to 3 users) to build usage data and testimonials.',
      'Target agencies on LinkedIn and ProductHunt for initial 50 customers.',
      'Integrate with QuickBooks and Slack within first 90 days post-launch.',
      'Implement usage-based pricing triggers to convert free users by month 4.',
    ],
  },
  'restaurant-miami': {
    title: 'Farm-to-Table Restaurant in Miami',
    description: 'An upscale casual farm-to-table restaurant in Wynwood, Miami, focusing on locally sourced ingredients and a craft cocktail program.',
    industry: 'Restaurant',
    location: 'Miami, FL',
    seo: {
      title: 'Farm-to-Table Restaurant Analysis — Miami, FL | AIWMC Quantis',
      description: 'Financial viability analysis for a farm-to-table restaurant in Miami Wynwood. $8,900/mo profit projection, $120K startup, 13.5-month payback.',
    },
    metrics: { monthlyRevenue: '$62,000', monthlyProfit: '$8,900', paybackMonths: '13.5 months', roi: '89%', startupCost: '$120,000' },
    costBreakdown: [
      { label: 'Kitchen equipment & buildout', value: '$55,000' },
      { label: 'Interior design & furniture', value: '$25,000' },
      { label: 'Licenses, permits, inspections', value: '$8,000' },
      { label: 'Initial food & bar inventory', value: '$12,000' },
      { label: 'Marketing & PR launch', value: '$10,000' },
      { label: 'Working capital', value: '$10,000' },
    ],
    risks: [
      { text: 'Wynwood rent escalation — landlords increasing rates 10-15%/yr', severity: 'high' },
      { text: 'Food cost volatility with local sourcing (35-40% vs 28-32% standard)', severity: 'high' },
      { text: 'Staffing: Miami service industry turnover averages 75%/yr', severity: 'medium' },
      { text: 'Hurricane season (Jun-Nov) disrupts supply chain and foot traffic', severity: 'medium' },
      { text: 'Tourism dependence — 30% revenue drop in off-season', severity: 'low' },
    ],
    actionPlan: [
      'Lock a 3-year lease with capped annual rent increases (max 5%) before signing.',
      'Establish relationships with 3+ local farms for supply redundancy.',
      'Launch Instagram-first marketing — Wynwood visual culture drives discovery.',
      'Offer weekend brunch within first month — highest margin daypart in Miami.',
      'Build a 500-person email list pre-launch with a "founding member" tasting event.',
    ],
  },
  'ecommerce-sustainable-fashion': {
    title: 'Sustainable Fashion E-commerce Brand',
    description: 'A direct-to-consumer sustainable clothing brand selling organic basics and recycled-material outerwear through Shopify and social commerce.',
    industry: 'E-commerce / Fashion',
    location: 'Online (US/EU)',
    seo: {
      title: 'Sustainable Fashion E-commerce Analysis | AIWMC Quantis',
      description: 'Business analysis for a DTC sustainable fashion brand. $6,200/mo profit, 55% gross margin, strong LTV from repeat buyers.',
    },
    metrics: { monthlyRevenue: '$22,000', monthlyProfit: '$6,200', paybackMonths: '9.7 months', roi: '124%', startupCost: '$60,000' },
    costBreakdown: [
      { label: 'Initial inventory production', value: '$25,000' },
      { label: 'Shopify + tech stack', value: '$3,000' },
      { label: 'Brand identity & photography', value: '$8,000' },
      { label: 'Paid acquisition (first 3 months)', value: '$15,000' },
      { label: 'Packaging & fulfillment setup', value: '$5,000' },
      { label: 'Legal (trademarks, compliance)', value: '$4,000' },
    ],
    risks: [
      { text: 'Customer acquisition cost rising — Meta CPM up 23% YoY in fashion', severity: 'high' },
      { text: 'Inventory risk — overproduction of wrong sizes/colors ties up capital', severity: 'high' },
      { text: '"Greenwashing" scrutiny requires genuine certifications (GOTS, OEKO-TEX)', severity: 'medium' },
      { text: 'Returns rate in online fashion averages 25-30%, impacting margins', severity: 'medium' },
      { text: 'EU textile regulation changes may require compliance updates', severity: 'low' },
    ],
    actionPlan: [
      'Start with 5 core SKUs — validate demand before expanding collection.',
      'Invest in UGC (user-generated content) over polished ads for 3x better ROAS.',
      'Implement a subscription model for basics (socks, tees) — target 20% of revenue.',
      'Get GOTS certification before launch to preempt greenwashing accusations.',
      'Build email list to 2,000 before launch via Instagram + TikTok waitlist.',
    ],
  },
  'consulting-firm-new-york': {
    title: 'Management Consulting Firm in New York',
    description: 'A boutique management consulting firm specializing in digital transformation for mid-market companies ($50M-$500M revenue) in the NYC metro area.',
    industry: 'Consulting',
    location: 'New York, NY',
    seo: {
      title: 'Management Consulting Firm Analysis — NYC | AIWMC Quantis',
      description: 'Financial analysis for a boutique management consulting firm in New York. $18,500/mo profit, 68% gross margin, low startup costs.',
    },
    metrics: { monthlyRevenue: '$45,000', monthlyProfit: '$18,500', paybackMonths: '4.3 months', roi: '280%', startupCost: '$28,000' },
    costBreakdown: [
      { label: 'Office space (WeWork/coworking)', value: '$8,000' },
      { label: 'Legal & professional licenses', value: '$5,000' },
      { label: 'Website & branding', value: '$6,000' },
      { label: 'Initial marketing & networking', value: '$5,000' },
      { label: 'Tools & subscriptions', value: '$2,000' },
      { label: 'Working capital', value: '$2,000' },
    ],
    risks: [
      { text: 'Pipeline dependency — losing 1 client = 30-50% revenue drop', severity: 'high' },
      { text: 'Long sales cycle (2-6 months) delays revenue start', severity: 'high' },
      { text: 'Talent competition — experienced consultants command $200K+ packages', severity: 'medium' },
      { text: 'Economic downturn risk — consulting budgets get cut first', severity: 'medium' },
      { text: 'Scope creep without proper SOW management reduces profitability', severity: 'low' },
    ],
    actionPlan: [
      'Leverage personal network for first 2-3 clients — avoid cold outreach initially.',
      'Specialize in ONE vertical (e.g., healthcare digital transformation) for positioning.',
      'Offer a free "Digital Maturity Assessment" as lead magnet on LinkedIn.',
      'Structure engagements as monthly retainers ($15-25K/mo) over project-based work.',
      'Hire contractors before full-time hires to maintain margin flexibility.',
    ],
  },

  // ==================== 10 NEW EXAMPLES ====================

  'fitness-studio-los-angeles': {
    title: 'Boutique Fitness Studio in Los Angeles',
    description: 'A boutique HIIT and yoga studio in West Hollywood targeting health-conscious millennials with small class sizes and premium amenities.',
    industry: 'Fitness Studio',
    location: 'Los Angeles, CA',
    seo: {
      title: 'Fitness Studio Business Analysis — Los Angeles, CA | AIWMC Quantis',
      description: 'Financial analysis for opening a boutique fitness studio in Los Angeles. $7,800/mo profit, $95K startup cost, 12.2-month payback period.',
    },
    metrics: { monthlyRevenue: '$38,000', monthlyProfit: '$7,800', paybackMonths: '12.2 months', roi: '98%', startupCost: '$95,000' },
    costBreakdown: [
      { label: 'Buildout & equipment', value: '$45,000' },
      { label: 'Lease deposit & first 3 months', value: '$18,000' },
      { label: 'Branding & website', value: '$7,000' },
      { label: 'Insurance & permits', value: '$5,000' },
      { label: 'Sound system & A/V', value: '$8,000' },
      { label: 'Working capital', value: '$12,000' },
    ],
    risks: [
      { text: 'LA rent in West Hollywood averages $6,000+/mo for 2,000 sq ft', severity: 'high' },
      { text: 'Intense competition from ClassPass, Equinox, and indie studios', severity: 'high' },
      { text: 'Instructor retention — top trainers freelance and demand revenue share', severity: 'medium' },
      { text: 'Seasonality: January surge followed by 30% drop-off by March', severity: 'medium' },
      { text: 'Liability insurance costs higher in CA than national average', severity: 'low' },
    ],
    actionPlan: [
      'Pre-sell 100 founding memberships at a discounted rate before opening day.',
      'Partner with 3 local influencers for launch-week Instagram coverage.',
      'Offer a "first class free" referral program from day one.',
      'Install a booking app with waitlist functionality to create scarcity perception.',
      'Launch corporate wellness packages targeting WeHo-based agencies by month 2.',
    ],
  },
  'food-truck-austin': {
    title: 'Gourmet Food Truck in Austin, TX',
    description: 'A Korean-Mexican fusion food truck targeting Austin\'s vibrant food scene, operating at breweries, festivals, and office parks.',
    industry: 'Food Truck',
    location: 'Austin, TX',
    seo: {
      title: 'Food Truck Business Analysis — Austin, TX | AIWMC Quantis',
      description: 'Complete financial analysis for a gourmet food truck in Austin. $5,400/mo profit, $42K startup, 7.8-month payback. Revenue, costs, and risks.',
    },
    metrics: { monthlyRevenue: '$24,000', monthlyProfit: '$5,400', paybackMonths: '7.8 months', roi: '154%', startupCost: '$42,000' },
    costBreakdown: [
      { label: 'Used truck + kitchen buildout', value: '$22,000' },
      { label: 'Permits & health inspections', value: '$3,000' },
      { label: 'Initial food inventory', value: '$4,000' },
      { label: 'Generator & equipment', value: '$5,000' },
      { label: 'Branding & wrap design', value: '$3,500' },
      { label: 'Working capital', value: '$4,500' },
    ],
    risks: [
      { text: 'Austin food truck market is saturated — 1,200+ licensed trucks', severity: 'high' },
      { text: 'Revenue depends on event bookings — one slow month can wipe quarterly profit', severity: 'high' },
      { text: 'Texas summer heat (100°F+) reduces outdoor dining demand June-August', severity: 'medium' },
      { text: 'Mechanical breakdowns average $2,000-5,000 per incident', severity: 'medium' },
      { text: 'Parking permit regulations changing in 2026 may limit locations', severity: 'low' },
    ],
    actionPlan: [
      'Secure 3 recurring weekly spots at popular breweries before launch.',
      'Build Instagram + TikTok presence with "cooking on the truck" content pre-launch.',
      'Offer catering for private events — higher margins than street service.',
      'Partner with delivery apps (UberEats, DoorDash) for rainy-day revenue backup.',
      'Create a limited "weekly special" menu to drive repeat visits and FOMO.',
    ],
  },
  'dropshipping-store-online': {
    title: 'Dropshipping E-commerce Store',
    description: 'A niche dropshipping store selling ergonomic home office accessories through Shopify, targeting remote workers via Facebook and TikTok ads.',
    industry: 'E-commerce / Dropshipping',
    location: 'Online (Global)',
    seo: {
      title: 'Dropshipping Store Business Analysis | AIWMC Quantis',
      description: 'Financial analysis for a dropshipping e-commerce store. $3,900/mo profit, $8K startup, 2.1-month payback. Low risk, high scalability.',
    },
    metrics: { monthlyRevenue: '$16,000', monthlyProfit: '$3,900', paybackMonths: '2.1 months', roi: '585%', startupCost: '$8,000' },
    costBreakdown: [
      { label: 'Shopify + apps', value: '$1,200' },
      { label: 'Initial ad spend (testing)', value: '$3,000' },
      { label: 'Brand design & product photos', value: '$1,500' },
      { label: 'Sample products for review', value: '$800' },
      { label: 'Legal (LLC, TOS, privacy)', value: '$1,000' },
      { label: 'Working capital', value: '$500' },
    ],
    risks: [
      { text: 'Facebook ad costs volatile — CPM can spike 40% during Q4', severity: 'high' },
      { text: 'Supplier reliability issues — shipping delays damage brand reputation', severity: 'high' },
      { text: 'Low barrier to entry means competitors can copy winning products quickly', severity: 'medium' },
      { text: 'Chargebacks and returns eat into thin margins (15-25% net margin)', severity: 'medium' },
      { text: 'Platform risk — Shopify policy changes or ad account bans', severity: 'low' },
    ],
    actionPlan: [
      'Test 10 products with $50 each in ad spend — scale only winners above 2.5x ROAS.',
      'Use AliExpress alternatives (CJDropshipping, Zendrop) for faster US shipping.',
      'Build a branded experience — custom packaging inserts drive repeat purchases.',
      'Collect 50+ product reviews within first month using post-purchase email flows.',
      'Diversify ad channels: test TikTok Ads and Google Shopping alongside Meta.',
    ],
  },
  'mobile-app-startup-san-francisco': {
    title: 'Mobile App Startup in San Francisco',
    description: 'A fintech mobile app helping Gen Z users automate savings through round-up purchases and micro-investing, built with React Native.',
    industry: 'Mobile App / Fintech',
    location: 'San Francisco, CA',
    seo: {
      title: 'Mobile App Startup Analysis — San Francisco | AIWMC Quantis',
      description: 'Business analysis for a fintech mobile app startup in San Francisco. $15,200/mo MRR projection, $180K startup cost, 11.8-month payback.',
    },
    metrics: { monthlyRevenue: '$15,200', monthlyProfit: '$4,600', paybackMonths: '11.8 months', roi: '102%', startupCost: '$180,000' },
    costBreakdown: [
      { label: 'App development (6 months)', value: '$90,000' },
      { label: 'Compliance & legal (fintech)', value: '$25,000' },
      { label: 'Cloud infrastructure', value: '$12,000' },
      { label: 'Marketing & user acquisition', value: '$30,000' },
      { label: 'Team (2 engineers, part-time)', value: '$15,000' },
      { label: 'Working capital', value: '$8,000' },
    ],
    risks: [
      { text: 'Fintech regulation (SEC, state money transmitter licenses) adds 6+ months', severity: 'high' },
      { text: 'High CAC for fintech apps — $30-80 per install in competitive market', severity: 'high' },
      { text: 'App Store review rejections can delay launch by weeks', severity: 'medium' },
      { text: 'User trust barrier — handling money requires security certifications', severity: 'medium' },
      { text: 'React Native performance limitations for complex financial UI', severity: 'low' },
    ],
    actionPlan: [
      'Start with savings round-ups only — avoid securities regulation initially.',
      'Apply for money transmitter licenses in top 5 states before MVP launch.',
      'Build a waitlist of 5,000 via TikTok financial literacy content.',
      'Partner with a banking-as-a-service provider (Unit, Treasury Prime) for faster compliance.',
      'Implement referral rewards ($5 per referral) to reduce effective CAC below $15.',
    ],
  },
  'real-estate-agency-chicago': {
    title: 'Real Estate Agency in Chicago',
    description: 'A boutique residential real estate brokerage targeting first-time homebuyers in Chicago\'s Logan Square and Wicker Park neighborhoods.',
    industry: 'Real Estate',
    location: 'Chicago, IL',
    seo: {
      title: 'Real Estate Agency Analysis — Chicago, IL | AIWMC Quantis',
      description: 'Financial analysis for a boutique real estate agency in Chicago. $11,200/mo profit, $32K startup, 2.9-month payback period.',
    },
    metrics: { monthlyRevenue: '$28,000', monthlyProfit: '$11,200', paybackMonths: '2.9 months', roi: '420%', startupCost: '$32,000' },
    costBreakdown: [
      { label: 'Office space (shared/coworking)', value: '$6,000' },
      { label: 'Real estate license & MLS fees', value: '$4,000' },
      { label: 'Website & IDX integration', value: '$5,000' },
      { label: 'Marketing & lead generation', value: '$8,000' },
      { label: 'Insurance (E&O)', value: '$3,000' },
      { label: 'Working capital', value: '$6,000' },
    ],
    risks: [
      { text: 'Commission compression — discount brokerages reducing standard 3% to 2%', severity: 'high' },
      { text: 'Interest rate sensitivity — higher rates reduce buyer pool significantly', severity: 'high' },
      { text: 'NAR settlement changes restructuring buyer agent compensation in 2026', severity: 'medium' },
      { text: 'Pipeline volatility — 60-90 day close cycles create cash flow gaps', severity: 'medium' },
      { text: 'Seasonal slowdown in Chicago winter months (Dec-Feb)', severity: 'low' },
    ],
    actionPlan: [
      'Focus on first-time buyer education content — "How to buy in Logan Square" YouTube series.',
      'Build partnerships with 5 mortgage brokers for referral exchange.',
      'Offer free home valuations as lead magnets on neighborhood-specific landing pages.',
      'Target renters in Logan Square/Wicker Park with "rent vs buy" calculators.',
      'Host monthly first-time buyer workshops at local coffee shops for lead generation.',
    ],
  },
  'cleaning-service-atlanta': {
    title: 'Residential Cleaning Service in Atlanta',
    description: 'An eco-friendly residential cleaning company targeting dual-income families in Buckhead and Midtown Atlanta with recurring weekly service.',
    industry: 'Cleaning Service',
    location: 'Atlanta, GA',
    seo: {
      title: 'Cleaning Service Business Analysis — Atlanta, GA | AIWMC Quantis',
      description: 'Business analysis for a residential cleaning service in Atlanta. $6,800/mo profit, $15K startup, 2.2-month payback. Recurring revenue model.',
    },
    metrics: { monthlyRevenue: '$22,000', monthlyProfit: '$6,800', paybackMonths: '2.2 months', roi: '544%', startupCost: '$15,000' },
    costBreakdown: [
      { label: 'Cleaning supplies & equipment', value: '$3,000' },
      { label: 'Vehicle (used van)', value: '$5,000' },
      { label: 'Insurance (liability + bonding)', value: '$2,000' },
      { label: 'Website & booking system', value: '$1,500' },
      { label: 'Initial marketing', value: '$2,000' },
      { label: 'Working capital', value: '$1,500' },
    ],
    risks: [
      { text: 'Employee turnover in cleaning industry averages 200%+ annually', severity: 'high' },
      { text: 'Liability exposure — property damage or theft claims', severity: 'high' },
      { text: 'Price competition from apps like Handy and TaskRabbit', severity: 'medium' },
      { text: 'Seasonal demand dip in summer when families travel', severity: 'medium' },
      { text: 'Eco-friendly supplies cost 30-40% more than conventional', severity: 'low' },
    ],
    actionPlan: [
      'Start with 20 recurring weekly clients — prioritize retention over new acquisition.',
      'Implement GPS tracking and digital checklists for quality assurance.',
      'Offer a "satisfaction guarantee or free re-clean" policy to build trust.',
      'Get 50 Google reviews within 90 days — primary local SEO driver.',
      'Pay cleaners above market rate ($18-22/hr) to reduce turnover below 100%.',
    ],
  },
  'tutoring-service-boston': {
    title: 'Online Tutoring Service in Boston',
    description: 'A premium SAT/ACT and AP exam tutoring service for high school students in the Greater Boston area, offered via Zoom with in-person options.',
    industry: 'Education / Tutoring',
    location: 'Boston, MA',
    seo: {
      title: 'Tutoring Service Business Analysis — Boston, MA | AIWMC Quantis',
      description: 'Financial analysis for an online tutoring service in Boston. $9,500/mo profit, $12K startup, 1.3-month payback. Premium pricing model.',
    },
    metrics: { monthlyRevenue: '$18,000', monthlyProfit: '$9,500', paybackMonths: '1.3 months', roi: '950%', startupCost: '$12,000' },
    costBreakdown: [
      { label: 'Website & booking platform', value: '$3,000' },
      { label: 'Marketing (Google Ads, Nextdoor)', value: '$4,000' },
      { label: 'Curriculum & materials development', value: '$2,000' },
      { label: 'Legal & business registration', value: '$1,500' },
      { label: 'Technology (Zoom, LMS)', value: '$500' },
      { label: 'Working capital', value: '$1,000' },
    ],
    risks: [
      { text: 'Seasonal demand — 70% of revenue concentrated in Sept-May', severity: 'high' },
      { text: 'Competition from Khan Academy, Varsity Tutors, and Wyzant', severity: 'high' },
      { text: 'Tutor quality inconsistency as you scale beyond solo operation', severity: 'medium' },
      { text: 'SAT/ACT format changes can invalidate existing curriculum materials', severity: 'medium' },
      { text: 'Parent expectations very high in Boston market — reputation risk', severity: 'low' },
    ],
    actionPlan: [
      'Start as solo tutor — prove results with 10 students before hiring.',
      'Guarantee a minimum score improvement (e.g., 100+ points SAT) or money back.',
      'Partner with 5 private schools for referral pipeline.',
      'Create a free "SAT prep checklist" lead magnet for parent email capture.',
      'Offer summer intensive boot camps to smooth seasonal revenue dips.',
    ],
  },
  'barbershop-houston': {
    title: 'Modern Barbershop in Houston',
    description: 'A premium men\'s grooming barbershop in Houston\'s Heights neighborhood with online booking, membership model, and retail product line.',
    industry: 'Barbershop',
    location: 'Houston, TX',
    seo: {
      title: 'Barbershop Business Analysis — Houston, TX | AIWMC Quantis',
      description: 'Business analysis for a modern barbershop in Houston. $8,200/mo profit, $55K startup, 6.7-month payback. Membership + retail model.',
    },
    metrics: { monthlyRevenue: '$32,000', monthlyProfit: '$8,200', paybackMonths: '6.7 months', roi: '179%', startupCost: '$55,000' },
    costBreakdown: [
      { label: 'Interior buildout & chairs', value: '$22,000' },
      { label: 'Lease deposit', value: '$8,000' },
      { label: 'Retail product inventory', value: '$5,000' },
      { label: 'POS & booking software', value: '$3,000' },
      { label: 'Branding & signage', value: '$4,000' },
      { label: 'Licenses & insurance', value: '$3,000' },
      { label: 'Working capital', value: '$10,000' },
    ],
    risks: [
      { text: 'Barber retention — skilled barbers leave to open their own shops', severity: 'high' },
      { text: 'Rent increases in The Heights — gentrification driving 8-12%/yr hikes', severity: 'high' },
      { text: 'Oversaturation — Houston has 3,500+ licensed barbershops', severity: 'medium' },
      { text: 'Membership model requires 6+ months to reach profitable subscriber base', severity: 'medium' },
      { text: 'Retail margins lower than service margins — inventory management needed', severity: 'low' },
    ],
    actionPlan: [
      'Recruit 2 experienced barbers with existing client followings before opening.',
      'Launch a $49/mo membership (2 cuts + product discounts) as primary revenue driver.',
      'Install a self-service booking kiosk to reduce no-shows by 30%.',
      'Create a "first cut free" referral card for every paying customer.',
      'Stock exclusive grooming products not available at chain stores for retail margin.',
    ],
  },
  'coworking-space-portland': {
    title: 'Coworking Space in Portland',
    description: 'A creative-focused coworking space in Portland\'s Pearl District with private offices, event space, and a built-in podcast studio.',
    industry: 'Coworking Space',
    location: 'Portland, OR',
    seo: {
      title: 'Coworking Space Business Analysis — Portland, OR | AIWMC Quantis',
      description: 'Financial analysis for a coworking space in Portland. $9,400/mo profit, $140K startup, 14.9-month payback. Creative niche positioning.',
    },
    metrics: { monthlyRevenue: '$42,000', monthlyProfit: '$9,400', paybackMonths: '14.9 months', roi: '81%', startupCost: '$140,000' },
    costBreakdown: [
      { label: 'Lease deposit & buildout', value: '$60,000' },
      { label: 'Furniture & desks (40 seats)', value: '$25,000' },
      { label: 'Podcast studio setup', value: '$12,000' },
      { label: 'Internet & A/V infrastructure', value: '$8,000' },
      { label: 'Marketing & pre-launch', value: '$10,000' },
      { label: 'Insurance & legal', value: '$5,000' },
      { label: 'Working capital', value: '$20,000' },
    ],
    risks: [
      { text: 'High fixed costs — $18K+/mo rent regardless of occupancy', severity: 'high' },
      { text: 'Remote work trend reducing demand for physical coworking in Portland', severity: 'high' },
      { text: 'WeWork and Industrious competing with deep-discounted flexible leases', severity: 'medium' },
      { text: 'Breakeven requires 65%+ occupancy — ramp-up takes 6-9 months', severity: 'medium' },
      { text: 'Portland\'s downtown vacancy rate currently 25%+ post-pandemic', severity: 'low' },
    ],
    actionPlan: [
      'Pre-sell 15 private offices to startups before signing lease — reduces risk.',
      'Position as "creative coworking" — podcast studio is the differentiator.',
      'Offer free first month to first 20 members for social proof and reviews.',
      'Host weekly networking events to build community and justify premium pricing.',
      'Partner with local accelerators for pipeline of startup tenants.',
    ],
  },
  'pet-grooming-seattle': {
    title: 'Pet Grooming Salon in Seattle',
    description: 'A premium pet grooming and spa salon in Seattle\'s Capitol Hill, offering organic grooming products and dog daycare add-on services.',
    industry: 'Pet Grooming',
    location: 'Seattle, WA',
    seo: {
      title: 'Pet Grooming Salon Analysis — Seattle, WA | AIWMC Quantis',
      description: 'Business analysis for a pet grooming salon in Seattle. $7,100/mo profit, $38K startup, 5.4-month payback. Recurring customer model.',
    },
    metrics: { monthlyRevenue: '$26,000', monthlyProfit: '$7,100', paybackMonths: '5.4 months', roi: '224%', startupCost: '$38,000' },
    costBreakdown: [
      { label: 'Grooming equipment & tubs', value: '$12,000' },
      { label: 'Lease deposit & buildout', value: '$10,000' },
      { label: 'Organic product inventory', value: '$3,000' },
      { label: 'Insurance & permits', value: '$3,000' },
      { label: 'Website & booking system', value: '$2,000' },
      { label: 'Marketing launch', value: '$4,000' },
      { label: 'Working capital', value: '$4,000' },
    ],
    risks: [
      { text: 'Groomer shortage — certified groomers in high demand with rising wages', severity: 'high' },
      { text: 'Liability risk — dog injuries during grooming can result in lawsuits', severity: 'high' },
      { text: 'Competition from mobile groomers offering at-home convenience', severity: 'medium' },
      { text: 'Seattle pet ownership rates plateauing after post-pandemic surge', severity: 'medium' },
      { text: 'Organic product costs 40% higher than standard grooming supplies', severity: 'low' },
    ],
    actionPlan: [
      'Hire 2 certified groomers and offer above-market pay ($25-30/hr) for retention.',
      'Launch a "grooming subscription" — monthly plan at $65/mo for recurring revenue.',
      'Partner with 5 veterinary clinics for cross-referrals.',
      'Collect pet photos during sessions for social media content (owners love sharing).',
      'Add dog daycare service by month 3 to increase revenue per visit by 60%.',
    ],
  },
};

/** Derive a score from ROI percentage */
function deriveScore(roi: string): number {
  const num = parseFloat(roi.replace('%', ''));
  if (num > 200) return 9;
  if (num > 100) return 8;
  if (num > 80) return 7;
  return 6;
}

/** Index page data */
export const EXAMPLE_LIST = Object.entries(EXAMPLE_ANALYSES).map(([slug, data]) => ({
  slug,
  title: data.title,
  industry: data.industry,
  location: data.location,
  description: data.description,
  profit: data.metrics.monthlyProfit,
  roi: data.metrics.roi,
  score: deriveScore(data.metrics.roi),
}));
