import React from 'react';
import { Clock, DollarSign, FileText, Sparkles } from 'lucide-react';

interface ComparisonRow {
  approach: string;
  cost: string;
  time: string;
  output: string;
  icon: React.ElementType;
  highlight?: boolean;
}

const comparisons: ComparisonRow[] = [
  {
    approach: 'Hire Consultant',
    cost: '$2,000 – $5,000',
    time: '2-4 weeks',
    output: 'Business plan PDF',
    icon: DollarSign,
  },
  {
    approach: 'DIY Research',
    cost: '$0 (your time)',
    time: '20+ hours',
    output: 'Spreadsheet estimates',
    icon: Clock,
  },
  {
    approach: 'AIWMC Quantis',
    cost: '$0 – $17/mo',
    time: '< 2 minutes',
    output: 'Complete analysis + PDF',
    icon: Sparkles,
    highlight: true,
  },
];

export function ValueAnchor() {
  return (
    <div className="mb-10">
      {/* Mobile: Stacked cards */}
      <div className="md:hidden space-y-3">
        {comparisons.map((row) => (
          <div
            key={row.approach}
            className={`p-4 rounded-xl border ${
              row.highlight
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-border bg-card'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${row.highlight ? 'bg-primary/10' : 'bg-muted'}`}>
                <row.icon className={`w-4 h-4 ${row.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <span className={`font-semibold ${row.highlight ? 'text-primary' : 'text-foreground'}`}>
                {row.approach}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Cost</p>
                <p className={`font-medium ${row.highlight ? 'text-success' : 'text-foreground'}`}>
                  {row.cost}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Time</p>
                <p className={`font-medium ${row.highlight ? 'text-success' : 'text-foreground'}`}>
                  {row.time}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Output</p>
                <p className="font-medium text-foreground text-xs">{row.output}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block max-w-3xl mx-auto">
        <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Approach</th>
                <th className="text-center p-4 text-sm font-medium text-muted-foreground">Cost</th>
                <th className="text-center p-4 text-sm font-medium text-muted-foreground">Time</th>
                <th className="text-center p-4 text-sm font-medium text-muted-foreground">Output</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row, idx) => (
                <tr
                  key={row.approach}
                  className={`${
                    row.highlight
                      ? 'bg-primary/5 border-l-4 border-l-primary'
                      : idx % 2 === 0
                      ? 'bg-background'
                      : 'bg-muted/20'
                  }`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <row.icon 
                        className={`w-5 h-5 ${row.highlight ? 'text-primary' : 'text-muted-foreground'}`} 
                      />
                      <span className={`font-medium ${row.highlight ? 'text-primary' : 'text-foreground'}`}>
                        {row.approach}
                      </span>
                    </div>
                  </td>
                  <td className={`p-4 text-center font-semibold ${row.highlight ? 'text-success' : 'text-foreground'}`}>
                    {row.cost}
                  </td>
                  <td className={`p-4 text-center font-semibold ${row.highlight ? 'text-success' : 'text-foreground'}`}>
                    {row.time}
                  </td>
                  <td className={`p-4 text-center ${row.highlight ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {row.output}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
