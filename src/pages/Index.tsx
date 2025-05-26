import React from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import AnalysisInputForm from '@/components/AnalysisInputForm';
import AnalysisResults from '@/components/AnalysisResults';
import AnalysisHistory from '@/components/AnalysisHistory';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import ErrorDisplay from '@/components/ErrorDisplay';
import { useAnalysisManager } from '@/hooks/useAnalysisManager';

const Index: React.FC = () => {
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
    handleExportPDF,
    handleClearHistory,
  } = useAnalysisManager();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 dark:from-background dark:to-slate-900 text-foreground flex flex-col items-center p-4 sm:p-8 selection:bg-primary/30">
      <header className="w-full max-w-5xl flex justify-between items-center mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400 dark:to-sky-300">
          AI Анализ Бизнеса
        </h1>
        <ThemeToggle />
      </header>

      <main className="w-full max-w-3xl flex flex-col items-center">
        <AnalysisInputForm
          idea={idea}
          location={location}
          loading={loading}
          isFormValid={isFormValid}
          onIdeaChange={setIdea}
          onLocationChange={setLocation}
          onSubmit={handleSubmit}
        />

        {loading && <LoadingSkeleton />}
        {error && !loading && <ErrorDisplay error={error} />}
        {result && !loading && <AnalysisResults result={result} onExportPDF={handleExportPDF} />}
        
        {/* Display history only if not loading, no error, and no result, or if explicitly desired alongside results */}
        {/* For this project, history is shown when there's no active analysis result being displayed */}
        {!loading && !error && !result && history.length > 0 && (
          <AnalysisHistory history={history} onClearHistory={handleClearHistory} />
        )}
        {/* If you want history to always be visible below results (even if there is a result): */}
        {/* {!loading && !error && history.length > 0 && (
          <AnalysisHistory history={history} onClearHistory={handleClearHistory} />
        )} */}


      </main>

      <footer className="mt-24 mb-8 text-sm text-muted-foreground text-center">
        © {new Date().getFullYear()} AI Анализ Бизнеса. Сделано с <span className="text-red-500">💙</span> для предпринимателей.
      </footer>
    </div>
  );
};

export default Index;
