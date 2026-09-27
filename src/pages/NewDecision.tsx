import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation as useRouterLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isEnabled } from '@/lib/flags';
import { recordFunnelEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';

/**
 * Activation-to-revenue Wave 4: /app/new-decision.
 *
 * A lightweight "what decision are you trying to make?" intent-capture
 * step. Deliberately does NOT create a second analysis engine -- on submit
 * it hands off (via router state, the same pattern ScenarioWorkspace uses
 * to hand off to DocsStudio) into the existing real analysis workflow at
 * /app, which reads this state once on mount to pre-fill
 * CompactAnalysisForm's idea field via useAnalysis()'s setIdea. The actual
 * analysis is still built and run entirely by the existing /app workflow.
 */

export type DecisionType =
  | 'launch'
  | 'location'
  | 'hire_capacity'
  | 'pricing'
  | 'marketing'
  | 'client_evaluation'
  | 'new_client_capacity'
  | 'expansion'
  | 'other';

export interface DecisionIntent {
  decision_type: DecisionType;
  decision_statement: string;
  capital_at_risk?: number;
  decision_deadline?: string;
}

const DECISION_TYPES: { value: DecisionType; label: string }[] = [
  { value: 'launch', label: 'Launch a business' },
  { value: 'location', label: 'Open a new location' },
  { value: 'hire_capacity', label: 'Hire / add capacity' },
  { value: 'pricing', label: 'Change pricing' },
  { value: 'marketing', label: 'Increase marketing spend' },
  { value: 'client_evaluation', label: 'Evaluate a client business' },
  { value: 'new_client_capacity', label: 'Take on a new client' },
  { value: 'expansion', label: 'Compare an expansion' },
  { value: 'other', label: 'Other' },
];

export interface NewDecisionRouterState {
  decisionType: DecisionType;
  decisionStatement: string;
  capitalAtRisk?: number;
  decisionDeadline?: string;
}

export default function NewDecision() {
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();

  const [decisionType, setDecisionType] = useState<DecisionType | null>(null);
  const [decisionStatement, setDecisionStatement] = useState('');
  const [capitalAtRisk, setCapitalAtRisk] = useState('');
  const [decisionDeadline, setDecisionDeadline] = useState('');
  const hasFiredInputStarted = useRef(false);

  useEffect(() => {
    if (!isEnabled('new_decision_v1')) {
      navigate('/app', { replace: true });
      return;
    }
    recordFunnelEvent('new_decision_viewed', { source_route: routerLocation.pathname });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectType(type: DecisionType) {
    setDecisionType(type);
    recordFunnelEvent('decision_type_selected', { decision_type: type });
  }

  function onStatementChange(value: string) {
    setDecisionStatement(value);
    if (!hasFiredInputStarted.current && value.trim().length > 0) {
      hasFiredInputStarted.current = true;
      recordFunnelEvent('decision_input_started', { decision_type: decisionType });
    }
  }

  function continueToAnalysis() {
    if (!decisionType || decisionStatement.trim().length === 0) return;
    const state: NewDecisionRouterState = {
      decisionType,
      decisionStatement: decisionStatement.trim(),
      capitalAtRisk: capitalAtRisk ? Number(capitalAtRisk) : undefined,
      decisionDeadline: decisionDeadline || undefined,
    };
    navigate('/app', { state });
  }

  const canContinue = !!decisionType && decisionStatement.trim().length > 0;

  return (
    <AppLayout title="New decision">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">What decision are you trying to make?</h1>
          <p className="text-sm text-muted-foreground">
            This just sets context -- the real analysis below uses the same engine and data as every other Decision Run.
          </p>
        </div>

        <GlassCard className="p-6 space-y-6">
          <div>
            <Label className="mb-2 block">Decision type</Label>
            <div className="grid grid-cols-2 gap-2">
              {DECISION_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => selectType(t.value)}
                  className={cn(
                    'text-left px-3 py-2 rounded-md border text-sm transition-colors',
                    decisionType === t.value
                      ? 'border-primary bg-primary/10 font-medium'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="decision-statement" className="mb-2 block">
              Describe the decision
            </Label>
            <Textarea
              id="decision-statement"
              value={decisionStatement}
              onChange={(e) => onStatementChange(e.target.value)}
              placeholder="e.g. Should we open a second location in Denver this year?"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="capital-at-risk" className="mb-2 block text-xs text-muted-foreground">
                Capital at risk (optional)
              </Label>
              <Input
                id="capital-at-risk"
                type="number"
                inputMode="decimal"
                value={capitalAtRisk}
                onChange={(e) => setCapitalAtRisk(e.target.value)}
                placeholder="$"
              />
            </div>
            <div>
              <Label htmlFor="decision-deadline" className="mb-2 block text-xs text-muted-foreground">
                Deadline (optional)
              </Label>
              <Input
                id="decision-deadline"
                type="date"
                value={decisionDeadline}
                onChange={(e) => setDecisionDeadline(e.target.value)}
              />
            </div>
          </div>

          <Button size="lg" className="w-full" onClick={continueToAnalysis} disabled={!canContinue}>
            Continue to analysis
          </Button>
        </GlassCard>
      </div>
    </AppLayout>
  );
}
