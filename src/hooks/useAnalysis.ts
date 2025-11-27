import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { generateAnalysis, validateIdea, validateLocation } from '@/services/analysisApi';
import { saveAnalysis } from '@/services/analysisDb';
import { useAnalysisHistory } from './useAnalysisHistory';
import { useAuth } from './useAuth';
import type { AnalysisRequest, BusinessAnalysisResult } from '@/types/analysis';

interface FormErrors {
  idea?: string;
  location?: string;
}

export function useAnalysis() {
  const [idea, setIdea] = useState('');
  const [location, setLocation] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [result, setResult] = useState<BusinessAnalysisResult | null>(null);
  
  const { addEntry } = useAnalysisHistory();
  const { user, isAuthenticated } = useAuth();

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    
    const ideaValidation = validateIdea(idea);
    if (!ideaValidation.valid) {
      newErrors.idea = ideaValidation.error;
    }
    
    const locationValidation = validateLocation(location);
    if (!locationValidation.valid) {
      newErrors.location = locationValidation.error;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [idea, location]);

  const mutation = useMutation({
    mutationFn: (request: AnalysisRequest) => generateAnalysis(request),
    onSuccess: async (data) => {
      setResult(data);
      toast.success('Анализ готов!');
      
      const trimmedIdea = idea.trim();
      const trimmedLocation = location.trim();
      
      if (isAuthenticated && user) {
        // Save to database for authenticated users
        const saved = await saveAnalysis(user.id, trimmedIdea, trimmedLocation, data);
        if (saved) {
          addEntry({
            id: saved.id,
            idea: trimmedIdea,
            location: trimmedLocation,
            result: data,
            created_at: new Date().toISOString(),
          });
        }
      } else {
        // Save to localStorage for guests
        addEntry({
          id: crypto.randomUUID(),
          idea: trimmedIdea,
          location: trimmedLocation,
          result: data,
          created_at: new Date().toISOString(),
        });
      }
    },
    onError: (error: Error) => {
      console.error('Analysis error:', error);
      
      const message = error.message.includes('429') || error.message.includes('RATE_LIMIT')
        ? 'Слишком много запросов. Подождите минуту.'
        : error.message.includes('402') || error.message.includes('PAYMENT')
        ? 'Превышен лимит использования.'
        : error.message || 'Произошла ошибка при анализе';
        
      toast.error(message);
    },
  });

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!validate()) return;
    
    mutation.mutate({ idea: idea.trim(), location: location.trim() });
  }, [idea, location, validate, mutation]);

  const clearError = useCallback((field: keyof FormErrors) => {
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setIdea('');
    setLocation('');
    setErrors({});
    setResult(null);
    mutation.reset();
  }, [mutation]);

  const isFormValid = idea.trim().length >= 10 && location.trim().length >= 2;

  return {
    // Form state
    idea,
    setIdea,
    location,
    setLocation,
    errors,
    clearError,
    
    // Analysis state
    result,
    setResult,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    
    // Actions
    handleSubmit,
    reset,
    isFormValid,
  };
}
