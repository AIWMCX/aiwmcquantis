
import React from 'react';
import { AnalysisResultData } from '@/types';
import { FileText, CheckCircle2 } from 'lucide-react';

interface AnalysisResultsProps {
  result: AnalysisResultData;
  onExportPDF: () => void;
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({ result, onExportPDF }) => {
  return (
    <div className="mt-0 w-full max-w-4xl section-card space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <CheckCircle2 className="text-green-500 dark:text-green-400 w-10 h-10 mb-2" />
          <h2 className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
            Ожидаемая прибыль: ${result.monthly_revenue_estimate.toLocaleString()} / мес.
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground">
            Окупаемость: <span className="font-medium text-foreground">{result.payback_period_months} месяцев</span>
          </p>
          <p className="text-lg sm:text-xl text-muted-foreground">
            Инвестиции: <span className="font-medium text-foreground">${result.startup_investment.toLocaleString()}</span>
          </p>
        </div>
        <button
          onClick={onExportPDF}
          className="btn btn-secondary flex items-center gap-2 self-start sm:self-center"
        >
          <FileText className="w-5 h-5" /> PDF
        </button>
      </div>

      <div className="space-y-8">
        <section>
          <h3 className="text-xl sm:text-2xl font-semibold text-primary mb-3 pb-2 border-b border-border">📘 Бизнес-план</h3>
          <p className="whitespace-pre-line leading-relaxed text-base sm:text-lg">{result.business_plan}</p>
        </section>
        <section>
          <h3 className="text-xl sm:text-2xl font-semibold text-primary mb-3 pb-2 border-b border-border">📢 План маркетинга</h3>
          <p className="whitespace-pre-line leading-relaxed text-base sm:text-lg">{result.marketing_plan}</p>
        </section>
        <section>
          <h3 className="text-xl sm:text-2xl font-semibold text-primary mb-3 pb-2 border-b border-border">📊 Анализ рынка</h3>
          <p className="whitespace-pre-line leading-relaxed text-base sm:text-lg">{result.market_analysis}</p>
        </section>
      </div>
    </div>
  );
};

export default AnalysisResults;
