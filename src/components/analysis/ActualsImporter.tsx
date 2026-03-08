import React, { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Upload, FileSpreadsheet, Plus, Trash2, Play, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActualsDataPoint, ProjectionDataPoint, ModelCalibrationResult, AnalysisParams, ParamUpdate } from '@/services/reality-bridge';
import { compareActualsToModel } from '@/services/reality-bridge';

interface ActualsImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projections: ProjectionDataPoint[];
  currentParams: AnalysisParams;
  onApplyUpdates?: (updates: ParamUpdate[]) => void;
}

const EMPTY_ROW: ActualsDataPoint = { month: 1, revenue: 0, costs: 0, customers: 0 };

const severityConfig = {
  within_range: { color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10', icon: CheckCircle2, label: 'OK' },
  notable: { color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10', icon: Info, label: 'Notable' },
  significant: { color: 'text-orange-600 dark:text-orange-400 bg-orange-500/10', icon: AlertTriangle, label: 'Significant' },
  critical: { color: 'text-destructive bg-destructive/10', icon: XCircle, label: 'Critical' },
};

export function ActualsImporter({ open, onOpenChange, projections, currentParams, onApplyUpdates }: ActualsImporterProps) {
  const [rows, setRows] = useState<ActualsDataPoint[]>([{ ...EMPTY_ROW }]);
  const [calibration, setCalibration] = useState<ModelCalibrationResult | null>(null);
  const [selectedUpdates, setSelectedUpdates] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addRow = () => {
    setRows(prev => [...prev, { ...EMPTY_ROW, month: prev.length + 1 }]);
  };

  const removeRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, field: keyof ActualsDataPoint, value: number) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const handleCSVUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.trim().split('\n');
      if (lines.length < 2) return;

      const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
      const monthIdx = headers.findIndex(h => h.includes('month'));
      const revIdx = headers.findIndex(h => h.includes('revenue') || h.includes('rev'));
      const costIdx = headers.findIndex(h => h.includes('cost') || h.includes('expense'));
      const custIdx = headers.findIndex(h => h.includes('customer') || h.includes('cust') || h.includes('user'));
      const leadIdx = headers.findIndex(h => h.includes('lead'));
      const convIdx = headers.findIndex(h => h.includes('conversion') || h.includes('conv'));
      const churnIdx = headers.findIndex(h => h.includes('churn'));

      const parsed: ActualsDataPoint[] = [];
      for (let i = 1; i < lines.length && i <= 24; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
        const row: ActualsDataPoint = {
          month: monthIdx >= 0 ? parseInt(cols[monthIdx]) || i : i,
          revenue: revIdx >= 0 ? parseFloat(cols[revIdx]) || 0 : 0,
          costs: costIdx >= 0 ? parseFloat(cols[costIdx]) || 0 : 0,
          customers: custIdx >= 0 ? parseInt(cols[custIdx]) || 0 : 0,
          leads: leadIdx >= 0 ? parseInt(cols[leadIdx]) || undefined : undefined,
          conversions: convIdx >= 0 ? parseInt(cols[convIdx]) || undefined : undefined,
          churn: churnIdx >= 0 ? parseFloat(cols[churnIdx]) || undefined : undefined,
        };
        parsed.push(row);
      }

      if (parsed.length > 0) setRows(parsed);
    };
    reader.readAsText(file);
  }, []);

  const runCalibration = () => {
    const validRows = rows.filter(r => r.revenue > 0 || r.costs > 0 || r.customers > 0);
    if (validRows.length === 0) return;

    const result = compareActualsToModel(validRows, projections, currentParams);
    setCalibration(result);

    const defaults: Record<string, boolean> = {};
    result.suggestedParamUpdates.forEach(u => { defaults[u.paramName] = true; });
    setSelectedUpdates(defaults);
  };

  const applySelected = () => {
    if (!calibration || !onApplyUpdates) return;
    const updates = calibration.suggestedParamUpdates.filter(u => selectedUpdates[u.paramName]);
    onApplyUpdates(updates);
    onOpenChange(false);
  };

  const accuracyColor = calibration
    ? calibration.modelAccuracyScore >= 80 ? 'text-emerald-600 dark:text-emerald-400'
      : calibration.modelAccuracyScore >= 60 ? 'text-amber-600 dark:text-amber-400'
        : 'text-destructive'
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Import Actual Data
          </DialogTitle>
          <DialogDescription>
            Compare your real business performance against model projections.
          </DialogDescription>
        </DialogHeader>

        {!calibration ? (
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="manual" className="text-xs">Manual Entry</TabsTrigger>
              <TabsTrigger value="csv" className="text-xs">CSV Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="csv" className="space-y-3">
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Drop CSV file here or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">Columns: month, revenue, costs, customers (auto-detected)</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
              {rows.length > 1 && (
                <p className="text-xs text-muted-foreground">{rows.length} rows loaded from CSV</p>
              )}
            </TabsContent>

            <TabsContent value="manual" className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-1.5 text-muted-foreground font-medium">Mo.</th>
                      <th className="text-left p-1.5 text-muted-foreground font-medium">Revenue ($)</th>
                      <th className="text-left p-1.5 text-muted-foreground font-medium">Costs ($)</th>
                      <th className="text-left p-1.5 text-muted-foreground font-medium">Customers</th>
                      <th className="p-1.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={idx} className="border-b border-border/50">
                        <td className="p-1">
                          <Input type="number" min={1} max={24} value={row.month} onChange={e => updateRow(idx, 'month', parseInt(e.target.value) || 1)} className="h-7 w-12 text-xs" />
                        </td>
                        <td className="p-1">
                          <Input type="number" min={0} value={row.revenue} onChange={e => updateRow(idx, 'revenue', parseFloat(e.target.value) || 0)} className="h-7 text-xs" />
                        </td>
                        <td className="p-1">
                          <Input type="number" min={0} value={row.costs} onChange={e => updateRow(idx, 'costs', parseFloat(e.target.value) || 0)} className="h-7 text-xs" />
                        </td>
                        <td className="p-1">
                          <Input type="number" min={0} value={row.customers} onChange={e => updateRow(idx, 'customers', parseInt(e.target.value) || 0)} className="h-7 text-xs" />
                        </td>
                        <td className="p-1">
                          {rows.length > 1 && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeRow(idx)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={addRow} className="gap-1 text-xs" disabled={rows.length >= 24}>
                  <Plus className="w-3 h-3" /> Add Month
                </Button>
                <span className="text-xs text-muted-foreground">{rows.length}/24 months</span>
              </div>
            </TabsContent>

            <div className="pt-3 border-t border-border">
              <Button onClick={runCalibration} className="w-full gap-2" disabled={rows.every(r => r.revenue === 0 && r.costs === 0 && r.customers === 0)}>
                <Play className="w-4 h-4" /> Run Calibration
              </Button>
            </div>
          </Tabs>
        ) : (
          <div className="space-y-4">
            {/* Accuracy Badge */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Model Accuracy</p>
                <p className={cn('text-3xl font-bold tabular-nums', accuracyColor)}>
                  {calibration.modelAccuracyScore}%
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCalibration(null)} className="text-xs">
                ← Back to Data
              </Button>
            </div>

            {/* Insights */}
            <div className="space-y-1.5">
              {calibration.insights.map((insight, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                  {insight}
                </p>
              ))}
            </div>

            {/* Divergence Table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="p-2 bg-muted/30 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Divergence Analysis</p>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left p-1.5 text-muted-foreground font-medium">Metric</th>
                      <th className="text-right p-1.5 text-muted-foreground font-medium">Projected</th>
                      <th className="text-right p-1.5 text-muted-foreground font-medium">Actual</th>
                      <th className="text-right p-1.5 text-muted-foreground font-medium">Diff</th>
                      <th className="text-center p-1.5 text-muted-foreground font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calibration.divergences.map((d, i) => {
                      const config = severityConfig[d.severity];
                      const Icon = config.icon;
                      return (
                        <tr key={i} className="border-b border-border/50">
                          <td className="p-1.5 text-foreground">{d.metric}</td>
                          <td className="p-1.5 text-right text-muted-foreground">${d.projected.toLocaleString()}</td>
                          <td className="p-1.5 text-right text-foreground font-medium">${d.actual.toLocaleString()}</td>
                          <td className={cn('p-1.5 text-right font-medium', d.pctDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                            {d.pctDiff >= 0 ? '+' : ''}{d.pctDiff}%
                          </td>
                          <td className="p-1.5 text-center">
                            <Badge variant="outline" className={cn('text-[10px] gap-0.5', config.color)}>
                              <Icon className="w-2.5 h-2.5" />
                              {config.label}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Suggested Updates */}
            {calibration.suggestedParamUpdates.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Suggested Parameter Updates</p>
                  <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => {
                    const all: Record<string, boolean> = {};
                    calibration.suggestedParamUpdates.forEach(u => { all[u.paramName] = true; });
                    setSelectedUpdates(all);
                  }}>
                    Select All
                  </Button>
                </div>
                {calibration.suggestedParamUpdates.map((update, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg border border-border bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{update.paramName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{update.rationale}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {update.oldValue} → <span className="font-medium text-primary">{update.newValue}</span>
                      </p>
                    </div>
                    <Switch
                      checked={selectedUpdates[update.paramName] ?? false}
                      onCheckedChange={checked => setSelectedUpdates(prev => ({ ...prev, [update.paramName]: checked }))}
                    />
                  </div>
                ))}
                <Button onClick={applySelected} className="w-full gap-2 mt-2" disabled={!Object.values(selectedUpdates).some(Boolean)}>
                  <CheckCircle2 className="w-4 h-4" /> Apply Selected Updates
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
