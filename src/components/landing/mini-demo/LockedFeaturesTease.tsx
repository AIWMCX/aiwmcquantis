import React from 'react';
import { Lock, BarChart3, AlertTriangle, Target, Calculator, FileText, Database, History, ShieldCheck } from 'lucide-react';

// 8 locked features matching the spec's gating strategy
const LOCKED_FEATURES = [
  { icon: BarChart3, title: '3 Scenario Modeling', desc: 'Pessimistic / Base / Optimistic' },
  { icon: AlertTriangle, title: 'Risk Analysis', desc: 'Threats with mitigations' },
  { icon: Target, title: '5-7 Recommendations', desc: 'Actionable next steps' },
  { icon: Calculator, title: 'Unit Economics', desc: 'CAC, LTV, margins' },
  { icon: FileText, title: 'PDF Export', desc: 'Investor-ready reports' },
  { icon: Database, title: 'Industry Benchmarks', desc: 'Compare vs 10K+ businesses' },
  { icon: History, title: 'Unlimited History', desc: 'Save all your analyses' },
  { icon: ShieldCheck, title: 'Calculation Audit', desc: 'See how numbers are derived' },
];

export function LockedFeaturesTease() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {LOCKED_FEATURES.map(({ icon: Icon, title, desc }) => (
        <div 
          key={title} 
          className="p-3 rounded-xl bg-muted/50 border border-border relative overflow-hidden group hover:border-primary/30 transition-colors"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-2 mb-1.5">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            <Icon className="w-3.5 h-3.5 text-primary/60" />
          </div>
          <p className="text-xs font-medium text-foreground leading-tight">{title}</p>
          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{desc}</p>
        </div>
      ))}
    </div>
  );
}
