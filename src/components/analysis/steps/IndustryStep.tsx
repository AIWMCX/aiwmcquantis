import React, { useState } from 'react';
import { Check } from 'lucide-react';
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
        <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--q-text-secondary)' }}>Step 1 · Business</span>
      </div>
      <div className="p-4 space-y-3.5">
        {/* Industry Grid */}
        <div>
          <label className="text-[11px] font-semibold tracking-[0.06em] uppercase mb-1.5 block" style={{ color: 'var(--q-text-tertiary)' }}>Industry</label>
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
                  className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-[11px] transition-all duration-200 cursor-pointer text-center min-h-[60px] hover:translate-y-[-1px] hover:shadow-md active:translate-y-0"
                  style={{
                    background: isSelected ? 'var(--q-accent-glow)' : 'var(--q-bg-input)',
                    border: `2px solid ${isSelected ? 'var(--q-accent-primary)' : 'var(--q-border-subtle)'}`,
                    color: isSelected ? 'var(--q-accent-primary)' : 'var(--q-text-secondary)',
                    fontWeight: isSelected ? 600 : 500,
                    boxShadow: isSelected ? '0 0 0 3px var(--q-accent-glow)' : 'none',
                  }}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="leading-tight">{ind.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="text-[11px] font-semibold tracking-[0.06em] uppercase mb-1.5 block" style={{ color: 'var(--q-text-tertiary)' }}>Location</label>
          <div
            className="flex items-center h-11 rounded-[var(--q-radius-md)] px-3 gap-2 transition-all duration-150"
            style={{ background: 'var(--q-bg-input)', border: '1px solid var(--q-border-subtle)' }}
          >
            <span className="text-[13px] flex-shrink-0">📍</span>
            <input
              type="text"
              placeholder="City, State — e.g. Denver, CO"
              value={location}
              onChange={e => { onLocationChange(e.target.value); if (errors.location) onClearError('location'); }}
              className="flex-1 bg-transparent border-none outline-none text-[13px]"
              style={{ color: 'var(--q-text-primary)' }}
            />
          </div>
          {errors.location && <span className="text-[11px] mt-1 block" style={{ color: 'var(--q-status-red)' }}>{errors.location}</span>}
        </div>

        {/* Business Idea */}
        <div>
          <button
            type="button"
            onClick={() => setDescOpen(!descOpen)}
            className="flex items-center gap-1 bg-transparent border-none cursor-pointer p-0"
          >
            <span className="transition-transform duration-200" style={{ transform: descOpen ? 'rotate(90deg)' : 'none', color: 'var(--q-text-tertiary)', fontSize: 12 }}>›</span>
            <span className="text-[12px]" style={{ color: 'var(--q-text-tertiary)' }}>Describe your idea</span>
            <span className="text-[10px] ml-1" style={{ color: 'var(--q-text-disabled)' }}>(required · +12% accuracy)</span>
          </button>
          {descOpen ? (
            <textarea
              placeholder="e.g. Boutique fitness studio near LoDo with premium equipment"
              value={idea}
              onChange={e => { onIdeaChange(e.target.value); if (errors.idea) onClearError('idea'); }}
              className="w-full mt-2 resize-none rounded-[var(--q-radius-md)] text-[13px] p-2.5 outline-none transition-all duration-150"
              style={{ height: 64, background: 'var(--q-bg-input)', border: '1px solid var(--q-border-subtle)', color: 'var(--q-text-primary)' }}
            />
          ) : (
            <input
              type="text"
              placeholder="Your business idea in one line..."
              value={idea}
              onChange={e => { onIdeaChange(e.target.value); if (errors.idea) onClearError('idea'); }}
              className="w-full mt-2 h-10 rounded-[var(--q-radius-md)] text-[13px] px-3 outline-none transition-all duration-150"
              style={{ background: 'var(--q-bg-input)', border: '1px solid var(--q-border-subtle)', color: 'var(--q-text-primary)' }}
            />
          )}
          {errors.idea && <span className="text-[11px] mt-1 block" style={{ color: 'var(--q-status-red)' }}>{errors.idea}</span>}
        </div>

        {!isAuthenticated && <AnonymousUsageNotice />}
      </div>
    </div>
  );
}
