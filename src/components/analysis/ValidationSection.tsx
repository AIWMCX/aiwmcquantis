import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Info, Calculator, TrendingUp, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import type { ValidationResult } from '@/types/analysis';

interface ValidationSectionProps {
  validation: ValidationResult;
}

export function ValidationSection({ validation }: ValidationSectionProps) {
  const getStatusColor = () => {
    if (!validation.is_profitable) return 'border-destructive/50 bg-destructive/5';
    if (validation.was_auto_corrected || validation.warnings.length > 0) return 'border-amber-500/50 bg-amber-500/5';
    return 'border-emerald-500/50 bg-emerald-500/5';
  };

  const getStatusIcon = () => {
    if (!validation.is_profitable) return <XCircle className="w-5 h-5 text-destructive" />;
    if (validation.was_auto_corrected || validation.warnings.length > 0) return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
  };

  // Calculate improvement potential
  const canImprove = validation.improvement_suggestions && validation.improvement_suggestions.length > 0;

  return (
    <div className={cn("section-card border", getStatusColor())}>
      <div className="flex items-start gap-3 mb-4">
        {getStatusIcon()}
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">Data Quality & Calculation Audit</h3>
          <p className="text-sm text-muted-foreground">{validation.summary}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge 
            variant="outline" 
            className={cn(
              "text-sm font-semibold",
              validation.reliability_score >= 80 ? "border-emerald-500/50 text-emerald-600" :
              validation.reliability_score >= 50 ? "border-amber-500/50 text-amber-600" :
              "border-destructive/50 text-destructive"
            )}
          >
            Reliability: {validation.reliability_score}%
          </Badge>
          {validation.industry_detected && (
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {validation.industry_detected}
            </Badge>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-card border border-border">
          <div className="text-xs text-muted-foreground mb-1">Break-even Revenue</div>
          <div className="text-sm font-semibold text-foreground">
            ${validation.break_even_revenue.toLocaleString('en-US')}/mo
          </div>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border">
          <div className="text-xs text-muted-foreground mb-1">For $45k Profit</div>
          <div className="text-sm font-semibold text-foreground">
            ${validation.revenue_for_45k_profit.toLocaleString('en-US')}/mo
          </div>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border">
          <div className="text-xs text-muted-foreground mb-1">Flagged for Review</div>
          <div className={cn(
            "text-sm font-semibold",
            validation.corrections.length > 0 ? "text-amber-600" : "text-emerald-600"
          )}>
            {validation.corrections.length} {validation.corrections.length === 1 ? 'field' : 'fields'}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border">
          <div className="text-xs text-muted-foreground mb-1">Warnings</div>
          <div className={cn(
            "text-sm font-semibold",
            validation.warnings.length > 0 ? "text-amber-600" : "text-emerald-600"
          )}>
            {validation.warnings.length} {validation.warnings.length === 1 ? 'issue' : 'issues'}
          </div>
        </div>
      </div>

      <Accordion type="multiple" className="w-full">
        {/* Warnings */}
        {validation.warnings.length > 0 && (
          <AccordionItem value="warnings" className="border-border">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Warnings ({validation.warnings.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {validation.warnings.map((warning, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "p-3 rounded-lg border text-sm",
                      warning.severity === 'error' 
                        ? "bg-destructive/5 border-destructive/30 text-destructive" 
                        : "bg-amber-500/5 border-amber-500/30 text-amber-700 dark:text-amber-400"
                    )}
                  >
                    <div className="font-medium mb-1">{warning.field}</div>
                    <div>{warning.message}</div>
                    <div className="text-xs mt-1 opacity-70">
                      Current: {warning.value} | Expected: {warning.expected}
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Flagged fields (P0-01/02, 2026-07-25): these values are NOT altered --
            the engine no longer silently overwrites a user-declared value with a
            benchmark-derived one. Every figure elsewhere in this report is the
            real calculation from what was actually reported; this panel only
            flags fields that sit outside the typical industry range for review. */}
        {validation.corrections.length > 0 && (
          <AccordionItem value="corrections" className="border-border">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                <span>Flagged for Review ({validation.corrections.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {validation.corrections.map((correction, i) => (
                  <div key={i} className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/30 text-sm">
                    <div className="font-medium text-blue-700 dark:text-blue-400 mb-1">
                      {correction.field}
                    </div>
                    <div className="text-muted-foreground">{correction.reason}</div>
                    <div className="text-xs mt-1 flex gap-2">
                      <span className="text-foreground font-medium">
                        Used in this report: ${correction.original.toLocaleString('en-US')}
                      </span>
                      <span className="text-muted-foreground">
                        (industry typical: ~${correction.corrected.toLocaleString('en-US')})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Calculation Audit */}
        {validation.calculation_audit && validation.calculation_audit.length > 0 && (
          <AccordionItem value="audit" className="border-border">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                <span>Calculation Audit ({validation.calculation_audit.length} formulas)</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {validation.calculation_audit.map((audit, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "p-3 rounded-lg border text-sm",
                      audit.isValid 
                        ? "bg-emerald-500/5 border-emerald-500/30" 
                        : "bg-amber-500/5 border-amber-500/30"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {audit.isValid ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                      )}
                      <span className="font-mono text-xs text-foreground">{audit.formula}</span>
                    </div>
                    {audit.notes && (
                      <div className="text-xs text-muted-foreground pl-5">{audit.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Domain 5 audit: `canImprove` was computed above but never rendered
            anywhere in this file — the one signal that would tell a user
            their industry was auto-guessed (keyword-matched, not selected)
            and to pick the real one for better benchmarks was silently
            discarded. `TrendingUp` was already imported and unused, which is
            itself evidence this section existed before and was lost, not
            omitted deliberately. Restoring it in the same accordion pattern
            as Warnings/Corrections/Audit above. */}
        {canImprove && (
          <AccordionItem value="improvements" className="border-border">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span>Ways to Improve Accuracy ({validation.improvement_suggestions.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {validation.improvement_suggestions.map((suggestion, i) => (
                  <div key={i} className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-foreground">
                    {suggestion}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}