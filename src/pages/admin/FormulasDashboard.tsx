import { useMemo, useState } from 'react';
import { FormulaRegistry, type FormulaDefinition } from '@/lib/formula-registry';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, FlaskConical, ChevronDown, ChevronUp } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  unit_economics: 'Unit Economics',
  profitability: 'Profitability',
  investment: 'Investment',
  statistical: 'Statistical',
  growth: 'Growth',
  risk: 'Risk',
};

export default function FormulasDashboard() {
  const formulas = useMemo(() => FormulaRegistry.list(), []);
  const testResults = useMemo(() => FormulaRegistry.testAll(), []);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const grouped = useMemo(() => {
    const map = new Map<string, FormulaDefinition[]>();
    for (const f of formulas) {
      const list = map.get(f.category) || [];
      list.push(f);
      map.set(f.category, list);
    }
    return map;
  }, [formulas]);

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold font-sora text-foreground">Formula Registry</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {formulas.length} formulas registered · {testResults.totalPassed} passed · {testResults.totalFailed} failed
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'text-sm px-3 py-1',
              testResults.totalFailed === 0
                ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10'
                : 'border-destructive/40 text-destructive bg-destructive/10'
            )}
          >
            {testResults.totalFailed === 0 ? (
              <><CheckCircle2 className="w-4 h-4 mr-1.5" /> All Tests Pass</>
            ) : (
              <><XCircle className="w-4 h-4 mr-1.5" /> {testResults.totalFailed} Failures</>
            )}
          </Badge>
        </div>

        {[...grouped.entries()].map(([category, categoryFormulas]) => (
          <div key={category} className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3 font-sora">
              {CATEGORY_LABELS[category] || category}
            </h2>
            <div className="space-y-3">
              {categoryFormulas.map(formula => {
                const result = testResults.results[formula.id];
                const isExpanded = expanded.has(formula.id);
                const allPass = result?.passed ?? false;

                return (
                  <Card key={formula.id} className="border-border">
                    <CardHeader className="p-4 pb-2 cursor-pointer" onClick={() => toggle(formula.id)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-2 h-2 rounded-full',
                            allPass ? 'bg-emerald-500' : 'bg-destructive'
                          )} />
                          <div>
                            <CardTitle className="text-sm font-semibold">{formula.name}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">{formula.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">v{formula.version}</Badge>
                          <Badge variant="outline" className={cn(
                            'text-[10px]',
                            formula.criticality === 'critical' ? 'border-destructive/40 text-destructive' : ''
                          )}>
                            {formula.criticality}
                          </Badge>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="p-4 pt-2 space-y-3">
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-xs font-mono text-foreground">{formula.formulaExpression}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-muted-foreground">Units:</span> <span className="text-foreground font-medium">{formula.units}</span></div>
                          <div><span className="text-muted-foreground">Confidence Weight:</span> <span className="text-foreground font-medium">{formula.confidenceWeight}%</span></div>
                          <div><span className="text-muted-foreground">Last Verified:</span> <span className="text-foreground font-medium">{formula.lastVerified}</span></div>
                          {formula.validRange && (
                            <div><span className="text-muted-foreground">Valid Range:</span> <span className="text-foreground font-medium">{formula.validRange.min} – {formula.validRange.max}</span></div>
                          )}
                        </div>

                        <div>
                          <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                            <FlaskConical className="w-3.5 h-3.5" /> Test Cases
                          </h4>
                          <div className="space-y-1">
                            {result?.results.map((tc, i) => (
                              <div key={i} className={cn(
                                'flex items-center justify-between text-xs px-2 py-1 rounded',
                                tc.passed ? 'bg-emerald-500/5' : 'bg-destructive/5'
                              )}>
                                <span className="text-foreground">{tc.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-muted-foreground">
                                    expected: {tc.expected} | actual: {tc.actual}
                                  </span>
                                  {tc.passed ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-destructive" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
