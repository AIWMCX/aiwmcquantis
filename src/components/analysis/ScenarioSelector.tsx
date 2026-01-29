import React from 'react';
import { TrendingDown, Target, TrendingUp } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type ScenarioType = 'pessimistic' | 'base' | 'optimistic';

interface ScenarioSelectorProps {
  selectedScenario: ScenarioType;
  onScenarioChange: (scenario: ScenarioType) => void;
  className?: string;
}

const scenarios = [
  {
    value: 'pessimistic' as const,
    label: 'Conservative',
    icon: TrendingDown,
    color: 'text-orange-600 dark:text-orange-400',
    description: 'Worst-case projections',
  },
  {
    value: 'base' as const,
    label: 'Baseline',
    icon: Target,
    color: 'text-blue-600 dark:text-blue-400',
    description: 'Expected outcomes',
  },
  {
    value: 'optimistic' as const,
    label: 'Optimistic',
    icon: TrendingUp,
    color: 'text-emerald-600 dark:text-emerald-400',
    description: 'Best-case projections',
  },
];

export function ScenarioSelector({ 
  selectedScenario, 
  onScenarioChange, 
  className 
}: ScenarioSelectorProps) {
  return (
    <div className={cn("section-card", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">Financial Scenario</h3>
          <p className="text-xs text-muted-foreground">
            Toggle to view different projections
          </p>
        </div>
        <Tabs 
          value={selectedScenario} 
          onValueChange={(v) => onScenarioChange(v as ScenarioType)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-3 sm:w-[320px]">
            {scenarios.map((scenario) => {
              const Icon = scenario.icon;
              const isSelected = selectedScenario === scenario.value;
              return (
                <TabsTrigger
                  key={scenario.value}
                  value={scenario.value}
                  className={cn(
                    "flex items-center gap-1.5 text-xs",
                    isSelected && scenario.color
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{scenario.label}</span>
                  <span className="sm:hidden">
                    {scenario.value === 'pessimistic' ? 'Low' : 
                     scenario.value === 'base' ? 'Base' : 'High'}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>
      
      {/* Scenario Description */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
        {(() => {
          const current = scenarios.find(s => s.value === selectedScenario)!;
          const Icon = current.icon;
          return (
            <>
              <Icon className={cn("w-4 h-4", current.color)} />
              <span className="text-sm">
                <span className={cn("font-medium", current.color)}>
                  {current.label}:
                </span>{' '}
                <span className="text-muted-foreground">
                  {current.description}
                </span>
              </span>
            </>
          );
        })()}
      </div>
    </div>
  );
}
