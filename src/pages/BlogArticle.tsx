import React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSEO } from '@/components/seo/PageSEO';
import { Footer } from '@/components/layout/Footer';
import { BLOG_ARTICLES } from './Blog';

// Article content map
const ARTICLE_CONTENT: Record<string, React.ReactNode> = {
  'validate-startup-idea-using-ai': (
    <>
      <p>Most startup ideas fail not because they're bad — but because founders skip structured validation. They jump from idea to code, skipping the financial logic that determines whether the business can actually work.</p>
      
      <h2>Why Traditional Validation Falls Short</h2>
      <p>Traditional approaches — customer interviews, landing page tests, competitor research — cover product-market fit but ignore the financial structure. You can have 1,000 interested users and still build an unprofitable business.</p>
      <p>AI-powered validation solves this by combining industry benchmarks, unit economics, and risk analysis into a single structured output — in minutes, not weeks.</p>
      
      <h2>Step 1: Define Your Business Model Clearly</h2>
      <p>Before any analysis, you need clarity on: What are you selling? Who pays? How much? How often? What does it cost to acquire and serve each customer?</p>
      <p>AI tools can help structure this — but only if you provide a clear description of your idea and target market.</p>
      
      <h2>Step 2: Run Financial Logic Through Benchmarks</h2>
      <p>Every industry has baseline metrics: gross margins, customer acquisition costs (CAC), lifetime value (LTV), churn rates, and average transaction values. Your idea should be measured against these.</p>
      <p>For example, a SaaS product with 80% gross margin but $500 CAC and $200 LTV has a fundamental unit economics problem that no amount of growth will fix.</p>
      
      <h2>Step 3: Identify Risk Signals Early</h2>
      <p>Risk isn't just "will anyone buy this." It includes:</p>
      <ul>
        <li><strong>Market risk:</strong> Is the market large enough and growing?</li>
        <li><strong>Financial risk:</strong> Can you reach profitability before running out of money?</li>
        <li><strong>Operational risk:</strong> Can you deliver at the projected cost structure?</li>
        <li><strong>Competitive risk:</strong> What's your defensibility?</li>
      </ul>
      
      <h2>Step 4: Generate Scenario Projections</h2>
      <p>Don't plan for one outcome. Generate pessimistic, realistic, and optimistic scenarios. This shows you the range of possible outcomes and helps you prepare for downside cases.</p>
      
      <h2>Step 5: Make a Decision with Data</h2>
      <p>With structured financial logic, risk signals, and projections in hand, you can make a clear-headed decision: build, pivot, or move on. This is validation — not motivation, not vibes, not gut feel.</p>
      
      <h2>How AIWMC Quantis Automates This</h2>
      <p>Quantis runs all five steps automatically. You describe your idea and location, and the AI returns structured financial analysis, risk assessment, and 3-scenario projections — in under 90 seconds.</p>
      <p>It's the same framework VCs and accelerators use, made accessible to founders who are just getting started.</p>
    </>
  ),
  '5-financial-mistakes-early-founders-make': (
    <>
      <p>After analyzing thousands of business ideas, clear patterns emerge. Here are the five financial mistakes that kill startups before they launch — and how to avoid them.</p>
      
      <h2>1. Ignoring Unit Economics</h2>
      <p>The most common mistake: founders focus on revenue without understanding whether each customer is profitable. If your CAC exceeds your LTV, more customers means more losses.</p>
      <p><strong>Fix:</strong> Calculate your unit economics before building. Know your CAC, LTV, gross margin, and payback period.</p>
      
      <h2>2. Underestimating Fixed Costs</h2>
      <p>Founders routinely underestimate rent, salaries, software, insurance, and operational overhead by 40-60%. This creates a false sense of profitability in projections.</p>
      <p><strong>Fix:</strong> Use industry benchmarks for your location. A coffee shop in Denver has very different fixed costs than one in Miami.</p>
      
      <h2>3. Over-Optimistic Revenue Projections</h2>
      <p>Revenue projections based on "if we capture just 1% of the market" sound conservative but are often wildly optimistic. Market capture takes time, money, and proven channels.</p>
      <p><strong>Fix:</strong> Build projections bottom-up from realistic customer acquisition rates, not top-down from market size.</p>
      
      <h2>4. No Scenario Planning</h2>
      <p>Single-scenario planning is a recipe for surprise. Markets shift, costs increase, and growth takes longer than expected.</p>
      <p><strong>Fix:</strong> Always model pessimistic, realistic, and optimistic cases. Your plan should survive the pessimistic scenario.</p>
      
      <h2>5. Skipping Risk Assessment</h2>
      <p>Founders are natural optimists — which means they systematically underestimate risks. Market competition, regulatory changes, supply chain issues, and team dependencies are real threats.</p>
      <p><strong>Fix:</strong> Run a structured risk assessment before investing. Identify the top 5 risks and have mitigation plans for each.</p>
      
      <h2>The Bottom Line</h2>
      <p>Financial discipline isn't about being pessimistic. It's about being prepared. Founders who validate their financial logic before building are significantly more likely to survive the first two years.</p>
    </>
  ),
  'ai-vs-traditional-business-planning': (
    <>
      <p>Business planning hasn't changed much in 30 years. Write a 50-page document, hire a consultant, wait weeks for financial models. AI is changing this — but is it actually better?</p>
      
      <h2>Traditional Business Planning</h2>
      <p><strong>Pros:</strong> Deep customization, human judgment on nuance, relationship with advisors.</p>
      <p><strong>Cons:</strong> Expensive ($5,000-$50,000 for consultants), slow (4-12 weeks), often biased toward the conclusion the founder wants to hear.</p>
      
      <h2>AI-Powered Validation</h2>
      <p><strong>Pros:</strong> Fast (minutes, not weeks), data-driven (based on real benchmarks), objective (no emotional bias), affordable.</p>
      <p><strong>Cons:</strong> Less nuance on highly unique business models, can't replace deep industry expertise for complex ventures.</p>
      
      <h2>When to Use AI Validation</h2>
      <ul>
        <li>Early-stage idea validation — before spending money</li>
        <li>Quick feasibility checks across multiple ideas</li>
        <li>Financial structuring when you don't have a CFO</li>
        <li>Risk screening before committing to a direction</li>
      </ul>
      
      <h2>When to Use Traditional Planning</h2>
      <ul>
        <li>Series A+ fundraising where investor relationships matter</li>
        <li>Highly regulated industries needing specialized compliance</li>
        <li>Complex multi-stakeholder businesses</li>
        <li>When you need a named advisor for credibility</li>
      </ul>
      
      <h2>The Best Approach: Both</h2>
      <p>Smart founders use AI validation first to screen and structure their thinking, then engage consultants for the specific areas that need human expertise. This saves thousands in consulting fees and weeks of time.</p>
      <p>AI handles the 80% (financial logic, benchmarks, risk scoring). Humans handle the 20% (strategy, relationships, judgment calls).</p>
    </>
  ),
  'how-to-calculate-startup-costs': (
    <>
      <p>One of the most common reasons startups fail isn't a bad idea — it's running out of money. And that usually happens because founders underestimate how much it actually costs to get started.</p>
      
      <h2>Why Startup Cost Estimation Matters</h2>
      <p>Before you write a single line of code or sign a lease, you need to know your burn rate. How much will you spend per month before generating revenue? How many months of runway do you need? These questions determine whether your business survives the startup phase.</p>
      
      <h2>The Three Categories of Startup Costs</h2>
      <h3>1. Fixed Costs (Monthly)</h3>
      <p>These are costs you pay regardless of revenue: rent, salaries, software subscriptions, insurance, and utilities. For a coffee shop in Denver, expect $8,000-$15,000/month in fixed costs. For a SaaS startup, $2,000-$5,000/month.</p>
      
      <h3>2. Variable Costs (Per Unit)</h3>
      <p>Costs that scale with your output: raw materials, transaction fees, shipping, and customer support. Your gross margin is revenue minus variable costs — and it determines whether scaling makes you money or loses it faster.</p>
      
      <h3>3. One-Time Setup Costs</h3>
      <p>Equipment, legal fees, branding, initial inventory, and deposits. These are your "Day 1" costs before the business even opens.</p>
      
      <h2>Location Matters More Than You Think</h2>
      <p>The same business in New York City costs 2-3x more to run than in Austin, Texas. Rent, salaries, and even utilities vary dramatically. AIWMC Quantis adjusts all projections for 50+ cities worldwide, so your numbers reflect reality — not averages.</p>
      
      <h2>The Break-Even Formula</h2>
      <p>Break-even point = Fixed Costs ÷ (Price per Unit - Variable Cost per Unit). This tells you exactly how many customers you need to cover your costs. If that number seems unrealistically high for your market, reconsider your pricing or cost structure before launching.</p>
      
      <h2>Common Estimation Mistakes</h2>
      <ul>
        <li><strong>Forgetting hidden costs:</strong> Payment processing fees, accounting software, legal compliance, and insurance add up to 15-25% of your estimated budget.</li>
        <li><strong>Underestimating time to revenue:</strong> Most businesses take 3-6 months to generate meaningful revenue. Budget for at least 6 months of runway.</li>
        <li><strong>Ignoring seasonality:</strong> A beach rental business will have 3-4 strong months and 8 lean ones. Your cost structure must survive the off-season.</li>
      </ul>
      
      <h2>How to Get Accurate Startup Cost Estimates</h2>
      <p>AIWMC Quantis calculates startup costs using industry benchmarks from 1,000+ business scenarios, adjusted for your specific location. Enter your business idea and city, and get a complete cost breakdown — fixed costs, variable costs, break-even point, and payback period — in under 90 seconds.</p>
    </>
  ),
  'unit-economics-explained-for-founders': (
    <>
      <p>Unit economics is the single most important concept for any founder to understand. It answers the fundamental question: "Does this business make money on each customer, or lose it?"</p>
      
      <h2>What Are Unit Economics?</h2>
      <p>Unit economics measures the revenue and costs associated with a single "unit" of your business — usually one customer. If each customer generates more revenue than they cost to acquire and serve, your business is fundamentally sound. If not, growing faster just means losing money faster.</p>
      
      <h2>Customer Acquisition Cost (CAC)</h2>
      <p>CAC is the total cost to acquire one new customer. This includes marketing spend, sales team costs, advertising, and any tools used for outreach — divided by the number of customers acquired in that period.</p>
      <p><strong>Formula:</strong> CAC = Total Sales & Marketing Spend ÷ New Customers Acquired</p>
      <p><strong>Example:</strong> If you spend $5,000/month on marketing and acquire 100 customers, your CAC is $50.</p>
      <p>Industry benchmarks vary widely: B2C e-commerce averages $10-$50 CAC, while B2B SaaS can range from $200-$1,000+.</p>
      
      <h2>Lifetime Value (LTV)</h2>
      <p>LTV is the total revenue you expect from a single customer over their entire relationship with your business. It depends on three factors: average transaction value, purchase frequency, and customer lifespan.</p>
      <p><strong>Formula:</strong> LTV = Average Revenue per Customer × Customer Lifetime (in months)</p>
      <p><strong>Example:</strong> If a customer pays $29/month and stays for 14 months on average, LTV = $406.</p>
      
      <h2>The LTV/CAC Ratio</h2>
      <p>This is the most important metric in startup economics. It tells you how much value you get for every dollar spent on acquisition.</p>
      <ul>
        <li><strong>LTV/CAC &lt; 1:</strong> You're losing money on every customer. Stop spending on acquisition immediately.</li>
        <li><strong>LTV/CAC = 1-2:</strong> Barely profitable. You need to either reduce CAC or increase retention.</li>
        <li><strong>LTV/CAC = 3-5:</strong> Healthy business. This is the target range for most startups.</li>
        <li><strong>LTV/CAC &gt; 5:</strong> Excellent — you may be underinvesting in growth.</li>
      </ul>
      
      <h2>Payback Period</h2>
      <p>Even if your LTV/CAC ratio is healthy, you need to consider how long it takes to recover your acquisition cost. A 12-month payback period means you need 12 months of cash flow before each customer becomes profitable.</p>
      <p><strong>Formula:</strong> Payback Period = CAC ÷ Monthly Revenue per Customer</p>
      <p>For bootstrapped startups, aim for a payback period under 6 months. VC-backed companies can tolerate 12-18 months.</p>
      
      <h2>Churn Rate: The Silent Killer</h2>
      <p>Monthly churn rate directly impacts LTV. If 5% of customers leave each month, your average customer lifetime is only 20 months. At 10% churn, it drops to 10 months — cutting your LTV in half.</p>
      <p>Reducing churn by even 1-2% can have a bigger impact on profitability than doubling your marketing budget.</p>
      
      <h2>How Quantis Calculates Your Unit Economics</h2>
      <p>AIWMC Quantis automatically calculates CAC, LTV, LTV/CAC ratio, payback period, and churn impact for your specific business idea — using benchmarks from 1,000+ industry scenarios. You'll see exactly where your business stands and what metrics need to improve before you invest.</p>
    </>
  ),
  'how-to-stress-test-your-startup': (
    <>
      <p>Most founders plan for success. Very few plan for pressure. Stress-testing your business model before launch means asking: "What happens when things go wrong?" — and having real numbers to answer with.</p>

      <h2>Why Most Founders Skip Stress Testing (And Pay For It)</h2>
      <p>90% of startups fail, and the #1 reason is running out of money. Not because the idea was bad — but because the financial model couldn't survive reality. Revenue came slower than expected. Costs were higher. The market shifted.</p>
      <p>Stress testing exposes these vulnerabilities <strong>before</strong> you invest time and money. It's the difference between launching with confidence and launching with hope.</p>

      <h2>The 3 Scenarios Every Business Model Needs</h2>
      <p>A single-scenario plan is a wish. You need three:</p>
      <ul>
        <li><strong>Conservative (Pessimistic):</strong> Revenue 30% below expectations, costs 15% above. This is your survival scenario — can the business stay alive?</li>
        <li><strong>Realistic (Base):</strong> Industry-average growth rates, benchmarked costs. This is your planning scenario.</li>
        <li><strong>Optimistic:</strong> Strong product-market fit, efficient acquisition. This is your upside scenario — what happens when things go right?</li>
      </ul>
      <p>If your business model breaks in the conservative scenario, you have a structural problem that needs fixing before launch.</p>

      <h2>How to Run a Financial Stress Test in 60 Seconds</h2>
      <p>With AIWMC Quantis, enter your business idea and location. The engine automatically:</p>
      <ul>
        <li>Calculates revenue projections using industry benchmarks</li>
        <li>Runs all three scenarios with location-adjusted costs</li>
        <li>Identifies risk flags — fragile assumptions that could break the model</li>
        <li>Generates an action plan: what to cut, where to invest, whether to proceed</li>
      </ul>

      <h2>Real Example: Coffee Shop Under Pressure</h2>
      <p>We stress-tested a coffee shop with remote work focus in Denver. Base case: $4,200/mo profit, 7.1-month payback. But in the conservative scenario (20% less foot traffic, 10% higher rent), profit drops to $1,800/mo — still viable, but the payback extends to 14 months.</p>
      <p>That information changes how you plan: you'd want 14 months of runway, not 7. Without stress testing, you'd run out of money thinking everything was fine.</p>

      <h2>What to Do When Your Model Breaks</h2>
      <p>If the conservative scenario shows losses, you have three options:</p>
      <ul>
        <li><strong>Reduce fixed costs:</strong> Can you start smaller? Shared space? Fewer hires?</li>
        <li><strong>Increase margins:</strong> Can you charge more? Reduce COGS? Bundle services?</li>
        <li><strong>Pivot the model:</strong> Is there an adjacent business model that's more resilient?</li>
      </ul>
      <p>The goal isn't to guarantee success — it's to ensure you're not walking into a financial trap.</p>
    </>
  ),
  'startup-validation-checklist': (
    <>
      <p>Before you write code, sign a lease, or pitch an investor, answer these seven questions. They separate businesses that survive from ones that don't.</p>

      <h2>1. Is There a Real Problem?</h2>
      <p>Not "would people like this" — but "are people actively spending money or time trying to solve this today?" If no one is paying for a solution (or a workaround), there may not be a market.</p>
      <p><strong>Validation signal:</strong> You can find existing competitors, substitute products, or manual workarounds that people are currently using.</p>

      <h2>2. Can You Make Money on Each Customer?</h2>
      <p>This is unit economics. If your Customer Acquisition Cost (CAC) exceeds your Customer Lifetime Value (LTV), more customers means more losses. Calculate this before building.</p>
      <p><strong>Target:</strong> LTV/CAC ratio of 3:1 or higher. Anything below 2:1 is a red flag.</p>

      <h2>3. What Kills This Business?</h2>
      <p>Every business has 2-3 assumptions that, if wrong, would be fatal. For a restaurant: foot traffic. For SaaS: churn rate. For e-commerce: return rate. Identify yours and stress-test them.</p>

      <h2>4. How Long Until Profitability?</h2>
      <p>Payback period tells you how many months of cash you need before the business sustains itself. If it's 18 months, you need 18 months of runway — plus a buffer. Most founders underestimate this by 40-60%.</p>

      <h2>5. What Does the Data Say?</h2>
      <p>Industry benchmarks exist for almost every business type: average margins, typical CAC, churn rates, seasonal patterns. Your assumptions should be calibrated against this data, not invented from scratch.</p>
      <p>AIWMC Quantis automatically provides benchmark comparisons for 50+ industries.</p>

      <h2>6. Does the Location Work?</h2>
      <p>The same business in San Francisco costs 2-3x more to run than in Austin. Rent, salaries, regulations, and customer density all vary dramatically. Make sure your financial model is location-adjusted.</p>

      <h2>7. When to Proceed vs When to Pivot</h2>
      <p>If your idea passes questions 1-6 with reasonable numbers, proceed. If 2+ answers are red flags, pivot the model — don't abandon the problem, but find a more viable way to solve it.</p>
      <p>Validation isn't about proving your idea is perfect. It's about proving it's viable enough to bet your time on.</p>
    </>
  ),
  'ai-vs-spreadsheets-startup-planning': (
    <>
      <p>Every founder faces this choice: build a financial model in a spreadsheet, or use an AI-powered tool. Here's an honest comparison based on speed, accuracy, cost, and when each approach wins.</p>

      <h2>The Spreadsheet Problem</h2>
      <p>Spreadsheets are powerful but dangerous for financial planning:</p>
      <ul>
        <li><strong>Time:</strong> Building a proper financial model takes 20-40 hours. Most founders don't have that.</li>
        <li><strong>Errors:</strong> 88% of spreadsheets contain errors (University of Hawaii study). One wrong formula compounds across the entire model.</li>
        <li><strong>Bias:</strong> You built it, so you unconsciously make assumptions that support your desired outcome.</li>
        <li><strong>Benchmarks:</strong> Spreadsheets don't know your industry's typical margins, CAC, or churn. You're guessing.</li>
      </ul>

      <h2>What AI Actually Does Differently</h2>
      <p>AI-powered validation tools like AIWMC Quantis solve the spreadsheet problems:</p>
      <ul>
        <li><strong>Speed:</strong> 60 seconds vs 20-40 hours. Enter your idea and location, get a complete financial model.</li>
        <li><strong>Benchmarks:</strong> Every calculation is grounded in 1,000+ industry benchmarks. No guessing.</li>
        <li><strong>Objectivity:</strong> The engine doesn't care about your feelings. It shows you the math.</li>
        <li><strong>Scenarios:</strong> Automatic conservative/realistic/optimistic projections. No manual formula copying.</li>
      </ul>

      <h2>When Spreadsheets Still Win</h2>
      <p>AI isn't always the answer. Spreadsheets are better when:</p>
      <ul>
        <li>You need a <strong>custom model</strong> with unique business logic (e.g., marketplace with two-sided pricing)</li>
        <li>You're building an <strong>investor deck</strong> that needs specific formatting and assumptions investors will scrutinize</li>
        <li>You need <strong>real-time collaboration</strong> with a co-founder or CFO on the same model</li>
        <li>Your business is <strong>post-revenue</strong> and you're modeling from actual historical data</li>
      </ul>

      <h2>Side-by-Side Comparison</h2>
      <p>Here's how they stack up:</p>
      <ul>
        <li><strong>Time to first model:</strong> AI = 60 seconds. Spreadsheet = 20-40 hours.</li>
        <li><strong>Cost:</strong> AI = $0-17/month. Spreadsheet = free tool, but 20+ hours of your time.</li>
        <li><strong>Industry benchmarks:</strong> AI = built-in. Spreadsheet = manual research required.</li>
        <li><strong>Error rate:</strong> AI = deterministic calculations. Spreadsheet = 88% contain errors.</li>
        <li><strong>Customization:</strong> AI = limited to framework. Spreadsheet = fully custom.</li>
        <li><strong>Scenario modeling:</strong> AI = automatic 3 scenarios. Spreadsheet = manual setup.</li>
      </ul>

      <h2>The Best Approach: Use Both</h2>
      <p>Smart founders use AI validation first to screen and structure their thinking — then build a custom spreadsheet only for the ideas that pass initial validation. This saves weeks of wasted modeling on ideas that don't survive basic financial logic.</p>
      <p>AI handles the 80% (benchmarks, scenarios, risk scoring). Spreadsheets handle the 20% (custom models, investor presentations, detailed operational planning).</p>
    </>
  ),
};

export default function BlogArticle() {
  const { slug } = useParams<{ slug: string }>();
  const article = BLOG_ARTICLES.find(a => a.slug === slug);
  const content = slug ? ARTICLE_CONTENT[slug] : null;

  if (!article || !content) {
    return <Navigate to="/blog" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageSEO
        title={`${article.title} — AIWMC Quantis`}
        description={article.description}
        canonical={`/blog/${article.slug}`}
        ogType="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title,
          description: article.description,
          image: 'https://aiwmcquantis.com/og-image.png',
          datePublished: article.date,
          dateModified: article.date,
          author: { '@type': 'Person', name: 'Bogdan Jeltov', url: 'https://aiwmcquantis.com' },
          publisher: { '@type': 'Organization', name: 'AIWMC AI Agency LLC', logo: { '@type': 'ImageObject', url: 'https://aiwmcquantis.com/icon-512.png' } },
          mainEntityOfPage: { '@type': 'WebPage', '@id': `https://aiwmcquantis.com/blog/${article.slug}` },
          ...(article.keywords && { keywords: article.keywords.join(', ') }),
          articleSection: article.category,
        }}
      />

      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-bold text-foreground">AIWMC Quantis</span>
            </Link>
            <Link to="/app">
              <Button size="sm" className="gap-2 min-h-[48px] px-5 text-sm font-semibold">
                Start Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to blog
        </Link>

        <article>
          <div className="flex items-center gap-3 mb-4">
            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {article.category}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {new Date(article.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {article.readTime}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
            {article.title}
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            {article.description}
          </p>

          <div className="prose prose-neutral dark:prose-invert max-w-none
            [&>h2]:text-xl [&>h2]:font-bold [&>h2]:text-foreground [&>h2]:mt-8 [&>h2]:mb-3
            [&>p]:text-muted-foreground [&>p]:leading-relaxed [&>p]:mb-4
            [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2 [&>ul]:mb-4
            [&>ul>li]:text-muted-foreground
            [&_strong]:text-foreground
          ">
            {content}
          </div>
        </article>

        {/* CTA */}
        <div className="mt-16 text-center p-8 rounded-2xl bg-primary/5 border border-primary/20">
          <h2 className="text-2xl font-bold text-foreground mb-3">Ready to validate your idea?</h2>
          <p className="text-muted-foreground mb-6">Revenue projections, risk flags, and a clear action plan — free, in under 90 seconds.</p>
          <Link to="/app">
            <Button size="lg" className="gap-2 py-6 px-8">
              See My Numbers — Free <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
