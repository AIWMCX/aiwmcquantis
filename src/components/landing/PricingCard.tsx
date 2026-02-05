import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingFeature {
  text: string;
  highlight?: boolean;
  subtext?: string;
  badge?: string;
}

interface PricingCardProps {
  name: string;
  price: number;
  period: string;
  description: string;
  features: PricingFeature[];
  ctaText: string;
  onCtaClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  highlighted?: boolean;
  badge?: string;
  annualSavings?: number;
  totalYear?: number;
}

export const PricingCard = React.memo(function PricingCard({
  name,
  price,
  period,
  description,
  features,
  ctaText,
  onCtaClick,
  isLoading = false,
  disabled = false,
  highlighted = false,
  badge,
  annualSavings,
  totalYear,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        'relative p-6 md:p-8 rounded-2xl border transition-all duration-300',
        highlighted
          ? 'border-primary bg-card shadow-xl md:scale-105 hover:shadow-2xl'
          : 'border-border bg-card hover:border-primary/30 hover:shadow-lg'
      )}
    >
      {/* Badge */}
      {badge && highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-lg">
          {badge}
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-foreground mb-2">{name}</h3>
        
        {/* Price Display */}
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl md:text-5xl font-bold text-foreground">
            ${price}
          </span>
          <span className="text-muted-foreground">/{period}</span>
        </div>

        {/* Annual savings callout */}
        {annualSavings && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success text-sm font-medium">
            Save ${annualSavings}/year
          </div>
        )}

        {/* Total yearly cost */}
        {totalYear && price > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            ${totalYear}/year billed {period === 'mo' ? 'monthly' : 'annually'}
          </p>
        )}

        <p className="text-sm text-muted-foreground mt-3">{description}</p>
      </div>

      {/* Features List */}
      <ul className="space-y-3 mb-6 md:mb-8">
        {features.map((feature) => (
          <li key={feature.text} className="flex items-start gap-3">
            <CheckCircle2 
              className={cn(
                'w-5 h-5 flex-shrink-0 mt-0.5',
                feature.highlight ? 'text-success' : 'text-primary/70'
              )} 
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span 
                  className={cn(
                    'text-sm md:text-base',
                    feature.highlight ? 'text-foreground font-medium' : 'text-foreground'
                  )}
                >
                  {feature.text}
                </span>
                {feature.badge && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-success/10 text-success rounded-full">
                    {feature.badge}
                  </span>
                )}
              </div>
              {feature.subtext && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {feature.subtext}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <Button
        className={cn(
          'w-full min-h-[52px] font-semibold text-base',
          highlighted && 'shadow-lg hover:shadow-xl transition-shadow'
        )}
        variant={highlighted ? 'default' : 'outline'}
        size="lg"
        onClick={onCtaClick}
        disabled={disabled}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          ctaText
        )}
      </Button>

      {/* Trust element for Plus */}
      {highlighted && (
        <p className="text-center text-xs text-muted-foreground mt-3">
          No credit card required to start trial
        </p>
      )}
    </div>
  );
});
