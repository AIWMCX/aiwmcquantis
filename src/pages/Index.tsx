
import React, { useState, useEffect } from 'react';
import { AnalysisResultData, HistoryEntry } from '@/types';
import ThemeToggle from '@/components/ThemeToggle';
import { AlertTriangle, FileText, CheckCircle2, Brain, MapPin, Trash2, Send, Loader2 } from 'lucide-react';

// Заглушка URL API
const API_URL = 'https://api.example.com/analyze'; // ЗАМЕНИТЕ НА ВАШ URL API

const Index: React.FC = () => {
  const [idea, setIdea] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResultData | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
     if (typeof window !== 'undefined') {
      const savedHistory = localStorage.getItem('analysisHistory');
      return savedHistory ? JSON.parse(savedHistory) : [];
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('analysisHistory', JSON.stringify(history));
    }
  }, [history]);

  const isFormValid = idea.trim() !== '' && location.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setError(null);
    setResult(null);

    // Имитация API запроса
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      // Закомментированный реальный запрос. Раскомментируйте и настройте при необходимости.
      /*
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, location }),
      });

      if (!response.ok) {
        throw new Error(`Ошибка ${response.status}: ${response.statusText || 'Не удалось получить данные'}`);
      }
      const data: AnalysisResultData = await response.json();
      */

      // Моковые данные для демонстрации
      const mockData: AnalysisResultData = {
        payback_period_months: Math.floor(Math.random() * 24) + 6,
        monthly_revenue_estimate: Math.floor(Math.random() * 50000) + 5000,
        startup_investment: Math.floor(Math.random() * 100000) + 10000,
        business_plan: `Подробный бизнес-план для идеи "${idea}" в ${location}. Включает анализ целевой аудитории, определение уникального торгового предложения, стратегию выхода на рынок и финансовые прогнозы.`,
        marketing_plan: `Комплексный маркетинговый план, ориентированный на ${location}. Включает SMM, контент-маркетинг, SEO-оптимизацию и партнерские программы для продвижения "${idea}".`,
        market_analysis: `Анализ рынка для "${idea}" в ${location}. Оценка размера рынка, выявление ключевых конкурентов, анализ трендов и потребительских предпочтений. SWOT-анализ прилагается.`,
      };
      const data = mockData;

      setResult(data);
      const newHistoryEntry: HistoryEntry = {
        id: new Date().toISOString(),
        idea,
        location,
        result: data,
        timestamp: new Date(),
      };
      setHistory(prevHistory => [newHistoryEntry, ...prevHistory].slice(0, 10)); // Хранить последние 10
      setIdea('');
      setLocation('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Произошла неизвестная ошибка.');
      }
      console.error("Ошибка при запросе к API:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleClearHistory = () => {
    if (window.confirm('Вы уверены, что хотите очистить историю анализов?')) {
      setHistory([]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 dark:from-background dark:to-slate-900 text-foreground flex flex-col items-center p-4 sm:p-8 selection:bg-primary/30">
      <header className="w-full max-w-5xl flex justify-between items-center mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400 dark:to-sky-300">
          AI Анализ Бизнеса
        </h1>
        <ThemeToggle />
      </header>

      <main className="w-full max-w-3xl flex flex-col items-center">
        <form onSubmit={handleSubmit} className="w-full section-card mb-12 space-y-6">
          <div>
            <label htmlFor="idea" className="block text-sm font-medium mb-1 ml-1">Ваша бизнес-идея</label>
            <div className="relative">
              <Brain className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                id="idea"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Например, платформа для онлайн-обучения йоге"
                className="input-field pl-10"
              />
            </div>
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium mb-1 ml-1">Страна или город</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Например, Москва или Вьетнам"
                className="input-field pl-10"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={!isFormValid || loading}
            className="btn btn-primary w-full text-lg flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Анализируем...
              </>
            ) : (
              <>
                Рассчитать
                <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {loading && (
          <div className="w-full max-w-3xl mt-0 animate-pulse-subtle">
            <div className="section-card space-y-6">
              <div className="h-8 bg-muted rounded w-2/3"></div>
              <div className="h-5 bg-muted rounded w-1/3"></div>
              <div className="h-5 bg-muted rounded w-1/2"></div>
              <div className="space-y-3">
                <div className="h-6 bg-muted rounded w-1/4 mb-2"></div>
                <div className="h-20 bg-muted rounded"></div>
              </div>
              <div className="space-y-3">
                <div className="h-6 bg-muted rounded w-1/4 mb-2"></div>
                <div className="h-20 bg-muted rounded"></div>
              </div>
              <div className="space-y-3">
                <div className="h-6 bg-muted rounded w-1/4 mb-2"></div>
                <div className="h-20 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-0 w-full max-w-xl bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 rounded-xl p-6 flex items-start space-x-3 shadow-lg">
            <AlertTriangle className="w-6 h-6 mt-1 text-red-500 dark:text-red-400" />
            <div>
              <h3 className="font-semibold text-lg">Ошибка анализа</h3>
              <p>{error}</p>
            </div>
          </div>
        )}

        {result && !loading && (
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
                onClick={handleExportPDF}
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
        )}

        {history.length > 0 && !loading && !result && (
          <div className="mt-16 w-full max-w-4xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold">История анализов</h2>
              <button
                onClick={handleClearHistory}
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
        )}
      </main>

      <footer className="mt-24 mb-8 text-sm text-muted-foreground text-center">
        © {new Date().getFullYear()} AI Анализ Бизнеса. Сделано с <span className="text-red-500">💙</span> для предпринимателей.
      </footer>
    </div>
  );
};

export default Index;

