import React from 'react';
import { Star, StarHalf, Quote } from 'lucide-react';

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
  rating: number;
  highlight?: string;
}

const testimonials: Testimonial[] = [
  {
    quote: "I spent $3,000 on a consultant who gave me a 20-page report after 3 weeks. Quantis gave me better numbers in 2 minutes — with clear explanations for each calculation.",
    name: "Maria S.",
    role: "Founder",
    company: "FreshBake Co.",
    rating: 4.5,
    highlight: "Better than $3K consultant",
  },
  {
    quote: "The payback period calculation alone saved me from a bad investment. Quantis showed me the real numbers — my 'sure thing' would have taken 4 years to break even.",
    name: "James T.",
    role: "Serial Entrepreneur",
    company: "Denver, CO",
    rating: 4.5,
    highlight: "Avoided bad investment",
  },
  {
    quote: "Finally, an AI tool that shows its work. I can see exactly how every number was calculated. This isn't a black box — it's a transparent financial engine.",
    name: "Dr. Sarah K.",
    role: "Business Professor",
    company: "CU Boulder",
    rating: 4.5,
    highlight: "Transparent calculations",
  },
];

// Star rating component with half-star support
function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {/* Full Stars */}
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star
          key={`full-${i}`}
          className="w-4 h-4 fill-warning text-warning drop-shadow-sm"
        />
      ))}
      
      {/* Half Star */}
      {hasHalfStar && (
        <div className="relative w-4 h-4">
          {/* Empty star background */}
          <Star className="absolute inset-0 w-4 h-4 text-warning/30" />
          {/* Half-filled star using clip */}
          <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
            <Star className="w-4 h-4 fill-warning text-warning drop-shadow-sm" />
          </div>
        </div>
      )}
      
      {/* Empty Stars */}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star
          key={`empty-${i}`}
          className="w-4 h-4 text-warning/30"
        />
      ))}
    </div>
  );
}

export function ClientTestimonials() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            What Entrepreneurs Say
          </h2>
          <p className="text-muted-foreground">
            Real feedback from founders who've used Quantis for business validation
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative p-6 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all duration-300"
            >
              {/* Highlight Badge */}
              {testimonial.highlight && (
                <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  {testimonial.highlight}
                </div>
              )}

              {/* Quote Icon */}
              <div className="mb-4 pt-2">
                <Quote className="w-8 h-8 text-primary/20" />
              </div>

              {/* Quote Text */}
              <blockquote className="text-foreground leading-relaxed mb-6">
                "{testimonial.quote}"
              </blockquote>

              {/* Rating */}
              <div className="mb-4">
                <StarRating rating={testimonial.rating} />
              </div>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {testimonial.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-foreground">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.role}, {testimonial.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Social Proof Stats */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-foreground">500+</div>
              <div className="text-sm text-muted-foreground">Analyses Generated</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl md:text-3xl font-bold text-foreground">4.5</span>
                <div className="flex items-center">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                  ))}
                  <div className="relative w-4 h-4">
                    <Star className="absolute inset-0 w-4 h-4 text-warning/30" />
                    <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                      <Star className="w-4 h-4 fill-warning text-warning" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-foreground">92%</div>
              <div className="text-sm text-muted-foreground">Would Recommend</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
