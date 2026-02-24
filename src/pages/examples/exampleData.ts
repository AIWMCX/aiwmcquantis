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
    metrics: {
      monthlyRevenue: '$18,500',
      monthlyProfit: '$4,200',
      paybackMonths: '7.1 months',
      roi: '168%',
      startupCost: '$35,000',
    },
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
    metrics: {
      monthlyRevenue: '$12,400',
      monthlyProfit: '$3,800',
      paybackMonths: '14 months',
      roi: '86%',
      startupCost: '$52,000',
    },
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
    metrics: {
      monthlyRevenue: '$62,000',
      monthlyProfit: '$8,900',
      paybackMonths: '13.5 months',
      roi: '89%',
      startupCost: '$120,000',
    },
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
    metrics: {
      monthlyRevenue: '$22,000',
      monthlyProfit: '$6,200',
      paybackMonths: '9.7 months',
      roi: '124%',
      startupCost: '$60,000',
    },
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
    metrics: {
      monthlyRevenue: '$45,000',
      monthlyProfit: '$18,500',
      paybackMonths: '4.3 months',
      roi: '280%',
      startupCost: '$28,000',
    },
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
};

/** Index page data */
export const EXAMPLE_LIST = Object.entries(EXAMPLE_ANALYSES).map(([slug, data]) => ({
  slug,
  title: data.title,
  industry: data.industry,
  location: data.location,
  description: data.description,
  profit: data.metrics.monthlyProfit,
  roi: data.metrics.roi,
}));
