import React from 'react';
import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export function UrgencyBanner() {
  return (
    <div className="bg-gradient-to-r from-primary via-primary/90 to-primary py-2.5 text-center text-primary-foreground">
      <div className="container max-w-7xl mx-auto px-4 flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
        <span className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Анализируйте бизнес-идеи бесплатно — регистрация за 30 секунд</span>
          <span className="sm:hidden">Бесплатный анализ бизнес-идей</span>
        </span>
        <Link 
          to="/auth" 
          className="px-4 py-1 bg-primary-foreground text-primary rounded-lg text-sm font-semibold hover:bg-primary-foreground/90 transition-colors whitespace-nowrap"
        >
          Начать →
        </Link>
      </div>
    </div>
  );
}
