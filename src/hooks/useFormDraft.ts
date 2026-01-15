import { useState, useEffect, useCallback, useRef } from 'react';
import type { OptionalFinancialInputs } from '@/types/analysis';

interface DraftData {
  idea: string;
  location: string;
  financialInputs: OptionalFinancialInputs;
  savedAt: number;
}

const DRAFT_KEY = 'quantis_draft';
const SAVE_DELAY_MS = 1000; // Debounce save by 1 second

/**
 * Hook for auto-saving form drafts to localStorage
 * Provides draft recovery on page load with debounced saves
 */
export function useFormDraft(
  idea: string,
  location: string,
  financialInputs: OptionalFinancialInputs,
  setIdea: (value: string) => void,
  setLocation: (value: string) => void,
  setFinancialInputs: (inputs: OptionalFinancialInputs) => void
) {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftAge, setDraftAge] = useState<string | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializedRef = useRef(false);

  // Check for existing draft on mount
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft: DraftData = JSON.parse(saved);
        // Only show draft if it has meaningful content
        if (draft.idea?.trim().length > 5 || draft.location?.trim().length > 2) {
          setHasDraft(true);
          // Calculate age
          const ageMs = Date.now() - draft.savedAt;
          const ageMinutes = Math.floor(ageMs / 60000);
          const ageHours = Math.floor(ageMinutes / 60);
          const ageDays = Math.floor(ageHours / 24);
          
          if (ageDays > 0) {
            setDraftAge(`${ageDays} day${ageDays > 1 ? 's' : ''} ago`);
          } else if (ageHours > 0) {
            setDraftAge(`${ageHours} hour${ageHours > 1 ? 's' : ''} ago`);
          } else if (ageMinutes > 0) {
            setDraftAge(`${ageMinutes} minute${ageMinutes > 1 ? 's' : ''} ago`);
          } else {
            setDraftAge('just now');
          }
        }
      }
    } catch (e) {
      console.error('Failed to check draft:', e);
    }
    
    isInitializedRef.current = true;
  }, []);

  // Debounced save to localStorage
  useEffect(() => {
    // Don't save if we haven't restored yet and have a draft waiting
    if (hasDraft && !isRestored) return;
    // Don't save empty forms
    if (!idea.trim() && !location.trim()) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        const draft: DraftData = {
          idea,
          location,
          financialInputs,
          savedAt: Date.now(),
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch (e) {
        console.error('Failed to save draft:', e);
      }
    }, SAVE_DELAY_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [idea, location, financialInputs, hasDraft, isRestored]);

  // Restore draft
  const restoreDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft: DraftData = JSON.parse(saved);
        setIdea(draft.idea || '');
        setLocation(draft.location || '');
        setFinancialInputs(draft.financialInputs || {});
        setIsRestored(true);
        setHasDraft(false);
      }
    } catch (e) {
      console.error('Failed to restore draft:', e);
    }
  }, [setIdea, setLocation, setFinancialInputs]);

  // Dismiss draft
  const dismissDraft = useCallback(() => {
    setHasDraft(false);
    setIsRestored(true);
  }, []);

  // Clear draft (after successful submission)
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
    } catch (e) {
      console.error('Failed to clear draft:', e);
    }
  }, []);

  return {
    hasDraft,
    draftAge,
    restoreDraft,
    dismissDraft,
    clearDraft,
  };
}
