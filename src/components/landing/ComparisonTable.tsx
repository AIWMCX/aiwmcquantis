import React from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { BENCHMARK_COUNT_DISPLAY } from '@/config/canonical-facts';

const comparisons = [
  {
    aspect: 'Calculations',
    generic: 'AI-text estimates (no formulas)',
    quantis: 'Mathematical formulas',
    genericStatus: 'poor',
    quantisStatus: 'good',
  },
  {
    aspect: 'Data Source',
    generic: 'Training data only',
    quantis: `${BENCHMARK_COUNT_DISPLAY}-cell modeled benchmark grid`,
    genericStatus: 'poor',
    quantisStatus: 'good',
  },
  {
    aspect: 'Validation',
    generic: 'None',
    quantis: 'Auto-correction of unrealistic values',
    genericStatus: 'poor',
    quantisStatus: 'good',
  },
  {
    aspect: 'Transparency',
    generic: '"Black box"',
    quantis: 'Full calculation audit',
    genericStatus: 'poor',
    quantisStatus: 'good',
  },
  {
    aspect: 'Scenarios',
    generic: 'Single prediction',
    quantis: '3 scenarios (Pessimistic/Base/Optimistic)',
    genericStatus: 'neutral',
    quantisStatus: 'good',
  },
  {
    aspect: 'Document Analysis',
    generic: 'Not supported',
    quantis: 'PDF/XLSX with data extraction',
    genericStatus: 'poor',
    quantisStatus: 'good',
  },
];

function StatusIcon({ status }: { status: 'good' | 'neutral' | 'poor' }) {
  if (status === 'good') {
    return <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />;
  }
  if (status === 'neutral') {
    return <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
  }
  return <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />;
}

// Mobile Card Layout Component
function MobileComparisonCard({ row }: { row: typeof comparisons[0] }) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <h4 className="font-semibold text-foreground mb-3">{row.aspect}</h4>
      
      <div className="space-y-2">
        {/* Generic AI Row */}
        <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
          <StatusIcon status={row.genericStatus as 'good' | 'neutral' | 'poor'} />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-muted-foreground block mb-0.5">Generic AI</span>
            <span className="text-sm text-muted-foreground">{row.generic}</span>
          </div>
        </div>
        
        {/* Quantis Row */}
        <div className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
          <StatusIcon status={row.quantisStatus as 'good' | 'neutral' | 'poor'} />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-primary block mb-0.5">AIWMC Quantis</span>
            <span className="text-sm text-foreground font-medium">{row.quantis}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ComparisonTable() {
  return (
    <>
      {/* Mobile Card Layout */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {comparisons.map((row) => (
          <MobileComparisonCard key={row.aspect} row={row} />
        ))}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-4 px-4 font-semibold text-foreground">Aspect</th>
              <th className="text-left py-4 px-4 font-semibold text-muted-foreground">Generic AI Tools</th>
              <th className="text-left py-4 px-4 font-semibold text-primary">AIWMC Quantis</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((row, index) => (
              <tr
                key={row.aspect}
                className={`border-b border-border/50 ${
                  index % 2 === 0 ? 'bg-muted/20' : 'bg-transparent'
                }`}
              >
                <td className="py-4 px-4 font-medium text-foreground">{row.aspect}</td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={row.genericStatus as 'good' | 'neutral' | 'poor'} />
                    <span className="text-muted-foreground text-sm">{row.generic}</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={row.quantisStatus as 'good' | 'neutral' | 'poor'} />
                    <span className="text-foreground text-sm font-medium">{row.quantis}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
