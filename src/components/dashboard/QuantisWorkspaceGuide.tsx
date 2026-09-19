import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  FileText,
  GitBranch,
  Receipt,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuantisWorkspaceGuideProps {
  isFree: boolean;
  remainingAnalyses: number;
  onStartAnalysis: () => void;
}

const TOOLS = [
  {
    title: 'Decision Analysis',
    question: 'Does this business work financially?',
    description: 'Validate assumptions, unit economics, cash runway, break-even, payback, and a 36-month model.',
    icon: BarChart3,
    action: 'Start analysis',
    route: 'analysis',
    badge: 'CORE',
  },
  {
    title: 'Failure Pre-Mortem',
    question: 'What is most likely to break?',
    description: 'Expose revenue, churn, cost, and concentration failure modes, then identify mitigations.',
    icon: ShieldAlert,
    action: 'Run pre-mortem',
    route: '/app/pre-mortem',
    badge: 'INCLUDED',
  },
  {
    title: 'Compare Outcomes',
    question: 'Which assumption changes the decision?',
    description: 'Recalculate the same model under controlled changes and find the point where profit reaches zero.',
    icon: GitBranch,
    action: 'Model scenarios',
    route: '/app/scenarios',
    badge: '1 SET / RUN',
  },
  {
    title: 'Client Proposal',
    question: 'What should this job cost?',
    description: 'Build a traceable service quote from scope, labor, materials, overhead, risk, and margin.',
    icon: Zap,
    action: 'Build a quote',
    route: '/quote',
    badge: 'BETA',
  },
  {
    title: 'Decision Report',
    question: 'How do I turn the model into a usable document?',
    description: 'Create invoices, summaries, agreements, and decision documents without retyping the analysis.',
    icon: FileText,
    action: 'Explore documents',
    route: '/docs',
    badge: 'EXPLORE',
  },
  {
    title: 'Invoice & Capacity',
    question: 'Can I afford to accept this work?',
    description: 'Check cash timing, margin, workload, late-payment exposure, and conditions before saying yes.',
    icon: Receipt,
    action: 'Evaluate work',
    route: '/app/invoices',
    badge: 'WORKFLOW',
  },
] as const;

export function QuantisWorkspaceGuide({
  isFree,
  remainingAnalyses,
  onStartAnalysis,
}: QuantisWorkspaceGuideProps) {
  const navigate = useNavigate();
  const runLabel = isFree
    ? `${Math.max(0, remainingAnalyses)} of 5 Decision Runs left this month`
    : 'Unlimited Decision Runs';

  return (
    <section className="mb-6" aria-labelledby="quantis-tools-title">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Your decision workspace
          </p>
          <h2 id="quantis-tools-title" className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
            Start with the decision—not the tool name.
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            One Decision Run includes the complete financial analysis, failure pre-mortem, and a saved scenario set.
            Use the other workflows when you need to price, document, or accept real work.
          </p>
        </div>
        <div className="shrink-0 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
          {runLabel}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <article
              key={tool.title}
              className="group flex min-h-[190px] flex-col rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/35"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/5">
                  <Icon className="h-4 w-4 text-primary" aria-hidden />
                </div>
                <span className="rounded-full border border-border px-2 py-0.5 text-[9px] font-semibold tracking-[0.1em] text-muted-foreground">
                  {tool.badge}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">{tool.title}</h3>
              <p className="mt-1 text-sm font-medium text-foreground/85">{tool.question}</p>
              <p className="mt-1.5 flex-1 text-xs leading-relaxed text-muted-foreground">{tool.description}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3 h-8 w-fit gap-1.5 px-0 text-xs text-primary hover:bg-transparent hover:text-primary"
                onClick={() => tool.route === 'analysis' ? onStartAnalysis() : navigate(tool.route)}
              >
                {tool.action} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
