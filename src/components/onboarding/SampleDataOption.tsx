import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PenLine, Building2, Coffee, Laptop, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

interface SampleIdea {
  id: string;
  icon: React.ElementType;
  title: string;
  idea: string;
  location: string;
}

const SAMPLE_IDEAS: SampleIdea[] = [
  {
    id: 'coffee_shop',
    icon: Coffee,
    title: 'Coffee Shop',
    idea: 'A specialty coffee shop with a coworking space for remote workers, featuring locally roasted beans and light breakfast options',
    location: 'Denver, Colorado, USA',
  },
  {
    id: 'saas_platform',
    icon: Laptop,
    title: 'SaaS Platform',
    idea: 'A project management tool for creative agencies with time tracking, client portals, and automated invoicing',
    location: 'San Francisco, California, USA',
  },
  {
    id: 'ecommerce',
    icon: ShoppingBag,
    title: 'E-commerce Store',
    idea: 'An online store selling sustainable, eco-friendly home products with subscription boxes for monthly delivery',
    location: 'New York City, New York, USA',
  },
  {
    id: 'consulting',
    icon: Building2,
    title: 'Consulting Firm',
    idea: 'A boutique AI consulting firm helping SMBs automate their operations and implement machine learning solutions',
    location: 'Austin, Texas, USA',
  },
];

interface SampleDataOptionProps {
  onSelectSample: (idea: string, location: string) => void;
  onStartBlank: () => void;
  className?: string;
}

export const SampleDataOption = React.memo(function SampleDataOption({
  onSelectSample,
  onStartBlank,
  className,
}: SampleDataOptionProps) {
  const handleSelectSample = (sample: SampleIdea) => {
    trackEvent('onboarding_sample_selected', { sample_id: sample.id });
    onSelectSample(sample.idea, sample.location);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          Try with an example, or start with your own idea
        </h3>
        <p className="text-sm text-muted-foreground">
          See how Quantis works with a sample business idea
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {SAMPLE_IDEAS.map((sample) => (
          <Card
            key={sample.id}
            className="cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 group"
            onClick={() => handleSelectSample(sample)}
          >
            <CardContent className="p-3 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <sample.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">
                {sample.title}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <Button
        variant="outline"
        onClick={() => {
          trackEvent('onboarding_start_blank');
          onStartBlank();
        }}
        className="w-full gap-2"
      >
        <PenLine className="w-4 h-4" />
        Start with my own idea
      </Button>
    </div>
  );
});
