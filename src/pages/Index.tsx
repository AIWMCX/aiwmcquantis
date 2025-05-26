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
      // Моковые данные для демонстрации
      const currentIdea = idea;
      const currentLocation = location;
      const randomInvestment = Math.floor(Math.random() * 80000) + 20000;

      const mockData: AnalysisResultData = {
        payback_period_months: Math.floor(Math.random() * 18) + 6,
        monthly_revenue_estimate: Math.floor(Math.random() * 45000) + 10000,
        startup_investment: randomInvestment,
        business_plan: `Развернутый бизнес-план для вашей идеи "${currentIdea}" в локации ${currentLocation}:

1. Резюме проекта:
   Концепция: Запуск и развитие "${currentIdea}" ориентирован на удовлетворение специфических потребностей рынка в ${currentLocation}. Мы стремимся предложить уникальное решение, которое выделит нас среди конкурентов.
   Целевая аудитория: Наша целевая аудитория в ${currentLocation} включает [детальное описание сегментов аудитории, например, "молодые профессионалы в возрасте 25-40 лет, интересующиеся инновационными технологиями" или "семьи с детьми, ищущие качественные образовательные услуги"].
   Уникальное торговое предложение (УТП): Ключевым отличием "${currentIdea}" станет [описание УТП, например, "персонализированный подход к каждому клиенту", "использование передовых AI-алгоритмов для анализа данных", "экологически чистые материалы и производство"].
   Цели проекта: Краткосрочные цели включают достижение точки безубыточности в течение первых ${Math.floor(Math.random() * 6) + 6} месяцев и привлечение первых 100 клиентов. Долгосрочные цели – занять лидирующие позиции на рынке ${currentLocation} в сегменте "${currentIdea}" с долей рынка не менее 15% в течение 3 лет.

2. Анализ рынка и конкурентов:
   Подробный анализ текущей рыночной ситуации и конкурентной среды для "${currentIdea}" в ${currentLocation} представлен в разделе "Анализ рынка". Мы выявили ключевых игроков и их стратегии, что позволяет нам определить наши конкурентные преимущества.

3. Продукт/Услуга:
   Описание: "${currentIdea}" представляет собой [детальное описание продукта/услуги, его функций, преимуществ для пользователя]. Мы планируем постоянное развитие и добавление новых функций на основе обратной связи от пользователей.
   Ценообразование: Стратегия ценообразования будет основана на [выберите: "ценности для клиента", "анализе цен конкурентов", "премиальном позиционировании", "доступности для широкого круга"]. Возможные тарифные планы: [описание].
   План разработки: Первый этап разработки включает [описание]. Последующие этапы будут направлены на [описание].

4. Маркетинговая стратегия:
   Комплексная маркетинговая стратегия для продвижения "${currentIdea}" в ${currentLocation} подробно изложена в разделе "План маркетинга". Она включает как онлайн, так и офлайн каналы для максимального охвата целевой аудитории.

5. Операционный план:
   Ресурсы: Для успешного старта и функционирования "${currentIdea}" потребуются следующие ресурсы: [например, "офисное помещение площадью X кв.м.", "специализированное оборудование Y", "команда из Z специалистов (разработчики, маркетологи, менеджеры по продажам)"].
   Бизнес-процессы: Ключевые бизнес-процессы включают [например, "разработку продукта", "привлечение клиентов", "обслуживание клиентов", "финансовый учет"]. Мы будем использовать CRM-систему для автоматизации рутинных задач.
   Партнеры: Потенциальные партнеры в ${currentLocation} могут включать [например, "местные технологические компании", "маркетинговые агентства", "образовательные учреждения"].

6. Организационная структура:
   Команда: Ядро команды состоит из [описание ключевых членов команды и их опыта]. Мы планируем нанять дополнительных специалистов по мере роста бизнеса.
   Юридическая форма: Наиболее подходящей юридической формой для "${currentIdea}" в ${currentLocation} будет [например, "ООО", "ИП"], что обеспечит оптимальный налоговый режим и юридическую защиту.

7. Финансовый план:
   Прогноз доходов и расходов: На основе анализа рынка и планируемых объемов продаж, ожидаемый ежемесячный доход составляет $${(Math.floor(Math.random() * 45000) + 10000).toLocaleString()}. Основные статьи расходов включают [например, "аренду", "заработную плату", "маркетинг", "операционные расходы"].
   Точка безубыточности: Ожидается, что проект достигнет точки безубыточности через ${Math.floor(Math.random() * 12) + 6} месяцев после запуска.
   Инвестиции: Общий объем необходимых стартовых инвестиций оценивается в $${randomInvestment.toLocaleString()}. Эти средства будут направлены на [например, "разработку продукта", "маркетинговую кампанию", "формирование оборотного капитала"].
   Анализ рисков: Основные риски включают [например, "изменение рыночной конъюнктуры", "появление сильных конкурентов", "технологические риски"]. План минимизации рисков предусматривает [описание мер].

8. Ключевые показатели эффективности (KPI):
   Для оценки успеха проекта "${currentIdea}" будут использоваться следующие KPI: [например, "количество активных пользователей", "средний чек", "стоимость привлечения клиента (CAC)", "пожизненная ценность клиента (LTV)", "коэффициент оттока клиентов"].`,
        marketing_plan: `Детализированный маркетинговый план для эффективного продвижения вашей идеи "${currentIdea}" в регионе ${currentLocation}:

1. Цели маркетинговой кампании:
   Повышение узнаваемости бренда "${currentIdea}" среди целевой аудитории в ${currentLocation} на 30% в течение первых 6 месяцев.
   Привлечение не менее 500 качественных лидов в первые 3 месяца.
   Достижение конверсии из лида в клиента на уровне 10%.
   Формирование активного и лояльного сообщества вокруг бренда.

2. Глубокий анализ целевой аудитории в ${currentLocation}:
   Демография: [Например: "Возраст: 22-55 лет. Пол: Мужчины и женщины в соотношении 50/50. Уровень дохода: Средний и выше среднего. Образование: Высшее."].
   Психография: [Например: "Интересы: инновации, технологии, саморазвитие, эффективное управление бизнесом. Ценности: качество, надежность, удобство. Образ жизни: активный, стремление к новым знаниям и инструментам."].
   Поведенческие факторы: [Например: "Активные пользователи интернета и социальных сетей. Предпочитают получать информацию из онлайн-источников, экспертных блогов, вебинаров. При принятии решения о покупке ориентируются на отзывы, рекомендации и функциональность продукта."].

3. Выбор оптимальных каналов продвижения для ${currentLocation}:
   Онлайн-маркетинг:
     SEO (Поисковая оптимизация): Создание и оптимизация контента на сайте/лендинге под ключевые запросы, связанные с "${currentIdea}" и спецификой ${currentLocation}. Цель – попадание в ТОП-10 поисковой выдачи по основным запросам.
     Контекстная реклама: Запуск кампаний в Яндекс.Директ и Google Ads с точным геотаргетингом на ${currentLocation}. Использование как поисковой, так и медийной рекламы.
     SMM (Маркетинг в социальных сетях): Активное ведение профилей в социальных сетях, популярных в ${currentLocation} (например, [VK, Instagram, Facebook, LinkedIn, Telegram – выбрать релевантные]). Публикация полезного контента, проведение конкурсов, взаимодействие с аудиторией.
     Контент-маркетинг: Создание и распространение ценного контента (статьи в блоге, кейсы, видеообзоры, инфографика, вебинары), демонстрирующего экспертизу и преимущества "${currentIdea}".
     Email-маркетинг: Сбор базы подписчиков и регулярная рассылка с новостями, специальными предложениями и полезными материалами. Сегментация базы для персонализированных предложений.
     Партнерский маркетинг: Сотрудничество с блогерами, лидерами мнений и компаниями со смежной целевой аудиторией в ${currentLocation}.
   Офлайн-маркетинг (если применимо для "${currentIdea}" в ${currentLocation}):
     Участие в профильных выставках, конференциях и мероприятиях, проводимых в ${currentLocation} или ориентированных на этот рынок.
     Организация собственных семинаров или мастер-классов.
     Размещение рекламы в местных СМИ (если это соответствует портрету ЦА).

4. Разработка маркетингового бюджета:
   Предполагаемый ежемесячный бюджет на маркетинг составит [например, "$1000 - $5000"], который будет распределен следующим образом: [например, "40% - контекстная реклама, 30% - SMM и контент-маркетинг, 20% - SEO, 10% - партнерский маркетинг"].
   Прогноз ROMI (возврат на маркетинговые инвестиции): Ожидаемый ROMI составляет не менее 200% через 12 месяцев.

5. Система аналитики и оптимизации маркетинговых усилий:
   Инструменты: Использование Google Analytics, Яндекс.Метрики, а также встроенных инструментов аналитики рекламных кабинетов и социальных сетей.
   KPI для маркетинга: Отслеживание таких показателей, как трафик на сайт, количество лидов, стоимость лида (CPL), конверсия, охват, вовлеченность.
   Процесс: Регулярный (еженедельный/ежемесячный) анализ полученных данных, выявление наиболее эффективных каналов и кампаний, корректировка стратегии и перераспределение бюджета для достижения максимальных результатов.`,
        market_analysis: `Комплексный анализ рынка для оценки перспективности вашей идеи "${currentIdea}" в специфических условиях ${currentLocation}:

1. Общий обзор и характеристика рынка в ${currentLocation}:
   Объем и динамика: Текущий оценочный объем рынка для продуктов/услуг, аналогичных "${currentIdea}", в ${currentLocation} составляет [например, "$X млн в год"]. Прогнозируемый среднегодовой темп роста (CAGR) на ближайшие 3-5 лет – [например, "Y%"], что обусловлено [факторы роста, например, "растущим проникновением интернета", "повышением спроса на автоматизацию", "государственной поддержкой инноваций"].
   Ключевые сегменты: Наиболее перспективными сегментами рынка для "${currentIdea}" в ${currentLocation} являются: [перечислить и кратко охарактеризовать сегменты, например, "малый и средний бизнес, нуждающийся в оптимизации процессов", "крупные корпорации, внедряющие AI-решения", "образовательные учреждения, переходящие на цифровые платформы"].
   Тренды и драйверы роста: Основные тенденции, влияющие на рынок: [например, "цифровая трансформация", "рост популярности облачных решений", "усиление конкуренции", "изменение потребительских предпочтений в сторону персонализации"]. Драйверами роста выступают [например, "технологические инновации", "доступность финансирования", "изменения в законодательстве"].

2. Детальный конкурентный анализ в ${currentLocation}:
   Основные конкуренты: На рынке ${currentLocation} присутствуют следующие ключевые игроки, предлагающие схожие или замещающие решения для "${currentIdea}": [Список 3-5 основных конкурентов с кратким описанием их деятельности].
   Сильные и слабые стороны конкурентов:
     Конкурент 1: Сильные стороны ([например, "узнаваемый бренд", "большая клиентская база"]), Слабые стороны ([например, "устаревшие технологии", "высокая цена"]).
     Конкурент 2: Сильные стороны ([...]), Слабые стороны ([...]).
   Конкурентные преимущества "${currentIdea}": На фоне конкурентов, наше предложение будет выгодно отличаться за счет [перечислить 2-3 ключевых конкурентных преимущества, например, "более гибкая ценовая политика", "уникальная технология...", "превосходный клиентский сервис"].

3. Глубокий анализ потребителей в ${currentLocation}:
   Профиль целевого потребителя: (Подробное описание см. в разделе "Маркетинговый план"). Важно учитывать культурные и экономические особенности потребителей в ${currentLocation}.
   Потребности и "боли" клиентов: Ключевые проблемы, которые "${currentIdea}" решает для потребителей в ${currentLocation}: [например, "недостаток времени для рутинных задач", "высокие затраты на существующих решениях", "отсутствие инструментов для глубокого анализа данных"].
   Процесс принятия решения о покупке: Потребители в ${currentLocation} обычно [описание процесса: например, "изучают информацию онлайн, читают отзывы, сравнивают несколько предложений перед принятием решения"]. Важными факторами являются [например, "цена, качество, репутация поставщика, наличие поддержки на местном языке"].

4. SWOT-анализ (Сильные стороны, Слабые стороны, Возможности, Угрозы) для "${currentIdea}" в ${currentLocation}:
   Сильные стороны (Strengths): [Внутренние факторы: "инновационная технология", "опытная команда", "гибкость бизнес-модели"].
   Слабые стороны (Weaknesses): [Внутренние факторы: "ограниченный стартовый бюджет", "неизвестность бренда на начальном этапе", "зависимость от ключевых сотрудников"].
   Возможности (Opportunities): [Внешние факторы: "растущий спрос на рынке ${currentLocation}", "слабость позиций некоторых конкурентов", "возможность выхода на смежные рынки", "благоприятные государственные программы поддержки"].
   Угрозы (Threats): [Внешние факторы: "появление новых сильных конкурентов", "изменение законодательства", "экономическая нестабильность в ${currentLocation}", "технологические изменения, обесценивающие текущее решение"].

5. Оценка барьеров входа на рынок ${currentLocation}:
   Основные барьеры для входа на рынок с идеей "${currentIdea}" включают: [например, "высокая стоимость привлечения первых клиентов", "необходимость получения специфических лицензий или сертификатов (если применимо)", "лояльность потребителей к существующим брендам", "сложность адаптации продукта под местные нужды"]. Мы планируем преодолеть эти барьеры путем [описание стратегии].

6. Итоговые выводы и стратегические рекомендации:
   Оценка перспективности: Рынок ${currentLocation} представляет [например, "значительные возможности", "умеренные перспективы с высокими рисками"] для запуска и развития "${currentIdea}". Успех будет зависеть от эффективной реализации маркетинговой стратегии и способности адаптироваться к изменяющимся условиям.
   Рекомендации по позиционированию: Рекомендуется позиционировать "${currentIdea}" как [например, "инновационное и доступное решение для...", "надежного партнера для..."] в ${currentLocation}.
   Стратегия входа: Наиболее эффективной стратегией входа на рынок будет [например, "быстрый захват ниши с уникальным предложением", "постепенное наращивание присутствия через партнерства"].`,
      };
      const data = mockData;

      setResult(data);
      const newHistoryEntry: HistoryEntry = {
        id: new Date().toISOString(),
        idea: currentIdea, // Используем сохраненные значения
        location: currentLocation, // Используем сохраненные значения
        result: data,
        timestamp: new Date(),
      };
      setHistory(prevHistory => [newHistoryEntry, ...prevHistory].slice(0, 10)); // Хранить последние 10
      setIdea(''); // Очищаем поля после успешной отправки
      setLocation(''); // Очищаем поля после успешной отправки
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
                placeholder="Например, AI агентство для стартапов"
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
                placeholder="Например, США или Кремниевая долина"
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
