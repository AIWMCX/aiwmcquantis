import React from 'react';
import { cn } from '@/lib/utils';

interface QuickPick {
  id: string;
  icon: string;
  label: string;
  description?: string;
}

const QUICK_PICKS: QuickPick[] = [
  { id: 'coffee_shop', icon: '☕', label: 'Coffee Shop', description: 'Specialty coffee & café' },
  { id: 'saas', icon: '💻', label: 'SaaS', description: 'Software as a service' },
  { id: 'ecommerce', icon: '🛍️', label: 'Ecommerce', description: 'Online retail store' },
  { id: 'restaurant', icon: '🍽️', label: 'Restaurant', description: 'Food & dining' },
  { id: 'fitness', icon: '💪', label: 'Fitness', description: 'Gym or studio' },
  { id: 'consulting', icon: '📊', label: 'Consulting', description: 'Professional services' },
];

interface QuickIndustryPicksProps {
  selected?: string;
  onSelect: (industryId: string) => void;
  disabled?: boolean;
}

export function QuickIndustryPicks({ selected, onSelect, disabled }: QuickIndustryPicksProps) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-[var(--q-text-tertiary)]" style={{ fontFamily: 'var(--q-font-body)' }}>
        Popular industries
      </span>
      <div className="flex flex-wrap gap-2">
        {QUICK_PICKS.map((pick) => (
          <button
            key={pick.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(pick.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all duration-[var(--q-duration-fast)]',
              'hover:bg-[var(--q-accent-glow)] hover:border-[var(--q-accent-primary)]/40',
              selected === pick.id
                ? 'bg-[var(--q-accent-glow)] border-[var(--q-accent-primary)]/40 text-[var(--q-accent-primary)]'
                : 'bg-[var(--q-bg-surface)] border-[var(--q-border-default)] text-[var(--q-text-secondary)]',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span>{pick.icon}</span>
            <span style={{ fontFamily: 'var(--q-font-body)' }}>{pick.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
