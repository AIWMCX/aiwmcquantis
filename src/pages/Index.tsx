import React, { useState } from 'react';
import axios from 'axios';

const BusinessAnalyzer = () => {
  const [idea, setIdea] = useState('');
  const [location, setLocation] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);

  const isValid = idea.trim() !== '' && location.trim() !== '';

  const handleSubmit = async () => {
    if (!isValid) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await axios.post('YOUR_URL', {
        idea,
        location,
        show_explanations: showExplanations
      });

      setResult(response.data);
      const newEntry = {
        idea,
        location,
        timestamp: new Date().toLocaleString(),
        result: response.data
      };

      setHistory([newEntry, ...history.slice(0, 4)]);
    } catch (e) {
      setError('Ошибка при получении данных. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    if (window.confirm('Очистить историю?')) {
      setHistory([]);
    }
  };

  return (
    <div className={`${darkMode ? 'dark' : ''} min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6`}>
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">🧠 AI анализ бизнеса</h1>
          <button onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? '☀️ Светлая тема' : '🌙 Тёмная тема'}
          </button>
        </div>

        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Проанализируй идею, получи бизнес-план, расчёт вложений и потенциального дохода от бизнеса в любой точке мира.
        </p>

        <div className="space-y-4">
          <input
            type="text"
            className="w-full px-4 py-2 border rounded dark:bg-gray-800"
            placeholder="Введите вашу бизнес-идею"
            value={idea}
            onChange={e => setIdea(e.target.value)}
          />
          <input
            type="text"
            className="w-full px-4 py-2 border rounded dark:bg-gray-800"
            placeholder="Введите страну или город"
            value={location}
            onChange={e => setLocation(e.target.value)}
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showExplanations}
              onChange={() => setShowExplanations(!showExplanations)}
            />
            <span>Показать пояснения (обоснования)</span>
          </label>

          <button
            className={`px-6 py-2 text-white font-semibold rounded ${isValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
            onClick={handleSubmit}
            disabled={!isValid}
          >
            Рассчитать
          </button>
        </div>

        {loading && (
          <div className="mt-10 animate-pulse space-y-4">
            <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        )}

        {error && <p className="mt-6 text-red-600">{error}</p>}

        {result && (
          <div className="mt-10 bg-white dark:bg-gray-800 p-6 rounded shadow space-y-4">
            <div className="text-xl font-semibold text-green-600">
              💰 Ожидаемая прибыль в месяц: ${result.monthly_revenue_estimate}
            </div>
            <div>📆 Срок окупаемости: {result.payback_period_months} месяцев</div>
            <div>💸 Необходимые инвестиции: ${result.startup_investment}</div>

            <section>
              <h3 className="text-lg font-bold mt-6">📘 Бизнес-план</h3>
              <p className="whitespace-pre-line">{result.business_plan}</p>
            </section>

            <section>
              <h3 className="text-lg font-bold mt-6">📢 План маркетинга</h3>
              <p className="whitespace-pre-line">{result.marketing_plan}</p>
            </section>

            <section>
              <h3 className="text-lg font-bold mt-6">📊 Анализ рынка</h3>
              <p className="whitespace-pre-line">{result.market_analysis}</p>
            </section>

            <button
              className="mt-6 px-4 py-2 bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded"
              onClick={() => window.print()}
            >
              📄 Экспорт в PDF
            </button>
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-12">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">📂 История запросов</h2>
              <button onClick={clearHistory} className="text-sm text-red-500">Очистить</button>
            </div>
            <ul className="space-y-2">
              {history.map((entry, index) => (
                <li key={index} className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-sm">
                  <strong>{entry.idea}</strong> — {entry.location} <br />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{entry.timestamp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <footer className="mt-16 text-center text-xs text-gray-500">
          © 2025 AI Business AIWMC. Все права защищены.
        </footer>
      </div>
    </div>
  );
};

export default BusinessAnalyzer;

