import React from 'react';
import { cn } from '@/lib/utils';
import { RotateCcw, TrendingDown, Home, Megaphone, Snail, Sun, AlertTriangle, Swords } from 'lucide-react';

export type ScenarioId = 'base' | 'recession' | 'rent_2x' | 'ad_surge' | 'slow_launch' | 'best_case' | 'worst_case' | 'competitor';

export interface ScenarioConfig {
  id: ScenarioId;
  label: string;
  icon: React.ReactNode | null;
  multiplier: number;
  volatility: number;
  marginDelta: number;
}

export const SCENARIO_CONFIGS: ScenarioConfig[] = [
  { id: 'base', label: 'Base', icon: null, multiplier: 1, volatility: 0.15, marginDelta: 0 },
  { id: 'recession', label: 'Recession', icon: <TrendingDown className="w-3 h-3" />, multiplier: 0.7, volatility: 0.25, marginDelta: -8 },
  { id: 'rent_2x', label: 'Rent ×2', icon: <Home className="w-3 h-3" />, multiplier: 0.85, volatility: 0.18, marginDelta: -12 },
  { id: 'ad_surge', label: 'Ad Surge', icon: <Megaphone className="w-3 h-3" />, multiplier: 1.25, volatility: 0.22, marginDelta: -5 },
  { id: 'slow_launch', label: 'Slow Launch', icon: <Snail className="w-3 h-3" />, multiplier: 0.6, volatility: 0.30, marginDelta: -3 },
  { id: 'best_case', label: 'Best Case', icon: <Sun className="w-3 h-3" />, multiplier: 1.4, volatility: 0.12, marginDelta: 5 },
  { id: 'worst_case', label: 'Worst Case', icon: <AlertTriangle className="w-3 h-3" />, multiplier: 0.45, volatility: 0.35, marginDelta: -15 },
  { id: 'competitor', label: 'Competitor', icon: <Swords className="w-3 h-3" />, multiplier: 0.75, volatility: 0.28, marginDelta: -10 },
];

interface ScenarioBarProps {
  activeScenario: ScenarioId;
  onScenarioChange: (id: ScenarioId) => void;
}

export function ScenarioBar({ activeScenario, onScenarioChange }: ScenarioBarProps) {
  const activeConfig = SCENARIO_CONFIGS.find(s => s.id === activeScenario);

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider font-medium text-[var(--q-text-tertiary)]">
          Stress-test scenarios:
        </span>
        {activeScenario !== 'base' && (
          <button
            onClick={() => onScenarioChange('base')}
            className="flex items-center gap-1 text-[11px] text-[var(--q-text-tertiary)] hover:text-[var(--q-text-secondary)] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset to Base
          </button>
        )}
      </div>

      {/* Scenario label when non-base */}
      {activeScenario !== 'base' && activeConfig && (
        <p className="text-xs font-medium text-[var(--q-accent-primary)]">
          Scenario: {activeConfig.emoji} {activeConfig.label}
        </p>
      )}

      {/* Pill row — horizontal scroll */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
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
                  ? 'bg-[var(--q-accent-primary)] text-white border-[var(--q-accent-primary)] scale-100 animate-[spring-in_0.3s_ease-out]'
                  : 'bg-[var(--q-bg-elevated)] text-[var(--q-text-secondary)] border-[var(--q-border-default)]'
              )}
            >
              {s.emoji ? `${s.emoji} ${s.label}` : s.label}
            </button>
          );
        })}
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @keyframes spring-in {
          0% { transform: scale(0.95); }
          60% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
