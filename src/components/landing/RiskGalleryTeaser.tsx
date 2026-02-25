import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackCtaClick } from '@/lib/analytics';

export function RiskGalleryTeaser() {
  return (
    <section id="risk-gallery-teaser" className="py-16 md:py-24 bg-background">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 text-destructive font-semibold text-sm mb-6">
          <AlertTriangle className="w-4 h-4" />
          New: Risk Gallery
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          See Real Startup Risk Scenarios
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Explore anonymized scenarios from founders who ran their models through AIWMC Quantis. See what breaks, what survives, and how small changes affect survival.
        </p>
        <Link
          to="/risk-gallery"
          onClick={() => trackCtaClick('open_risk_gallery', 'landing_teaser')}
        >
          <Button size="lg" variant="outline" className="gap-2 py-6 px-8 text-base">
            Open the Risk Gallery <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
      </div>
    </section>
  );
}