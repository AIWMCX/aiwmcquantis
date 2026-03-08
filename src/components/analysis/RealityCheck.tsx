import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Question {
  id: string;
  text: string;
  options: { label: string; score: number }[];
}

interface RealityCheckProps {
  industryType?: string;
  overallRiskIndex: number;
  onComplete?: (delta: number) => void;
}

const BASE_QUESTIONS: Question[] = [
  {
    id: 'customer_conversations',
    text: 'How many customer conversations have you had about this specific problem?',
    options: [
      { label: '0', score: -10 },
      { label: '1–5', score: -3 },
      { label: '6–20', score: 2 },
      { label: '20+', score: 5 },
    ],
  },
  {
    id: 'cac_channel',
    text: 'Do you have a realistic channel to acquire customers at the CAC you entered?',
    options: [
      { label: 'Yes', score: 5 },
      { label: 'Roughly', score: 0 },
      { label: 'Unsure', score: -5 },
      { label: 'No', score: -10 },
    ],
  },
  {
    id: 'price_validation',
    text: 'Have you validated your price point with potential customers?',
    options: [
      { label: 'Yes, paid', score: 5 },
      { label: 'Yes, survey', score: 1 },
      { label: 'Not yet', score: -8 },
    ],
  },
  {
    id: 'competitor_analysis',
    text: 'Have you identified your top 3 competitors and their pricing?',
    options: [
      { label: 'Yes', score: 5 },
      { label: 'Partially', score: -2 },
      { label: 'No', score: -8 },
    ],
  },
  {
    id: 'first_100',
    text: 'Do you have a specific plan for your first 100 customers?',
    options: [
      { label: 'Detailed', score: 5 },
      { label: 'Rough', score: -2 },
      { label: 'No', score: -10 },
    ],
  },
  {
    id: 'delay_scenario',
    text: 'Have you modeled the scenario where launch takes 3x longer than planned?',
    options: [
      { label: 'Yes, in model', score: 5 },
      { label: 'Mentally', score: -1 },
      { label: 'No', score: -8 },
    ],
  },
];

function getDynamicQuestions(industryType?: string): Question[] {
  const lower = (industryType || '').toLowerCase();
  if (lower.includes('saas') || lower.includes('software') || lower.includes('tech')) {
    return [
      { id: 'dyn_onboarding', text: 'Have you tested your onboarding flow with real users?', options: [{ label: 'Yes, iterated', score: 5 }, { label: 'Once', score: 0 }, { label: 'No', score: -7 }] },
      { id: 'dyn_churn', text: 'Do you have a plan to keep monthly churn below 5%?', options: [{ label: 'Yes, detailed', score: 5 }, { label: 'Rough idea', score: -2 }, { label: 'No', score: -8 }] },
    ];
  }
  if (lower.includes('retail') || lower.includes('ecommerce') || lower.includes('shop')) {
    return [
      { id: 'dyn_supplier', text: 'Have you secured supplier terms and pricing?', options: [{ label: 'Yes, signed', score: 5 }, { label: 'In negotiation', score: 0 }, { label: 'No', score: -7 }] },
      { id: 'dyn_inventory', text: 'Do you have a plan for inventory management and returns?', options: [{ label: 'Detailed', score: 5 }, { label: 'Rough', score: -2 }, { label: 'No', score: -8 }] },
    ];
  }
  if (lower.includes('food') || lower.includes('restaurant') || lower.includes('cafe')) {
    return [
      { id: 'dyn_permits', text: 'Have you secured necessary food service permits?', options: [{ label: 'Yes', score: 5 }, { label: 'In progress', score: 0 }, { label: 'No', score: -7 }] },
      { id: 'dyn_location', text: 'Have you analyzed foot traffic at your target location?', options: [{ label: 'Yes, data-driven', score: 5 }, { label: 'Visually', score: -1 }, { label: 'No', score: -8 }] },
    ];
  }
  return [
    { id: 'dyn_mvp', text: 'Do you have a working prototype or MVP?', options: [{ label: 'Yes, tested', score: 5 }, { label: 'In development', score: 0 }, { label: 'No', score: -7 }] },
    { id: 'dyn_team', text: 'Do you have the core team needed to execute this plan?', options: [{ label: 'Yes, committed', score: 5 }, { label: 'Partially', score: -2 }, { label: 'No', score: -8 }] },
  ];
}

export function RealityCheck({ industryType, overallRiskIndex, onComplete }: RealityCheckProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const allQuestions = useMemo(() => [...BASE_QUESTIONS, ...getDynamicQuestions(industryType)], [industryType]);

  const allAnswered = Object.keys(answers).length === allQuestions.length;

  const delta = useMemo(() => Object.values(answers).reduce((sum, v) => sum + v, 0), [answers]);
  const adjustedRisk = Math.max(0, Math.min(100, overallRiskIndex - delta));

  const handleSelect = (questionId: string, score: number) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: score }));
  };

  const handleSubmit = () => {
    if (!allAnswered) return;
    setSubmitted(true);
    onComplete?.(delta);
  };

  const improvementActions = useMemo(() => {
    if (!submitted) return [];
    const actions: string[] = [];
    if ((answers['customer_conversations'] ?? 0) < 2) actions.push('Conduct 10+ customer discovery interviews before investing further.');
    if ((answers['price_validation'] ?? 0) < 1) actions.push('Run a pricing validation survey or pre-sell to 5 potential customers.');
    if ((answers['first_100'] ?? 0) < 0) actions.push('Map out your specific channel strategy for acquiring the first 100 customers.');
    if ((answers['delay_scenario'] ?? 0) < 0) actions.push('Add a 3x timeline scenario to your financial model and plan for it.');
    if (actions.length === 0) actions.push('Your reality check is strong — focus on execution speed.');
    return actions.slice(0, 2);
  }, [submitted, answers]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <div className="text-left">
            <span className="font-semibold text-sm text-foreground">Reality Check</span>
            <p className="text-xs text-muted-foreground">Adjust your risk score based on founder readiness</p>
          </div>
          {submitted && (
            <Badge variant={delta >= 0 ? 'default' : 'destructive'} className="ml-2 text-xs">
              {delta >= 0 ? `−${delta} risk` : `+${Math.abs(delta)} risk`}
            </Badge>
          )}
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="border-t border-border p-4 space-y-5">
          {allQuestions.map((q, idx) => (
            <div key={q.id} className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                {idx + 1}. {q.text}
              </p>
              <div className="flex flex-wrap gap-2">
                {q.options.map(opt => {
                  const isSelected = answers[q.id] === opt.score && q.id in answers;
                  return (
                    <button
                      key={opt.label}
                      onClick={() => handleSelect(q.id, opt.score)}
                      disabled={submitted}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50',
                        submitted && 'opacity-70 cursor-default'
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {!submitted && (
            <Button onClick={handleSubmit} disabled={!allAnswered} size="sm" className="w-full">
              <ShieldCheck className="w-4 h-4 mr-2" />
              Calculate Reality-Adjusted Risk
            </Button>
          )}

          {submitted && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center gap-3">
                {delta >= 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {delta >= 0
                      ? `Your reality check reduced risk by ${delta} points`
                      : `Your reality check increased risk by ${Math.abs(delta)} points`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Adjusted Risk Index: <span className="font-bold">{adjustedRisk}</span> (was {overallRiskIndex})
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                {improvementActions.map((action, i) => (
                  <p key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary font-bold mt-0.5">→</span>
                    {action}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
