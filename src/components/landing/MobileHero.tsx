import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, MapPin, Lightbulb, ArrowRight, BarChart3, AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react';
import { trackCtaClick, trackEvent, trackAnalysisFunnel } from '@/lib/analytics';
import { LiveCounter } from './LiveCounter';

const VALUE_BADGES = [
{ icon: BarChart3, text: 'Revenue projections' },
{ icon: AlertTriangle, text: 'Risk flags identified' },
{ icon: CheckCircle2, text: 'Action plan included' }];


export function MobileHero() {
  const navigate = useNavigate();
  const [quickIdea, setQuickIdea] = useState('');
  const [quickLocation, setQuickLocation] = useState('');

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickIdea.trim().length < 5 || quickLocation.trim().length < 2) return;

    trackEvent('hero_quick_submit', { idea_length: quickIdea.length, location: quickLocation });
    trackCtaClick('see_preview_numbers', 'hero_form');
    trackAnalysisFunnel('started', { source: 'hero_form', idea_length: quickIdea.length });

    sessionStorage.setItem('hero_prefill', JSON.stringify({
      idea: quickIdea.trim(),
      location: quickLocation.trim()
    }));
    navigate('/app');
  };

  const isFormValid = quickIdea.trim().length >= 5 && quickLocation.trim().length >= 2;

  return (
    <section id="main-content" className="relative overflow-hidden" aria-label="Hero">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-1/4 w-64 h-64 bg-primary/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />

      </div>
      
      <div className="relative container max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-16">
        <div className="text-center max-w-4xl mx-auto">
          
          {/* Live Counter */}
          <div className="flex justify-center mb-4 md:mb-6">
            <LiveCounter />
          </div>
          
          {/* Trust badge — consistent with "700+ businesses" below */}
          




          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-3 leading-tight tracking-tight">
            Stress-Test Your Business Model
            <span className="text-primary block mt-1">Before the Market Does</span>
          </h1>

          {/* Plain-English explainer */}
          <p className="text-base sm:text-lg text-foreground/80 font-medium mb-2 md:mb-3">
            Enter your idea and location. Get revenue projections, risk flags, and an action plan — in 60 seconds.
          </p>

          {/* Sub-headline */}
          <p className="text-base sm:text-lg text-muted-foreground mb-2 md:mb-3">
            AI-powered financial validation using 1,000+ industry benchmarks.
            The same framework VCs use — for <span className="text-foreground font-semibold">$17/month</span>.
          </p>
          <p className="text-sm text-muted-foreground/80 mb-4 md:mb-6 italic">
            "Coffee shop in Denver → <span className="text-foreground font-semibold not-italic">$4,200/mo profit</span>, <span className="text-foreground font-semibold not-italic">7.1 mo payback</span>, <span className="text-foreground font-semibold not-italic">168% ROI</span>"
          </p>

          {/* FORM FIRST on mobile - above badges */}
          <form
            onSubmit={handleQuickSubmit}
            className="max-w-xl mx-auto bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-4 sm:p-6 shadow-xl mb-4 md:mb-6">

            <div className="space-y-3">
              <div className="relative">
                <Lightbulb className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Your business idea (e.g., Coffee shop with remote work focus)"
                  value={quickIdea}
                  onChange={(e) => setQuickIdea(e.target.value)}
                  className="pl-10 h-12 text-base bg-background"
                  maxLength={200} />

              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Location (e.g., Denver, Colorado)"
                  value={quickLocation}
                  onChange={(e) => setQuickLocation(e.target.value)}
                  className="pl-10 h-12 text-base bg-background"
                  maxLength={100} />

              </div>
              <Button
                type="submit"
                disabled={!isFormValid}
                size="lg"
                className="w-full gap-2 text-base sm:text-lg py-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] min-h-[56px]">

                <Zap className="w-5 h-5" />
                See My Numbers — Free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>

          {/* Friction reducers - compact */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-muted-foreground mb-4 md:mb-6">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> No credit card</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> Results in under 3 min</span>
            <a href="#demo-preview" className="flex items-center gap-1 text-primary hover:underline">
              <BarChart3 className="w-3.5 h-3.5" /> See a sample report
            </a>
          </div>

          {/* Value badges + ICP - BELOW the form (visible on scroll or on desktop) */}
          <div className="hidden md:block">
            <p className="text-sm text-muted-foreground mb-3">
              Built for early-stage founders, consultants, and indie builders
              validating ideas before investing time and money.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {VALUE_BADGES.map(({ icon: Icon, text }) =>
              <div
                key={text}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-semibold text-foreground">

                  <Icon className="w-4 h-4 text-primary" />
                  {text}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>);

}