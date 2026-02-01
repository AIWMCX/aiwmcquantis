import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Shield, MapPin, Lightbulb, ArrowDown } from 'lucide-react';
import { trackCtaClick, trackEvent } from '@/lib/analytics';

export function MobileHero() {
  const navigate = useNavigate();
  const [quickIdea, setQuickIdea] = useState('');
  const [quickLocation, setQuickLocation] = useState('');

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (quickIdea.trim().length < 5 || quickLocation.trim().length < 2) {
      return;
    }

    // Track the submission
    trackEvent('hero_quick_submit', { 
      idea_length: quickIdea.length, 
      location: quickLocation 
    });
    trackCtaClick('see_preview_numbers', 'hero_form');

    // Navigate to mini-demo with query params
    const params = new URLSearchParams({
      idea: quickIdea.trim(),
      location: quickLocation.trim(),
    });
    
    // Scroll to mini-demo section with pre-filled data
    const miniDemoSection = document.getElementById('mini-demo');
    if (miniDemoSection) {
      // Store in sessionStorage for MiniDemo to pick up
      sessionStorage.setItem('hero_prefill', JSON.stringify({
        idea: quickIdea.trim(),
        location: quickLocation.trim(),
        autoSubmit: true,
      }));
      
      miniDemoSection.scrollIntoView({ behavior: 'smooth' });
      
      // Trigger a custom event for MiniDemo to react to
      window.dispatchEvent(new CustomEvent('hero-prefill-ready'));
    }
  };

  const isFormValid = quickIdea.trim().length >= 5 && quickLocation.trim().length >= 2;

  return (
    <section id="main-content" className="relative" aria-label="Hero">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      
      <div className="relative container max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
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

          {/* Quick Input Form - Above the fold */}
          <form 
            onSubmit={handleQuickSubmit}
            className="max-w-xl mx-auto bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-xl mb-6"
          >
            <div className="space-y-3">
              {/* Business Idea Input */}
              <div className="relative">
                <Lightbulb className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Your business idea (e.g., Coffee shop with remote work focus)"
                  value={quickIdea}
                  onChange={(e) => setQuickIdea(e.target.value)}
                  className="pl-10 h-12 text-base"
                  maxLength={200}
                />
              </div>

              {/* Location Input */}
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Location (e.g., Denver, Colorado)"
                  value={quickLocation}
                  onChange={(e) => setQuickLocation(e.target.value)}
                  className="pl-10 h-12 text-base"
                  maxLength={100}
                />
              </div>

              {/* Submit Button */}
              <Button 
                type="submit"
                disabled={!isFormValid}
                size="lg" 
                className="w-full gap-2 text-base sm:text-lg py-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] min-h-[56px]"
              >
                <Sparkles className="w-5 h-5" />
                See My Preview Numbers
                <ArrowDown className="w-4 h-4 animate-bounce" />
              </Button>
            </div>
          </form>

          {/* Verified Trust Indicator - No fabricated stats */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-success" />
            <span>No credit card required • Free preview • Results in seconds</span>
          </div>
        </div>
      </div>
    </section>
  );
}
