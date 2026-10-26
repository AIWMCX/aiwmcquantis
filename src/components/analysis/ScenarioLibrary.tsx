import React, { useState, useEffect, useCallback } from 'react';
import { Pin, PinOff, Trash2, Plus, GitCompare, Zap, Loader2, Star } from 'lucide-react';
import { TIERS } from '@/config/tiers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { ScenarioComparison, type SavedScenario } from './ScenarioComparison';

import { logger } from '@/lib/logger';
interface ScenarioLibraryProps {
  analysisId?: string;
  currentParams?: Record<string, any>;
  currentOutput?: Record<string, any>;
  currentConfidence?: number;
}

const TYPE_STYLES: Record<string, string> = {
  base: 'bg-primary/10 text-primary border-primary/30',
  optimistic: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  pessimistic: 'bg-destructive/10 text-destructive border-destructive/30',
  custom: 'bg-accent text-accent-foreground border-border',
};

export function ScenarioLibrary({ analysisId, currentParams, currentOutput, currentConfidence }: ScenarioLibraryProps) {
  const { user } = useAuth();
  const { isPlus, isFree, createCheckout } = useSubscription();

  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveType, setSaveType] = useState<'base' | 'optimistic' | 'pessimistic' | 'custom'>('custom');
  const [saving, setSaving] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const fetchScenarios = useCallback(async () => {
    if (!user || !analysisId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('scenarios')
      .select('*')
      .eq('user_id', user.id)
      .eq('analysis_id', analysisId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch scenarios:', error);
    } else {
      setScenarios((data || []).map(d => ({
        id: d.id,
        name: d.name,
        scenario_type: d.scenario_type as SavedScenario['scenario_type'],
        params: d.params as Record<string, any>,
        output: d.output as Record<string, any> | null,
        monte_carlo_result: d.monte_carlo_result as Record<string, any> | null,
        confidence_score: d.confidence_score,
        is_pinned: d.is_pinned,
        created_at: d.created_at,
      })));
    }
    setLoading(false);
  }, [user, analysisId]);

  useEffect(() => { fetchScenarios(); }, [fetchScenarios]);

  const handleSave = async () => {
    if (!user || !analysisId || !saveName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('scenarios').insert({
      user_id: user.id,
      analysis_id: analysisId,
      name: saveName.trim(),
      scenario_type: saveType,
      params: currentParams || {},
      output: currentOutput || null,
      confidence_score: currentConfidence ?? null,
    } as any);

    if (error) {
      toast.error('Failed to save scenario');
      logger.error('Failed to save scenario', error as unknown);
    } else {
      toast.success('Scenario saved');
      setShowSaveDialog(false);
      setSaveName('');
      fetchScenarios();
    }
    setSaving(false);
  };

  const togglePin = async (id: string, currentPin: boolean) => {
    await supabase.from('scenarios').update({ is_pinned: !currentPin } as any).eq('id', id);
    fetchScenarios();
  };

  const deleteScenario = async (id: string) => {
    await supabase.from('scenarios').delete().eq('id', id);
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
    fetchScenarios();
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else if (s.size < 4) s.add(id);
      return s;
    });
  };

  const selectedScenarios = scenarios.filter(s => selected.has(s.id));
  const canCompare = selected.size >= 2 && selected.size <= 4;

  // Free tier gate
  if (isFree) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
        <div className="w-10 h-10 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Scenario Library — Plus Feature</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Save multiple scenarios, compare side-by-side, and track how your assumptions evolve.
        </p>
        <Button size="sm" onClick={() => createCheckout('plus')} className="gap-1.5">
          <Zap className="w-3.5 h-3.5" /> Upgrade to Plus — ${TIERS.plus.priceMonthly}/mo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Saved Scenarios</h3>
        <div className="flex items-center gap-2">
          {canCompare && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowComparison(true)}>
              <GitCompare className="w-3.5 h-3.5" /> Compare ({selected.size})
            </Button>
          )}
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowSaveDialog(true)}>
            <Plus className="w-3.5 h-3.5" /> Save Current
          </Button>
        </div>
      </div>

      {/* Scenario Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : scenarios.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-xs text-muted-foreground">No saved scenarios yet. Save your current analysis as the first scenario.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {scenarios.map(s => {
            // payback_period_months carries the real unprofitable-sentinel (999);
            // breakeven_months is 0 (not null) for unprofitable cases, so it must
            // never be checked first — that previously rendered "Break-even: 0 mo"
            // for underwater scenarios, which is false, not just unformatted.
            const be = s.output?.financial_analysis?.returns?.payback_period_months
              ?? s.output?.financial_analysis?.breakeven?.breakeven_months ?? null;
            const rev12 = (() => {
              const rev = s.output?.financial_analysis?.scenarios?.base?.revenue || s.output?.financial_analysis?.mrr || 0;
              const g = s.params?.monthly_growth_rate || 0.05;
              return Math.round(rev * Math.pow(1 + g, 11));
            })();
            const conf = s.confidence_score;
            const confTier = conf != null ? (conf >= 80 ? 'High' : conf >= 50 ? 'Medium' : 'Low') : null;
            const confColor = conf != null
              ? conf >= 80 ? 'text-emerald-600 dark:text-emerald-400'
              : conf >= 50 ? 'text-amber-600 dark:text-amber-400'
              : 'text-destructive'
              : '';

            return (
              <div key={s.id} className={cn(
                'rounded-lg border bg-card p-3 transition-colors',
                selected.has(s.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
              )}>
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selected.has(s.id)}
                    onCheckedChange={() => toggleSelect(s.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground truncate">{s.name}</span>
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', TYPE_STYLES[s.scenario_type])}>
                        {s.scenario_type}
                      </Badge>
                      {s.is_pinned && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      {be != null && <span>Break-even: {be >= 999 ? 'N/A (unprofitable)' : `${Math.round(be)} mo`}</span>}
                      <span>M12 Rev: ${rev12.toLocaleString('en-US')}</span>
                      {confTier && <span className={confColor}>{confTier} confidence</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePin(s.id, s.is_pinned)}>
                      {s.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteScenario(s.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Scenario</DialogTitle>
            <DialogDescription>Save the current analysis parameters as a named scenario.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="e.g. Base Case, With Investment, Conservative..."
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              maxLength={60}
            />
            <Select value={saveType} onValueChange={v => setSaveType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="base">Base Case</SelectItem>
                <SelectItem value="optimistic">Optimistic</SelectItem>
                <SelectItem value="pessimistic">Pessimistic</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSave} disabled={saving || !saveName.trim()} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Scenario
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comparison Modal */}
      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scenario Comparison</DialogTitle>
            <DialogDescription>Comparing {selectedScenarios.length} scenarios side by side.</DialogDescription>
          </DialogHeader>
          {selectedScenarios.length >= 2 && (
            <ScenarioComparison scenarios={selectedScenarios} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
