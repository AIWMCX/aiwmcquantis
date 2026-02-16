import React from 'react';
import { Coffee, Monitor, ShoppingBag, Briefcase, Utensils, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

interface QuickTemplate {
  id: string;
  icon: React.ElementType;
  label: string;
  idea: string;
  location: string;
  color: string;
}

const TEMPLATES: QuickTemplate[] = [
  {
    id: 'coffee-shop',
    icon: Coffee,
    label: 'Coffee Shop',
    idea: 'Specialty coffee shop with remote work-friendly spaces, fast Wi-Fi, meeting rooms, and locally roasted beans in a high-foot-traffic neighborhood',
    location: 'Denver, Colorado',
    color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20',
  },
  {
    id: 'saas-app',
    icon: Monitor,
    label: 'SaaS App',
    idea: 'Project management SaaS tool for freelancers and small agencies with AI-powered task prioritization, time tracking, and automated invoicing',
    location: 'San Francisco, USA',
    color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20',
  },
  {
    id: 'ecommerce',
    icon: ShoppingBag,
    label: 'Online Store',
    idea: 'Direct-to-consumer sustainable fashion brand selling organic cotton basics online with subscription model and personalized styling',
    location: 'London, UK',
    color: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20 hover:bg-pink-500/20',
  },
  {
    id: 'consulting',
    icon: Briefcase,
    label: 'Consulting',
    idea: 'Digital transformation consulting firm for mid-market manufacturing companies transitioning to Industry 4.0 with AI implementation',
    location: 'Chicago, USA',
    color: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/20',
  },
  {
    id: 'restaurant',
    icon: Utensils,
    label: 'Restaurant',
    idea: 'Fast-casual healthy bowl restaurant with customizable grain bowls, fresh ingredients, and a strong delivery/takeout model',
    location: 'Austin, Texas',
    color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20',
  },
  {
    id: 'fitness',
    icon: Dumbbell,
    label: 'Fitness Studio',
    idea: 'Boutique fitness studio combining HIIT and yoga classes with an app for at-home workouts, nutrition coaching, and community challenges',
    location: 'Miami, Florida',
    color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/20',
  },
];

interface QuickStartTemplatesProps {
  onSelect: (idea: string, location: string) => void;
  disabled?: boolean;
  className?: string;
}

export function QuickStartTemplates({ onSelect, disabled = false, className }: QuickStartTemplatesProps) {
  const handleSelect = (template: QuickTemplate) => {
    if (disabled) return;
    trackEvent('quick_template_selected', { template_id: template.id });
    onSelect(template.idea, template.location);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-sm font-medium text-muted-foreground text-center">
        Or try a sample — pick a business type:
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelect(template)}
              disabled={disabled}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 min-h-[72px]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                template.color
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium leading-tight text-center">{template.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
