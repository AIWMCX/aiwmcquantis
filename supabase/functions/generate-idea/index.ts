import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';
import { aiCall } from '../_shared/llm-call.ts';

/* ─── 100 BUSINESS CASE SEEDS ───
   Each seed provides a specific, financially-calculable concept with realistic
   ranges the AI must respect. Grouped by sector for variety. */

const BUSINESS_SEEDS: Record<string, { concepts: string[]; capitalRange: [number, number]; priceRange: [number, number]; customerRange: [number, number]; costRange: [number, number] }> = {
  // ── FOOD & BEVERAGE (15) ──
  coffee_shop: {
    concepts: [
      "Third-wave pour-over bar with bean subscription program",
      "Drive-through specialty coffee kiosk in suburban commuter corridor",
      "Co-working café with hourly desk rental and premium espresso bar",
      "Cold brew manufacturing micro-facility selling kegs to offices",
      "Cat café with adoption partnership and themed pastry menu",
    ],
    capitalRange: [25000, 120000], priceRange: [4, 12], customerRange: [40, 200], costRange: [5000, 18000],
  },
  restaurant: {
    concepts: [
      "Farm-to-table fast-casual with rotating seasonal 5-item menu",
      "Ghost kitchen operating 3 delivery-only brands from one location",
      "Upscale ramen bar with in-house noodle production",
      "Mediterranean mezze counter with catering arm for corporate events",
      "AI-optimized menu pricing restaurant with dynamic demand-based pricing",
    ],
    capitalRange: [50000, 350000], priceRange: [12, 45], customerRange: [30, 150], costRange: [12000, 45000],
  },
  food_truck: {
    concepts: [
      "Gourmet grilled cheese truck targeting tech campus lunch circuits",
      "Korean-Mexican fusion taco truck with festival route optimization",
      "Artisan wood-fired pizza truck for weddings and private events",
      "Vegan comfort food truck with loyalty app and pre-order system",
      "Dessert-only food truck specializing in liquid nitrogen ice cream",
    ],
    capitalRange: [15000, 80000], priceRange: [8, 18], customerRange: [50, 200], costRange: [3000, 10000],
  },

  // ── RETAIL & E-COMMERCE (15) ──
  ecommerce: {
    concepts: [
      "Curated sustainable home goods DTC with carbon-offset shipping",
      "Custom pet portrait marketplace connecting artists with pet owners",
      "Refurbished electronics store with 2-year warranty and trade-in program",
      "Subscription snack box featuring small-batch international brands",
      "Print-on-demand streetwear brand with AI-generated designs",
    ],
    capitalRange: [5000, 60000], priceRange: [15, 120], customerRange: [20, 500], costRange: [2000, 15000],
  },
  retail: {
    concepts: [
      "Zero-waste refill station for household and personal care products",
      "Board game café and retail hybrid with tournament league nights",
      "Vintage vinyl record shop with listening lounge and DJ workshops",
      "Indoor plant boutique with subscription care service and workshops",
      "Luxury sneaker consignment store with authentication lab",
    ],
    capitalRange: [30000, 200000], priceRange: [10, 250], customerRange: [15, 100], costRange: [6000, 25000],
  },
  dropshipping: {
    concepts: [
      "Ergonomic home office accessories store with video review content flywheel",
      "Niche outdoor survival gear store targeting preppers and campers",
      "Minimalist Japanese kitchenware brand with influencer partnerships",
      "Adaptive clothing for elderly and disabled customers with sizing AI",
      "Premium phone accessories brand with TikTok-first marketing strategy",
    ],
    capitalRange: [2000, 15000], priceRange: [15, 80], customerRange: [30, 300], costRange: [1000, 5000],
  },

  // ── HEALTH & FITNESS (10) ──
  fitness: {
    concepts: [
      "Boutique HIIT studio with heart-rate leaderboard and recovery lounge",
      "Women-only strength training gym with childcare and nutrition coaching",
      "Outdoor bootcamp franchise model targeting suburban parks",
      "Virtual reality fitness arcade with competitive multiplayer workouts",
      "Senior mobility and balance studio with physical therapy partnerships",
    ],
    capitalRange: [40000, 250000], priceRange: [15, 60], customerRange: [30, 200], costRange: [8000, 30000],
  },
  health_wellness: {
    concepts: [
      "IV hydration therapy lounge targeting athletes and hangover recovery",
      "Corporate wellness platform with on-site meditation and ergonomic assessments",
      "Functional medicine clinic with subscription-based lab testing",
      "Float tank sensory deprivation spa with biometric tracking",
      "Mental health co-op offering sliding-scale therapy with AI intake screening",
    ],
    capitalRange: [50000, 300000], priceRange: [40, 200], customerRange: [10, 80], costRange: [10000, 35000],
  },

  // ── TECHNOLOGY & SAAS (15) ──
  saas: {
    concepts: [
      "AI-powered invoice reconciliation tool for freelancers and micro-agencies",
      "Tenant screening SaaS for independent landlords with credit + social scoring",
      "Restaurant inventory waste tracker with supplier price comparison engine",
      "Employee recognition micro-SaaS with Slack integration and reward marketplace",
      "Compliance checklist automation for small healthcare practices",
    ],
    capitalRange: [10000, 100000], priceRange: [20, 200], customerRange: [10, 100], costRange: [3000, 20000],
  },
  fintech: {
    concepts: [
      "Micro-investing app for Gen Z with round-up purchases and social portfolios",
      "Invoice factoring marketplace connecting SMBs with institutional buyers",
      "Expense management tool for gig workers with tax optimization AI",
      "Crypto payroll platform for remote teams with multi-currency conversion",
      "Rent reporting service that builds credit scores from lease payments",
    ],
    capitalRange: [50000, 500000], priceRange: [5, 50], customerRange: [50, 1000], costRange: [15000, 60000],
  },
  digital_agency: {
    concepts: [
      "AI-augmented SEO agency guaranteeing first-page rankings or money back",
      "Vertical-specific web studio for dentists with patient booking integration",
      "Conversion rate optimization consultancy with revenue-share pricing model",
      "Social media management agency for local restaurants with content templates",
      "Shopify migration agency with post-launch growth retainer packages",
    ],
    capitalRange: [5000, 50000], priceRange: [500, 5000], customerRange: [3, 20], costRange: [4000, 25000],
  },

  // ── PROFESSIONAL SERVICES (10) ──
  consulting: {
    concepts: [
      "Fractional CFO service for Series A startups with financial modeling platform",
      "Supply chain resilience consulting for mid-market manufacturers",
      "DEI audit and implementation firm with benchmarking dashboard",
      "Regulatory compliance consulting for cannabis dispensaries entering new states",
      "AI readiness assessment consultancy for traditional enterprises",
    ],
    capitalRange: [5000, 40000], priceRange: [1000, 10000], customerRange: [2, 15], costRange: [3000, 15000],
  },
  coaching: {
    concepts: [
      "Executive presence coaching with video analysis AI and 360 feedback",
      "Career pivot bootcamp for mid-career professionals with hiring guarantees",
      "Couples financial planning coaching with joint budgeting app",
      "Public speaking accelerator with VR audience simulation practice",
      "ADHD productivity coaching practice with accountability app integration",
    ],
    capitalRange: [3000, 25000], priceRange: [100, 500], customerRange: [5, 40], costRange: [1500, 8000],
  },

  // ── EDUCATION (10) ──
  education: {
    concepts: [
      "Micro-credential platform for supply chain certifications with employer matching",
      "After-school STEM robotics lab with tournament competition circuit",
      "Language immersion preschool with cultural exchange family program",
      "Online tutoring marketplace matching PhD students with high schoolers",
      "Corporate upskilling platform for AI literacy with hands-on projects",
    ],
    capitalRange: [10000, 150000], priceRange: [30, 300], customerRange: [10, 100], costRange: [4000, 20000],
  },
  online_course: {
    concepts: [
      "Cohort-based data analytics bootcamp with job placement guarantee",
      "YouTube creator academy with monetization coaching and editing services",
      "Professional chef certification online with ingredient kit delivery",
      "No-code app development course with capstone project marketplace",
      "Financial modeling masterclass targeting investment banking aspirants",
    ],
    capitalRange: [5000, 50000], priceRange: [50, 500], customerRange: [20, 200], costRange: [2000, 12000],
  },

  // ── REAL ESTATE & PROPERTY (5) ──
  real_estate: {
    concepts: [
      "Co-living property management company targeting remote workers in mid-tier cities",
      "Short-term rental arbitrage business with dynamic pricing optimization",
      "Commercial kitchen rental marketplace for food entrepreneurs",
      "Parking space rental platform for downtown urban areas",
      "Modular tiny home development company for affordable housing initiatives",
    ],
    capitalRange: [20000, 500000], priceRange: [200, 3000], customerRange: [5, 50], costRange: [5000, 40000],
  },

  // ── CREATIVE & MEDIA (10) ──
  content_creation: {
    concepts: [
      "Podcast production studio with ad sales agency for niche creators",
      "Newsletter media company covering local business news with sponsored deep-dives",
      "UGC content agency connecting brands with micro-creators for ad content",
      "AI-assisted children's book publishing with personalized story generation",
      "Corporate video production house specializing in employer branding content",
    ],
    capitalRange: [5000, 80000], priceRange: [200, 3000], customerRange: [3, 30], costRange: [3000, 15000],
  },
  photography: {
    concepts: [
      "Drone real estate photography service with 3D virtual tour integration",
      "Pet photography studio with same-day prints and digital delivery",
      "Event photo booth rental company with AI face-swap and social sharing",
      "Product photography-as-a-service for Amazon and Etsy sellers",
      "School portrait franchise with AI background replacement and parent ordering app",
    ],
    capitalRange: [8000, 60000], priceRange: [100, 800], customerRange: [5, 40], costRange: [2000, 10000],
  },

  // ── HOME SERVICES & TRADES (5) ──
  home_services: {
    concepts: [
      "Eco-friendly house cleaning service with non-toxic products and subscription model",
      "Smart home installation and automation service for aging-in-place seniors",
      "Mobile auto detailing franchise with ceramic coating upsell",
      "Junk removal service with resale/donation tracking and tax receipt generation",
      "Lawn care subscription with drone-based lawn health monitoring",
    ],
    capitalRange: [5000, 80000], priceRange: [50, 500], customerRange: [10, 80], costRange: [3000, 15000],
  },

  // ── MANUFACTURING & LOGISTICS (5) ──
  manufacturing: {
    concepts: [
      "Custom 3D-printed prosthetics lab with insurance billing integration",
      "Artisan candle manufacturing with subscription box and wholesale channel",
      "Micro-brewery with taproom and direct-to-consumer can shipping program",
      "Sustainable packaging manufacturing for DTC e-commerce brands",
      "Electric vehicle charging station deployment and maintenance company",
    ],
    capitalRange: [30000, 400000], priceRange: [10, 500], customerRange: [10, 200], costRange: [8000, 50000],
  },
};

// Flatten all concepts for truly random cross-industry generation
const ALL_INDUSTRIES = Object.keys(BUSINESS_SEEDS);

function getRandomSeed(industry?: string): { industry: string; concept: string; ranges: typeof BUSINESS_SEEDS[string] } {
  // If industry matches a key, use it; otherwise pick random
  const key = industry && BUSINESS_SEEDS[industry] ? industry : ALL_INDUSTRIES[Math.floor(Math.random() * ALL_INDUSTRIES.length)];
  const entry = BUSINESS_SEEDS[key];
  const concept = entry.concepts[Math.floor(Math.random() * entry.concepts.length)];
  return { industry: key, concept, ranges: entry };
}

function buildDeterministicIdea(seed: ReturnType<typeof getRandomSeed>) {
  const r = seed.ranges;
  const startingCapital = Math.round((r.capitalRange[0] * 0.65 + r.capitalRange[1] * 0.35) / 500) * 500;
  const pricePerCustomer = Math.round((r.priceRange[0] + r.priceRange[1]) / 2);
  const customersAtLaunch = Math.max(1, Math.round((r.customerRange[0] + r.customerRange[1]) / 2));
  const monthlyOpCosts = Math.round((r.costRange[0] * 0.45 + r.costRange[1] * 0.55) / 100) * 100;
  const monthlyRevenue = pricePerCustomer * customersAtLaunch;
  const contribution = Math.max(monthlyRevenue - monthlyOpCosts, 1);
  const estimatedBreakEven = Math.min(48, Math.max(3, Math.ceil(startingCapital / contribution)));
  const estimatedRevM12 = Math.round(monthlyRevenue * 2.4);

  return {
    idea: `${seed.concept} for a specific underserved ${seed.industry.replace(/_/g, ' ')} customer segment`,
    differentiator: 'Narrow customer focus, benchmark-bounded pricing, and controlled launch scope reduce early cash-burn risk.',
    targetCustomer: `Price-sensitive but quality-focused buyers already spending in ${seed.industry.replace(/_/g, ' ')} channels`,
    startingCapital,
    pricePerCustomer,
    customersAtLaunch,
    monthlyOpCosts,
    estimatedBreakEven,
    estimatedRevM12,
    grossMarginPct: seed.industry.includes('saas') || seed.industry.includes('technology') ? 78 : 58,
    riskNote: 'The main risk is demand overestimation before repeat-purchase behavior is proven.',
    mitigationStrategy: 'Launch with a paid pilot cohort, cap fixed costs, and validate repeat purchase before scaling spend.',
    _seedIndustry: seed.industry,
    _engineVersion: 'v2.1-deterministic-fallback',
    degraded: true,
  };
}

serve(async (req) => {
  const reqId = getRequestId(req);
  const log = createLogger('generate-idea', reqId);

  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let quotaReserved = false;
  let quotaClient: ReturnType<typeof createClient> | null = null;

  try {
    // ========== QUOTA GATE: Free gets 5/mo; Plus/Pro are unlimited ==========
    // Require auth because usage is attached to a user account, not device storage.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Sign in to use your 5 free random ideas.", code: "AUTH_REQUIRED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      quotaClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims } = await quotaClient.auth.getClaims(authHeader.replace("Bearer ", ""));
      if (!claims?.claims?.sub) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: quota, error: quotaError } = await quotaClient.rpc('increment_idea_generation_usage');
      if (quotaError) throw quotaError;
      const q = quota as { ok?: boolean; reason?: string; limit?: number; used?: number; remaining?: number; planTier?: string } | null;
      if (!q?.ok) {
        return new Response(
          JSON.stringify({
            error: 'IDEA_QUOTA_EXCEEDED',
            message: `You've used all ${q?.limit ?? 5} free random ideas this month.`,
            planTier: q?.planTier ?? 'free',
            used: q?.used ?? q?.limit ?? 5,
            limit: q?.limit ?? 5,
            remaining: 0,
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      quotaReserved = true;
    }

    const { industry } = await req.json();


    const seed = getRandomSeed(industry);
    const r = seed.ranges;

    const systemPrompt = `You are AIWMC Quantis — a financial pre-mortem engine with 99.9% analytical accuracy.

ROLE: Generate ONE hyper-specific, non-generic, financially-calculable business idea.

SEED INSPIRATION (use as a starting point, then ADD your own creative twist):
"${seed.concept}"

FINANCIAL GUARDRAILS for ${seed.industry} sector:
- Starting capital: $${r.capitalRange[0].toLocaleString()}–$${r.capitalRange[1].toLocaleString()}
- Price per customer: $${r.priceRange[0]}–$${r.priceRange[1]}
- Realistic customers at launch: ${r.customerRange[0]}–${r.customerRange[1]}
- Monthly operating costs: $${r.costRange[0].toLocaleString()}–$${r.costRange[1].toLocaleString()}

ACCURACY RULES (CRITICAL):
1. All numbers MUST be internally consistent: Revenue = price × customers × frequency
2. Break-even month = startup_investment / (monthly_revenue - monthly_costs), rounded up
3. Month-12 revenue must account for realistic growth (5-15% MoM for good, 2-5% for conservative)
4. Monthly costs must include: rent/hosting, labor, COGS, marketing, insurance/legal, software
5. Starting capital must cover: buildout/setup + 3 months operating runway + marketing launch budget
6. If break-even > 36 months, the idea needs restructuring — flag this
7. NEVER invent unrealistic margins: use industry benchmarks (food 60-70% gross, SaaS 75-85%, services 50-65%)

DIFFERENTIATION RULES:
- Must name a SPECIFIC target customer segment (not "everyone" or "businesses")
- Must include ONE defensible competitive advantage (proprietary tech, exclusive partnership, regulatory moat, network effect)
- Must be launchable within 90 days with the stated capital

Respond ONLY via the suggest_idea tool. Make numbers precise (not round thousands).`;

    const aiResult = await aiCall(
      {
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate a unique, investment-ready ${industry || seed.industry} business idea. Make it specific enough that a founder could pitch it tomorrow. Include precise financial projections that pass reconciliation checks.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_idea",
              description: "Return a specific, financially-validated business idea",
              parameters: {
                type: "object",
                properties: {
                  idea: { type: "string", description: "One-sentence specific concept with target customer and location context" },
                  differentiator: { type: "string", description: "The specific financial moat, competitive edge, or market inefficiency exploited" },
                  targetCustomer: { type: "string", description: "Specific customer persona (age, income, pain point)" },
                  startingCapital: { type: "number", description: "Total capital needed to launch (USD)" },
                  pricePerCustomer: { type: "number", description: "Average transaction value (USD)" },
                  customersAtLaunch: { type: "number", description: "Realistic month-1 customer count" },
                  monthlyOpCosts: { type: "number", description: "Total monthly operating expenses (USD)" },
                  estimatedBreakEven: { type: "number", description: "Months to reach profitability" },
                  estimatedRevM12: { type: "number", description: "Projected monthly revenue at month 12 (USD)" },
                  grossMarginPct: { type: "number", description: "Gross margin percentage (0-100)" },
                  riskNote: { type: "string", description: "Primary risk factor that could cause failure" },
                  mitigationStrategy: { type: "string", description: "How to mitigate the primary risk" },
                },
                required: [
                  "idea", "differentiator", "targetCustomer",
                  "startingCapital", "pricePerCustomer", "customersAtLaunch",
                  "monthlyOpCosts", "estimatedBreakEven", "estimatedRevM12",
                  "grossMarginPct", "riskNote", "mitigationStrategy",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_idea" } },
      },
      { task: 'generate-idea', metadata: { industry: industry || seed.industry } },
    );

    if (!aiResult.ok) {
      log.error("AI gateway error:", aiResult.status, aiResult.error);
      const userMsg =
        aiResult.status === 429 ? "Rate limit exceeded. Try again shortly." :
        aiResult.status === 402 ? "Credits exhausted. Please add funds in Settings > Workspace > Usage." :
        aiResult.message;
      return new Response(
        JSON.stringify({ error: userMsg, code: aiResult.error }),
        { status: aiResult.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const choices = aiResult.data.choices as Array<{ message?: { tool_calls?: Array<{ function: { arguments: string } }> } }> | undefined;
    const toolCall = choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);

    // ── POST-GENERATION VALIDATION ──
    // Sanity-check the AI's numbers against seed ranges and internal consistency
    const monthlyRev = result.pricePerCustomer * result.customersAtLaunch;
    const impliedBreakEven = monthlyRev > result.monthlyOpCosts
      ? Math.ceil(result.startingCapital / (monthlyRev - result.monthlyOpCosts))
      : 99;

    // If AI break-even diverges >50% from calculated, override with computed value
    if (Math.abs(result.estimatedBreakEven - impliedBreakEven) / Math.max(impliedBreakEven, 1) > 0.5) {
      result.estimatedBreakEven = impliedBreakEven;
      result._corrected = true;
    }

    // Clamp gross margin to realistic bounds
    if (result.grossMarginPct > 95) result.grossMarginPct = 85;
    if (result.grossMarginPct < 10) result.grossMarginPct = 25;

    // Tag with metadata
    result._seedIndustry = seed.industry;
    result._engineVersion = "v2.0-100cases";

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log.error("generate-idea error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
