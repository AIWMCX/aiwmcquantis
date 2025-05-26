
import React from 'react';
import { HistoryEntry } from '@/types';
import { Trash2 } from 'lucide-react';

interface AnalysisHistoryProps {
  history: HistoryEntry[];
  onClearHistory: () => void;
}

const AnalysisHistory: React.FC<AnalysisHistoryProps> = ({ history, onClearHistory }) => {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="mt-16 w-full max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold">История анализов</h2>
        <button
          onClick={onClearHistory}
          className="btn btn-ghost text-sm text-muted-foreground hover:text-destructive flex items-center gap-2"
          title="Очистить историю"
        >
          <Trash2 className="w-4 h-4" /> Очистить
        </button>
      </div>
      <div className="space-y-4">
        {history.map((entry) => (
          <div key={entry.id} className="section-card p-4 sm:p-6 hover:shadow-2xl transition-shadow duration-300">
            <p className="font-semibold text-lg text-primary truncate">💡 {entry.idea}</p>
            <p className="text-sm text-muted-foreground mb-2">🌍 {entry.location} &bull; <span className="text-xs">{new Date(entry.timestamp).toLocaleString('ru-RU')}</span></p>
            <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              <span>Окупаемость: <span className="font-medium">{entry.result.payback_period_months} мес.</span></span>
              <span>Прибыль: <span className="font-medium">${entry.result.monthly_revenue_estimate.toLocaleString()}/мес.</span></span>
              <span>Инвестиции: <span className="font-medium">${entry.result.startup_investment.toLocaleString()}</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalysisHistory;
