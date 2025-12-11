import React from 'react';
import { FileText, TrendingUp, Target, BarChart3 } from 'lucide-react';

export function EmptyState() {
  const features = [
    { icon: BarChart3, label: 'Financial Analysis' },
    { icon: FileText, label: 'Business Plan' },
    { icon: TrendingUp, label: 'Marketing' },
    { icon: Target, label: 'Market Analysis' },
  ];

  return (
    <div className="section-card flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="p-4 rounded-2xl bg-primary/10 mb-6">
        <FileText className="w-12 h-12 text-primary" />
      </div>
      
      <h3 className="text-xl font-semibold text-foreground mb-2">
        Start Analysis
      </h3>
      
      <p className="text-muted-foreground max-w-md mb-8">
        Enter your business idea and location to get a detailed analysis 
        with financial projections and recommendations.
      </p>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {features.map((feature) => (
          <div
            key={feature.label}
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50"
          >
            <feature.icon className="w-6 h-6 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">{feature.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
