import React from 'react';
import { cn } from '@/lib/utils';
import { RotateCcw, TrendingDown, Home, Megaphone, Snail, Sun, AlertTriangle, Swords } from 'lucide-react';

export type ScenarioId = 'base' | 'recession' | 'rent_2x' | 'ad_surge' | 'slow_launch' | 'best_case' | 'worst_case' | 'competitor';

export interface ScenarioConfig {
  id: ScenarioId;
  label: string;
  description: string;
  icon: React.ReactNode | null;
  multiplier: number;
  volatility: number;
  marginDelta: number;
  accentHue?: string; // ambient color shift
}

export const SCENARIO_CONFIGS: ScenarioConfig[] = [
  { id: 'base', label: 'Base', description: 'Your current assumptions', icon: null, multiplier: 1, volatility: 0.15, marginDelta: 0 },
  { id: 'recession', label: 'Recession', description: '−15% demand, tighter spending', icon: <TrendingDown className="w-3.5 h-3.5" />, multiplier: 0.7, volatility: 0.25, marginDelta: -8, accentHue: 'var(--q-status-yellow)' },
  { id: 'rent_2x', label: 'Rent ×2', description: '+40% fixed costs, same revenue', icon: <Home className="w-3.5 h-3.5" />, multiplier: 0.85, volatility: 0.18, marginDelta: -12, accentHue: 'var(--q-status-orange)' },
  { id: 'ad_surge', label: 'Ad Surge', description: '+40% demand, CAC −15% for 3mo', icon: <Megaphone className="w-3.5 h-3.5" />, multiplier: 1.25, volatility: 0.22, marginDelta: -5, accentHue: 'var(--q-status-green)' },
  { id: 'slow_launch', label: 'Slow Launch', description: '60% of expected traction', icon: <Snail className="w-3.5 h-3.5" />, multiplier: 0.6, volatility: 0.30, marginDelta: -3, accentHue: 'var(--q-status-yellow)' },
  { id: 'best_case', label: 'Best Case', description: 'Everything goes right', icon: <Sun className="w-3.5 h-3.5" />, multiplier: 1.4, volatility: 0.12, marginDelta: 5, accentHue: 'var(--q-status-green)' },
  { id: 'worst_case', label: 'Worst Case', description: 'Multiple shocks at once', icon: <AlertTriangle className="w-3.5 h-3.5" />, multiplier: 0.45, volatility: 0.35, marginDelta: -15, accentHue: 'var(--q-status-red)' },
  { id: 'competitor', label: 'Competitor', description: 'New entrant takes 25% share', icon: <Swords className="w-3.5 h-3.5" />, multiplier: 0.75, volatility: 0.28, marginDelta: -10, accentHue: 'var(--q-status-orange)' },
];

interface ScenarioBarProps {
  activeScenario: ScenarioId;
  onScenarioChange: (id: ScenarioId) => void;
}

export function ScenarioBar({ activeScenario, onScenarioChange }: ScenarioBarProps) {
  const activeConfig = SCENARIO_CONFIGS.find(s => s.id === activeScenario);

  return (
    <div className="space-y-3">
      {/* Story line — one sentence about active scenario */}
      {activeScenario !== 'base' && activeConfig && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300"
          style={{
            backgroundColor: `color-mix(in srgb, ${activeConfig.accentHue || 'var(--q-accent-primary)'} 8%, transparent)`,
            color: activeConfig.accentHue || 'var(--q-accent-primary)',
            borderLeft: `3px solid ${activeConfig.accentHue || 'var(--q-accent-primary)'}`,
          }}
        >
          {activeConfig.icon}
          <span>{activeConfig.label}: {activeConfig.description}</span>
        </div>
      )}

      {/* Label + reset */}
      <div className="flex items-center justify-between">
        <span className="text-label-sm">Stress-test scenarios</span>
        {activeScenario !== 'base' && (
          <button
            onClick={() => onScenarioChange('base')}
            className="flex items-center gap-1 text-[11px] text-[var(--q-text-tertiary)] hover:text-[var(--q-text-secondary)] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* Scenario pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {SCENARIO_CONFIGS.map(s => {
          const isActive = activeScenario === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onScenarioChange(s.id)}
              className={cn(
                'shrink-0 h-9 px-3.5 rounded-full text-xs font-medium border whitespace-nowrap',
                'transition-all duration-200',
                'hover:border-[var(--q-border-strong)] hover:-translate-y-px',
                isActive
                  ? 'text-white border-transparent scale-100'
                  : 'bg-[var(--q-bg-elevated)] text-[var(--q-text-secondary)] border-[var(--q-border-default)]'
              )}
              style={isActive ? {
                backgroundColor: s.accentHue || 'var(--q-accent-primary)',
                borderColor: s.accentHue || 'var(--q-accent-primary)',
              } : undefined}
            >
              {s.icon && <span className="mr-1 inline-flex">{s.icon}</span>}{s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
