
import React from 'react';
import { HistoryEntry } from '@/types'; // Assuming HistoryEntry is exported from @/types

interface HistorySectionProps {
  history: HistoryEntry[];
  loading: boolean;
  onClearHistory: () => void;
}

const HistorySection: React.FC<HistorySectionProps> = ({ history, loading, onClearHistory }) => {
  if (history.length === 0 || loading) {
    return null;
  }

  return (
    <div className="mt-10 sm:mt-12 w-full">
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">📂 История запросов</h2>
        <button 
          onClick={onClearHistory} 
          className="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
          aria-label="Очистить историю"
        >
          Очистить
        </button>
      </div>
      <ul className="space-y-3">
        {history.map((entry) => (
          <li 
            key={entry.id} 
            className="bg-card border border-border p-3 sm:p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <strong className="text-base sm:text-lg font-medium text-foreground">{entry.idea}</strong>
                <p className="text-sm text-muted-foreground">— {entry.location}</p>
              </div>
              {/* Optional: Add a button to re-run analysis or view details */}
            </div>
            <span className="block mt-1 text-xs text-muted-foreground">
              {new Date(entry.timestamp).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HistorySection;
