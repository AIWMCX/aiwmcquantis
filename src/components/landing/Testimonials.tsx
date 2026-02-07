import React from 'react';
import { Star, Quote } from 'lucide-react';

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initials: string;
  metric: string;
  metricLabel: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote: "Saved me thousands in consultant fees. Got the same analysis in 2 minutes that would've taken weeks.",
    name: "M. Chen",
    role: "Founder, TechFlow",
    initials: "MC",
    metric: "12x",
    metricLabel: "ROI",
  },
  {
    quote: "The risk analysis caught a fatal flaw in my pricing model before I launched. Invaluable.",
    name: "S. Williams",
    role: "CEO, CloudSync",
    initials: "SW",
    metric: "$50K",
    metricLabel: "Saved",
  },
  {
    quote: "Used the business plan for my pitch deck. The projections were spot-on and helped close my seed round.",
    name: "A. Rodriguez",
    role: "Founder, DataPipe",
    initials: "AR",
    metric: "$500K",
    metricLabel: "Raised",
  },
];

const STATS = [
  { value: '12,847+', label: 'Businesses Analyzed' },
  { value: '4.9/5', label: 'Average Rating' },
  { value: '<2 min', label: 'Full Report Generation' },
  { value: '47s', label: 'Average Analysis Time' },
];

export function Testimonials() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-medium text-sm mb-4">
            <Star className="w-4 h-4 fill-primary" />
            Loved by Founders
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
            Join Thousands Making Smarter Decisions
          </h2>
          <p className="text-muted-foreground">
            See why entrepreneurs choose Quantis for business validation
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {TESTIMONIALS.map((testimonial, index) => (
            <div
              key={index}
              className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              {/* Quote icon */}
              <Quote className="absolute top-4 right-4 w-8 h-8 text-muted-foreground/20 group-hover:text-primary/20 transition-colors" />
              
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className="w-4 h-4 fill-current text-primary"
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="text-foreground mb-6 leading-relaxed">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {testimonial.initials}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>

                {/* Metric badge */}
                <div className="text-right">
                  <p className="text-lg font-bold text-success">
                    {testimonial.metric}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.metricLabel}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {STATS.map((stat, index) => (
            <div
              key={index}
              className="text-center p-4 rounded-xl bg-muted/50 border border-border"
            >
              <p className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
