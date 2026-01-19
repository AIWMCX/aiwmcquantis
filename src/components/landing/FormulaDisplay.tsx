import React from 'react';

interface FormulaDisplayProps {
  name: string;
  formula: string;
  example: string;
  description: string;
  isActive: boolean;
  onHover: () => void;
  onLeave: () => void;
}

export function FormulaDisplay({
  name,
  formula,
  example,
  description,
  isActive,
  onHover,
  onLeave,
}: FormulaDisplayProps) {
  return (
    <div
      className={`relative p-4 rounded-xl border bg-card transition-all duration-300 cursor-default ${
        isActive
          ? 'border-primary shadow-lg scale-105 z-10'
          : 'border-border hover:border-primary/50'
      }`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div className="text-center">
        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
          {name}
        </div>
        <p className="text-xs text-muted-foreground mb-2">{description}</p>
        <p className="font-mono text-xs text-foreground/80 leading-relaxed">{formula}</p>
      </div>

      {/* Hover tooltip with example */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-3 rounded-lg bg-foreground text-background text-xs transition-all duration-200 shadow-xl ${
          isActive ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2'
        }`}
      >
        <p className="font-medium mb-1">Example:</p>
        <p className="font-mono text-primary">{example}</p>
        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-foreground" />
      </div>
    </div>
  );
}
