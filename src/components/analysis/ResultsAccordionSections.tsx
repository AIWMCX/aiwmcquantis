import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calculator, GitCompare, BarChart3, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ResultsAccordionSectionsProps {
  financialContent: React.ReactNode;
  scenarioContent: React.ReactNode;
  marketContent: React.ReactNode;
  analysisId?: string;
}

export function ResultsAccordionSections({
  financialContent,
  scenarioContent,
  marketContent,
  analysisId,
}: ResultsAccordionSectionsProps) {
  return (
    <div className="animate-fade-in" style={{ animationDelay: '1200ms', animationFillMode: 'both' }}>
      <Accordion type="multiple" defaultValue={['financial']} className="space-y-2">
        <AccordionItem value="financial" className="rounded-xl border border-[var(--q-border-default)] bg-[var(--q-bg-surface)] overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-semibold text-[var(--q-text-primary)]">
              <Calculator className="w-4 h-4 text-[var(--q-accent-primary)]" />
              Financial Model
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {financialContent}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="scenarios" className="rounded-xl border border-[var(--q-border-default)] bg-[var(--q-bg-surface)] overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-semibold text-[var(--q-text-primary)]">
              <GitCompare className="w-4 h-4 text-[var(--q-accent-primary)]" />
              Scenario Comparison
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {scenarioContent}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="market" className="rounded-xl border border-[var(--q-border-default)] bg-[var(--q-bg-surface)] overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-semibold text-[var(--q-text-primary)]">
              <BarChart3 className="w-4 h-4 text-[var(--q-accent-primary)]" />
              Market Analysis
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {marketContent}
          </AccordionContent>
        </AccordionItem>

        {analysisId && (
          <AccordionItem value="documents" className="rounded-xl border border-[var(--q-border-default)] bg-[var(--q-bg-surface)] overflow-hidden">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--q-text-primary)]">
                <FileText className="w-4 h-4 text-[var(--q-accent-primary)]" />
                Generate Documents
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--q-bg-elevated)] border border-[var(--q-border-default)]">
                <div>
                  <p className="text-sm font-medium text-[var(--q-text-primary)]">Create business documents</p>
                  <p className="text-xs text-[var(--q-text-tertiary)]">Auto-filled with your analysis data</p>
                </div>
                <Link to={`/docs?analysis=${analysisId}`}>
                  <Button size="sm" className="gap-1.5 text-xs q-btn-ai text-[var(--q-text-inverse)]">
                    Open Docs Studio
                  </Button>
                </Link>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
