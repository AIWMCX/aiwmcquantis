import { useState, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { generateAnalysis, validateIdea, validateLocation } from '@/services/analysisApi';
import { saveAnalysis } from '@/services/analysisDb';
import { useAnalysisHistory } from './useAnalysisHistory';
import { useAuth } from './useAuth';
import { useFileUpload } from './useFileUpload';
import type { AnalysisRequest, BusinessAnalysisResult, OptionalFinancialInputs } from '@/types/analysis';

interface FormErrors {
  idea?: string;
  location?: string;
}

const EMPTY_FINANCIAL_INPUTS: OptionalFinancialInputs = {};

export function useAnalysis() {
  const [idea, setIdea] = useState('');
  const [location, setLocation] = useState('');
  const [financialInputs, setFinancialInputs] = useState<OptionalFinancialInputs>(EMPTY_FINANCIAL_INPUTS);
  const [errors, setErrors] = useState<FormErrors>({});
  const [result, setResult] = useState<BusinessAnalysisResult | null>(null);
  
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
      toast.success('Analysis complete!');
      
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
      
      let message: string;
      
      if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
        // Extract the user-friendly message from the error
        message = error.message.replace('RATE_LIMIT_EXCEEDED: ', '');
      } else if (error.message.includes('429') || error.message.includes('RATE_LIMIT')) {
        message = 'Too many requests. Please wait a minute and try again.';
      } else if (error.message.includes('402') || error.message.includes('PAYMENT') || error.message.includes('USAGE_LIMIT')) {
        message = 'Monthly analysis limit reached. Upgrade your plan for more analyses.';
      } else {
        message = error.message || 'An error occurred during analysis';
      }
        
      toast.error(message, {
        duration: 5000,
        description: error.message.includes('RATE_LIMIT')
          ? 'Please wait a bit, or sign in / upgrade to Plus for higher limits.'
          : undefined,
      });
    },
  });

  const handleSubmit = useCallback((e?: React.FormEvent) => {
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
      ...(documents.length > 0 && { documents })
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
  
  // Watch for new document extractions and offer auto-fill
  useEffect(() => {
    const readyFiles = fileUpload.getReadyFiles();
    const hasExtractedData = readyFiles.some(f => f.extractedFinancials && Object.keys(f.extractedFinancials).length > 0);
    
    if (hasExtractedData) {
      const suggestions = fileUpload.getSuggestedInputs();
      const suggestionCount = Object.keys(suggestions).length;
      
      if (suggestionCount > 0) {
        toast.info(`Found ${suggestionCount} financial data points in your documents`, {
          action: {
            label: 'Auto-fill Form',
            onClick: handleAutoFillFromDocuments
          },
          duration: 8000,
        });
      }
    }
  }, [fileUpload.files.filter(f => f.status === 'ready').length]);

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
    fileUpload.clearFiles();
    mutation.reset();
  }, [mutation, fileUpload]);

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
