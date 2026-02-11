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
      <p>Quantis runs all five steps automatically. You describe your idea and location, and the AI returns structured financial analysis, risk assessment, and 3-scenario projections — in under 3 minutes.</p>
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
        title={`${article.title} — AIWMC Quantis™`}
        description={article.description}
        canonical={`/blog/${article.slug}`}
        ogType="article"
      />

      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-bold text-foreground">AIWMC Quantis<sup className="text-xs align-super">™</sup></span>
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
          <p className="text-muted-foreground mb-6">Structured financial logic, risk signals, and clarity — in under 3 minutes.</p>
          <Link to="/app">
            <Button size="lg" className="gap-2 py-6 px-8">
              Start Free Validation <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
