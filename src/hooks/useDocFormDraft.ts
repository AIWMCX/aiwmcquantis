import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { UseFormReturn, FieldValues, Path } from 'react-hook-form';
import { secureSetItem, secureGetItem, secureRemoveItem } from '@/lib/secureStorage';

const SAVE_DELAY_MS = 800; // Reduced debounce delay for faster auto-save
const DRAFT_PREFIX = 'docs_draft_';

interface DocDraftData<T> {
  data: T;
  savedAt: number;
  templateId: string;
}

interface UseDocFormDraftOptions<T extends FieldValues> {
  form: UseFormReturn<T>;
  templateId: string;
  enabled?: boolean;
}

/**
 * Hook for auto-saving document form drafts to localStorage
 * Prevents data loss when page refreshes or navigating away
 */
export function useDocFormDraft<T extends FieldValues>({
  form,
  templateId,
  enabled = true,
}: UseDocFormDraftOptions<T>) {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftAge, setDraftAge] = useState<string | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(false);
  
  const storageKey = `${DRAFT_PREFIX}${templateId}`;
  
  // Format age for display
  const formatAge = (timestamp: number): string => {
    const ageMs = Date.now() - timestamp;
    const ageMinutes = Math.floor(ageMs / 60000);
    const ageHours = Math.floor(ageMinutes / 60);
    const ageDays = Math.floor(ageHours / 24);
    
    if (ageDays > 0) return `${ageDays} day${ageDays > 1 ? 's' : ''} ago`;
    if (ageHours > 0) return `${ageHours} hour${ageHours > 1 ? 's' : ''} ago`;
    if (ageMinutes > 0) return `${ageMinutes} minute${ageMinutes > 1 ? 's' : ''} ago`;
    return 'just now';
  };
  
  // Check for existing draft on mount
  useEffect(() => {
    if (!enabled || initialLoadRef.current) return;
    initialLoadRef.current = true;
    
    const checkDraft = async () => {
      try {
        const draft = await secureGetItem<DocDraftData<T>>(storageKey);
        if (draft && typeof draft === 'object' && 'data' in draft && 'savedAt' in draft) {
          // Check if draft has meaningful content (not just defaults)
          const hasContent = Object.values(draft.data as Record<string, unknown>).some(
            (v) => v !== '' && v !== 0 && v !== null && v !== undefined
          );
          
          if (hasContent) {
            setHasDraft(true);
            setDraftAge(formatAge(draft.savedAt));
          }
        }
      } catch (e) {
        console.error('[useDocFormDraft] Failed to check draft:', e);
      }
    };
    
    checkDraft();
  }, [enabled, storageKey]);
  
  // Use subscription for form values to avoid re-renders
  const formValuesRef = useRef<T | null>(null);
  
  // Subscribe to form changes without causing re-renders
  useEffect(() => {
    if (!enabled) return;
    
    const subscription = form.watch((values) => {
      formValuesRef.current = values as T;
      
      // Skip if we have a pending draft and haven't restored yet
      if (!isRestored && hasDraft) return;
      
      // Skip saving if form is still at defaults
      const hasContent = Object.values(values as Record<string, unknown>).some(
        (v) => v !== '' && v !== 0 && v !== null && v !== undefined && 
               (Array.isArray(v) ? v.length > 0 : true)
      );
      if (!hasContent) return;
      
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Set new timeout for debounced save
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          setIsSaving(true);
          const draft: DocDraftData<T> = {
            data: values as T,
            savedAt: Date.now(),
            templateId,
          };
          await secureSetItem(storageKey, draft);
          setLastSaved(new Date());
          setIsSaving(false);
        } catch (e) {
          console.error('[useDocFormDraft] Failed to save draft:', e);
          setIsSaving(false);
        }
      }, SAVE_DELAY_MS);
    });
    
    return () => {
      subscription.unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [enabled, form, storageKey, templateId, hasDraft, isRestored]);
  
  // Restore draft data to form
  const restoreDraft = useCallback(async () => {
    try {
      const draft = await secureGetItem<DocDraftData<T>>(storageKey);
      if (draft && typeof draft === 'object' && 'data' in draft) {
        // Reset form with draft data
        const data = draft.data as T;
        Object.keys(data).forEach((key) => {
          const value = data[key as keyof T];
          if (value !== undefined) {
            form.setValue(key as Path<T>, value as T[Path<T>]);
          }
        });
        setIsRestored(true);
        setHasDraft(false);
        setLastSaved(new Date(draft.savedAt));
      }
    } catch (e) {
      console.error('[useDocFormDraft] Failed to restore draft:', e);
    }
  }, [form, storageKey]);
  
  // Dismiss draft without restoring
  const dismissDraft = useCallback(() => {
    setHasDraft(false);
    setIsRestored(true);
  }, []);
  
  // Clear draft from storage
  const clearDraft = useCallback(async () => {
    try {
      await secureRemoveItem(storageKey);
      setHasDraft(false);
      setLastSaved(null);
    } catch (e) {
      console.error('[useDocFormDraft] Failed to clear draft:', e);
    }
  }, [storageKey]);
  
  // Force save immediately
  const saveDraft = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setIsSaving(true);
      const draft: DocDraftData<T> = {
        data: form.getValues(),
        savedAt: Date.now(),
        templateId,
      };
      await secureSetItem(storageKey, draft);
      setLastSaved(new Date());
      setIsSaving(false);
    } catch (e) {
      console.error('[useDocFormDraft] Failed to force save:', e);
      setIsSaving(false);
    }
  }, [enabled, form, storageKey, templateId]);
  
  return {
    hasDraft,
    draftAge,
    isRestored,
    isSaving,
    lastSaved,
    restoreDraft,
    dismissDraft,
    clearDraft,
    saveDraft,
  };
}
