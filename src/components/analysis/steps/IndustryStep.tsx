import React, { useState } from 'react';
import { Check, MapPin } from 'lucide-react';
import { INDUSTRIES } from './shared';
import { AnonymousUsageNotice } from '../AnonymousUsageNotice';

interface IndustryStepProps {
  selectedIndustry: string | undefined;
  onIndustrySelect: (id: string) => void;
  location: string;
  onLocationChange: (v: string) => void;
  idea: string;
  onIdeaChange: (v: string) => void;
  errors: { idea?: string; location?: string };
  onClearError: (field: 'idea' | 'location') => void;
  isAuthenticated?: boolean;
}

export function IndustryStep({
  selectedIndustry, onIndustrySelect,
  location, onLocationChange,
  idea, onIdeaChange,
  errors, onClearError,
  isAuthenticated,
}: IndustryStepProps) {
  const [descOpen, setDescOpen] = useState(false);

  return (
    <div className="rounded-[var(--q-radius-lg)] overflow-hidden" style={{ background: 'var(--q-bg-surface)', border: '1px solid var(--q-border-subtle)' }}>
      <div className="flex items-center gap-2 h-12 px-4" style={{ borderBottom: '1px solid var(--q-border-subtle)' }}>
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{
          background: selectedIndustry ? 'var(--q-status-green)' : 'var(--q-accent-primary)',
          color: '#fff'
        }}>{selectedIndustry ? <Check className="w-3 h-3" /> : '1'}</span>
        <span className="text-[13px] font-bold tracking-[0.06em] uppercase" style={{ color: 'var(--q-text-secondary)' }}>Step 1 · Business</span>
      </div>
      <div className="p-4 space-y-3.5">
        {/* Industry Grid */}
        <div>
          <label className="q-form-label mb-2 block">Industry</label>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Select industry">
            {INDUSTRIES.map(ind => {
              const Icon = ind.icon;
              const isSelected = selectedIndustry === ind.id;
              return (
                <button
                  key={ind.id} type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onIndustrySelect(ind.id)}
                  className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all duration-200 cursor-pointer text-center min-h-[72px] hover:translate-y-[-1px] hover:shadow-md active:translate-y-0 relative"
                  style={{
                    background: isSelected ? 'var(--q-accent-glow)' : 'var(--q-bg-input)',
                    border: `2px solid ${isSelected ? 'var(--q-accent-primary)' : 'var(--q-border-subtle)'}`,
                    color: isSelected ? 'var(--q-accent-primary)' : 'var(--q-text-secondary)',
                    fontWeight: isSelected ? 600 : 500,
                    boxShadow: isSelected ? '0 0 0 3px var(--q-accent-glow)' : 'none',
                  }}
                >
                  {ind.popular && !isSelected && (
                    <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--q-status-green)', color: '#fff' }}>
                      Popular
                    </span>
                  )}
                  <Icon className="w-6 h-6 flex-shrink-0" />
                  <span className="text-[13px] leading-tight font-semibold">{ind.label}</span>
                  <span className="text-[10px] leading-tight" style={{ color: 'var(--q-text-disabled)' }}>{ind.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="q-form-label mb-1.5 block">Location</label>
          <div
            className="flex items-center h-12 rounded-[var(--q-radius-md)] px-3 gap-2 transition-all duration-150"
            style={{ background: 'var(--q-bg-input)', border: '1px solid var(--q-border-subtle)' }}
          >
            <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--q-text-tertiary)' }} />
            <input
              type="text"
              placeholder="City, State — e.g. Denver, CO"
              value={location}
              onChange={e => { onLocationChange(e.target.value); if (errors.location) onClearError('location'); }}
              className="flex-1 bg-transparent border-none outline-none text-[15px]"
              style={{ color: 'var(--q-text-primary)' }}
            />
          </div>
          <span className="q-form-hint mt-1 block">Required for geo-calibrated benchmarks</span>
          {errors.location && <span className="text-[12px] mt-1 block" style={{ color: 'var(--q-status-red)' }}>{errors.location}</span>}
        </div>

        {/* Business Idea */}
        <div>
          <button
            type="button"
            onClick={() => setDescOpen(!descOpen)}
            className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0"
          >
            <span className="transition-transform duration-200" style={{ transform: descOpen ? 'rotate(90deg)' : 'none', color: 'var(--q-text-tertiary)', fontSize: 14 }}>›</span>
            <span className="text-[13px] font-medium" style={{ color: 'var(--q-text-secondary)' }}>Describe your idea</span>
            <span className="text-[11px] ml-1 font-semibold" style={{ color: 'var(--q-status-green)' }}>(+12% accuracy)</span>
          </button>
          {descOpen ? (
            <textarea
              placeholder="e.g. Boutique fitness studio near LoDo with premium equipment"
              value={idea}
              onChange={e => { onIdeaChange(e.target.value); if (errors.idea) onClearError('idea'); }}
              className="w-full mt-2 resize-none rounded-[var(--q-radius-md)] text-[15px] p-3 outline-none transition-all duration-150"
              style={{ height: 72, background: 'var(--q-bg-input)', border: '1px solid var(--q-border-subtle)', color: 'var(--q-text-primary)' }}
            />
          ) : (
            <input
              type="text"
              placeholder="Your business idea in one line..."
              value={idea}
              onChange={e => { onIdeaChange(e.target.value); if (errors.idea) onClearError('idea'); }}
              className="w-full mt-2 h-11 rounded-[var(--q-radius-md)] text-[15px] px-3 outline-none transition-all duration-150"
              style={{ background: 'var(--q-bg-input)', border: '1px solid var(--q-border-subtle)', color: 'var(--q-text-primary)' }}
            />
          )}
          <span className="q-form-hint mt-1 block">We'll rewrite this into investor-grade language</span>
          {errors.idea && <span className="text-[12px] mt-1 block" style={{ color: 'var(--q-status-red)' }}>{errors.idea}</span>}
        </div>

        {!isAuthenticated && <AnonymousUsageNotice />}
      </div>
    </div>
  );
}
