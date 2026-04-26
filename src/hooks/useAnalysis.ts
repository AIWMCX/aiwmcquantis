import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { generateAnalysis, validateIdea, validateLocation } from '@/services/analysisApi';
import { saveAnalysis } from '@/services/analysisDb';
import { useAnalysisHistory } from './useAnalysisHistory';
import { useAuth } from './useAuth';
import { useFileUpload } from './useFileUpload';
import type { AnalysisRequest, BusinessAnalysisResult, OptionalFinancialInputs } from '@/types/analysis';
import { trackActivationEvent } from '@/lib/activationTracking';

import { logger } from '@/lib/logger';
interface FormErrors {
  idea?: string;
  location?: string;
}

const EMPTY_FINANCIAL_INPUTS: OptionalFinancialInputs = {};

export function useAnalysis() {
  const [idea, setIdea] = useState('');
  const [location, setLocation] = useState('');
  const [financialInputs, setFinancialInputs] = useState<OptionalFinancialInputs>(EMPTY_FINANCIAL_INPUTS);

  // Debounced activation tracking for idea/location entry — fires once user pauses typing.
  // Internal dedupe (30s window in trackActivationEvent) prevents spam on remounts.
  useEffect(() => {
    if (idea.trim().length < 8) return;
    const t = setTimeout(() => {
      void trackActivationEvent('idea_entered', { length: idea.length });
    }, 1200);
    return () => clearTimeout(t);
  }, [idea]);

  useEffect(() => {
    if (location.trim().length < 3) return;
    const t = setTimeout(() => {
      void trackActivationEvent('location_entered', { length: location.length });
    }, 1200);
    return () => clearTimeout(t);
  }, [location]);

  const [errors, setErrors] = useState<FormErrors>({});
  const [result, setResult] = useState<BusinessAnalysisResult | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  
  const { addEntry } = useAnalysisHistory();
  const { user, isAuthenticated } = useAuth();
  
  // File upload functionality
  const fileUpload = useFileUpload(user?.id);

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
      void trackActivationEvent('calculation_completed', {
        idea_length: idea.length,
      });
      toast.success('Analysis complete! ✅', {
        description: 'Scroll down to view your full results',
        duration: 6000,
      });
      
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
    onError: (error: Error, variables) => {
      logger.error('Analysis error:', error);

      const msg = error.message || '';
      const isRateLimit = msg.includes('RATE_LIMIT_EXCEEDED') || msg.includes('429') || msg.includes('RATE_LIMIT');
      const isInvalidIdea = msg.includes('INVALID_BUSINESS_IDEA');
      const isQuota = msg.includes('402') || msg.includes('PAYMENT') || msg.includes('USAGE_LIMIT');
      const isNetwork = /network|fetch|Failed to fetch|ECONN|NetworkError/i.test(msg);
      const isTimeout = /timeout|abort|ETIMEDOUT/i.test(msg);
      const isServer = /\b5\d{2}\b|server|INTERNAL/i.test(msg);
      const isAi = /AI|model|provider|JSON|PARSE/i.test(msg);

      // Specific message — falls back to raw error if nothing matches.
      let title: string;
      let description: string | undefined;
      if (isRateLimit) {
        setRateLimitError(msg);
        title = msg.replace('RATE_LIMIT_EXCEEDED: ', '');
        description = 'Please wait a bit, or sign in / upgrade to Plus for higher limits.';
      } else if (isInvalidIdea) {
        title = msg.replace('INVALID_BUSINESS_IDEA: ', '');
      } else if (isQuota) {
        title = 'Monthly analysis limit reached. Upgrade your plan for more analyses.';
      } else if (isNetwork) {
        title = 'Network error — check your connection and retry.';
      } else if (isTimeout) {
        title = 'Server took too long to respond. The analysis may still complete on retry.';
      } else if (isServer) {
        title = 'Our analysis engine is having a hiccup. Please try again.';
      } else if (isAi) {
        title = 'AI provider returned an unexpected response. Retry usually fixes this.';
      } else {
        title = msg || 'Something went wrong while running your analysis.';
      }

      // Transient failures get an actionable Try-again button. The underlying
      // generateAnalysis() already retries twice silently — this surfaces a
      // third user-initiated attempt with a fresh request.
      const isTransient = isNetwork || isTimeout || isServer || isAi;
      toast.error(title, {
        duration: isInvalidIdea ? 8000 : isTransient ? 10000 : 5000,
        description,
        action: isTransient
          ? {
              label: 'Try again',
              onClick: () => mutation.mutate(variables),
            }
          : undefined,
      });
    },
  });

  const handleSubmit = useCallback((e?: React.FormEvent, depth?: string) => {
    e?.preventDefault();
    
    if (!validate()) return;
    
    // Only include financial inputs that have values
    const cleanedFinancialInputs = Object.fromEntries(
      Object.entries(financialInputs).filter(([_, v]) => v !== undefined && v !== null && v > 0)
    ) as OptionalFinancialInputs;
    
    const hasFinancialInputs = Object.keys(cleanedFinancialInputs).length > 0;
    
    // Get ready files with parsed content AND extracted financials
    const readyFiles = fileUpload.getReadyFiles();
    const documents = readyFiles.map(f => ({
      name: f.name,
      type: f.type,
      parsedContent: f.parsedContent || '',
      extractedFinancials: f.extractedFinancials || undefined,
    }));
    
    mutation.mutate({ 
      idea: idea.trim(), 
      location: location.trim(),
      ...(hasFinancialInputs && { financial_inputs: cleanedFinancialInputs }),
      ...(documents.length > 0 && { documents }),
      ...(depth && { analysis_depth: depth as 'quick' | 'full' | 'deep' }),
    });
  }, [idea, location, financialInputs, validate, mutation, fileUpload]);
  
  // Auto-fill form when documents are parsed with financial data
  const handleAutoFillFromDocuments = useCallback(() => {
    const suggestions = fileUpload.getSuggestedInputs();
    if (Object.keys(suggestions).length > 0) {
      setFinancialInputs(prev => ({ ...prev, ...suggestions }));
      toast.success('Form auto-filled with document data!');
    }
  }, [fileUpload]);
  
  // Watch for new document extractions and offer auto-fill.
  // Use a ref-tracked signature so we only toast when the *set* of extracted
  // financial keys actually changes (prevents re-render toast spam — ISSUE-008).
  const lastSuggestionSigRef = useRef<string>('');
  useEffect(() => {
    const readyFiles = fileUpload.getReadyFiles();
    const hasExtractedData = readyFiles.some(
      (f) => f.extractedFinancials && Object.keys(f.extractedFinancials).length > 0
    );
    if (!hasExtractedData) return;

    const suggestions = fileUpload.getSuggestedInputs();
    const keys = Object.keys(suggestions).sort();
    if (keys.length === 0) return;

    const sig = keys.join('|');
    if (sig === lastSuggestionSigRef.current) return;
    lastSuggestionSigRef.current = sig;

    toast.info(`Found ${keys.length} financial data points in your documents`, {
      action: { label: 'Auto-fill Form', onClick: handleAutoFillFromDocuments },
      duration: 8000,
    });
  }, [fileUpload, handleAutoFillFromDocuments]);

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
    setFinancialInputs(EMPTY_FINANCIAL_INPUTS);
    setErrors({});
    setResult(null);
    setRateLimitError(null);
    fileUpload.clearFiles();
    mutation.reset();
  }, [mutation, fileUpload]);

  const clearRateLimitError = useCallback(() => setRateLimitError(null), []);

  const isFormValid = idea.trim().length >= 10 && location.trim().length >= 2 && !fileUpload.isUploading;

  return {
    // Form state
    idea,
    setIdea,
    location,
    setLocation,
    financialInputs,
    setFinancialInputs,
    errors,
    clearError,
    
    // Analysis state
    result,
    setResult,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    rateLimitError,
    clearRateLimitError,
    
    // Actions
    handleSubmit,
    reset,
    isFormValid,
    handleAutoFillFromDocuments,
    
    // File upload
    files: fileUpload.files,
    isUploading: fileUpload.isUploading,
    uploadFiles: fileUpload.uploadFiles,
    removeFile: fileUpload.removeFile,
    maxFiles: fileUpload.maxFiles,
    allowedExtensions: fileUpload.allowedExtensions,
    getDocumentSummary: fileUpload.getDocumentSummary,
  };
}
