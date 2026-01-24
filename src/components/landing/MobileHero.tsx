import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  CheckCircle2, 
  DollarSign, 
  AlertTriangle,
  ChevronRight,
  Clock,
  BarChart3
} from 'lucide-react';
import { trackCtaClick } from '@/lib/analytics';

interface MobileHeroProps {
  stats: Array<{ value: string; label: string }>;
}

export function MobileHero({ stats }: MobileHeroProps) {
  return (
    <section id="main-content" className="relative" aria-label="Hero">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-background" />
      
      <div className="relative container max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-20 lg:py-28">
        <div className="text-center max-w-4xl mx-auto">
          
          {/* Mobile-First Headline - 6 words max */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-tight tracking-tight">
            Know Your Numbers
            <span className="text-primary block mt-1">Before You Invest</span>
          </h1>
          
          {/* Shorter description for mobile */}
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-lg mx-auto mb-6 leading-relaxed">
            AI-powered business analysis in 2 minutes. Revenue, risks, and a clear action plan.
          </p>

          {/* Single dominant CTA - larger touch target */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <Link 
              to="/app" 
              className="w-full sm:w-auto"
              onClick={() => trackCtaClick('get_free_analysis', 'hero_primary')}
            >
              <Button 
                size="lg" 
                className="w-full sm:w-auto gap-2 text-lg px-8 py-7 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 min-h-[60px]"
              >
                <Play className="w-6 h-6" />
                Get Free Analysis
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              No signup required • Results in 2 min
            </p>
          </div>

          {/* Quick Benefits - Mobile optimized grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 max-w-2xl mx-auto">
            <div className="flex items-center justify-center sm:justify-start gap-3 p-4 rounded-xl bg-card/60 border border-border/50">
              <div className="p-2 rounded-full bg-success/10 flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <span className="text-sm font-medium text-foreground">Validate idea</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-3 p-4 rounded-xl bg-card/60 border border-border/50">
              <div className="p-2 rounded-full bg-success/10 flex-shrink-0">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <span className="text-sm font-medium text-foreground">See real numbers</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-3 p-4 rounded-xl bg-card/60 border border-border/50">
              <div className="p-2 rounded-full bg-success/10 flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-success" />
              </div>
              <span className="text-sm font-medium text-foreground">Know risks first</span>
            </div>
          </div>

          {/* 3-Step Process - Horizontal on mobile too */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-6 py-6 px-4 border border-border bg-muted/30 rounded-2xl mb-8">
            <div className="flex items-center gap-3 justify-center">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center flex-shrink-0">
                1
              </div>
              <span className="text-sm font-medium text-foreground">Describe idea</span>
            </div>
            <ChevronRight className="hidden sm:block w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
            <div className="flex items-center gap-3 justify-center">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center flex-shrink-0">
                2
              </div>
              <span className="text-sm font-medium text-foreground">AI analyzes</span>
            </div>
            <ChevronRight className="hidden sm:block w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
            <div className="flex items-center gap-3 justify-center">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center flex-shrink-0">
                3
              </div>
              <span className="text-sm font-medium text-foreground">Get report</span>
            </div>
          </div>

          {/* Stats - More compact */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            {stats.map(stat => (
              <div key={stat.label} className="text-center p-3 rounded-lg bg-card/40">
                <div className="text-xl md:text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
