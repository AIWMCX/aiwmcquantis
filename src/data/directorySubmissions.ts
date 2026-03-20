export type DirectoryStatus = 'not_started' | 'submitted' | 'live' | 'rejected';
export type DirectoryPriority = 'HIGH' | 'MED' | 'LOW';
export type DirectoryWave = 1 | 2 | 3 | 4;

export interface DirectoryEntry {
  id: number;
  name: string;
  url: string;
  type: string;
  drScore: number | null;
  cost: string;
  priority: DirectoryPriority;
  wave: DirectoryWave;
  status: DirectoryStatus;
  submittedDate: string | null;
  notes: string;
}

export const optimizedDescriptions: Record<string, { label: string; text: string }> = {
  taaft: {
    label: 'TAAFT / AI Directories (200 chars)',
    text: 'AI-powered business validation for founders. Dual-AI engine stress-tests your idea with financial modeling, risk scoring, and scenario analysis before you invest a dollar.',
  },
  productHunt: {
    label: 'Product Hunt (60 chars)',
    text: 'Validate your startup before it validates you',
  },
  g2: {
    label: 'G2 / Capterra / GetApp (500 chars)',
    text: 'AIWMC Quantis helps early-stage founders and small business owners validate their business ideas using AI-driven financial modeling and risk assessment. The platform\'s dual-AI engine runs Monte Carlo simulations, competitive stress tests, and scenario analyses to produce a validation score and actionable recommendations — replacing guesswork, expensive consultants, and spreadsheet marathons with an interactive, data-backed decision framework.',
  },
  crunchbase: {
    label: 'Crunchbase / AngelList',
    text: 'AIWMC Quantis is a Denver-based AI SaaS platform that automates business validation for pre-revenue founders and small business owners. The platform combines dual-AI financial modeling with risk scoring and scenario stress-testing, enabling entrepreneurs to make capital allocation decisions with confidence. Founded by Bogdan Jeltov, AIWMC Quantis addresses the $47B+ wasted annually on failed ventures by giving founders a structured validation layer before launch.',
  },
  betaList: {
    label: 'BetaList / Betabound / BetaPage',
    text: 'We built AIWMC Quantis for founders who\'ve ever second-guessed their business idea at 2 AM. Our dual-AI engine gives you a validation score, financial stress test, and risk breakdown in minutes — not months. Currently accepting beta users.',
  },
  saasHub: {
    label: 'SaaSHub / AlternativeTo',
    text: 'AIWMC Quantis is an AI-powered alternative to manual business planning tools like LivePlan and Bizplan. Where traditional tools ask you to input your assumptions, Quantis questions them — using AI to stress-test your projections and surface risks you haven\'t considered yet.',
  },
  indieHackers: {
    label: 'IndieHackers (founder voice)',
    text: 'I built AIWMC Quantis because I lost 8 months and $40K on a startup that a good validation process would\'ve flagged in week 1. The tool is a dual-AI validation engine that gives founders a structured, data-backed answer to \'should I build this.\' Would love feedback from other builders.',
  },
};

export const directories: DirectoryEntry[] = [
  { id: 1, name: "There's An AI For That (TAAFT)", url: "https://theresanaiforthat.com", type: "AI Tool", drScore: 77, cost: "$49", priority: "HIGH", wave: 2, status: "not_started", submittedDate: null, notes: "#1 AI directory by traffic (4.8M/mo). Submit under 'Business' + 'Productivity.' 200 char limit." },
  { id: 2, name: "Futurepedia", url: "https://futurepedia.io", type: "AI Tool", drScore: 72, cost: "$497 / free basic", priority: "HIGH", wave: 3, status: "not_started", submittedDate: null, notes: "519K mo. visits. Start with free listing. Category: 'Business & Finance.'" },
  { id: 3, name: "Toolify.ai", url: "https://toolify.ai", type: "AI Tool", drScore: 73, cost: "$99", priority: "HIGH", wave: 4, status: "not_started", submittedDate: null, notes: "1.5M mo. visits. Categorize under 'Startup Tools.' Include pricing, use case tags." },
  { id: 4, name: "TopAI.tools", url: "https://topai.tools", type: "AI Tool", drScore: 62, cost: "$47", priority: "HIGH", wave: 2, status: "not_started", submittedDate: null, notes: "551K mo. visits. Submit under 'Finance' and 'Business Validation.'" },
  { id: 5, name: "FutureTools.io", url: "https://futuretools.io", type: "AI Tool", drScore: 69, cost: "Free", priority: "HIGH", wave: 1, status: "not_started", submittedDate: null, notes: "447K mo. visits, dofollow backlink, no cost." },
  { id: 6, name: "AI Tools Directory", url: "https://aitoolsdirectory.com", type: "AI Tool", drScore: 50, cost: "Free", priority: "HIGH", wave: 1, status: "not_started", submittedDate: null, notes: "196K mo. visits. Focus description on ROI for founders." },
  { id: 7, name: "Dang.ai", url: "https://dang.ai", type: "AI Tool", drScore: 80, cost: "Free", priority: "HIGH", wave: 1, status: "not_started", submittedDate: null, notes: "Highest DR on free tier. DR 80 dofollow backlink at zero cost." },
  { id: 8, name: "ToolPilot AI", url: "https://toolpilot.ai", type: "AI Tool", drScore: 77, cost: "Free", priority: "HIGH", wave: 1, status: "not_started", submittedDate: null, notes: "105K visits, DR 77 free. Submit with full feature list." },
  { id: 9, name: "Insidr.ai", url: "https://insidr.ai/ai-tools", type: "AI Tool", drScore: 48, cost: "Free", priority: "HIGH", wave: 1, status: "not_started", submittedDate: null, notes: "270K mo. visits. Targets productivity-focused professionals — ideal ICP match." },
  { id: 10, name: "OpenTools.ai", url: "https://opentools.ai", type: "AI Tool", drScore: 68, cost: "Unknown", priority: "HIGH", wave: 1, status: "not_started", submittedDate: null, notes: "DR 68, 127K visits. Reach out directly. Category: Business Intelligence." },
  { id: 11, name: "Product Hunt", url: "https://producthunt.com", type: "Startup", drScore: 90, cost: "Free", priority: "HIGH", wave: 3, status: "not_started", submittedDate: null, notes: "Single most important launch platform. Schedule full launch day. Recruit hunter with 500+ followers." },
  { id: 12, name: "G2", url: "https://g2.com", type: "SaaS", drScore: 83, cost: "Freemium", priority: "HIGH", wave: 3, status: "not_started", submittedDate: null, notes: "DR 83. Focus on collecting 5+ reviews in first 60 days. Category: Business Intelligence." },
  { id: 13, name: "Capterra", url: "https://capterra.com", type: "SaaS", drScore: 90, cost: "Freemium ($2/click)", priority: "HIGH", wave: 3, status: "not_started", submittedDate: null, notes: "DR 90. Free profile, optional PPC. Critical for 'business validation software' search intent." },
  { id: 14, name: "Crunchbase", url: "https://crunchbase.com", type: "General", drScore: 91, cost: "Free (basic)", priority: "HIGH", wave: 1, status: "not_started", submittedDate: null, notes: "Investors check here first. Fill every field: funding stage, team size, description, tags." },
  { id: 15, name: "F6S", url: "https://f6s.com", type: "Startup", drScore: 82, cost: "Free", priority: "HIGH", wave: 1, status: "not_started", submittedDate: null, notes: "DR 82, massive founder/VC community. Apply to accelerator programs simultaneously." },
  { id: 16, name: "AlternativeTo", url: "https://alternativeto.net", type: "SaaS", drScore: 88, cost: "Free", priority: "HIGH", wave: 1, status: "not_started", submittedDate: null, notes: "DR 88, 14.4M mo. visits. List as alternative to: Lean Canvas Pro, Bizplan, LivePlan." },
  { id: 17, name: "SaaSHub", url: "https://saashub.com", type: "SaaS", drScore: 77, cost: "Free", priority: "HIGH", wave: 1, status: "not_started", submittedDate: null, notes: "DR 77. Strong 'alternatives' pages drive sustained organic traffic." },
  { id: 18, name: "GetApp", url: "https://getapp.com", type: "SaaS", drScore: 83, cost: "Freemium", priority: "HIGH", wave: 3, status: "not_started", submittedDate: null, notes: "Gartner-owned, DR 83. Categories: Business Plan Software, Risk Management." },
  { id: 19, name: "BetaList", url: "https://betalist.com", type: "Startup", drScore: 73, cost: "Freemium ($129)", priority: "HIGH", wave: 1, status: "not_started", submittedDate: null, notes: "Best pre-launch discovery. Free queue = 2 months. Pay $129 to skip." },
  { id: 20, name: "AngelList / Wellfound", url: "https://wellfound.com", type: "Startup/Investor", drScore: 88, cost: "Free", priority: "HIGH", wave: 1, status: "not_started", submittedDate: null, notes: "Investor + talent discovery. Essential credibility signal. Complete full profile." },
  { id: 21, name: "The Rundown AI", url: "https://rundown.ai/tools", type: "AI Tool", drScore: 46, cost: "Free", priority: "MED", wave: 2, status: "not_started", submittedDate: null, notes: "435K mo. visits. Newsletter has 500K+ subscribers." },
  { id: 22, name: "AI Valley", url: "https://aivalley.ai", type: "AI Tool", drScore: 31, cost: "Free", priority: "MED", wave: 2, status: "not_started", submittedDate: null, notes: "145K visits, free. Good for building breadth of backlinks." },
  { id: 23, name: "GenAI.Works", url: "https://genai.works/applications", type: "AI Tool", drScore: 43, cost: "Free", priority: "MED", wave: 2, status: "not_started", submittedDate: null, notes: "221K visits, free. Categorize under 'Business Automation.'" },
  { id: 24, name: "EliteAI.tools", url: "https://eliteai.tools", type: "AI Tool", drScore: 48, cost: "$10", priority: "MED", wave: 2, status: "not_started", submittedDate: null, notes: "145K visits. $10 is negligible — worth it for the authority." },
  { id: 25, name: "AITopTools", url: "https://aitoptools.com", type: "AI Tool", drScore: 54, cost: "$69", priority: "MED", wave: 4, status: "not_started", submittedDate: null, notes: "179K visits, DR 54. Submit if budget allows after tier-1." },
  { id: 26, name: "AI Chief", url: "https://aichief.com", type: "AI Tool", drScore: 52, cost: "$30", priority: "MED", wave: 2, status: "not_started", submittedDate: null, notes: "186K visits. Low cost, solid DR. Good complement to TAAFT." },
  { id: 27, name: "AI Tools FYI", url: "https://aitools.fyi", type: "AI Tool", drScore: 47, cost: "$30", priority: "MED", wave: 2, status: "not_started", submittedDate: null, notes: "82K visits. Focus on 'validate your startup' angle." },
  { id: 28, name: "FutureTools BAI", url: "https://bai.tools", type: "AI Tool", drScore: 48, cost: "Free", priority: "MED", wave: 2, status: "not_started", submittedDate: null, notes: "78K visits, free. Growing platform, dofollow links." },
  { id: 29, name: "Launching Next", url: "https://launchingnext.com", type: "Startup", drScore: 54, cost: "Free", priority: "MED", wave: 2, status: "not_started", submittedDate: null, notes: "Startup-focused, free. Good for early-stage credibility." },
  { id: 30, name: "StartupBase", url: "https://startupbase.io", type: "Startup", drScore: 52, cost: "Free", priority: "MED", wave: 1, status: "not_started", submittedDate: null, notes: "Active community. Tag: 'fintech,' 'AI,' 'b2b.'" },
  { id: 31, name: "BetaPage", url: "https://betapage.co", type: "Startup", drScore: 55, cost: "Freemium ($58)", priority: "MED", wave: 2, status: "not_started", submittedDate: null, notes: "58K visits. Free tier available. Good pre-launch buzz." },
  { id: 32, name: "Betabound", url: "https://betabound.com", type: "Startup", drScore: 51, cost: "Free", priority: "MED", wave: 1, status: "not_started", submittedDate: null, notes: "Free. Attracts beta testers — use to recruit first 50 users." },
  { id: 33, name: "KillerStartups", url: "https://killerstartups.com", type: "Startup", drScore: 74, cost: "Freemium ($75)", priority: "MED", wave: 2, status: "not_started", submittedDate: null, notes: "DR 74. Free listing possible; $75 for featured. Founder-voice narrative." },
  { id: 34, name: "AI Scout", url: "https://aiscout.net", type: "AI Tool", drScore: 45, cost: "Free", priority: "MED", wave: 2, status: "not_started", submittedDate: null, notes: "Community-built AI directory. Free submission. 'Business' category." },
  { id: 35, name: "Google Business Profile", url: "https://business.google.com", type: "General", drScore: null, cost: "Free", priority: "MED", wave: 1, status: "not_started", submittedDate: null, notes: "Local SEO for Denver. Category: 'Software Company.' Add photos, description." },
  { id: 36, name: "AIxploria", url: "https://aixploria.com", type: "AI Tool", drScore: 51, cost: "$79", priority: "MED", wave: 4, status: "not_started", submittedDate: null, notes: "1.08M visits. High traffic, moderate cost." },
  { id: 37, name: "Creati.ai", url: "https://creati.ai", type: "AI Tool", drScore: 48, cost: "$69", priority: "LOW", wave: 4, status: "not_started", submittedDate: null, notes: "505K visits. Lower ROI than free options with similar DR." },
  { id: 38, name: "AIPURE", url: "https://aipure.ai", type: "AI Tool", drScore: 56, cost: "$70", priority: "LOW", wave: 4, status: "not_started", submittedDate: null, notes: "177K visits. Round out AI directory breadth in later phase." },
  { id: 39, name: "AI Mojo", url: "https://aimojo.io", type: "AI Tool", drScore: 45, cost: "$79", priority: "LOW", wave: 4, status: "not_started", submittedDate: null, notes: "208K visits. Consider if budget > $500/mo." },
  { id: 40, name: "AIApps.com", url: "https://aiapps.com", type: "AI Tool", drScore: 48, cost: "$10", priority: "LOW", wave: 2, status: "not_started", submittedDate: null, notes: "Low cost but lower priority once core directories covered." },
  { id: 41, name: "IndieHackers", url: "https://indiehackers.com", type: "General/SaaS", drScore: 79, cost: "Free", priority: "MED", wave: 1, status: "not_started", submittedDate: null, notes: "Not a directory but post building-in-public updates. DR 79 links." },
  { id: 42, name: "Wellfound (Jobs)", url: "https://wellfound.com", type: "Startup", drScore: 88, cost: "Free", priority: "MED", wave: 1, status: "not_started", submittedDate: null, notes: "Post a job listing to increase discoverability." },
  { id: 43, name: "SaaSWorthy", url: "https://saasworthy.com", type: "SaaS", drScore: 65, cost: "Free", priority: "MED", wave: 2, status: "not_started", submittedDate: null, notes: "Review-based. Important for 'momentum score' algorithm." },
  { id: 44, name: "Crozdesk", url: "https://crozdesk.com", type: "SaaS", drScore: 85, cost: "Freemium", priority: "MED", wave: 2, status: "not_started", submittedDate: null, notes: "DR 85. Free vendor profile. Category: Business Intelligence." },
];
