import React, { useState, useEffect } from 'react';
import { Sparkles, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

type Language = 'en' | 'ru';

const CONTENT = {
  en: {
    desktop: 'AI business validation for founders — structured financial logic in 3 min',
    mobile: 'Validate your idea free',
    cta: 'Start →',
  },
  ru: {
    desktop: 'AI-валидация бизнес-идей — финансовая логика за 3 минуты',
    mobile: 'Проверьте идею бесплатно',
    cta: 'Начать →',
  },
} as const;

export function UrgencyBanner() {
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('preferred_lang') as Language;
      if (stored === 'en' || stored === 'ru') return stored;
      // Auto-detect from browser
      const browserLang = navigator.language.toLowerCase();
      return browserLang.startsWith('ru') ? 'ru' : 'en';
    }
    return 'en';
  });

  useEffect(() => {
    localStorage.setItem('preferred_lang', lang);
  }, [lang]);

  const toggleLang = () => setLang(prev => prev === 'en' ? 'ru' : 'en');
  const content = CONTENT[lang];

  return (
    <div className="bg-gradient-to-r from-primary via-primary/90 to-primary py-2.5 text-center text-primary-foreground">
      <div className="container max-w-7xl mx-auto px-4 flex items-center justify-between">
        {/* Language Toggle - Left */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors text-xs font-medium"
          aria-label="Toggle language"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="uppercase">{lang}</span>
        </button>

        {/* Main Content - Center */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center flex-1 mx-2">
          <span className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">{content.desktop}</span>
            <span className="sm:hidden">{content.mobile}</span>
          </span>
          <Link 
            to="/app" 
            className="px-4 py-1 bg-primary-foreground text-primary rounded-lg text-sm font-semibold hover:bg-primary-foreground/90 transition-colors whitespace-nowrap"
          >
            {content.cta}
          </Link>
        </div>

        {/* Spacer for balance */}
        <div className="w-[52px] hidden sm:block" />
      </div>
    </div>
  );
}
