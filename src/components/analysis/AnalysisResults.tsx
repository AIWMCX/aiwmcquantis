import React, { useRef } from 'react';
import { FileDown, RefreshCw, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinancialSummary } from './FinancialSummary';
import { BusinessPlanSection } from './BusinessPlanSection';
import { MarketingSection } from './MarketingSection';
import { MarketAnalysisSection } from './MarketAnalysisSection';
import { cn } from '@/lib/utils';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { getMonthlyProfit, getPaybackMonths, getMonthlyRevenue } from '@/types/analysis';

interface AnalysisResultsProps {
  result: BusinessAnalysisResult;
  onReset?: () => void;
}

export function AnalysisResults({ result, onReset }: AnalysisResultsProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = () => {
    const printContent = contentRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Бизнес-анализ: ${result.metadata.idea}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
            h2 { color: #374151; margin-top: 30px; }
            h3 { color: #4b5563; }
            .metric { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 10px 0; }
            .metric-value { font-size: 24px; font-weight: bold; color: #1f2937; }
            .section { margin: 20px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
            th { background: #f9fafb; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>🧠 Бизнес-анализ</h1>
          <p><strong>Идея:</strong> ${result.metadata.idea}</p>
          <p><strong>Локация:</strong> ${result.metadata.location}</p>
          <p><strong>Дата:</strong> ${new Date(result.metadata.generated_at).toLocaleDateString('ru-RU')}</p>
          <p><strong>Уровень уверенности:</strong> ${result.confidence_score}%</p>
          
          <h2>📊 Финансовый анализ</h2>
          <div class="metric">
            <div>Стартовые инвестиции</div>
            <div class="metric-value">${new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(result.financial_analysis.startup_investment.total)}</div>
          </div>
          <div class="metric">
            <div>Ежемесячная выручка (MRR)</div>
            <div class="metric-value">${new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(getMonthlyRevenue(result.financial_analysis))}</div>
          </div>
          <div class="metric">
            <div>Ежемесячная прибыль</div>
            <div class="metric-value">${new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(getMonthlyProfit(result.financial_analysis))}</div>
          </div>
          <div class="metric">
            <div>Срок окупаемости</div>
            <div class="metric-value">${getPaybackMonths(result.financial_analysis)} месяцев</div>
          </div>
          
          <h2>📋 Бизнес-план</h2>
          <div class="section">
            <h3>Резюме</h3>
            <p>${result.business_plan.executive_summary}</p>
            
            <h3>Продукт</h3>
            <p>${result.business_plan.product_description}</p>
            
            <h3>Целевая аудитория</h3>
            <p>${result.business_plan.target_audience}</p>
          </div>
          
          <h2>📈 Маркетинг</h2>
          <div class="section">
            <p><strong>CAC:</strong> ${new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(result.marketing_plan.cac)}</p>
            <p><strong>LTV:</strong> ${new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(result.marketing_plan.ltv)}</p>
            <p>${result.marketing_plan.positioning}</p>
          </div>
          
          <div class="footer">
            <p>Сгенерировано AI Business Analyzer • ${new Date().toLocaleString('ru-RU')}</p>
            <p>Ограничения: ${result.limitations.join(', ')}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    if (score >= 60) return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
    return 'bg-destructive/10 text-destructive border-destructive/30';
  };

  const getConfidenceIcon = (score: number) => {
    if (score >= 80) return CheckCircle2;
    if (score >= 60) return Info;
    return AlertCircle;
  };

  const ConfidenceIcon = getConfidenceIcon(result.confidence_score);

  return (
    <div className="space-y-6" ref={contentRef}>
      {/* Header */}
      <div className="section-card">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">{result.metadata.idea}</h2>
            <p className="text-muted-foreground">📍 {result.metadata.location}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn("px-3 py-1.5 border", getConfidenceColor(result.confidence_score))}>
              <ConfidenceIcon className="w-4 h-4 mr-1.5" />
              Уверенность: {result.confidence_score}%
            </Badge>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button onClick={handleExportPDF} variant="outline" className="gap-2">
            <FileDown className="w-4 h-4" />
            Экспорт PDF
          </Button>
          {onReset && (
            <Button onClick={onReset} variant="ghost" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Новый анализ
            </Button>
          )}
        </div>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="financial" className="w-full">
        <TabsList className="w-full grid grid-cols-4 mb-4">
          <TabsTrigger value="financial">Финансы</TabsTrigger>
          <TabsTrigger value="business">Бизнес-план</TabsTrigger>
          <TabsTrigger value="marketing">Маркетинг</TabsTrigger>
          <TabsTrigger value="market">Рынок</TabsTrigger>
        </TabsList>
        
        <TabsContent value="financial">
          <FinancialSummary financial={result.financial_analysis} />
        </TabsContent>
        
        <TabsContent value="business">
          <BusinessPlanSection plan={result.business_plan} />
        </TabsContent>
        
        <TabsContent value="marketing">
          <MarketingSection marketing={result.marketing_plan} />
        </TabsContent>
        
        <TabsContent value="market">
          <MarketAnalysisSection market={result.market_analysis} />
        </TabsContent>
      </Tabs>

      {/* Limitations & Sources */}
      <div className="section-card space-y-4">
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Источники данных</h4>
          <div className="flex flex-wrap gap-2">
            {result.data_sources.map((source, i) => (
              <Badge key={i} variant="outline" className="text-xs">{source}</Badge>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Ограничения анализа</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            {result.limitations.map((limitation, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                {limitation}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground pt-2 border-t border-border">
          Сгенерировано: {new Date(result.metadata.generated_at).toLocaleString('ru-RU')} • 
          Модель: {result.metadata.model} • Версия: {result.metadata.version}
        </p>
      </div>
    </div>
  );
}
