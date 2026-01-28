import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  CheckCircle2, 
  DollarSign, 
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import { trackCtaClick } from '@/lib/analytics';

interface MobileHeroProps {
  stats: Array<{ value: string; label: string }>;
}

export function MobileHero({ stats }: MobileHeroProps) {
  return (
    <section id="main-content" className="relative" aria-label="Hero">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      
      <div className="relative container max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-24 lg:py-32">
        <div className="text-center max-w-4xl mx-auto">
          
          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-tight tracking-tight">
            Know Your Numbers
            <span className="text-primary block mt-1">Before You Invest</span>
          </h1>
          
          {/* Description */}
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-lg mx-auto mb-8 leading-relaxed">
            AI-powered business analysis in 2 minutes. Revenue, risks, and a clear action plan.
          </p>

          {/* Primary CTA */}
          <div className="flex flex-col items-center gap-4 mb-12">
            <Link 
              to="/app" 
              className="w-full sm:w-auto"
              onClick={() => trackCtaClick('get_free_analysis', 'hero_primary')}
            >
              <Button 
                size="lg" 
                className="w-full sm:w-auto gap-2 text-lg px-8 py-7 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] min-h-[64px]"
              >
                <Play className="w-5 h-5" />
                Get My Free Analysis
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              AI-powered analysis in 2 minutes
            </p>
          </div>

          {/* Quick Benefits - Clean inline layout */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mb-12 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Validate idea</span>
            </span>
            <span className="hidden sm:inline text-border">·</span>
            <span className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span>See real numbers</span>
            </span>
            <span className="hidden sm:inline text-border">·</span>
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-primary" />
              <span>Know risks first</span>
            </span>
          </div>

          {/* 3-Step Process - Minimal */}
          <div className="flex items-center justify-center gap-4 sm:gap-8 mb-12">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center">
                1
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">Describe</span>
            </div>
            <div className="w-8 sm:w-12 h-px bg-border" />
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center">
                2
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">AI Analyzes</span>
            </div>
            <div className="w-8 sm:w-12 h-px bg-border" />
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center">
                3
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">Get Report</span>
            </div>
          </div>

          {/* Stats - Clean typography, no borders */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat, index) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
