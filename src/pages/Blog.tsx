import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSEO } from '@/components/seo/PageSEO';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard, SectionHeader } from '@/components/ui/glass-card';

const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

export interface BlogArticle {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  category: string;
  keywords?: string[];
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: 'validate-startup-idea-using-ai',
    title: 'How to Validate a Startup Idea Using AI (Step-by-Step Guide)',
    description: 'A structured framework for validating any business idea with AI — financial logic, risk signals, and market context before you build.',
    date: '2026-02-11',
    readTime: '8 min read',
    category: 'Validation',
    keywords: ['startup validation', 'AI business analysis', 'validate business idea', 'startup feasibility'],
  },
  {
    slug: '5-financial-mistakes-early-founders-make',
    title: '5 Financial Mistakes Early Founders Make (And How to Avoid Them)',
    description: 'Five financial blind spots that can weaken an early-stage business, with practical checks for costs, cash flow, pricing, and runway.',
    date: '2026-02-11',
    readTime: '6 min read',
    category: 'Finance',
    keywords: ['startup finance', 'founder mistakes', 'unit economics', 'CAC LTV ratio'],
  },
  {
    slug: 'ai-vs-traditional-business-planning',
    title: 'AI vs Traditional Business Planning: What\'s Faster and Safer?',
    description: 'A practical comparison of AI-driven validation vs traditional consulting — speed, cost, accuracy, and when to use each.',
    date: '2026-02-11',
    readTime: '7 min read',
    category: 'Strategy',
    keywords: ['AI business planning', 'business plan generator', 'startup planning tools'],
  },
  {
    slug: 'how-to-calculate-startup-costs',
    title: 'How to Calculate Startup Costs for Any Business Idea (2026 Guide)',
    description: 'A practical breakdown of startup cost estimation — fixed costs, variable costs, and location-adjusted projections.',
    date: '2026-02-13',
    readTime: '7 min read',
    category: 'Finance',
    keywords: ['startup costs', 'business startup budget', 'calculate startup expenses', 'startup cost calculator'],
  },
  {
    slug: 'unit-economics-explained-for-founders',
    title: 'Unit Economics Explained: CAC, LTV, and Payback Period for Founders',
    description: 'The essential unit economics every founder must know — customer acquisition cost, lifetime value, and how to calculate payback period.',
    date: '2026-02-13',
    readTime: '9 min read',
    category: 'Finance',
    keywords: ['unit economics', 'CAC', 'LTV', 'customer acquisition cost', 'lifetime value', 'payback period'],
  },
  {
    slug: 'how-to-stress-test-your-startup',
    title: 'How to Stress-Test Your Startup Before Launch (2026 Guide)',
    description: 'Learn how to stress-test a startup idea with downside, base, and upside scenarios, risk signals, and cash-runway checks.',
    date: '2026-02-25',
    readTime: '8 min read',
    category: 'Validation',
    keywords: ['stress test startup', 'startup risk analysis', 'financial stress testing', 'scenario analysis startup', 'business model validation'],
  },
  {
    slug: 'startup-validation-checklist',
    title: 'Startup Validation Checklist: 7 Questions Before You Build',
    description: 'Validate your startup idea with this 7-step checklist covering financial logic, market signals, risk flags, and unit economics.',
    date: '2026-02-25',
    readTime: '7 min read',
    category: 'Validation',
    keywords: ['startup validation checklist', 'validate business idea', 'startup checklist', 'business validation steps'],
  },
  {
    slug: 'ai-vs-spreadsheets-startup-planning',
    title: 'AI vs Spreadsheets: Which Is Better for Startup Financial Planning?',
    description: 'Honest comparison of AI-powered validation vs spreadsheet modeling for startups. Speed, accuracy, cost, and when to use each approach.',
    date: '2026-02-25',
    readTime: '6 min read',
    category: 'Strategy',
    keywords: ['AI financial planning', 'startup spreadsheet', 'financial model tools', 'AI vs spreadsheet', 'startup planning tools'],
  },
  {
    slug: 'coffee-shop-startup-costs-by-city',
    title: 'Coffee Shop Startup Costs: Denver vs Austin vs NYC',
    description: 'Compare modeled coffee-shop startup costs, monthly expenses, and profit scenarios across Denver, Austin, and New York City.',
    date: '2026-04-10',
    readTime: '9 min read',
    category: 'Local Analysis',
    keywords: ['coffee shop startup costs', 'coffee shop Denver', 'coffee shop Austin', 'coffee shop NYC', 'how much to open a coffee shop', 'coffee shop profit margin'],
  },
  {
    slug: 'food-truck-profit-calculator',
    title: 'Food Truck Profit Calculator: Revenue, Costs & ROI by City (2026)',
    description: 'Explore modeled food-truck revenue, startup costs, permit fees, and profit scenarios for Austin, Los Angeles, and Miami.',
    date: '2026-04-10',
    readTime: '8 min read',
    category: 'Local Analysis',
    keywords: ['food truck profit', 'food truck revenue', 'food truck startup costs', 'food truck Austin', 'food truck Los Angeles', 'food truck calculator'],
  },
  {
    slug: 'how-to-validate-restaurant-idea',
    title: 'How to Validate a Restaurant Idea Before Signing a Lease (2026 Guide)',
    description: 'A practical framework for testing a restaurant concept through location analysis, financial stress tests, and seven metrics that shape viability.',
    date: '2026-04-10',
    readTime: '10 min read',
    category: 'Validation',
    keywords: ['validate restaurant idea', 'restaurant business plan', 'restaurant profit margin', 'restaurant feasibility', 'restaurant startup costs', 'restaurant financial analysis'],
  },
  {
    slug: 'business-validation-for-financial-clients',
    title: 'Business Validation for Financial Clients Explained',
    description: 'A compliance-focused guide to KYB, beneficial ownership, risk-tiered monitoring, documentation, and validation of business clients.',
    date: '2026-07-02',
    readTime: '11 min read',
    category: 'Compliance',
    keywords: ['business validation for financial clients', 'KYB', 'know your business', 'beneficial ownership verification', 'AML compliance', 'financial client validation process', 'enhanced due diligence'],
  },
];

export default function Blog() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Real categories from BLOG_ARTICLES — deliberately not using the
  // MP2-DESIGN-LAYOUT-02 spec's imagined "Methodology / Industry /
  // Benchmark / Technical" list, which doesn't match what's actually
  // written. Categories are derived from real posts so filtering is honest.
  const categories = useMemo(() => {
    const set = new Set(BLOG_ARTICLES.map((a) => a.category));
    return Array.from(set).sort();
  }, []);

  const visibleArticles = useMemo(
    () =>
      selectedCategory === null
        ? BLOG_ARTICLES
        : BLOG_ARTICLES.filter((a) => a.category === selectedCategory),
    [selectedCategory],
  );

  return (
    <PublicPageShell active="blog" backTo={{ href: '/', label: 'Back to home' }} maxWidth="lg">
      <PageSEO
        title="Startup Validation Blog — ​AIWMC™ Quantis Insights"
        description="Practical guides on validating startup ideas, financial stress-testing, and AI-powered business analysis. Written for founders, consultants, and builders."
        canonical="/blog"
      />

      <section aria-labelledby="blog-hero-heading" className="aiwmc-section-wash py-12 md:py-16">
        <SectionHeader
          eyebrow="Validation Insights for Founders"
          title="Practical guides for pre-launch and pre-scale decisions."
          subtitle="Financial structuring, unit economics, and using AI to de-risk your next venture."
          align="left"
        />
      </section>

      {/* Tag filter */}
      <div className="flex flex-wrap items-center gap-2 mb-6" role="tablist" aria-label="Filter posts by category">
        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === null}
          onClick={() => setSelectedCategory(null)}
          className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.14em] transition-colors border"
          style={
            selectedCategory === null
              ? { ...MONO, background: 'var(--aiwmc-grad-brand)', color: '#ffffff', borderColor: 'var(--aiwmc-grad-brand)' }
              : { ...MONO, background: 'rgba(148,163,255,0.06)', color: 'hsl(var(--muted-foreground))', borderColor: 'rgba(148,163,255,0.14)' }
          }
        >
          All ({BLOG_ARTICLES.length})
        </button>
        {categories.map((cat) => {
          const count = BLOG_ARTICLES.filter((a) => a.category === cat).length;
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedCategory(active ? null : cat)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.14em] transition-colors border"
              style={
                active
                  ? { ...MONO, background: 'var(--aiwmc-grad-brand)', color: '#ffffff', borderColor: 'var(--aiwmc-grad-brand)' }
                  : { ...MONO, background: 'rgba(148,163,255,0.06)', color: 'hsl(var(--muted-foreground))', borderColor: 'rgba(148,163,255,0.14)' }
              }
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      <section className="pb-4 space-y-4 md:space-y-5">
        {visibleArticles.map((article, i) => (
          <Link key={article.slug} to={`/blog/${article.slug}`} className="block group">
            <GlassCard glow={i % 3 === 0 ? 'cyan' : i % 3 === 1 ? 'violet' : 'brand'} revealDelay={Math.min(i, 6) * 40} className="p-6">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.14em]"
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
              <h2 className="text-xl font-bold mb-2 transition-colors group-hover:text-[color:var(--aiwmc-grad-cyan)]" style={{ color: 'hsl(var(--foreground))' }}>
                {article.title}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{article.description}</p>
              <span
                className="inline-flex items-center gap-1 text-sm font-medium mt-3 group-hover:gap-2 transition-all"
                style={{ color: 'var(--aiwmc-grad-cyan)' }}
              >
                Read article <ArrowRight className="w-4 h-4" />
              </span>
            </GlassCard>
          </Link>
        ))}
      </section>

      {/* Related examples */}
      <section className="mt-14 mb-10">
        <SectionHeader
          eyebrow="Related"
          title="See real business analyses"
          subtitle="Complete financial reports with revenue projections, risk flags, and action plans."
          align="left"
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {[
            { slug: 'coffee-shop-denver', title: 'Coffee Shop in Denver', profit: '$4,200/mo' },
            { slug: 'saas-project-management', title: 'SaaS Project Management', profit: '$3,800/mo' },
            { slug: 'restaurant-miami', title: 'Restaurant in Miami', profit: '$8,900/mo' },
            { slug: 'fitness-studio-los-angeles', title: 'Fitness Studio in LA', profit: '$7,800/mo' },
            { slug: 'food-truck-austin', title: 'Food Truck in Austin', profit: '$5,400/mo' },
            { slug: 'tutoring-service-boston', title: 'Tutoring Service in Boston', profit: '$9,500/mo' },
          ].map((ex, i) => (
            <Link key={ex.slug} to={`/examples/${ex.slug}`} className="block">
              <GlassCard glow={i % 2 === 0 ? 'cyan' : 'violet'} reveal={false} className="p-4">
                <h3 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>{ex.title}</h3>
                <p className="text-xs font-medium mt-1" style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}>
                  {ex.profit} profit →
                </p>
              </GlassCard>
            </Link>
          ))}
        </div>
        <Link
          to="/examples"
          className="inline-flex items-center gap-1 text-sm font-medium mt-4 hover:gap-2 transition-all"
          style={{ color: 'var(--aiwmc-grad-cyan)' }}
        >
          View all examples <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Closing CTA — glass, matches Landing pattern */}
      <section className="py-8 md:py-12">
        <GlassCard glow="brand" className="p-8 md:p-10 text-center">
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
            Ready to validate your idea?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Revenue projections, risk flags, and a clear action plan — free.
          </p>
          <Link to="/app">
            <Button size="lg" className="gap-2 py-6 px-8">
              See my numbers — free <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </GlassCard>
      </section>
    </PublicPageShell>
  );
}
