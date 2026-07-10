import React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowRight, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSEO } from '@/components/seo/PageSEO';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard } from '@/components/ui/glass-card';
import { BLOG_ARTICLES } from './Blog';

const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

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
      <p>AIWMC Quantis calculates startup costs using industry benchmarks from 97,500 business scenarios, adjusted for your specific location. Enter your business idea and city, and get a complete cost breakdown — fixed costs, variable costs, break-even point, and payback period — in under 90 seconds.</p>
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
      <p>AIWMC Quantis automatically calculates CAC, LTV, LTV/CAC ratio, payback period, and churn impact for your specific business idea — using benchmarks from 97,500 industry scenarios. You'll see exactly where your business stands and what metrics need to improve before you invest.</p>
    </>
  ),
  'how-to-stress-test-your-startup': (
    <>
      <p>Most founders plan for success. Very few plan for pressure. Stress-testing your business model before launch means asking: "What happens when things go wrong?" — and having real numbers to answer with.</p>

      <h2>Why Most Founders Skip Stress Testing (And Pay For It)</h2>
      <p>Roughly half of new businesses don't reach their fifth year, and running out of money is a leading cause. Not because the idea was bad — but because the financial model couldn't survive reality. Revenue came slower than expected. Costs were higher. The market shifted.</p>
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
        <li><strong>Benchmarks:</strong> Every calculation is grounded in 97,500 industry benchmarks. No guessing.</li>
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
  'coffee-shop-startup-costs-by-city': (
    <>
      <p>Opening a coffee shop is one of the most searched-for business ideas in America — and one of the most location-dependent. The same concept that thrives in Austin can bleed money in Manhattan. Here's what the real numbers look like in 2026.</p>

      <h2>Why Location Changes Everything for Coffee Shops</h2>
      <p>A coffee shop's profitability depends on three location-driven variables: rent, labor costs, and foot traffic density. A 1,200 sq ft space in Denver's LoHi neighborhood costs $3,500-$5,000/month. The same space in NYC's SoHo district costs $12,000-$18,000/month. That's a 3-4× cost difference that directly impacts your break-even timeline.</p>

      <h2>Denver, Colorado — The Sweet Spot</h2>
      <p>Denver consistently ranks as one of the best cities for independent coffee shops. Here's why:</p>
      <ul>
        <li><strong>Startup cost:</strong> $95,000-$145,000 (equipment, buildout, permits, initial inventory)</li>
        <li><strong>Monthly rent:</strong> $3,500-$5,500 for a 1,000-1,400 sq ft space</li>
        <li><strong>Monthly labor:</strong> $8,000-$12,000 (3-5 employees at $16-$19/hr)</li>
        <li><strong>Average ticket:</strong> $6.50-$8.50</li>
        <li><strong>Projected monthly profit:</strong> $3,800-$5,200 at steady state</li>
        <li><strong>Break-even:</strong> 7-10 months</li>
      </ul>
      <p>Denver's combination of strong remote-work culture, high coffee consumption per capita, and moderate commercial rents creates a favorable unit economics environment.</p>

      <h2>Austin, Texas — High Growth, Rising Costs</h2>
      <p>Austin's tech boom has driven both demand and costs upward:</p>
      <ul>
        <li><strong>Startup cost:</strong> $110,000-$165,000</li>
        <li><strong>Monthly rent:</strong> $4,200-$7,000 (rising fast in central neighborhoods)</li>
        <li><strong>Monthly labor:</strong> $7,500-$11,000 (lower minimum wage but competitive market)</li>
        <li><strong>Average ticket:</strong> $7.00-$9.00</li>
        <li><strong>Projected monthly profit:</strong> $3,200-$4,800</li>
        <li><strong>Break-even:</strong> 9-13 months</li>
      </ul>
      <p>Austin's higher foot traffic and tech worker spending offset the rising rents — but margins are thinner than Denver's.</p>

      <h2>New York City — High Volume Required</h2>
      <p>NYC is a different game entirely. The numbers only work at high volume:</p>
      <ul>
        <li><strong>Startup cost:</strong> $180,000-$320,000 (key money, buildout, permits)</li>
        <li><strong>Monthly rent:</strong> $8,000-$18,000 depending on borough and foot traffic</li>
        <li><strong>Monthly labor:</strong> $14,000-$22,000 ($16-$21/hr minimum, higher turnover)</li>
        <li><strong>Average ticket:</strong> $8.00-$12.00</li>
        <li><strong>Projected monthly profit:</strong> $2,500-$6,500 (wide range based on location)</li>
        <li><strong>Break-even:</strong> 14-24 months</li>
      </ul>
      <p>NYC coffee shops need 300+ transactions/day to hit profitability. In Denver, 120-180 transactions/day is sufficient.</p>

      <h2>The Key Metrics That Predict Coffee Shop Success</h2>
      <ul>
        <li><strong>Rent-to-revenue ratio:</strong> Keep below 15%. Above 20% is a red flag.</li>
        <li><strong>Labor cost percentage:</strong> Target 25-35% of revenue.</li>
        <li><strong>COGS (coffee, milk, food):</strong> Industry average is 28-35% of revenue.</li>
        <li><strong>Daily transaction target:</strong> Calculate your break-even transaction count and measure against local foot traffic data.</li>
      </ul>

      <h2>Run Your Own Coffee Shop Analysis</h2>
      <p>AIWMC Quantis calculates location-adjusted projections for coffee shops in 50+ cities. Enter your concept and city, and get startup costs, monthly P&L, break-even timeline, and risk flags — all benchmarked against 97,500 industry benchmark observations.</p>
    </>
  ),
  'food-truck-profit-calculator': (
    <>
      <p>Food trucks have lower startup costs than restaurants, higher mobility, and growing consumer demand. But how much does a food truck actually make? The answer depends heavily on your city, cuisine type, and operating model.</p>

      <h2>Food Truck Economics: The Basics</h2>
      <p>Unlike restaurants, food trucks have two unique advantages: lower fixed costs (no lease) and location flexibility (you go where the customers are). But they also face unique challenges: weather dependency, permit complexity, and limited kitchen space.</p>

      <h2>Austin, Texas — The Food Truck Capital</h2>
      <p>Austin has the highest density of food trucks per capita in the U.S., which means proven demand but also competition:</p>
      <ul>
        <li><strong>Startup cost:</strong> $55,000-$95,000 (truck purchase/wrap, equipment, permits, initial inventory)</li>
        <li><strong>Monthly operating costs:</strong> $8,000-$14,000 (commissary, fuel, insurance, supplies, labor)</li>
        <li><strong>Average ticket:</strong> $12-$16</li>
        <li><strong>Daily transactions:</strong> 80-150 on good days, 30-60 on slow days</li>
        <li><strong>Projected monthly revenue:</strong> $18,000-$35,000</li>
        <li><strong>Projected monthly profit:</strong> $4,500-$8,000</li>
        <li><strong>Break-even:</strong> 6-10 months</li>
      </ul>
      <p>Austin's year-round outdoor culture, festival scene, and food-forward reputation make it ideal for food trucks.</p>

      <h2>Los Angeles, California — High Volume, High Competition</h2>
      <ul>
        <li><strong>Startup cost:</strong> $70,000-$120,000 (stricter health codes, higher truck costs)</li>
        <li><strong>Monthly operating costs:</strong> $12,000-$20,000</li>
        <li><strong>Average ticket:</strong> $14-$18</li>
        <li><strong>Projected monthly revenue:</strong> $22,000-$42,000</li>
        <li><strong>Projected monthly profit:</strong> $4,000-$9,000</li>
        <li><strong>Break-even:</strong> 8-14 months</li>
      </ul>
      <p>LA's permit process is notoriously complex. Budget $3,000-$5,000 and 2-3 months for licensing alone.</p>

      <h2>Miami, Florida — Seasonal Opportunity</h2>
      <ul>
        <li><strong>Startup cost:</strong> $50,000-$85,000</li>
        <li><strong>Monthly operating costs:</strong> $7,000-$13,000</li>
        <li><strong>Average ticket:</strong> $13-$17</li>
        <li><strong>Projected monthly revenue:</strong> $16,000-$30,000 (peak season), $8,000-$15,000 (off-season)</li>
        <li><strong>Projected monthly profit:</strong> $3,500-$7,500 (annualized)</li>
        <li><strong>Break-even:</strong> 7-12 months</li>
      </ul>
      <p>Miami's seasonality is the biggest factor: November through April is peak season with tourist traffic. Summer months require a strategy — catering, events, or a secondary fixed location.</p>

      <h2>The 5 Metrics That Determine Food Truck Profitability</h2>
      <ul>
        <li><strong>COGS ratio:</strong> Keep food costs at 28-35% of revenue. Above 40% means your menu pricing is wrong.</li>
        <li><strong>Average daily revenue:</strong> Target $800-$1,500/day for profitability. Below $500/day is unsustainable.</li>
        <li><strong>Event vs. street ratio:</strong> Trucks that do 50%+ catering/events have more predictable revenue.</li>
        <li><strong>Fuel + commissary costs:</strong> Often underestimated — budget $800-$1,500/month.</li>
        <li><strong>Permit renewal costs:</strong> Annual permit fees range from $500 (Austin) to $3,000+ (LA).</li>
      </ul>

      <h2>Calculate Your Food Truck Profitability</h2>
      <p>AIWMC Quantis models food truck economics for any city — including permit costs, seasonal adjustments, and local competition density. Get your full financial projection in under 90 seconds.</p>
    </>
  ),
  'how-to-validate-restaurant-idea': (
    <>
      <p>Restaurants have a 60% failure rate in the first year and an 80% failure rate within five years. Most of these failures are predictable — and preventable — with proper financial validation before signing a lease.</p>

      <h2>Why Restaurants Fail: It's Usually the Numbers, Not the Food</h2>
      <p>The romantic vision: amazing food, packed tables, rave reviews. The reality: 85% of restaurant failures are caused by financial mismanagement, not bad food. The three most common killers:</p>
      <ul>
        <li><strong>Undercapitalization:</strong> Running out of money before reaching profitability (usually 12-18 months)</li>
        <li><strong>Wrong location economics:</strong> Rent too high for the traffic the location generates</li>
        <li><strong>Poor unit economics:</strong> Food costs + labor + overhead exceed revenue per seat</li>
      </ul>

      <h2>The 7 Metrics That Predict Restaurant Survival</h2>

      <h3>1. Rent-to-Revenue Ratio</h3>
      <p>Industry standard: rent should be 6-10% of gross revenue. Above 12% is a red flag. If your projected revenue can't support the rent at this ratio, the location is wrong for your concept.</p>
      <p><strong>Example:</strong> If rent is $8,000/month, you need at minimum $80,000/month in revenue ($8,000 ÷ 10%).</p>

      <h3>2. Food Cost Percentage</h3>
      <p>Target: 28-35% of revenue. Fast casual can go lower (25-30%). Fine dining runs higher (32-40%). Calculate this for every menu item before finalizing your menu.</p>

      <h3>3. Labor Cost Percentage</h3>
      <p>Target: 25-35% of revenue. This is your second-largest expense. Include payroll taxes, benefits, and training costs — not just base wages.</p>

      <h3>4. Prime Cost (Food + Labor)</h3>
      <p>This is the most important restaurant metric. Target: 55-65% of revenue. Above 70% means you're losing money on operations even before rent and utilities.</p>

      <h3>5. Revenue Per Square Foot</h3>
      <p>Industry benchmark: $150-$500/sq ft annually for casual dining. Fine dining: $300-$800/sq ft. If your concept can't hit these numbers for your location, reconsider the format.</p>

      <h3>6. Average Revenue Per Available Seat Hour (RevPASH)</h3>
      <p>This measures how efficiently you use your space. Calculate: total revenue ÷ (number of seats × hours open). Target varies by concept, but tracking this daily reveals whether you have a demand problem or an efficiency problem.</p>

      <h3>7. Break-Even Point</h3>
      <p>Calculate: Fixed costs ÷ (1 - Variable cost percentage). This tells you exactly how much revenue you need per month to cover all costs. Most restaurants need 6-18 months to reach consistent break-even.</p>

      <h2>Location Validation: The Walk-Through Method</h2>
      <p>Before signing any lease:</p>
      <ul>
        <li><strong>Count foot traffic:</strong> Stand outside the location for 3 hours during your target meal period. Count pedestrians. Your conversion rate will be 1-3% of foot traffic.</li>
        <li><strong>Check competition density:</strong> How many restaurants within a 5-minute walk? Moderate competition validates demand. Oversaturation kills margins.</li>
        <li><strong>Verify parking/transit:</strong> For suburban locations, parking is critical. For urban locations, proximity to transit and office buildings matters more.</li>
        <li><strong>Research previous tenants:</strong> If the last 3 businesses in the space failed, there may be a structural problem with the location.</li>
      </ul>

      <h2>The Financial Stress Test</h2>
      <p>Run three scenarios before committing:</p>
      <ul>
        <li><strong>Conservative:</strong> 30% less revenue than projected, 15% higher costs. Can you survive 12 months at this level?</li>
        <li><strong>Realistic:</strong> Industry-average performance for your concept and location.</li>
        <li><strong>Optimistic:</strong> Strong word-of-mouth, efficient operations. What's the upside?</li>
      </ul>
      <p>If the conservative scenario shows losses beyond month 12, you need more capital, lower costs, or a different concept.</p>

      <h2>Validate Your Restaurant Concept with Data</h2>
      <p>AIWMC Quantis runs full financial validation for restaurant concepts in any city — including location-adjusted rent, labor costs, food cost benchmarks, and 3-scenario projections. Enter your restaurant idea and get startup costs, monthly P&L, break-even timeline, and risk flags in 90 seconds.</p>
      <p>Don't sign a lease until the numbers work on paper. The data is free — the mistakes are expensive.</p>
    </>
  ),
  'business-validation-for-financial-clients': (
    <>
      <p>Business validation for financial clients is the process of confirming a company's legal existence, ownership structure, and risk profile before a financial institution or service provider engages with it. Known formally as Know Your Business (KYB), this process sits at the intersection of regulatory compliance and risk management. FinCEN's Customer Due Diligence Rule and global Anti-Money Laundering frameworks make it mandatory, not optional. Skipping or shortcutting the financial client validation process exposed institutions to $3.2 billion in AML fines in 2024 alone. That number reflects what happens when validation is treated as a checkbox rather than a governance function.</p>

      <h2>What are the essential steps in business validation for financial clients?</h2>
      <p>The financial client validation process follows a defined sequence. Each step builds on the last, and skipping any one of them creates a gap that regulators will find.</p>
      <ul>
        <li><strong>Entity verification.</strong> Confirm the legal name, registration status, and jurisdiction of the business. Pull records from state or national registries to verify the entity exists and is in good standing.</li>
        <li><strong>Beneficial ownership mapping.</strong> Identify every individual who owns 25% or more of the entity, plus anyone with significant control. This is the most time-consuming step for complex corporate structures.</li>
        <li><strong>Sanctions and PEP screening.</strong> Run the entity and its owners against OFAC's SDN list, UN sanctions lists, and politically exposed persons (PEP) databases. This step must happen before any funds move.</li>
        <li><strong>Adverse media checks.</strong> Search for negative news coverage, regulatory actions, or fraud allegations tied to the business or its principals. Reputational risk is a real compliance exposure.</li>
        <li><strong>Document authentication.</strong> Collect and verify incorporation papers, articles of organization, and incumbency certificates. Missing incumbency certificates cause 1–2 week onboarding delays when legal teams have to chase down signed documents after the fact.</li>
        <li><strong>Initial risk scoring.</strong> Assign a risk tier based on entity type, jurisdiction, industry, ownership complexity, and screening results. This score drives every subsequent decision about due diligence depth and monitoring frequency.</li>
      </ul>
      <p><strong>Pro tip:</strong> Request all required documents in a single, structured checklist at the start of onboarding. Sending piecemeal requests is the single biggest driver of back-and-forth delays with client legal teams.</p>
      <p>Automated processes cut onboarding time from 14–45 days manually to 7–14 days with integrated API checks. That reduction matters because faster onboarding means faster revenue and a better client experience without sacrificing compliance quality.</p>

      <h2>Why is beneficial ownership verification critical in financial client validation?</h2>
      <p>Beneficial ownership verification is the step that separates real KYB from superficial entity checks. KYB requires "looking through" entities to find the humans who actually control them, a process far more complex than standard Know Your Customer (KYC) checks on individuals.</p>
      <p>FinCEN's CDD Rule defines two prongs for beneficial ownership: the ownership prong (anyone holding 25% or more) and the control prong (a single individual with significant managerial control, regardless of ownership percentage). Both prongs must be satisfied for every covered legal entity.</p>
      <p>The challenges that most teams underestimate include:</p>
      <ul>
        <li><strong>Multi-layered holding structures.</strong> A business may be owned by a holding company, which is owned by a trust, which names a foundation as beneficiary. Each layer requires its own verification.</li>
        <li><strong>Nominee arrangements.</strong> Some structures use nominees to obscure true controllers. Certified organizational charts are the primary tool for cutting through this.</li>
        <li><strong>Jurisdictional gaps.</strong> Entities registered in jurisdictions with weak disclosure requirements make ownership verification harder and require additional document requests.</li>
        <li><strong>Outdated records.</strong> Ownership changes after initial onboarding go undetected without ongoing monitoring triggers.</li>
      </ul>
      <p>Certified organizational charts are key to avoiding "ownership blindness" in complex structures. Ownership blindness means a compliance team approves a client without knowing who actually controls the money. That is the scenario that produces AML penalties.</p>
      <p><strong>Pro tip:</strong> Ask for a certified org chart at the document request stage, not after you have already started processing. Retrofitting ownership maps mid-onboarding is expensive and error-prone.</p>
      <p>Failure to identify ultimate beneficial owners (UBOs) is one of the most cited deficiencies in regulatory enforcement actions. The $3.2 billion in AML fines recorded in 2024 reflects, in large part, failures at this exact step.</p>

      <h2>How does a risk-based approach optimize business validation and ongoing monitoring?</h2>
      <p>A risk-based approach means calibrating the depth of due diligence and the frequency of ongoing review to the actual risk level of each client. Not every business client needs the same scrutiny. Treating a low-risk domestic retailer the same as a high-risk cross-border payment processor wastes resources and slows onboarding for clients who pose minimal exposure.</p>
      <p>The standard risk tier structure works as follows:</p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-4 text-foreground font-semibold">Risk tier</th>
              <th className="text-left py-2 pr-4 text-foreground font-semibold">Review frequency</th>
              <th className="text-left py-2 pr-4 text-foreground font-semibold">Due diligence level</th>
              <th className="text-left py-2 text-foreground font-semibold">Common triggers for escalation</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="py-2 pr-4 text-muted-foreground">Low</td>
              <td className="py-2 pr-4 text-muted-foreground">Every 5 years</td>
              <td className="py-2 pr-4 text-muted-foreground">Standard CDD</td>
              <td className="py-2 text-muted-foreground">Change in ownership, new jurisdiction</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 pr-4 text-muted-foreground">Medium</td>
              <td className="py-2 pr-4 text-muted-foreground">Every 3 years</td>
              <td className="py-2 pr-4 text-muted-foreground">Enhanced CDD</td>
              <td className="py-2 text-muted-foreground">Adverse media hit, PEP connection</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 text-muted-foreground">High</td>
              <td className="py-2 pr-4 text-muted-foreground">Annually</td>
              <td className="py-2 pr-4 text-muted-foreground">Full EDD</td>
              <td className="py-2 text-muted-foreground">Sanctions proximity, complex structure</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>Risk-based ongoing monitoring requires annual reviews for high-risk clients, every 3 years for medium-risk clients, and every 5 years for low-risk clients. These intervals are regulatory recommendations, not suggestions. Deviating from them without documented justification creates examination risk.</p>
      <p>Enhanced Due Diligence (EDD) applies when a client hits specific triggers: a connection to a sanctioned jurisdiction, a PEP in the ownership chain, unusual transaction patterns, or a significant change in business activity. EDD means more documents, more source-of-funds verification, and senior management sign-off before approval.</p>
      <p>Risk scores are less effective without a documented rationale file explaining why a client was accepted at a given tier. Regulators focus on the rationale, not the number. A score of "medium" means nothing if the file does not explain what drove that assessment and who approved it. The rationale file is the audit trail that protects the institution.</p>
      <p>Continuous monitoring outperforms one-time checks because client risk profiles change. A business that was low-risk at onboarding may acquire a sanctioned subsidiary two years later. Automated monitoring tools flag these changes in real time rather than waiting for the next scheduled review.</p>

      <h2>What operational best practices improve business validation effectiveness?</h2>
      <p>Operational execution is where most validation frameworks break down. The policy may be sound, but the process falls apart when teams rely on informal judgments, inconsistent documentation, or manual workflows that do not scale.</p>
      <p>The practices that produce consistent results are:</p>
      <ul>
        <li><strong>Gather critical documents upfront.</strong> Build a standardized document checklist and send it at the first client contact. Onboarding delays come from missing signed legal documents, not from database checks. Collecting everything at once eliminates the most common bottleneck.</li>
        <li><strong>Use integrated API checks for real-time screening.</strong> Manual sanctions screening against static lists is a compliance liability. Real-time API connections to OFAC, PEP databases, and corporate registries catch changes that manual processes miss.</li>
        <li><strong>Document every decision with a rationale.</strong> Client acceptance controls protect firms at the point where risk enters by ensuring documentation, approvals, and escalation match the firm's risk appetite. Every acceptance or rejection needs a written record.</li>
        <li><strong>Link approval authority to risk tier.</strong> Low-risk clients can be approved by a compliance analyst. High-risk clients require senior compliance officer or committee sign-off. This approval control matrix prevents informal overrides.</li>
        <li><strong>Treat KYB as continuous governance.</strong> Client acceptance must be continuous governance protecting firms from risk at every stage, not just at onboarding. Periodic reviews, triggered re-screening, and transaction monitoring all feed back into the client's risk file.</li>
      </ul>
      <p><strong>Pro tip:</strong> Build your document checklist around the worst-case scenario for your highest-risk client type. Then strip it down for lower tiers. Starting from the top prevents gaps that only surface during audits.</p>
      <p>AIWMC Quantis supports this kind of structured validation workflow by generating the documentation and risk analysis that financial professionals need, in 90 seconds, without manual assembly. You can see how the risk calculation methodology works and apply it directly to your client assessment process.</p>

      <h2>Key takeaways</h2>
      <p>Effective business validation for financial clients requires verified ownership, documented risk rationale, and continuous monitoring — not a one-time onboarding check.</p>
      <ul>
        <li><strong>KYB goes beyond entity checks.</strong> Identifying beneficial owners and UBOs is the most complex and most regulated part of the process.</li>
        <li><strong>Document collection drives timelines.</strong> Missing incumbency certificates and corporate resolutions cause 1–2 week delays more than any database check.</li>
        <li><strong>Risk tiers set review frequency.</strong> High-risk clients need annual reviews; low-risk clients require review every 5 years per regulatory guidance.</li>
        <li><strong>Rationale files matter more than scores.</strong> Regulators examine the written justification for risk acceptance decisions, not just the numeric score.</li>
        <li><strong>Automation cuts onboarding time significantly.</strong> Automated workflows reduce onboarding from up to 45 days manually to as few as 7 days.</li>
      </ul>

      <h2>The gap between policy and practice is where compliance fails</h2>
      <p>I have reviewed validation frameworks at financial firms that looked excellent on paper. The policies cited FinCEN, referenced FATF guidance, and included detailed risk matrices. Then I looked at the actual client files. Half of them were missing certified org charts. A third had no documented rationale for the risk tier assigned. Several high-risk clients had not been reviewed in four years.</p>
      <p>The problem is not that compliance teams do not know what to do. The problem is that KYB is operationally hard, and most firms underestimate that difficulty until an examiner points it out. Ownership structures are genuinely complex. Clients push back on document requests. Analysts take shortcuts when they are processing 30 onboardings a month.</p>
      <p>What I have come to believe is that KYB needs to be treated as a living governance function, not a gate you pass through once. The firms that handle it well have two things in common: they automate the repeatable checks, and they invest in the human judgment layer for complex cases. Neither alone is enough. Automation without judgment misses nuance. Judgment without automation does not scale.</p>
      <p>The emerging use of real-time corporate registry APIs and AI-assisted adverse media screening is genuinely changing what is possible. But the technology only works if the underlying process is sound. If your rationale files are empty, better screening tools will not save you in an examination.</p>
      <p>My advice: audit your existing client files before your regulator does. Look for missing org charts, undocumented risk decisions, and overdue periodic reviews. Fix those first. Then build the automation layer on top of a process that already works.</p>
      <p>— Bogdan</p>

      <h2>How AIWMC Quantis supports your financial client validation process</h2>
      <p>Financial professionals who need structured, document-ready validation outputs do not have to build everything from scratch. AIWMC Quantis delivers business validation with document generation, instant quoting, and invoicing in 90 seconds, free to try.</p>
      <p>Whether you are validating a new business client, preparing a risk assessment file, or generating the supporting documentation for a compliance review, Quantis produces the structured outputs that financial professionals need without the manual assembly time. The platform is built for founders, investors, and consultants who need validation results fast and in a format that holds up to scrutiny.</p>

      <h2>FAQ</h2>
      <h3>What is KYB and how does it differ from KYC?</h3>
      <p>KYB (Know Your Business) verifies the legal existence, ownership structure, and risk profile of a business entity, while KYC (Know Your Customer) applies to individual persons. KYB is more complex because it requires identifying beneficial owners behind corporate layers, not just verifying a single individual's identity.</p>
      <h3>What documents are required for business validation?</h3>
      <p>Standard business validation requires incorporation papers, articles of organization, incumbency certificates, certified organizational charts, and government-issued ID for beneficial owners. Missing any of these, particularly incumbency certificates, typically causes 1–2 week onboarding delays.</p>
      <h3>What is the 25% beneficial ownership threshold?</h3>
      <p>FinCEN's CDD Rule requires financial institutions to identify any individual who owns 25% or more of a legal entity, plus one individual with significant managerial control. This threshold applies regardless of how ownership is structured across holding companies or trusts.</p>
      <h3>How often should financial clients be re-validated?</h3>
      <p>Regulatory guidance recommends annual reviews for high-risk clients, reviews every 3 years for medium-risk clients, and reviews every 5 years for low-risk clients. Significant changes in ownership, jurisdiction, or business activity trigger an immediate out-of-cycle review.</p>
      <h3>Why do risk scores need a rationale file?</h3>
      <p>A numeric risk score alone does not satisfy regulatory examiners. Regulators focus on the documented reasoning behind risk acceptance decisions, including who approved the client, what factors drove the tier assignment, and what conditions were attached to acceptance.</p>

      <h2>Related reading</h2>
      <ul>
        <li><Link to="/use-cases" className="text-primary hover:underline">Use Cases — Founders, Investors, Consultants</Link></li>
        <li><Link to="/examples/saas-fintech-lagos" className="text-primary hover:underline">SaaS Fintech Lagos — worked example</Link></li>
        <li><Link to="/vs/bizplanr" className="text-primary hover:underline">Quantis vs Bizplanr — deterministic engine vs AI plan writer</Link></li>
        <li><Link to="/examples/accounting-firm-zurich" className="text-primary hover:underline">Accounting Firm Zurich — worked example</Link></li>
        <li><Link to="/vs/foundra" className="text-primary hover:underline">Quantis vs Foundra — strategy cards vs a deterministic financial verdict</Link></li>
        <li><Link to="/vs/aicofounder" className="text-primary hover:underline">Quantis vs AI Co-Founder — building companion vs validation verdict</Link></li>
        <li><Link to="/vs/chatgpt" className="text-primary hover:underline">Quantis vs ChatGPT — why a general LLM can't cite its own numbers</Link></li>
      </ul>
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
    <PublicPageShell active="blog" backTo={{ href: '/blog', label: 'Back to blog' }} maxWidth="sm">
      <PageSEO
        title={article.title.length > 60 ? article.title.slice(0, 57) + '…' : article.title}
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
          publisher: { '@type': 'Organization', name: 'AIWMC™ LLC', logo: { '@type': 'ImageObject', url: 'https://aiwmcquantis.com/icon-512.png' } },
          mainEntityOfPage: { '@type': 'WebPage', '@id': `https://aiwmcquantis.com/blog/${article.slug}` },
          ...(article.keywords && { keywords: article.keywords.join(', ') }),
          articleSection: article.category,
        }}
      />

      <article className="pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span
            className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.1em]"
            style={{ ...MONO, background: 'rgba(103,232,249,0.10)', color: 'var(--aiwmc-grad-cyan)' }}
          >
            {article.category}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground" style={MONO}>
            <Calendar className="w-3 h-3" />
            {new Date(article.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground" style={MONO}>
            <Clock className="w-3 h-3" />
            {article.readTime}
          </span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight" style={{ color: 'hsl(var(--foreground))' }}>
          {article.title}
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          {article.description}
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none
          [&>h2]:text-xl [&>h2]:font-bold [&>h2]:text-foreground [&>h2]:mt-8 [&>h2]:mb-3
          [&>h3]:text-foreground
          [&>p]:text-muted-foreground [&>p]:leading-relaxed [&>p]:mb-4
          [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2 [&>ul]:mb-4
          [&>ul>li]:text-muted-foreground
          [&_strong]:text-foreground
        ">
          {content}
        </div>
      </article>

      {/* Author card — real name, no fabricated social handles */}
      <GlassCard glow="cyan" className="mt-8 mb-6 p-5 md:p-6">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(79,70,229,0.35), rgba(103,232,249,0.20))',
              color: 'hsl(var(--foreground))',
              border: '1px solid rgba(148,163,255,0.24)',
              ...MONO,
            }}
            aria-hidden="true"
          >
            BJ
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] mb-1" style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}>
              Written by
            </p>
            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              Bogdan Jeltov
            </p>
            <p className="text-xs text-muted-foreground">
              Founder, AIWMC Quantis ·{' '}
              <Link to="/methodology" className="hover:underline" style={{ color: 'var(--aiwmc-grad-cyan)' }}>
                Why I built this
              </Link>
            </p>
          </div>
        </div>
      </GlassCard>

      {/* CTA */}
      <GlassCard glow="brand" className="mb-8 p-8 text-center">
        <h2 className="text-2xl font-bold mb-3" style={{ color: 'hsl(var(--foreground))' }}>Ready to validate your idea?</h2>
        <p className="text-muted-foreground mb-6">Revenue projections, risk flags, and a clear action plan — free, in under 90 seconds.</p>
        <Link to="/app">
          <Button size="lg" className="gap-2 py-6 px-8">
            See my numbers — free <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
      </GlassCard>
    </PublicPageShell>
  );
}
