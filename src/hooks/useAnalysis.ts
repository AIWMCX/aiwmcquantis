import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { generateAnalysis, validateIdea, validateLocation } from '@/services/analysisApi';
import { useAnalysisHistory } from './useAnalysisHistory';
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
    onSuccess: (data) => {
      setResult(data);
      toast.success('Анализ готов!');
      
      // Save to history
      addEntry({
        id: crypto.randomUUID(),
        idea: idea.trim(),
        location: location.trim(),
        result: data,
        created_at: new Date().toISOString(),
      });
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
