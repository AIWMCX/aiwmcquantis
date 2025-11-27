import React from 'react';
import { FileText, Users, Zap, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BusinessPlan } from '@/types/analysis';

interface BusinessPlanSectionProps {
  plan: BusinessPlan;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

export function BusinessPlanSection({ plan }: BusinessPlanSectionProps) {
  const getProbabilityColor = (prob: string) => {
    switch (prob) {
      case 'низкая': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
      case 'средняя': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
      case 'высокая': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'низкий': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
      case 'средний': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
      case 'высокий': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="w-5 h-5 text-primary" />
          Бизнес-план
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={['summary', 'steps']} className="space-y-2">
          {/* Executive Summary */}
          <AccordionItem value="summary" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span>Резюме проекта</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground whitespace-pre-line pb-4">
              {plan.executive_summary}
            </AccordionContent>
          </AccordionItem>

          {/* Product & Target Audience */}
          <AccordionItem value="product" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>Продукт и аудитория</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-1">Описание продукта</h4>
                <p className="text-sm text-muted-foreground">{plan.product_description}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground mb-1">Целевая аудитория</h4>
                <p className="text-sm text-muted-foreground">{plan.target_audience}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground mb-1">Конкурентные преимущества</h4>
                <p className="text-sm text-muted-foreground">{plan.competitive_advantages}</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Operations */}
          <AccordionItem value="operations" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <span>Операционная модель</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground whitespace-pre-line pb-4">
              {plan.operations}
            </AccordionContent>
          </AccordionItem>

          {/* Launch Steps */}
          <AccordionItem value="steps" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                <span>План запуска ({plan.launch_steps.length} этапов)</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-3">
                {plan.launch_steps.map((step, index) => (
                  <div
                    key={index}
                    className="relative pl-6 pb-3 last:pb-0 border-l-2 border-primary/20 last:border-transparent"
                  >
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary">{step.step}</span>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium text-foreground text-sm">{step.title}</h4>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {step.duration}
                          </Badge>
                          {step.cost > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {formatCurrency(step.cost)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Risks */}
          <AccordionItem value="risks" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                <span>Риски ({plan.risks.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-3">
                {plan.risks.map((risk, index) => (
                  <div key={index} className="p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium text-foreground text-sm">{risk.risk}</p>
                      <div className="flex gap-1 flex-shrink-0">
                        <Badge className={cn("text-xs", getProbabilityColor(risk.probability))}>
                          {risk.probability}
                        </Badge>
                        <Badge className={cn("text-xs", getImpactColor(risk.impact))}>
                          {risk.impact}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <strong>Митигация:</strong> {risk.mitigation}
                    </p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
