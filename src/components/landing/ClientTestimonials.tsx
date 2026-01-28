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

// Star rating component with half-star support - Mobile optimized with larger stars
function StarRating({ rating, size = 'default' }: { rating: number; size?: 'default' | 'large' }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  const starSize = size === 'large' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {/* Full Stars */}
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star
          key={`full-${i}`}
          className={`${starSize} fill-warning text-warning drop-shadow-sm`}
          aria-hidden="true"
        />
      ))}
      
      {/* Half Star */}
      {hasHalfStar && (
        <div className={`relative ${starSize}`}>
          {/* Empty star background */}
          <Star className={`absolute inset-0 ${starSize} text-warning/30`} aria-hidden="true" />
          {/* Half-filled star using clip */}
          <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
            <Star className={`${starSize} fill-warning text-warning drop-shadow-sm`} aria-hidden="true" />
          </div>
        </div>
      )}
      
      {/* Empty Stars */}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star
          key={`empty-${i}`}
          className={`${starSize} text-warning/30`}
          aria-hidden="true"
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

        {/* Testimonials Grid - Horizontal scroll on mobile */}
        <div className="flex md:grid md:grid-cols-3 gap-4 md:gap-6 overflow-x-auto pb-4 md:pb-0 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative p-5 md:p-6 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all duration-300 min-w-[280px] md:min-w-0 flex-shrink-0 snap-center"
            >
              {/* Highlight Badge - Positioned inside card on mobile */}
              {testimonial.highlight && (
                <div className="inline-block mb-3 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  {testimonial.highlight}
                </div>
              )}

              {/* Quote Icon - Smaller on mobile */}
              <div className="mb-3 md:mb-4">
                <Quote className="w-6 h-6 md:w-8 md:h-8 text-primary/20" />
              </div>

              {/* Quote Text */}
              <blockquote className="text-sm md:text-base text-foreground leading-relaxed mb-4 md:mb-6 line-clamp-4 md:line-clamp-none">
                "{testimonial.quote}"
              </blockquote>

              {/* Rating - Larger on mobile for visibility */}
              <div className="mb-3 md:mb-4">
                <StarRating rating={testimonial.rating} size="large" />
              </div>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-primary">
                    {testimonial.name.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {testimonial.role}, {testimonial.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Mobile swipe indicator */}
        <div className="flex justify-center gap-1.5 mt-4 md:hidden">
          {testimonials.map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-primary/30" />
          ))}
        </div>

        {/* Social Proof Stats - Enhanced mobile layout with backgrounds */}
        <div className="mt-10 md:mt-12 pt-6 md:pt-8 border-t border-border">
          <div className="grid grid-cols-3 gap-3 md:flex md:flex-wrap md:items-center md:justify-center md:gap-16">
            <div className="text-center p-3 md:p-0 rounded-xl bg-success/5 md:bg-transparent">
              <div className="text-xl md:text-3xl font-bold text-foreground">500+</div>
              <div className="text-xs md:text-sm text-muted-foreground">Analyses</div>
            </div>
            <div className="text-center p-3 md:p-0 rounded-xl bg-warning/5 md:bg-transparent">
              <div className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2">
                <span className="text-xl md:text-3xl font-bold text-foreground">4.5</span>
                <div className="flex items-center">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 md:w-4 md:h-4 fill-warning text-warning" aria-hidden="true" />
                  ))}
                  <div className="relative w-3 h-3 md:w-4 md:h-4">
                    <Star className="absolute inset-0 w-3 h-3 md:w-4 md:h-4 text-warning/30" aria-hidden="true" />
                    <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                      <Star className="w-3 h-3 md:w-4 md:h-4 fill-warning text-warning" aria-hidden="true" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Rating</div>
            </div>
            <div className="text-center p-3 md:p-0 rounded-xl bg-primary/5 md:bg-transparent">
              <div className="text-xl md:text-3xl font-bold text-foreground">92%</div>
              <div className="text-xs md:text-sm text-muted-foreground">Recommend</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
