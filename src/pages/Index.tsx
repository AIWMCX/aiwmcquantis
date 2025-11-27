import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { EmptyState } from '@/components/layout/EmptyState';
import { AnalysisForm } from '@/components/analysis/AnalysisForm';
import { AnalysisResults } from '@/components/analysis/AnalysisResults';
import { AnalysisHistory } from '@/components/analysis/AnalysisHistory';
import { useAnalysis } from '@/hooks/useAnalysis';
import { Sparkles, History, BarChart3, FileText, TrendingUp, Target, Zap, Download } from 'lucide-react';

export default function Index() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const [activeTab, setActiveTab] = useState<'analyze' | 'history'>('analyze');

  const {
    idea,
    setIdea,
    location,
    setLocation,
    errors,
    clearError,
    result,
    setResult,
    isLoading,
    handleSubmit,
    reset,
    isFormValid,
  } = useAnalysis();

  // Apply dark mode
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const features = [
    {
      icon: BarChart3,
      title: 'Финансовый анализ',
      description: 'Расчёт инвестиций, выручки, расходов и срока окупаемости',
    },
    {
      icon: FileText,
      title: 'Бизнес-план',
      description: 'Пошаговый план запуска с конкретными действиями',
    },
    {
      icon: TrendingUp,
      title: 'Маркетинг-стратегия',
      description: 'Каналы привлечения клиентов и расчёт CAC/LTV',
    },
    {
      icon: Target,
      title: 'Анализ рынка',
      description: 'Оценка конкуренции, трендов и возможностей',
    },
    {
      icon: Download,
      title: 'Экспорт в PDF',
      description: 'Сохраните результаты для презентации инвесторам',
    },
    {
      icon: Zap,
      title: 'Реальные данные',
      description: 'Актуальные рыночные данные по локации',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header darkMode={darkMode} onToggleTheme={() => setDarkMode(!darkMode)} />

      <main className="flex-1 container max-w-7xl px-4 sm:px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI-анализ бизнес-идей
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Профессиональный анализ
            <span className="text-primary"> за секунды</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Получите детальный финансовый прогноз, бизнес-план, маркетинговую стратегию 
            и анализ рынка для вашей бизнес-идеи.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {/* Form Column */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <AnalysisForm
                idea={idea}
                location={location}
                errors={errors}
                isLoading={isLoading}
                isFormValid={isFormValid}
                onIdeaChange={setIdea}
                onLocationChange={setLocation}
                onClearError={clearError}
                onSubmit={handleSubmit}
              />
              
              {/* Quick History Access */}
              <button
                onClick={() => setActiveTab('history')}
                className="w-full p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <History className="w-4 h-4" />
                История анализов
              </button>
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'analyze' | 'history')}>
              <TabsList className="mb-6 grid w-full grid-cols-2">
                <TabsTrigger value="analyze" className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Результаты
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="w-4 h-4" />
                  История
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analyze">
                {result ? (
                  <AnalysisResults result={result} onReset={reset} />
                ) : (
                  <EmptyState />
                )}
              </TabsContent>

              <TabsContent value="history">
                <AnalysisHistory
                  onSelect={(selectedResult) => {
                    setResult(selectedResult);
                    setActiveTab('analyze');
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Features Section */}
        <div className="border-t border-border pt-16">
          <h2 className="text-2xl font-bold text-center text-foreground mb-12">
            Что вы получите
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all"
              >
                <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
