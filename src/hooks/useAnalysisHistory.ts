import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getAnalyses, deleteAnalysis, migrateLocalStorageToDb } from '@/services/analysisDb';
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

  // Load history based on auth state
  useEffect(() => {
    if (authLoading) return;

    const loadHistory = async () => {
      if (isAuthenticated && user) {
        // Authenticated: load from database
        setIsSyncing(true);
        
        // First, migrate any local history (handles both encrypted and legacy data)
        const migrated = await migrateLocalStorageToDb(user.id);
        if (migrated > 0) {
          logger.info(`Migrated ${migrated} analyses to cloud`);
          // Clear local storage after successful migration
          secureRemoveItem(STORAGE_KEY);
        }
        
        // Then fetch from database
        const dbHistory = await getAnalyses(user.id);
        setHistory(dbHistory);
        setIsSyncing(false);
      } else {
        // Guest: load from encrypted localStorage
        try {
          const stored = await secureGetItem<AnalysisHistoryEntry[]>(STORAGE_KEY);
          if (stored && Array.isArray(stored)) {
            setHistory(stored);
          }
        } catch (error) {
          logger.error('Failed to load local history:', error);
        }
      }
      setIsLoaded(true);
    };

    loadHistory();
  }, [isAuthenticated, user, authLoading]);

  // Save to encrypted localStorage for guests (when history changes)
  useEffect(() => {
    if (!isLoaded || isAuthenticated || authLoading) return;
    
    const saveHistory = async () => {
      try {
        await secureSetItem(STORAGE_KEY, history);
      } catch (error) {
        logger.error('Failed to save local history:', error);
      }
    };

    saveHistory();
  }, [history, isLoaded, isAuthenticated, authLoading]);

  const addEntry = useCallback((entry: AnalysisHistoryEntry) => {
    // For authenticated users, the entry is saved via useAnalysis hook
    // This is mainly for local state update
    setHistory(prev => {
      const filtered = prev.filter(e => e.id !== entry.id);
      return [entry, ...filtered].slice(0, isAuthenticated ? 1000 : MAX_LOCAL_ENTRIES);
    });
  }, [isAuthenticated]);

  const removeEntry = useCallback(async (id: string) => {
    if (isAuthenticated) {
      const success = await deleteAnalysis(id);
      if (success) {
        setHistory(prev => prev.filter(e => e.id !== id));
      }
      return success;
    } else {
      setHistory(prev => prev.filter(e => e.id !== id));
      return true;
    }
  }, [isAuthenticated]);

  const clearHistory = useCallback(async () => {
    if (isAuthenticated) {
      // Delete all analyses for user
      for (const entry of history) {
        await deleteAnalysis(entry.id);
      }
    } else {
      // Clear encrypted local storage
      secureRemoveItem(STORAGE_KEY);
    }
    setHistory([]);
  }, [isAuthenticated, history]);

  const getEntry = useCallback((id: string) => {
    return history.find(e => e.id === id);
  }, [history]);

  const refresh = useCallback(async () => {
    if (isAuthenticated && user) {
      setIsSyncing(true);
      const dbHistory = await getAnalyses(user.id);
      setHistory(dbHistory);
      setIsSyncing(false);
    }
  }, [isAuthenticated, user]);

  return {
    history,
    isLoaded,
    isSyncing,
    isAuthenticated,
    addEntry,
    removeEntry,
    clearHistory,
    getEntry,
    refresh,
    hasHistory: history.length > 0,
  };
}
