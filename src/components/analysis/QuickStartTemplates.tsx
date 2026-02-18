import React from 'react';
import { Coffee, Monitor, ShoppingBag, Briefcase, Utensils, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

interface QuickTemplate {
  id: string;
  icon: React.ElementType;
  label: string;
  shortLabel: string;
  idea: string;
  location: string;
  /** CSS vars-based ring color for the icon orb border */
  orbRing: string;
  /** Tailwind bg gradient classes */
  orbBg: string;
  /** Icon stroke color class */
  iconColor: string;
  /** Card border + hover */
  cardBorder: string;
}

const TEMPLATES: QuickTemplate[] = [
  {
    id: 'coffee-shop',
    icon: Coffee,
    label: 'Coffee Shop',
    shortLabel: 'Coffee',
    idea: 'Specialty coffee shop with remote work-friendly spaces, fast Wi-Fi, meeting rooms, and locally roasted beans in a high-foot-traffic neighborhood',
    location: 'Denver, Colorado',
    orbBg: 'from-amber-400 via-orange-400 to-amber-600',
    orbRing: 'ring-amber-400/30',
    iconColor: 'text-white',
    cardBorder: 'border-amber-400/20 hover:border-amber-400/50 hover:bg-amber-500/5',
  },
  {
    id: 'saas-app',
    icon: Monitor,
    label: 'SaaS App',
    shortLabel: 'SaaS',
    idea: 'Project management SaaS tool for freelancers and small agencies with AI-powered task prioritization, time tracking, and automated invoicing',
    location: 'San Francisco, USA',
    orbBg: 'from-blue-500 via-indigo-500 to-blue-700',
    orbRing: 'ring-blue-400/30',
    iconColor: 'text-white',
    cardBorder: 'border-blue-400/20 hover:border-blue-400/50 hover:bg-blue-500/5',
  },
  {
    id: 'ecommerce',
    icon: ShoppingBag,
    label: 'Online Store',
    shortLabel: 'Store',
    idea: 'Direct-to-consumer sustainable fashion brand selling organic cotton basics online with subscription model and personalized styling',
    location: 'London, UK',
    orbBg: 'from-pink-400 via-rose-500 to-pink-700',
    orbRing: 'ring-pink-400/30',
    iconColor: 'text-white',
    cardBorder: 'border-pink-400/20 hover:border-pink-400/50 hover:bg-pink-500/5',
  },
  {
    id: 'consulting',
    icon: Briefcase,
    label: 'Consulting',
    shortLabel: 'Consult',
    idea: 'Digital transformation consulting firm for mid-market manufacturing companies transitioning to Industry 4.0 with AI implementation',
    location: 'Chicago, USA',
    orbBg: 'from-violet-500 via-purple-500 to-violet-700',
    orbRing: 'ring-violet-400/30',
    iconColor: 'text-white',
    cardBorder: 'border-violet-400/20 hover:border-violet-400/50 hover:bg-violet-500/5',
  },
  {
    id: 'restaurant',
    icon: Utensils,
    label: 'Restaurant',
    shortLabel: 'Food',
    idea: 'Fast-casual healthy bowl restaurant with customizable grain bowls, fresh ingredients, and a strong delivery/takeout model',
    location: 'Austin, Texas',
    orbBg: 'from-emerald-400 via-teal-500 to-emerald-700',
    orbRing: 'ring-emerald-400/30',
    iconColor: 'text-white',
    cardBorder: 'border-emerald-400/20 hover:border-emerald-400/50 hover:bg-emerald-500/5',
  },
  {
    id: 'fitness',
    icon: Dumbbell,
    label: 'Fitness',
    shortLabel: 'Fitness',
    idea: 'Boutique fitness studio combining HIIT and yoga classes with an app for at-home workouts, nutrition coaching, and community challenges',
    location: 'Miami, Florida',
    orbBg: 'from-orange-400 via-red-500 to-orange-600',
    orbRing: 'ring-orange-400/30',
    iconColor: 'text-white',
    cardBorder: 'border-orange-400/20 hover:border-orange-400/50 hover:bg-orange-500/5',
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
      <p className="text-[10px] font-semibold text-muted-foreground text-center tracking-widest uppercase">
        Or try a sample — pick a business type
      </p>
      <div className="grid grid-cols-6 gap-1.5">
        {TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelect(template)}
              disabled={disabled}
              className={cn(
                'group relative flex flex-col items-center justify-center gap-1.5 px-0.5 py-2.5 rounded-xl border transition-all duration-200',
                'bg-card backdrop-blur-sm overflow-hidden',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                'hover:scale-[1.04] hover:shadow-md active:scale-[0.98]',
                template.cardBorder
              )}
            >
              {/* Quantis icon orb — solid gradient with specular highlight */}
              <div className={cn(
                'relative flex items-center justify-center w-8 h-8 rounded-[9px] shrink-0',
                'bg-gradient-to-br',
                template.orbBg,
                'ring-[1.5px]',
                template.orbRing,
                'shadow-md',
                'transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg'
              )}>
                <Icon className="w-4 h-4 text-white" strokeWidth={2.2} />
                <div className="absolute top-0.5 left-0.5 w-2.5 h-2 rounded-full bg-white/30 blur-[2.5px] pointer-events-none" />
              </div>

              {/* Short label — single line, guaranteed to fit */}
              <span className="block w-full text-center font-semibold text-[9.5px] leading-none tracking-tight text-foreground/70 group-hover:text-foreground transition-colors truncate px-0.5">
                {template.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

