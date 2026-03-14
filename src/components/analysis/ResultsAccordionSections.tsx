import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calculator, GitCompare, BarChart3, FileText, Coins, Search, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ResultsAccordionSectionsProps {
  financialContent: React.ReactNode;
  scenarioContent: React.ReactNode;
  marketContent: React.ReactNode;
  unitEconomicsContent?: React.ReactNode;
  forensicContent?: React.ReactNode;
  capitalReadinessContent?: React.ReactNode;
  analysisId?: string;
}

const sectionStyle = "rounded-xl border border-[var(--q-border-default)] bg-[var(--q-bg-surface)] overflow-hidden";
const triggerStyle = "px-5 h-16 hover:no-underline";
const labelStyle = "flex items-center gap-2.5 text-sm font-semibold text-[var(--q-text-primary)]";
const iconStyle = "w-4.5 h-4.5 text-[var(--q-accent-primary)]";

export function ResultsAccordionSections({
  financialContent,
  scenarioContent,
  marketContent,
  unitEconomicsContent,
  forensicContent,
  capitalReadinessContent,
  analysisId,
}: ResultsAccordionSectionsProps) {
  return (
    <div className="animate-fade-in" style={{ animationDelay: '1100ms', animationFillMode: 'both' }}>
      <Accordion type="multiple" defaultValue={['financial']} className="space-y-2">
        <AccordionItem value="financial" className={sectionStyle}>
          <AccordionTrigger className={triggerStyle}>
            <span className={labelStyle}>
              <Calculator className={iconStyle} />
              Financial Model
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            {financialContent}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="scenarios" className={sectionStyle}>
          <AccordionTrigger className={triggerStyle}>
            <span className={labelStyle}>
              <GitCompare className={iconStyle} />
              Scenarios
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            {scenarioContent}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="market" className={sectionStyle}>
          <AccordionTrigger className={triggerStyle}>
            <span className={labelStyle}>
              <BarChart3 className={iconStyle} />
              Market Analysis
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            {marketContent}
          </AccordionContent>
        </AccordionItem>

        {forensicContent && (
          <AccordionItem value="forensic" className={sectionStyle}>
            <AccordionTrigger className={triggerStyle}>
              <span className={labelStyle}>
                <Search className={iconStyle} />
                Forensic Analysis
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              {forensicContent}
            </AccordionContent>
          </AccordionItem>
        )}

        {capitalReadinessContent && (
          <AccordionItem value="capital-readiness" className={sectionStyle}>
            <AccordionTrigger className={triggerStyle}>
              <span className={labelStyle}>
                <Shield className={iconStyle} />
                Capital Readiness
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              {capitalReadinessContent}
            </AccordionContent>
          </AccordionItem>
        )}

        {unitEconomicsContent && (
          <AccordionItem value="unit-economics" className={sectionStyle}>
            <AccordionTrigger className={triggerStyle}>
              <span className={labelStyle}>
                <Coins className={iconStyle} />
                Unit Economics
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              {unitEconomicsContent}
            </AccordionContent>
          </AccordionItem>
        )}

        {analysisId && (
          <AccordionItem value="documents" className={sectionStyle}>
            <AccordionTrigger className={triggerStyle}>
              <span className={labelStyle}>
                <FileText className={iconStyle} />
                Documents
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
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