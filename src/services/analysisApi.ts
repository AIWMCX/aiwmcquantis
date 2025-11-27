import { supabase } from '@/integrations/supabase/client';
import type { AnalysisRequest, AnalysisAPIResponse, BusinessAnalysisResult } from '@/types/analysis';

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateAnalysis(request: AnalysisRequest): Promise<BusinessAnalysisResult> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt}/${MAX_RETRIES}`);
        await sleep(RETRY_DELAY * attempt);
      }

      const { data, error } = await supabase.functions.invoke<AnalysisAPIResponse>('analyze-business', {
        body: {
          idea: request.idea.trim(),
          location: request.location.trim(),
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to invoke analysis function');
      }

      if (!data) {
        throw new Error('Empty response from server');
      }

      if (!data.success || !data.data) {
        throw new Error(data.error || 'Analysis failed');
      }

      return data.data;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Analysis attempt ${attempt + 1} failed:`, lastError.message);
      
      // Don't retry for validation errors
      if (lastError.message.includes('VALIDATION') || lastError.message.includes('validation')) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error('Analysis failed after retries');
}

// Validation helpers
export function validateIdea(idea: string): { valid: boolean; error?: string } {
  const trimmed = idea.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Введите бизнес-идею' };
  }
  if (trimmed.length < 10) {
    return { valid: false, error: 'Минимум 10 символов' };
  }
  if (trimmed.length > 500) {
    return { valid: false, error: 'Максимум 500 символов' };
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [/<script/i, /javascript:/i, /<iframe/i];
  if (suspiciousPatterns.some(p => p.test(trimmed))) {
    return { valid: false, error: 'Недопустимые символы' };
  }
  
  return { valid: true };
}

export function validateLocation(location: string): { valid: boolean; error?: string } {
  const trimmed = location.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Введите локацию' };
  }
  if (trimmed.length < 2) {
    return { valid: false, error: 'Минимум 2 символа' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Максимум 100 символов' };
  }
  
  return { valid: true };
}
