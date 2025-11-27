import { useState, useEffect, useCallback } from 'react';
import type { AnalysisHistoryEntry } from '@/types/analysis';

const STORAGE_KEY = 'business_analysis_history';
const MAX_ENTRIES = 20;

export function useAnalysisHistory() {
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when history changes
  useEffect(() => {
    if (!isLoaded) return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }, [history, isLoaded]);

  const addEntry = useCallback((entry: AnalysisHistoryEntry) => {
    setHistory(prev => {
      // Remove duplicate if exists
      const filtered = prev.filter(e => e.id !== entry.id);
      // Add to beginning, limit to MAX_ENTRIES
      return [entry, ...filtered].slice(0, MAX_ENTRIES);
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setHistory(prev => prev.filter(e => e.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const getEntry = useCallback((id: string) => {
    return history.find(e => e.id === id);
  }, [history]);

  return {
    history,
    isLoaded,
    addEntry,
    removeEntry,
    clearHistory,
    getEntry,
    hasHistory: history.length > 0,
  };
}
