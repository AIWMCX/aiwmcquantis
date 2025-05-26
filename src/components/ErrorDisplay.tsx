
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorDisplayProps {
  error: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => {
  return (
    <div className="mt-0 w-full max-w-xl bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 rounded-xl p-6 flex items-start space-x-3 shadow-lg">
      <AlertTriangle className="w-6 h-6 mt-1 text-red-500 dark:text-red-400" />
      <div>
        <h3 className="font-semibold text-lg">Ошибка анализа</h3>
        <p>{error}</p>
      </div>
    </div>
  );
};

export default ErrorDisplay;
