import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation as useRouterLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { isEnabled } from '@/lib/flags';
import { recordFunnelEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { useClients } from '@/hooks/useClients';

const NEW_CLIENT_VALUE = '__new_client__';
const NO_CLIENT_VALUE = '__no_client__';

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
  // Client workspace (Stage 5): optional link to a public.clients row, plus
  // that client's stored industry/location so the downstream /app form can
  // offer them as a starting point (the user can still override either).
  clientId?: string;
  prefillIndustry?: string;
  prefillLocation?: string;
}

export default function NewDecision() {
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();

  const [decisionType, setDecisionType] = useState<DecisionType | null>(null);
  const [decisionStatement, setDecisionStatement] = useState('');
  const [capitalAtRisk, setCapitalAtRisk] = useState('');
  const [decisionDeadline, setDecisionDeadline] = useState('');
  const hasFiredInputStarted = useRef(false);

  // Client workspace (Stage 5): fully optional -- selecting a client or
  // typing a new one only sets clientId/newClientName; if the user never
  // touches this control, continueToAnalysis() below sends no client
  // information at all and the decision is saved exactly as before
  // (client_id stays null).
  const { clients, isLoaded: clientsLoaded, createClient } = useClients();
  const [selectedClientValue, setSelectedClientValue] = useState<string>(NO_CLIENT_VALUE);
  const [newClientName, setNewClientName] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const selectedClient = clients.find((c) => c.id === selectedClientValue);

  // Entry point from ClientDetail's "New decision for this client" button --
  // pre-selects that client once the list has loaded. Still just a default;
  // the dropdown above remains fully editable.
  const appliedClientPrefill = useRef(false);
  useEffect(() => {
    if (appliedClientPrefill.current || !clientsLoaded) return;
    const incoming = routerLocation.state as { prefillClientId?: string } | null;
    if (incoming?.prefillClientId && clients.some((c) => c.id === incoming.prefillClientId)) {
      appliedClientPrefill.current = true;
      setSelectedClientValue(incoming.prefillClientId);
    }
  }, [clientsLoaded, clients, routerLocation.state]);

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

  async function continueToAnalysis() {
    if (!decisionType || decisionStatement.trim().length === 0) return;

    // Client workspace (Stage 5): resolve the "+ New client" case by
    // creating the row now (so it exists before we ever try to save a
    // decision against it); an existing selection just passes its id
    // through. Neither path blocks the user if it fails -- the decision
    // still proceeds without a client_id, same as before this feature.
    let clientId: string | undefined;
    let prefillIndustry: string | undefined;
    let prefillLocation: string | undefined;

    if (selectedClientValue === NEW_CLIENT_VALUE && newClientName.trim()) {
      setIsCreatingClient(true);
      const created = await createClient({ name: newClientName.trim() });
      setIsCreatingClient(false);
      clientId = created?.id;
    } else if (selectedClient) {
      clientId = selectedClient.id;
      prefillIndustry = selectedClient.industry ?? undefined;
      prefillLocation = selectedClient.location ?? undefined;
    }

    const state: NewDecisionRouterState = {
      decisionType,
      decisionStatement: decisionStatement.trim(),
      capitalAtRisk: capitalAtRisk ? Number(capitalAtRisk) : undefined,
      decisionDeadline: decisionDeadline || undefined,
      clientId,
      prefillIndustry,
      prefillLocation,
    };
    navigate('/app', { state });
  }

  const canContinue =
    !!decisionType &&
    decisionStatement.trim().length > 0 &&
    !(selectedClientValue === NEW_CLIENT_VALUE && newClientName.trim().length === 0) &&
    !isCreatingClient;

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

          {clientsLoaded && (
            <div>
              <Label className="mb-2 block">Client (optional)</Label>
              <Select
                value={selectedClientValue}
                onValueChange={(value) => {
                  setSelectedClientValue(value);
                  if (value !== NEW_CLIENT_VALUE) setNewClientName('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No client -- just me" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CLIENT_VALUE}>No client -- just me</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_CLIENT_VALUE}>+ New client</SelectItem>
                </SelectContent>
              </Select>
              {selectedClientValue === NEW_CLIENT_VALUE && (
                <Input
                  className="mt-2"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Client or business name"
                  autoFocus
                />
              )}
              {selectedClient && (selectedClient.industry || selectedClient.location) && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Will pre-fill {selectedClient.industry ? `industry (${selectedClient.industry})` : ''}
                  {selectedClient.industry && selectedClient.location ? ' and ' : ''}
                  {selectedClient.location ? `location (${selectedClient.location})` : ''} on the next
                  step -- you can still change either.
                </p>
              )}
            </div>
          )}

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

          <Button
            size="lg"
            className="w-full"
            onClick={() => void continueToAnalysis()}
            disabled={!canContinue}
          >
            {isCreatingClient ? 'Setting up client…' : 'Continue to analysis'}
          </Button>
        </GlassCard>
      </div>
    </AppLayout>
  );
}
