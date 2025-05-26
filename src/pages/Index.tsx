
import React, { useState } from 'react'; // useState for darkMode will remain
// import axios from 'axios'; // No longer needed here
import { useAnalysisManager } from '@/hooks/useAnalysisManager';
import LoadingSkeleton from '@/components/LoadingSkeleton'; // Assuming this is used or should be
import ErrorDisplay from '@/components/ErrorDisplay'; // Assuming this is used or should be
import AnalysisResults from '@/components/AnalysisResults'; // Assuming this is used or should be
import AnalysisInputForm from '@/components/AnalysisInputForm'; // Assuming this is used or should be

const BusinessAnalyzer = () => {
  const {
    idea,
    setIdea,
    location,
    setLocation,
    loading,
    error,
    result,
    history,
    isFormValid,
    handleSubmit,
    handleExportPDF, // Will be used for the PDF button
    handleClearHistory,
  } = useAnalysisManager();

  const [darkMode, setDarkMode] = useState(false);
  // const [showExplanations, setShowExplanations] = useState(false); // Removed for now

  // isValid is now isFormValid from the hook
  // handleSubmit is from the hook
  // clearHistory is handleClearHistory from the hook

  // The actual form submission logic (including API call or mock data handling)
  // is now encapsulated within the handleSubmit from useAnalysisManager.

  return (
    <div className={`${darkMode ? 'dark' : ''} min-h-screen bg-background text-foreground p-4 sm:p-6 flex flex-col items-center`}>
      <div className="w-full max-w-4xl">
        <header className="flex justify-between items-center mb-6 sm:mb-10">
          <h1 className="text-2xl sm:text-4xl font-bold text-primary">🧠 AI Бизнес Анализ</h1>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-md hover:bg-muted transition-colors text-sm"
          >
            {darkMode ? '☀️ Светлая' : '🌙 Тёмная'}
          </button>
        </header>

        <p className="text-muted-foreground mb-6 sm:mb-8 text-center sm:text-left text-base sm:text-lg">
          Проанализируйте бизнес-идею, получите детальный бизнес-план, расчёт инвестиций и потенциального дохода для любой точки мира.
        </p>

        {/* Using AnalysisInputForm component as per existing allowed files, assuming it's preferred */}
        <AnalysisInputForm
          idea={idea}
          location={location}
          loading={loading}
          isFormValid={isFormValid}
          onIdeaChange={setIdea}
          onLocationChange={setLocation}
          onSubmit={handleSubmit}
        />
        
        {/* Old form structure, replaced by AnalysisInputForm. Kept for reference if needed to revert specific parts.
        <div className="space-y-4 mb-6">
          <input
            type="text"
            className="w-full px-4 py-2 border rounded dark:bg-gray-800"
            placeholder="Введите вашу бизнес-идею"
            value={idea}
            onChange={e => setIdea(e.target.value)}
            disabled={loading}
          />
          <input
            type="text"
            className="w-full px-4 py-2 border rounded dark:bg-gray-800"
            placeholder="Введите страну или город"
            value={location}
            onChange={e => setLocation(e.target.value)}
            disabled={loading}
          />

          Removed showExplanations checkbox
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showExplanations}
              onChange={() => setShowExplanations(!showExplanations)}
            />
            <span>Показать пояснения (обоснования)</span>
          </label>

          <button
            className={`px-6 py-3 text-white font-semibold rounded-lg w-full text-lg flex items-center justify-center gap-2 group transition-all duration-300 ease-in-out ${isFormValid && !loading ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
            onClick={handleSubmit} // handleSubmit from hook already prevents default and checks validity
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Анализируем...
              </>
            ) : (
              <>
                Рассчитать
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 ml-1 group-hover:translate-x-1 transition-transform"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </>
            )}
          </button>
        </div>
        */}

        {loading && <LoadingSkeleton />}

        {error && <ErrorDisplay error={error} />}

        {result && !loading && <AnalysisResults result={result} onExportPDF={handleExportPDF} />}

        {history.length > 0 && !loading && (
          <div className="mt-10 sm:mt-12 w-full">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-primary">📂 История запросов</h2>
              <button 
                onClick={handleClearHistory} 
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
        )}

        <footer className="mt-12 sm:mt-16 text-center text-xs text-muted-foreground py-6">
          © {new Date().getFullYear()} AI Business Analyzer (AIWMC). Все права защищены.
        </footer>
      </div>
    </div>
  );
};

export default BusinessAnalyzer;
