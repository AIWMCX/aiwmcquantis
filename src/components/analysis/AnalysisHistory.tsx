import React from 'react';
import { Link } from 'react-router-dom';
import { History, Trash2, ExternalLink, Clock, MapPin, TrendingUp, Cloud, CloudOff, Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnalysisHistory } from '@/hooks/useAnalysisHistory';
import type { AnalysisHistoryEntry, BusinessAnalysisResult } from '@/types/analysis';

interface AnalysisHistoryProps {
  onSelect: (result: BusinessAnalysisResult) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
    notation: 'compact',
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AnalysisHistory({ onSelect }: AnalysisHistoryProps) {
  const { history, isLoaded, isSyncing, isAuthenticated, removeEntry, clearHistory, hasHistory } = useAnalysisHistory();

  if (!isLoaded) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="w-5 h-5 text-primary" />
            История анализов ({history.length})
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : isAuthenticated ? (
              <span title="Синхронизировано с облаком"><Cloud className="w-4 h-4 text-primary" /></span>
            ) : (
              <span title="Только локально"><CloudOff className="w-4 h-4 text-muted-foreground" /></span>
            )}
          </CardTitle>
          {hasHistory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm('Очистить всю историю?')) {
                  clearHistory();
                }
              }}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Очистить
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isAuthenticated && (
          <div className="p-4 rounded-lg bg-muted/50 border border-border mb-4">
            <div className="flex items-start gap-3">
              <LogIn className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Войдите для синхронизации
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ваши анализы сохраняются локально. Войдите, чтобы сохранять их в облаке.
                </p>
                <Button asChild variant="link" size="sm" className="px-0 mt-2 h-auto">
                  <Link to="/auth">Войти или зарегистрироваться</Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {!hasHistory ? (
          <div className="py-8 text-center">
            <History className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">История пуста</h3>
            <p className="text-sm text-muted-foreground">
              Ваши анализы будут сохраняться здесь автоматически
            </p>
          </div>
        ) : (
          history.map((entry: AnalysisHistoryEntry) => (
            <div
              key={entry.id}
              className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer group"
              onClick={() => onSelect(entry.result)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {entry.idea}
                  </h4>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {entry.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(entry.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-muted-foreground">
                      Инвестиции: <span className="font-medium text-foreground">
                        {formatCurrency(entry.result.financial_analysis.startup_investment.total)}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Окупаемость: <span className="font-medium text-foreground">
                        {entry.result.financial_analysis.payback_period_months} мес.
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(entry.result.financial_analysis.monthly_profit)}/мес
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeEntry(entry.id);
                    }}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
