import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Shield, MapPin, Lightbulb, ArrowDown, BarChart3, AlertTriangle, TrendingUp, FileText, Target, CheckCircle2 } from 'lucide-react';
import { trackCtaClick, trackEvent } from '@/lib/analytics';
import { LiveCounter } from './LiveCounter';

// Value stack badges
const VALUE_BADGES = [
  { icon: BarChart3, text: 'ROI Analysis' },
  { icon: AlertTriangle, text: 'Risk Assessment' },
  { icon: TrendingUp, text: '3 Scenarios' },
  { icon: FileText, text: 'Business Plan' },
  { icon: Target, text: 'Unit Economics' },
];

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

    // Navigate to mini-demo section with pre-filled data
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
    <section id="main-content" className="relative overflow-hidden" aria-label="Hero">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        
        {/* Floating orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-1/4 w-64 h-64 bg-primary/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        />
      </div>
      
      <div className="relative container max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-16">
        <div className="text-center max-w-4xl mx-auto">
          
          {/* Live Counter - Social proof at top */}
          <div className="flex justify-center mb-6">
            <LiveCounter />
          </div>
          
          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-tight tracking-tight">
            Know If Your Business
            <span className="text-primary block mt-1">Will Make Money</span>
          </h1>
          
          {/* Action-oriented Description */}
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 leading-relaxed">
            Get comprehensive financial analysis, risk assessment, and investor-ready 
            business plans — in under 2 minutes
          </p>

          {/* Value Stack Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {VALUE_BADGES.map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/80 border border-border text-xs font-medium text-muted-foreground"
              >
                <Icon className="w-3.5 h-3.5" />
                {text}
              </div>
            ))}
          </div>

          {/* Quick Input Form - Above the fold */}
          <form 
            onSubmit={handleQuickSubmit}
            className="max-w-xl mx-auto bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-4 sm:p-6 shadow-xl mb-6"
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
                  className="pl-10 h-12 text-base bg-background"
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
                  className="pl-10 h-12 text-base bg-background"
                  maxLength={100}
                />
              </div>

              {/* Submit Button with shine effect */}
              <div className="relative overflow-hidden rounded-lg">
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
                {/* Shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
              </div>
            </div>
          </form>

          {/* Friction Reducers */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>No credit card</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Free preview</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Results in seconds</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
