import React, { useState } from 'react';
import { X } from 'lucide-react';

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
  const [isTouched, setIsTouched] = useState(false);
  
  // Combined active state for both hover and touch
  const showTooltip = isActive || isTouched;

  const handleClick = () => {
    setIsTouched(!isTouched);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTouched(false);
    onLeave();
  };

  return (
    <div
      className={`relative p-4 rounded-xl border bg-card transition-all duration-300 cursor-pointer min-h-[100px] ${
        showTooltip
          ? 'border-primary shadow-lg scale-105 z-10'
          : 'border-border hover:border-primary/50 active:border-primary'
      }`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-expanded={showTooltip}
      aria-label={`${name}: ${description}. Tap for example.`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="text-center">
        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
          {name}
        </div>
        <p className="text-xs text-muted-foreground mb-2">{description}</p>
        <p className="font-mono text-xs text-foreground/80 leading-relaxed">{formula}</p>
      </div>

      {/* Mobile tap hint */}
      <p className="text-[10px] text-muted-foreground/60 text-center mt-2 md:hidden">
        Tap for example
      </p>

      {/* Tooltip with example - shows on hover or tap */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-52 p-3 rounded-lg bg-foreground text-background text-xs transition-all duration-200 shadow-xl ${
          showTooltip ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2'
        }`}
      >
        {/* Close button for mobile */}
        <button
          onClick={handleClose}
          className="absolute top-1 right-1 p-1 rounded-full hover:bg-background/20 transition-colors md:hidden min-w-[28px] min-h-[28px] flex items-center justify-center"
          aria-label="Close example"
        >
          <X className="w-3 h-3" />
        </button>
        
        <p className="font-medium mb-1 pr-6 md:pr-0">Example:</p>
        <p className="font-mono text-primary">{example}</p>
        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-foreground" />
      </div>
    </div>
  );
}
