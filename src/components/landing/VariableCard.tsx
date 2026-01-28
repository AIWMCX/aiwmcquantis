import React from 'react';

interface VariableCardProps {
  code: string;
  name: string;
  description: string;
  color: 'emerald' | 'amber' | 'blue' | 'purple';
}

const colorClasses = {
  emerald: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20 hover:border-emerald-500/40',
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20 hover:border-amber-500/40',
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20 hover:border-blue-500/40',
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/20 hover:border-purple-500/40',
  },
};

export function VariableCard({ code, name, description, color }: VariableCardProps) {
  const classes = colorClasses[color];

  return (
    <div
      className={`group relative p-3 rounded-lg border bg-card transition-all duration-200 ${classes.border}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-md flex items-center justify-center font-mono font-bold text-sm ${classes.bg} ${classes.text}`}>
          {code}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm leading-tight">{name}</p>
          <p className="text-xs text-muted-foreground line-clamp-2 md:truncate">{description}</p>
        </div>
      </div>
    </div>
  );
}
