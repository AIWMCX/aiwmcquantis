import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Loader2, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalysisProgress } from './AnalysisProgress';
import { AnonymousUsageNotice } from './AnonymousUsageNotice';
import type { OptionalFinancialInputs } from '@/types/analysis';
import type { UploadedFile } from '@/hooks/useFileUpload';

/* ─── INDUSTRY BENCHMARKS ─── */
const INDUSTRY_BENCHMARKS: Record<string, Record<string, [number, number]>> = {
  coffee_shop:  { capital: [40000, 120000], price: [4, 8],       customers: [80, 200],   opex: [8000, 18000],  cac: [12, 35],    churn: [3, 8]   },
  saas:         { capital: [15000, 80000],  price: [29, 299],    customers: [20, 150],   opex: [5000, 25000],  cac: [80, 400],   churn: [2, 6]   },
  ecommerce:    { capital: [10000, 60000],  price: [35, 180],    customers: [50, 400],   opex: [3000, 15000],  cac: [15, 80],    churn: [20, 45] },
  restaurant:   { capital: [80000, 300000], price: [18, 55],     customers: [200, 800],  opex: [20000, 60000], cac: [8, 30],     churn: [5, 15]  },
  fitness:      { capital: [30000, 150000], price: [60, 180],    customers: [40, 200],   opex: [6000, 20000],  cac: [45, 180],   churn: [4, 10]  },
  consulting:   { capital: [5000, 30000],   price: [3000, 15000],customers: [3, 20],     opex: [2000, 8000],   cac: [200, 1200], churn: [2, 8]   },
  retail:       { capital: [50000, 200000], price: [25, 120],    customers: [100, 500],  opex: [10000, 35000], cac: [10, 40],    churn: [10, 30] },
  real_estate:  { capital: [20000, 100000], price: [2500, 12000],customers: [2, 15],     opex: [3000, 10000],  cac: [300, 2000], churn: [3, 10]  },
};

import { Coffee, Monitor, ShoppingCart, Utensils, Dumbbell, BarChart3 as ConsultingIcon, Store, Building2 } from 'lucide-react';

const INDUSTRIES = [
  { id: 'coffee_shop', icon: Coffee, label: 'Coffee Shop' },
  { id: 'saas',        icon: Monitor, label: 'SaaS' },
  { id: 'ecommerce',   icon: ShoppingCart, label: 'Ecommerce' },
  { id: 'restaurant',  icon: Utensils, label: 'Restaurant' },
  { id: 'fitness',     icon: Dumbbell, label: 'Fitness' },
  { id: 'consulting',  icon: ConsultingIcon, label: 'Consulting' },
  { id: 'retail',      icon: Store, label: 'Retail' },
  { id: 'real_estate', icon: Building2, label: 'Real Estate' },
];

const DEPTH_OPTIONS = [
  { id: 'quick', label: 'Quick', time: '30s', desc: 'Core projections' },
  { id: 'full',  label: 'Full',  time: '90s', desc: 'P&L + Stress Map' },
  { id: 'deep',  label: 'Deep',  time: '3min', desc: 'All engines' },
];

/* ─── FORMAT HELPERS ─── */
function fmtK(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `$${n}`;
}
function fmtPct(n: number): string { return `${n.toFixed(0)}%`; }

/* ─── FINANCIAL FIELD ─── */
interface FinancialFieldProps {
  label: string;
  prefix?: string;
  suffix?: string;
  placeholder: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  benchmarkMin?: number;
  benchmarkMax?: number;
  hint?: string;
}

function FinancialField({ label, prefix, suffix, placeholder, value, onChange, benchmarkMin, benchmarkMax, hint }: FinancialFieldProps) {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== undefined && value > 0;

  // benchmark bar logic
  let statusLabel = '';
  let statusColor = '';
  let dotPct = 50;
  if (hasValue && benchmarkMin !== undefined && benchmarkMax !== undefined) {
    const range = benchmarkMax - benchmarkMin;
    dotPct = range > 0 ? Math.max(0, Math.min(100, ((value - benchmarkMin) / range) * 100)) : 50;
    if (value >= benchmarkMin && value <= benchmarkMax) {
      statusLabel = 'In range ✓'; statusColor = 'var(--q-status-green)';
    } else if (value < benchmarkMin) {
      statusLabel = 'Below typical'; statusColor = 'var(--q-status-yellow)';
    } else {
      statusLabel = 'Above typical'; statusColor = 'var(--q-status-orange)';
    }
  }

  return (
    <div className="flex flex-col min-w-0">
      <label className="text-[11px] font-semibold tracking-[0.06em] uppercase mb-1.5" style={{ color: 'var(--q-text-tertiary)' }}>
        {label}
      </label>
      <div
        className="flex items-center h-12 rounded-[var(--q-radius-md)] transition-all duration-150"
        style={{
          background: 'var(--q-bg-input)',
          border: `1px solid ${focused ? 'var(--q-accent-primary)' : hasValue ? 'var(--q-border-default)' : 'var(--q-border-subtle)'}`,
          boxShadow: focused ? '0 0 0 3px var(--q-accent-glow)' : 'none',
        }}
      >
        {prefix && (
          <span className="pl-3 text-sm font-medium flex-shrink-0 select-none pointer-events-none transition-colors duration-150"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: focused ? 'var(--q-accent-primary)' : 'var(--q-text-tertiary)' }}>
            {prefix}
          </span>
        )}
        <input
          type="number"
          inputMode="numeric"
          placeholder={placeholder}
          value={value ?? ''}
          onChange={e => {
            const v = e.target.value;
            onChange(v === '' ? undefined : Number(v));
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 h-full bg-transparent border-none outline-none text-[16px] font-semibold"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: 'var(--q-text-primary)',
            padding: prefix ? '0 10px' : '0 12px',
            MozAppearance: 'textfield',
          }}
        />
        {suffix && (
          <span className="pr-3 text-sm font-medium flex-shrink-0 select-none pointer-events-none transition-colors duration-150"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: focused ? 'var(--q-accent-primary)' : 'var(--q-text-tertiary)' }}>
            {suffix}
          </span>
        )}
      </div>
      {/* Hint */}
      {!hasValue && hint && (
        <span className="text-[10px] mt-1" style={{ color: 'var(--q-text-disabled)' }}>{hint}</span>
      )}
      {/* Benchmark bar */}
      {benchmarkMin !== undefined && benchmarkMax !== undefined && hasValue && (
        <div className="mt-1.5">
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-[10px]" style={{ color: 'var(--q-text-tertiary)' }}>{fmtK(benchmarkMin)}</span>
            <span className="text-[10px] font-semibold" style={{ color: statusColor }}>{statusLabel}</span>
            <span className="text-[10px]" style={{ color: 'var(--q-text-tertiary)' }}>{fmtK(benchmarkMax)}</span>
          </div>
          <div className="relative h-[3px] rounded-full" style={{ background: 'var(--q-border-subtle)' }}>
            <div className="absolute h-full rounded-full" style={{ left: '25%', right: '25%', background: 'var(--q-status-green-bg)' }} />
            <div
              className="absolute top-1/2 w-2 h-2 rounded-full transition-all duration-[400ms]"
              style={{
                left: `${dotPct}%`,
                transform: 'translate(-50%, -50%)',
                background: statusColor,
                border: '2px solid var(--q-bg-base)',
                boxShadow: `0 0 8px ${statusColor}60`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── CONFIDENCE RING ─── */
function ConfidenceRing({ score }: { score: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 80 ? 'var(--q-status-green)' : score >= 60 ? 'var(--q-accent-primary)' : score >= 40 ? 'var(--q-status-yellow)' : 'var(--q-status-orange)';
  const tier = score >= 80 ? 'VERIFIED' : score >= 60 ? 'CONFIRMED' : score >= 40 ? 'ESTIMATED' : 'UNCERTAIN';
  const tierColor = score >= 80 ? 'var(--q-status-green)' : score >= 60 ? 'var(--q-accent-primary)' : score >= 40 ? 'var(--q-status-yellow)' : '#F87171';

  return (
    <div className="flex flex-col items-center gap-2">
        <div className="relative w-[72px] h-[72px] sm:w-[88px] sm:h-[88px]">
          <svg viewBox="0 0 88 88" className="w-full h-full block">
            <circle cx={44} cy={44} r={r} fill="none" stroke="var(--q-border-subtle)" strokeWidth={6} />
            <circle
              cx={44} cy={44} r={r} fill="none" strokeWidth={6} strokeLinecap="round"
            stroke={color}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className="transition-all duration-[800ms]"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--q-text-primary)' }}>
            {score}
          </span>
          <span className="text-[9px]" style={{ color: 'var(--q-text-tertiary)' }}>/100</span>
        </div>
      </div>
      <span
        className="text-[10px] font-bold tracking-[0.08em] px-2.5 py-0.5 rounded-full"
        style={{ background: `${color}18`, border: `1px solid ${color}40`, color: tierColor }}
      >
        {tier}
      </span>
    </div>
  );
}

/* ─── MAIN FORM ─── */
interface CompactAnalysisFormProps {
  idea: string;
  location: string;
  financialInputs: OptionalFinancialInputs;
  errors: { idea?: string; location?: string };
  isLoading: boolean;
  isFormValid: boolean;
  onIdeaChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onFinancialInputsChange: (inputs: OptionalFinancialInputs) => void;
  onClearError: (field: 'idea' | 'location') => void;
  onSubmit: (e: React.FormEvent, depth?: string) => void;
  files?: UploadedFile[];
  isUploading?: boolean;
  maxFiles?: number;
  allowedExtensions?: string[];
  onUploadFiles?: (files: FileList | File[]) => void;
  onRemoveFile?: (fileId: string) => void;
  isAuthenticated?: boolean;
}

export function CompactAnalysisForm({
  idea, location, financialInputs, errors, isLoading, isFormValid,
  onIdeaChange, onLocationChange, onFinancialInputsChange, onClearError, onSubmit,
  isAuthenticated,
}: CompactAnalysisFormProps) {
  const [selectedIndustry, setSelectedIndustry] = useState<string | undefined>(financialInputs.selected_industry);
  const [depth, setDepth] = useState('full');
  const [descOpen, setDescOpen] = useState(false);

  const benchmarks = selectedIndustry ? INDUSTRY_BENCHMARKS[selectedIndustry] : undefined;

  const handleIndustrySelect = useCallback((id: string) => {
    setSelectedIndustry(id);
    onFinancialInputsChange({ ...financialInputs, selected_industry: id });
  }, [financialInputs, onFinancialInputsChange]);

  const updateField = useCallback((field: keyof OptionalFinancialInputs, value: number | undefined) => {
    onFinancialInputsChange({ ...financialInputs, [field]: value });
  }, [financialInputs, onFinancialInputsChange]);

  // Confidence score
  const confidence = useMemo(() => {
    let s = 0;
    if (selectedIndustry) s += 15;
    if (location.trim().length >= 2) s += 10;
    const reqFields = [
      financialInputs.startup_investment,
      financialInputs.average_price,
      financialInputs.expected_customers,
      financialInputs.monthly_costs,
    ];
    s += reqFields.filter(Boolean).length * (55 / 6);
    if (idea.trim().length >= 10) s += (55 / 6);
    if (location.trim().length >= 2) s += (55 / 6) - 10; // avoid double count
    if (financialInputs.cac) s += 10;
    if (financialInputs.churn_rate) s += 7;
    return Math.min(97, Math.round(Math.max(0, s)));
  }, [selectedIndustry, location, idea, financialInputs]);

  // Live estimate
  const liveEstimate = useMemo(() => {
    const price = financialInputs.average_price || 0;
    const cust = financialInputs.expected_customers || 0;
    const opex = financialInputs.monthly_costs || 0;
    const cac = financialInputs.cac || 0;
    const revenue = price * cust;
    const profit = revenue - opex - (cac * cust / 12);
    const margin = revenue > 0 ? ((revenue - opex) / revenue) * 100 : 0;
    return { revenue, profit, margin };
  }, [financialInputs]);

  // Checklist items
  const checklist = useMemo(() => [
    { label: 'Industry', done: !!selectedIndustry, required: true },
    { label: 'Location', done: location.trim().length >= 2, required: true },
    { label: 'Capital', done: !!financialInputs.startup_investment, required: true },
    { label: 'Price', done: !!financialInputs.average_price, required: true },
    { label: 'Customers', done: !!financialInputs.expected_customers, required: true },
    { label: 'Op. Costs', done: !!financialInputs.monthly_costs, required: true },
    { label: 'CAC', done: !!financialInputs.cac, required: false },
    { label: 'Churn', done: !!financialInputs.churn_rate, required: false },
  ], [selectedIndustry, location, financialInputs]);

  const requiredReady = !!selectedIndustry && !!financialInputs.startup_investment && !!financialInputs.average_price && !!financialInputs.expected_customers && isFormValid;

  // Missing hints
  const missingHint = useMemo(() => {
    if (!selectedIndustry) return 'Select an industry to begin';
    const missing: string[] = [];
    if (!financialInputs.startup_investment) missing.push('capital');
    if (!financialInputs.average_price) missing.push('price');
    if (!financialInputs.expected_customers) missing.push('customers');
    if (!idea.trim() || idea.trim().length < 10) missing.push('business idea');
    if (missing.length) return `Fill ${missing.join(', ')}`;
    return '';
  }, [selectedIndustry, financialInputs, idea]);

  const depthTime = DEPTH_OPTIONS.find(d => d.id === depth)?.time || '90s';

  return (
    <form onSubmit={(e) => onSubmit(e, depth)} className="space-y-4">
      {/* Loading overlay */}
      {isLoading && <AnalysisProgress isLoading={isLoading} businessType={selectedIndustry} location={location} />}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-block text-[11px] font-bold tracking-[0.06em] px-2.5 py-[3px] rounded-full mb-2"
            style={{ background: 'var(--q-status-ai-bg)', border: '1px solid var(--q-status-ai-border)', color: 'var(--q-status-ai)' }}>
            ⚡ DUAL-AI · GPT-4o mini + GEMINI
          </span>
          <h1 className="text-[22px] sm:text-[26px] font-bold leading-tight" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--q-text-primary)' }}>
            Stress-test your business idea
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--q-text-tertiary)' }}>
            Fill in what you know. We validate with 1,000+ benchmarks.
          </p>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr_260px] gap-4">

        {/* ═══ COLUMN 1 — Business Identity ═══ */}
        <div className="rounded-[var(--q-radius-lg)] overflow-hidden" style={{ background: 'var(--q-bg-surface)', border: '1px solid var(--q-border-subtle)' }}>
          <div className="flex items-center gap-2 h-12 px-4" style={{ borderBottom: '1px solid var(--q-border-subtle)' }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ 
              background: selectedIndustry ? 'var(--q-status-green)' : 'var(--q-accent-primary)', 
              color: '#fff' 
            }}>{selectedIndustry ? <Check className="w-3 h-3" /> : '1'}</span>
            <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--q-text-secondary)' }}>Step 1 · Business</span>
          </div>
          <div className="p-4 space-y-3.5">
            {/* Industry */}
            <div>
              <label className="text-[11px] font-semibold tracking-[0.06em] uppercase mb-1.5 block" style={{ color: 'var(--q-text-tertiary)' }}>Industry</label>
              <div className="grid grid-cols-2 gap-[5px]">
                {INDUSTRIES.map(ind => {
                  const Icon = ind.icon;
                  return (
                    <button
                      key={ind.id} type="button"
                      onClick={() => handleIndustrySelect(ind.id)}
                      className="flex items-center gap-1.5 py-[7px] px-[9px] rounded-lg text-[12px] transition-all duration-[120ms] cursor-pointer text-left"
                      style={{
                        background: selectedIndustry === ind.id ? 'var(--q-accent-glow)' : 'var(--q-bg-input)',
                        border: `1px solid ${selectedIndustry === ind.id ? 'var(--q-accent-primary)' : 'var(--q-border-subtle)'}`,
                        color: selectedIndustry === ind.id ? 'var(--q-accent-primary)' : 'var(--q-text-secondary)',
                        fontWeight: selectedIndustry === ind.id ? 600 : 400,
                        transform: selectedIndustry === ind.id ? 'scale(1.02)' : 'none',
                      }}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{ind.label}</span>
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

            {/* Business Idea (collapsed) */}
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
              {descOpen && (
                <textarea
                  placeholder="e.g. Boutique fitness studio near LoDo with premium equipment"
                  value={idea}
                  onChange={e => { onIdeaChange(e.target.value); if (errors.idea) onClearError('idea'); }}
                  className="w-full mt-2 resize-none rounded-[var(--q-radius-md)] text-[13px] p-2.5 outline-none transition-all duration-150"
                  style={{
                    height: 64,
                    background: 'var(--q-bg-input)',
                    border: '1px solid var(--q-border-subtle)',
                    color: 'var(--q-text-primary)',
                  }}
                />
              )}
              {/* Always show idea input when not using collapsible — actually keep it always accessible */}
              {!descOpen && (
                <input
                  type="text"
                  placeholder="Your business idea in one line..."
                  value={idea}
                  onChange={e => { onIdeaChange(e.target.value); if (errors.idea) onClearError('idea'); }}
                  className="w-full mt-2 h-10 rounded-[var(--q-radius-md)] text-[13px] px-3 outline-none transition-all duration-150"
                  style={{
                    background: 'var(--q-bg-input)',
                    border: '1px solid var(--q-border-subtle)',
                    color: 'var(--q-text-primary)',
                  }}
                />
              )}
              {errors.idea && <span className="text-[11px] mt-1 block" style={{ color: 'var(--q-status-red)' }}>{errors.idea}</span>}
            </div>

            {!isAuthenticated && <AnonymousUsageNotice />}
          </div>
        </div>

        {/* ═══ COLUMN 2 — Financial Inputs ═══ */}
        <div className="rounded-[var(--q-radius-lg)] overflow-hidden" style={{ background: 'var(--q-bg-surface)', border: '1px solid var(--q-border-subtle)' }}>
          <div className="flex items-center justify-between h-12 px-4" style={{ borderBottom: '1px solid var(--q-border-subtle)' }}>
            <div className="flex items-center gap-2">
              {(() => {
                const allFilled = !!(financialInputs.startup_investment && financialInputs.average_price && financialInputs.expected_customers && financialInputs.monthly_costs);
                return (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ 
                    background: allFilled ? 'var(--q-status-green)' : 'var(--q-accent-primary)', 
                    color: '#fff' 
                  }}>{allFilled ? <Check className="w-3 h-3" /> : '2'}</span>
                );
              })()}
              <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--q-text-secondary)' }}>Step 2 · Financial Inputs</span>
            </div>
            {selectedIndustry && (
              <span className="text-[10px] px-2 py-[3px] rounded-md" style={{ background: 'var(--q-bg-input)', color: 'var(--q-text-tertiary)' }}>
                Benchmarks: {INDUSTRIES.find(i => i.id === selectedIndustry)?.label}
              </span>
            )}
          </div>
          <div className="p-4 space-y-3">
            {/* 2×2 core fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FinancialField
                label="Starting Capital" prefix="$" placeholder="50,000"
                value={financialInputs.startup_investment}
                onChange={v => updateField('startup_investment', v)}
                benchmarkMin={benchmarks?.capital?.[0]} benchmarkMax={benchmarks?.capital?.[1]}
                hint="How much to start"
              />
              <FinancialField
                label="Price per Customer" prefix="$" placeholder="89"
                value={financialInputs.average_price}
                onChange={v => updateField('average_price', v)}
                benchmarkMin={benchmarks?.price?.[0]} benchmarkMax={benchmarks?.price?.[1]}
                hint="Per transaction / month / unit"
              />
              <FinancialField
                label="Customers at Launch" placeholder="30"
                value={financialInputs.expected_customers}
                onChange={v => updateField('expected_customers', v)}
                benchmarkMin={benchmarks?.customers?.[0]} benchmarkMax={benchmarks?.customers?.[1]}
                hint="Month 1 target"
              />
              <FinancialField
                label="Monthly Op. Costs" prefix="$" placeholder="10,000"
                value={financialInputs.monthly_costs}
                onChange={v => updateField('monthly_costs', v)}
                benchmarkMin={benchmarks?.opex?.[0]} benchmarkMax={benchmarks?.opex?.[1]}
                hint="Rent + staff + software"
              />
            </div>

            {/* Divider */}
            <div className="h-px" style={{ background: 'var(--q-border-subtle)' }} />

            {/* Optional header */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--q-text-disabled)' }}>
                Optional · +40% confidence boost
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--q-border-subtle)' }} />
              <span className="text-[11px] font-semibold" style={{ color: 'var(--q-status-green)' }}>⚡ +40%</span>
            </div>

            {/* Optional fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FinancialField
                label="Cust. Acquisition Cost" prefix="$" placeholder="150"
                value={financialInputs.cac}
                onChange={v => updateField('cac', v)}
                benchmarkMin={benchmarks?.cac?.[0]} benchmarkMax={benchmarks?.cac?.[1]}
                hint="Cost to acquire 1 customer"
              />
              <FinancialField
                label="Monthly Churn Rate" suffix="%" placeholder="5"
                value={financialInputs.churn_rate}
                onChange={v => updateField('churn_rate', v)}
                benchmarkMin={benchmarks?.churn?.[0]} benchmarkMax={benchmarks?.churn?.[1]}
                hint="% customers lost/month"
              />
            </div>

            {/* Divider */}
            <div className="h-px" style={{ background: 'var(--q-border-subtle)' }} />

            {/* Depth selector */}
            <div>
              <label className="text-[11px] font-semibold tracking-[0.06em] uppercase mb-2 block" style={{ color: 'var(--q-text-tertiary)' }}>Analysis Depth</label>
              <div className="grid grid-cols-3 gap-1.5">
                {DEPTH_OPTIONS.map(opt => (
                  <button
                    key={opt.id} type="button"
                    onClick={() => setDepth(opt.id)}
                    className="flex flex-col items-center gap-0.5 py-2 px-1.5 rounded-lg cursor-pointer transition-all duration-150"
                    style={{
                      background: depth === opt.id ? 'var(--q-accent-glow)' : 'var(--q-bg-input)',
                      border: `1px solid ${depth === opt.id ? 'var(--q-accent-primary)' : 'var(--q-border-subtle)'}`,
                    }}
                  >
                    <span className="text-[13px] font-bold" style={{ color: depth === opt.id ? 'var(--q-accent-primary)' : 'var(--q-text-secondary)' }}>{opt.label}</span>
                    <span className="text-[10px]" style={{ color: depth === opt.id ? 'var(--q-accent-primary)' : 'var(--q-text-tertiary)' }}>{opt.time}</span>
                    <span className="text-[9px] text-center" style={{ color: 'var(--q-text-disabled)' }}>{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ COLUMN 3 — Confidence + Preview + Submit ═══ */}
        <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">

          {/* Card A — Confidence Ring */}
          <div className="rounded-[var(--q-radius-lg)] overflow-hidden" style={{ background: 'var(--q-bg-surface)', border: '1px solid var(--q-border-subtle)' }}>
            <div className="flex items-center gap-2 h-12 px-4" style={{ borderBottom: '1px solid var(--q-border-subtle)' }}>
              <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--q-text-secondary)' }}>Analysis Quality</span>
            </div>
            <div className="p-4 flex flex-col items-center">
              <ConfidenceRing score={confidence} />
              {/* Checklist */}
              <div className="w-full mt-3 space-y-[5px]">
                {checklist.map(item => (
                  <div key={item.label} className="flex items-center gap-[7px] h-[22px]">
                    <span
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300"
                      style={{
                        background: item.done ? 'var(--q-status-green)' : item.required ? 'var(--q-bg-input)' : 'var(--q-border-subtle)',
                        border: item.done ? 'none' : `1px solid ${item.required ? 'var(--q-border-default)' : 'var(--q-border-subtle)'}`,
                      }}
                    >
                      {item.done && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </span>
                    <span className="text-[11px]" style={{ color: item.done ? 'var(--q-text-secondary)' : item.required ? 'var(--q-text-tertiary)' : 'var(--q-text-disabled)' }}>
                      {item.label}
                    </span>
                    {!item.done && !item.required && (
                      <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--q-status-green-bg)', color: 'var(--q-status-green)', border: '1px solid var(--q-status-green-border)' }}>+20%</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card B — Live Estimate */}
          <div className="rounded-[var(--q-radius-lg)] overflow-hidden" style={{ background: 'var(--q-bg-surface)', border: '1px solid var(--q-border-subtle)' }}>
            <div className="flex items-center gap-2 h-12 px-4" style={{ borderBottom: '1px solid var(--q-border-subtle)' }}>
              <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--q-text-secondary)' }}>Live Estimate</span>
            </div>
            <div className="p-3 space-y-2">
              {[
                { label: 'Monthly Revenue', value: liveEstimate.revenue, fmt: (v: number) => v > 0 ? fmtK(v) : '—', color: liveEstimate.revenue > 0 ? 'var(--q-status-green)' : 'var(--q-text-tertiary)' },
                { label: 'Est. Month 12 Profit', value: liveEstimate.profit, fmt: (v: number) => v !== 0 ? `${v < 0 ? '−' : ''}${fmtK(Math.abs(v))}` : '—', color: liveEstimate.profit > 0 ? 'var(--q-status-green)' : liveEstimate.profit < 0 ? 'var(--q-status-red)' : 'var(--q-text-tertiary)' },
                { label: 'Gross Margin', value: liveEstimate.margin, fmt: (v: number) => liveEstimate.revenue > 0 ? fmtPct(v) : '—', color: liveEstimate.margin > 40 ? 'var(--q-status-green)' : liveEstimate.margin > 20 ? 'var(--q-status-yellow)' : liveEstimate.revenue > 0 ? 'var(--q-status-red)' : 'var(--q-text-tertiary)' },
                { label: 'Depth', value: 0, fmt: () => depthTime, color: 'var(--q-status-ai)' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-[7px] px-3 rounded-lg" style={{ background: 'var(--q-bg-surface)', border: '1px solid var(--q-border-subtle)' }}>
                  <span className="text-[11px]" style={{ color: 'var(--q-text-tertiary)' }}>{row.label}</span>
                  <span className="text-[13px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: row.color }}>{row.fmt(row.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!requiredReady || isLoading}
            className="w-full h-[52px] rounded-xl border-none text-[15px] font-bold transition-all duration-150 cursor-pointer flex items-center justify-center gap-2"
            style={{
              fontFamily: 'Sora, sans-serif',
              background: requiredReady && !isLoading ? 'var(--q-gradient-accent)' : 'var(--q-bg-input)',
              color: requiredReady && !isLoading ? '#fff' : 'var(--q-text-disabled)',
              boxShadow: requiredReady && !isLoading ? '0 4px 20px rgba(79,142,247,0.3)' : 'none',
              cursor: requiredReady && !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
            ) : requiredReady ? (
              'Start Free Analysis →'
            ) : (
              'Start Free Analysis'
            )}
          </button>
          {!requiredReady && missingHint && (
            <p className="text-[11px] text-center" style={{ color: 'var(--q-text-disabled)' }}>{missingHint}</p>
          )}
        </div>
      </div>

      {/* "What you'll get" strip */}
      <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2 rounded-xl px-4 sm:px-5 py-3" style={{ background: 'var(--q-bg-surface)', border: '1px solid var(--q-border-subtle)' }}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] w-full sm:w-auto" style={{ color: 'var(--q-text-disabled)' }}>You'll receive:</span>
        {[
          ['📊', '36-month P&L'],
          ['🗺', 'Stress Map'],
          ['🎯', 'Break-even'],
          ['⚡', 'Dual-AI'],
          ['🌍', 'Geo-calibrated', true],
          ['📄', 'Investor docs', true],
        ].map(([icon, text, hideMobile]) => (
          <span key={text as string} className={`flex items-center gap-1.5 ${hideMobile ? 'hidden sm:flex' : ''}`}>
            <span className="text-sm">{icon}</span>
            <span className="text-[11px] sm:text-[12px]" style={{ color: 'var(--q-text-tertiary)' }}>{text}</span>
          </span>
        ))}
      </div>
    </form>
  );
}
