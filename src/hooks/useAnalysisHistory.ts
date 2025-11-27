import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getAnalyses, deleteAnalysis, migrateLocalStorageToDb } from '@/services/analysisDb';
import type { AnalysisHistoryEntry } from '@/types/analysis';

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
        
        // First, migrate any local history
        const migrated = await migrateLocalStorageToDb(user.id);
        if (migrated > 0) {
          console.log(`Migrated ${migrated} analyses to cloud`);
        }
        
        // Then fetch from database
        const dbHistory = await getAnalyses(user.id);
        setHistory(dbHistory);
        setIsSyncing(false);
      } else {
        // Guest: load from localStorage
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              setHistory(parsed);
            }
          }
        } catch (error) {
          console.error('Failed to load local history:', error);
        }
      }
      setIsLoaded(true);
    };

    loadHistory();
  }, [isAuthenticated, user, authLoading]);

  // Save to localStorage for guests (when history changes)
  useEffect(() => {
    if (!isLoaded || isAuthenticated || authLoading) return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save local history:', error);
    }
  }, [history, isLoaded, isAuthenticated, authLoading]);

  const addEntry = useCallback((entry: AnalysisHistoryEntry) => {
    // For authenticated users, the entry is saved via useAnalysis hook
    // This is mainly for local state update
    setHistory(prev => {
      const filtered = prev.filter(e => e.id !== entry.id);
      return [entry, ...filtered].slice(0, isAuthenticated ? 50 : MAX_LOCAL_ENTRIES);
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
