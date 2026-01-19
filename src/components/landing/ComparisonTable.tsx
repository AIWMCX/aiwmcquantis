import React from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const comparisons = [
  {
    aspect: 'Calculations',
    generic: 'AI-generated estimates',
    quantis: 'Mathematical formulas',
    genericStatus: 'poor',
    quantisStatus: 'good',
  },
  {
    aspect: 'Data Source',
    generic: 'Training data only',
    quantis: '1,000+ industry benchmarks',
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

export function ComparisonTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-4 px-4 font-semibold text-foreground">Aspect</th>
            <th className="text-left py-4 px-4 font-semibold text-muted-foreground">Generic AI Tools</th>
            <th className="text-left py-4 px-4 font-semibold text-primary">AIWMC Quantis™</th>
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
  );
}
