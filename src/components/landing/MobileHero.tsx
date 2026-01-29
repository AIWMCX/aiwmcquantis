import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Play, Shield } from 'lucide-react';
import { trackCtaClick } from '@/lib/analytics';

export function MobileHero() {
  return (
    <section id="main-content" className="relative" aria-label="Hero">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      
      <div className="relative container max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-16">
        <div className="text-center max-w-4xl mx-auto">
          
          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-tight tracking-tight">
            Know Your Numbers
            <span className="text-primary block mt-1">Before You Invest</span>
          </h1>
          
          {/* Action-oriented Description */}
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-lg mx-auto mb-6 leading-relaxed">
            Describe your business idea → Get profit projections, risks, and a 90-day action plan.
          </p>

          {/* Primary CTA */}
          <div className="flex flex-col items-center gap-3 mb-6">
            <Link 
              to="/app" 
              className="w-full sm:w-auto"
              onClick={() => trackCtaClick('see_my_numbers', 'hero_primary')}
            >
              <Button 
                size="lg" 
                className="w-full sm:w-auto gap-2 text-lg px-8 py-7 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] min-h-[64px]"
              >
                <Play className="w-5 h-5" />
                See My Numbers Free
              </Button>
            </Link>
          </div>

          {/* Verified Trust Indicator - No fabricated stats */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-success" />
            <span>No credit card required • Free analysis</span>
          </div>
        </div>
      </div>
    </section>
  );
}
