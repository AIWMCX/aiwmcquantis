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
  // Quantis brand icon style: gradient bg + icon color + glow color
  iconBg: string;
  iconColor: string;
  glowColor: string;
  borderColor: string;
  hoverBg: string;
}

const TEMPLATES: QuickTemplate[] = [
  {
    id: 'coffee-shop',
    icon: Coffee,
    label: 'Coffee Shop',
    idea: 'Specialty coffee shop with remote work-friendly spaces, fast Wi-Fi, meeting rooms, and locally roasted beans in a high-foot-traffic neighborhood',
    location: 'Denver, Colorado',
    iconBg: 'from-amber-500/30 to-orange-600/20',
    iconColor: 'text-amber-400',
    glowColor: 'shadow-amber-500/20',
    borderColor: 'border-amber-500/25 hover:border-amber-400/50',
    hoverBg: 'hover:bg-amber-500/5',
  },
  {
    id: 'saas-app',
    icon: Monitor,
    label: 'SaaS App',
    idea: 'Project management SaaS tool for freelancers and small agencies with AI-powered task prioritization, time tracking, and automated invoicing',
    location: 'San Francisco, USA',
    iconBg: 'from-blue-500/30 to-indigo-600/20',
    iconColor: 'text-blue-400',
    glowColor: 'shadow-blue-500/20',
    borderColor: 'border-blue-500/25 hover:border-blue-400/50',
    hoverBg: 'hover:bg-blue-500/5',
  },
  {
    id: 'ecommerce',
    icon: ShoppingBag,
    label: 'Online Store',
    idea: 'Direct-to-consumer sustainable fashion brand selling organic cotton basics online with subscription model and personalized styling',
    location: 'London, UK',
    iconBg: 'from-pink-500/30 to-rose-600/20',
    iconColor: 'text-pink-400',
    glowColor: 'shadow-pink-500/20',
    borderColor: 'border-pink-500/25 hover:border-pink-400/50',
    hoverBg: 'hover:bg-pink-500/5',
  },
  {
    id: 'consulting',
    icon: Briefcase,
    label: 'Consulting',
    idea: 'Digital transformation consulting firm for mid-market manufacturing companies transitioning to Industry 4.0 with AI implementation',
    location: 'Chicago, USA',
    iconBg: 'from-violet-500/30 to-purple-600/20',
    iconColor: 'text-violet-400',
    glowColor: 'shadow-violet-500/20',
    borderColor: 'border-violet-500/25 hover:border-violet-400/50',
    hoverBg: 'hover:bg-violet-500/5',
  },
  {
    id: 'restaurant',
    icon: Utensils,
    label: 'Restaurant',
    idea: 'Fast-casual healthy bowl restaurant with customizable grain bowls, fresh ingredients, and a strong delivery/takeout model',
    location: 'Austin, Texas',
    iconBg: 'from-emerald-500/30 to-teal-600/20',
    iconColor: 'text-emerald-400',
    glowColor: 'shadow-emerald-500/20',
    borderColor: 'border-emerald-500/25 hover:border-emerald-400/50',
    hoverBg: 'hover:bg-emerald-500/5',
  },
  {
    id: 'fitness',
    icon: Dumbbell,
    label: 'Fitness Studio',
    idea: 'Boutique fitness studio combining HIIT and yoga classes with an app for at-home workouts, nutrition coaching, and community challenges',
    location: 'Miami, Florida',
    iconBg: 'from-orange-500/30 to-red-600/20',
    iconColor: 'text-orange-400',
    glowColor: 'shadow-orange-500/20',
    borderColor: 'border-orange-500/25 hover:border-orange-400/50',
    hoverBg: 'hover:bg-orange-500/5',
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
      <p className="text-xs font-medium text-muted-foreground text-center tracking-wide uppercase">
        Or try a sample — pick a business type
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
                'group relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 min-h-[80px]',
                'bg-card/60 backdrop-blur-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                'hover:scale-[1.04] hover:shadow-lg active:scale-[0.98]',
                template.borderColor,
                template.hoverBg
              )}
            >
              {/* Quantis branded icon container — gradient orb */}
              <div className={cn(
                'relative flex items-center justify-center w-10 h-10 rounded-xl',
                'bg-gradient-to-br',
                template.iconBg,
                'shadow-md',
                template.glowColor,
                'transition-transform duration-200 group-hover:scale-110'
              )}>
                <Icon className={cn('w-5 h-5', template.iconColor)} strokeWidth={1.75} />
                {/* Inner shine */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent to-white/10 pointer-events-none" />
              </div>
              <span className="text-[11px] font-semibold leading-tight text-center text-foreground/80 group-hover:text-foreground transition-colors">
                {template.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
