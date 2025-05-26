
import React, { useState } from 'react';
import { useAnalysisManager } from '@/hooks/useAnalysisManager';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import ErrorDisplay from '@/components/ErrorDisplay';
import AnalysisResults from '@/components/AnalysisResults';
import AnalysisInputForm from '@/components/AnalysisInputForm';
import AppHeader from '@/components/AppHeader';
import PageDescription from '@/components/PageDescription';
import HistorySection from '@/components/HistorySection';
import AppFooter from '@/components/AppFooter';

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
    handleExportPDF,
    handleClearHistory,
  } = useAnalysisManager();

  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={`${darkMode ? 'dark' : ''} min-h-screen bg-background text-foreground p-4 sm:p-6 flex flex-col items-center`}>
      <div className="w-full max-w-4xl">
        <AppHeader darkMode={darkMode} setDarkMode={setDarkMode} />
        <PageDescription />

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
        {error && <ErrorDisplay error={error} />}
        {result && !loading && <AnalysisResults result={result} onExportPDF={handleExportPDF} />}

        <HistorySection
          history={history}
          loading={loading}
          onClearHistory={handleClearHistory}
        />

        <AppFooter />
      </div>
    </div>
  );
};

export default BusinessAnalyzer;
