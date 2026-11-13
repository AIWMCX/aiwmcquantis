// =============================================================================
// seo.routes.mjs — THE single source of truth for every public, crawlable route.
// Built from the live aiwmcquantis.com sitemap + prerender-urls.txt as of 2026-06-19.
//
// Nothing else in the visibility pipeline hardcodes routes. Prerender, sitemap,
// verification gate, and live smoke-test all read from THIS file. If a page must
// be public and indexable, it lives here — and the build will refuse to ship if
// any route here renders as the homepage shell.
// =============================================================================

export const ORIGIN = "https://www.aiwmcquantis.com";

// Routes that must render their OWN body content (NOT the homepage shell).
// `title` = a substring that must appear in <title> for that route (uniqueness check).
// `must` = optional extra strings that must appear in the rendered HTML body.
export const PUBLIC_ROUTES = [
  // ---- Core pages (17) ------------------------------------------------------
  { path: "/",                title: "AIWMC Quantis", isHome: true,
    must: ["$17", "Plus", "$49", "Pro"] },
  { path: "/app",             title: "Quantis",
    must: ["analysis"] },
  { path: "/how-it-works",    title: "Quantis" },
  { path: "/use-cases",       title: "Use Cases" },
  { path: "/consultants",     title: "Consultants",
    must: ["client pre-screen", "8-Layer"] },
  { path: "/pricing",         title: "Pricing",
    must: ["Free", "$17", "Plus", "$49", "Pro"] },
  { path: "/methodology",     title: "Methodology" },
  { path: "/examples",        title: "Example" },
  { path: "/blog",            title: "Blog" },
  { path: "/risk-gallery",    title: "Risk" },
  { path: "/leaderboard",     title: "Leaderboard" },
  { path: "/research",        title: "Research" },
  { path: "/status",          title: "Status" },
  { path: "/state-of-quantis", title: "State of Quantis",
    must: ["What Quantis does", "deterministic"] },
  { path: "/security",        title: "Security" },
  { path: "/refund-policy",   title: "Refund" },
  { path: "/can-i-afford-to-hire", title: "Can I Afford to Hire an Employee",
    must: ["Can I afford to hire an employee?", "lowest"] },
  { path: "/decision-review", title: "Founder Decision Review",
    must: ["$349", "$499", "Founder Decision Review", "Consultant Founding Pilot"] },
  { path: "/consultant-pilot", title: "Consultant Founding Pilot",
    must: ["Consultant Founding Pilot", "two real client decisions"] },
  { path: "/demo/founder-decision-review", title: "Founder Decision Review" },
  { path: "/demo/hiring-decision", title: "Hiring Decision" },
  { path: "/demo/price-change", title: "Price Change Decision" },
  { path: "/demo/second-location", title: "Second Location Decision" },
  { path: "/demo/sample-decision-memo", title: "Sample Decision Memo" },
  { path: "/demo/consultant-founding-pilot", title: "Consultant Capacity" },
  { path: "/connect", title: "Connect" },
  { path: "/changelog",       title: "Changelog" },
  { path: "/privacy",         title: "Privacy" },
  { path: "/terms",           title: "Terms" },
  { path: "/ai-policy",       title: "AI Policy",
    must: ["deterministic", "DeepSeek"] },
  { path: "/dmca",            title: "DMCA",
    must: ["512(c)(3)", "counter-notice"] },

  // ---- 3 competitive comparison pages (audit D10.3) -------------------------
  { path: "/vs/liveplan",     title: "Quantis vs LivePlan" },
  { path: "/vs/upmetrics",    title: "Quantis vs Upmetrics" },
  { path: "/vs/bizplanr",     title: "Quantis vs Bizplanr" },
  { path: "/vs/foundra",      title: "Quantis vs Foundra" },
  { path: "/vs/aicofounder",  title: "Quantis vs AI Co-Founder" },
  { path: "/vs/chatgpt",      title: "Quantis vs ChatGPT" },

  // ---- 51 worked examples ---------------------------------------------------
  ...[
    "coffee-shop-denver", "saas-project-management", "restaurant-miami",
    "ecommerce-sustainable-fashion", "consulting-firm-new-york",
    "fitness-studio-los-angeles", "food-truck-austin", "dropshipping-store-online",
    "mobile-app-startup-san-francisco", "real-estate-agency-chicago",
    "cleaning-service-atlanta", "tutoring-service-boston", "barbershop-houston",
    "coworking-space-portland", "pet-grooming-seattle", "bakery-paris",
    "gym-london", "dental-clinic-dubai", "laundromat-tokyo", "digital-agency-berlin",
    "pharmacy-toronto", "auto-repair-dallas", "yoga-studio-bali", "bookstore-lisbon",
    "nail-salon-sydney", "pizzeria-naples", "pet-store-vancouver", "car-wash-riyadh",
    "daycare-singapore", "ice-cream-barcelona", "tutoring-seoul", "brewery-melbourne",
    "flower-shop-amsterdam", "saas-fintech-lagos", "juice-bar-miami",
    "tattoo-studio-brooklyn", "moving-company-phoenix", "event-planning-mumbai",
    "cleaning-service-dubai", "photography-studio-prague", "language-school-mexico-city",
    "accounting-firm-zurich", "cloud-kitchen-bangkok", "airbnb-management-lisbon",
    "music-school-nashville", "coworking-cape-town", "vet-clinic-madrid",
    "wine-bar-buenos-aires", "saas-hr-tech-bangalore", "print-shop-warsaw",
    "plumbing-business-toronto",
  ].map((slug) => ({ path: `/examples/${slug}`, title: "AIWMC Quantis" })),

  // ---- 12 blog posts --------------------------------------------------------
  { path: "/blog/how-to-stress-test-your-startup",        title: "Stress-Test" },
  { path: "/blog/startup-validation-checklist",            title: "Validation Checklist" },
  { path: "/blog/ai-vs-spreadsheets-startup-planning",     title: "Spreadsheets" },
  { path: "/blog/validate-startup-idea-using-ai",          title: "Validate" },
  { path: "/blog/how-to-calculate-startup-costs",          title: "Startup Costs" },
  { path: "/blog/unit-economics-explained-for-founders",   title: "Unit Economics" },
  { path: "/blog/coffee-shop-startup-costs-by-city",       title: "Coffee Shop" },
  { path: "/blog/food-truck-profit-calculator",            title: "Food Truck" },
  { path: "/blog/how-to-validate-restaurant-idea",         title: "Restaurant" },
  { path: "/blog/5-financial-mistakes-early-founders-make", title: "Financial Mistakes" },
  { path: "/blog/ai-vs-traditional-business-planning",     title: "Traditional" },
  { path: "/blog/business-validation-for-financial-clients", title: "Business Validation" },
];

export const HOME = PUBLIC_ROUTES.find((r) => r.isHome);
export const NON_HOME = PUBLIC_ROUTES.filter((r) => !r.isHome);
