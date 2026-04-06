import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSEO } from '@/components/seo/PageSEO';
import { Footer } from '@/components/layout/Footer';

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
    description: 'The most common financial blind spots that kill startups before they launch — and how structured analysis prevents them.',
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
    description: 'A practical breakdown of startup cost estimation — fixed costs, variable costs, and location-adjusted projections for 50+ cities.',
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
    description: 'Run financial stress tests on your startup idea before spending money. 3-scenario analysis, risk identification, and survival planning for founders.',
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
];

export default function Blog() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageSEO
        title="Startup Validation Blog — AIWMC™ Quantis Insights"
        description="Practical guides on validating startup ideas, financial stress-testing, and AI-powered business analysis. Written for founders, consultants, and builders."
        canonical="/blog"
      />

      {/* Header */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-bold text-foreground">AIWMC™ Quantis</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Home</Link>
              <Link to="/blog" className="text-sm font-medium text-foreground">Blog</Link>
            </div>
            <Link to="/app">
              <Button size="sm" className="gap-2 min-h-[48px] px-5 text-sm font-semibold">
                Start Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="mb-12">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Validation Insights for Founders
          </h1>
          <p className="text-lg text-muted-foreground">
            Practical guides on business validation, financial structuring, and using AI to de-risk your next venture.
          </p>
        </div>

        <div className="space-y-6">
          {BLOG_ARTICLES.map((article) => (
            <Link
              key={article.slug}
              to={`/blog/${article.slug}`}
              className="block group"
            >
              <article className="p-6 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
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
                <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-2">
                  {article.title}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {article.description}
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-3 group-hover:gap-2 transition-all">
                  Read article <ArrowRight className="w-4 h-4" />
                </span>
              </article>
            </Link>
          ))}
        </div>

        {/* Example Analyses Cross-Links */}
        <section className="mt-16 mb-10">
          <h2 className="text-2xl font-bold text-foreground mb-3">See Real Business Analyses</h2>
          <p className="text-muted-foreground mb-6">Explore complete financial reports with revenue projections, risk assessments, and action plans for real business ideas.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { slug: 'coffee-shop-denver', title: 'Coffee Shop in Denver', profit: '$4,200/mo' },
              { slug: 'saas-project-management', title: 'SaaS Project Management', profit: '$3,800/mo' },
              { slug: 'restaurant-miami', title: 'Restaurant in Miami', profit: '$8,900/mo' },
              { slug: 'fitness-studio-los-angeles', title: 'Fitness Studio in LA', profit: '$7,800/mo' },
              { slug: 'food-truck-austin', title: 'Food Truck in Austin', profit: '$5,400/mo' },
              { slug: 'tutoring-service-boston', title: 'Tutoring Service in Boston', profit: '$9,500/mo' },
            ].map((ex) => (
              <Link key={ex.slug} to={`/examples/${ex.slug}`} className="block p-4 rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all bg-card">
                <h3 className="font-semibold text-foreground text-sm">{ex.title}</h3>
                <p className="text-xs text-primary font-medium mt-1">{ex.profit} profit →</p>
              </Link>
            ))}
          </div>
          <Link to="/examples" className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-4 hover:gap-2 transition-all">
            View all 15 examples <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

        {/* CTA */}
        <div className="mt-8 text-center p-8 rounded-2xl bg-primary/5 border border-primary/20">
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
