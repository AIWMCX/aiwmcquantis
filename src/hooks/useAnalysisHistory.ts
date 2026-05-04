import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  getAnalyses,
  deleteAnalysis,
  migrateLocalStorageToDb,
  HISTORY_PAGE_SIZE,
} from '@/services/analysisDb';
import { secureSetItem, secureGetItem, secureRemoveItem } from '@/lib/secureStorage';
import type { AnalysisHistoryEntry } from '@/types/analysis';

import { logger } from '@/lib/logger';
const STORAGE_KEY = 'business_analysis_history';
const MAX_LOCAL_ENTRIES = 20;

export function useAnalysisHistory() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Load first page (or all local) when auth is ready
  useEffect(() => {
    if (authLoading) return;

    const loadHistory = async () => {
      if (isAuthenticated && user) {
        setIsSyncing(true);
        const migrated = await migrateLocalStorageToDb(user.id);
        if (migrated > 0) {
          logger.info(`Migrated ${migrated} analyses to cloud`);
          secureRemoveItem(STORAGE_KEY);
        }
        const firstPage = await getAnalyses(user.id, { limit: HISTORY_PAGE_SIZE });
        setHistory(firstPage);
        setHasMore(firstPage.length === HISTORY_PAGE_SIZE);
        setIsSyncing(false);
      } else {
        try {
          const stored = await secureGetItem<AnalysisHistoryEntry[]>(STORAGE_KEY);
          if (stored && Array.isArray(stored)) {
            setHistory(stored);
          }
          setHasMore(false);
        } catch (error) {
          logger.error('Failed to load local history:', error);
        }
      }
      setIsLoaded(true);
    };

    loadHistory();
  }, [isAuthenticated, user, authLoading]);

  // Persist guest history
  useEffect(() => {
    if (!isLoaded || isAuthenticated || authLoading) return;
    secureSetItem(STORAGE_KEY, history).catch((err) =>
      logger.error('Failed to save local history:', err),
    );
  }, [history, isLoaded, isAuthenticated, authLoading]);

  const loadMore = useCallback(async () => {
    if (!isAuthenticated || !user || !hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const oldest = history[history.length - 1]?.created_at;
      const next = await getAnalyses(user.id, {
        limit: HISTORY_PAGE_SIZE,
        before: oldest,
      });
      setHistory((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        const fresh = next.filter((e) => !seen.has(e.id));
        return [...prev, ...fresh];
      });
      setHasMore(next.length === HISTORY_PAGE_SIZE);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isAuthenticated, user, hasMore, isLoadingMore, history]);

  const addEntry = useCallback(
    (entry: AnalysisHistoryEntry) => {
      setHistory((prev) => {
        const filtered = prev.filter((e) => e.id !== entry.id);
        return [entry, ...filtered].slice(0, isAuthenticated ? 1000 : MAX_LOCAL_ENTRIES);
      });
    },
    [isAuthenticated],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      if (isAuthenticated) {
        const success = await deleteAnalysis(id);
        if (success) {
          setHistory((prev) => prev.filter((e) => e.id !== id));
        }
        return success;
      } else {
        setHistory((prev) => prev.filter((e) => e.id !== id));
        return true;
      }
    },
    [isAuthenticated],
  );

  const clearHistory = useCallback(async () => {
    if (isAuthenticated) {
      for (const entry of history) {
        await deleteAnalysis(entry.id);
      }
    } else {
      secureRemoveItem(STORAGE_KEY);
    }
    setHistory([]);
    setHasMore(false);
  }, [isAuthenticated, history]);

  const getEntry = useCallback((id: string) => history.find((e) => e.id === id), [history]);

  const refresh = useCallback(async () => {
    if (isAuthenticated && user) {
      setIsSyncing(true);
      const firstPage = await getAnalyses(user.id, { limit: HISTORY_PAGE_SIZE });
      setHistory(firstPage);
      setHasMore(firstPage.length === HISTORY_PAGE_SIZE);
      setIsSyncing(false);
    }
  }, [isAuthenticated, user]);

  return {
    history,
    isLoaded,
    isSyncing,
    isLoadingMore,
    hasMore,
    isAuthenticated,
    addEntry,
    removeEntry,
    clearHistory,
    getEntry,
    refresh,
    loadMore,
    hasHistory: history.length > 0,
  };
}
