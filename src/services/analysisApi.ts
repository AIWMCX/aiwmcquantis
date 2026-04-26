import { supabase } from '@/integrations/supabase/client';
import type {
  AnalysisRequest,
  AnalysisAPIResponse,
  AnalysisGenerationResult,
} from '@/types/analysis';
import { getAnonymousDeviceId, getBrowserFingerprint } from '@/lib/anonymousTracking';
import { startRequestContext, requestHeaders } from '@/lib/correlation';

import { logger } from '@/lib/logger';
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get anonymous tracking headers for abuse prevention
 */
async function getAnonymousHeaders(): Promise<Record<string, string>> {
  const deviceId = getAnonymousDeviceId();
  const fingerprint = await getBrowserFingerprint();
  
  return {
    'X-Device-Id': deviceId,
    'X-Fingerprint': fingerprint,
  };
}

export async function generateAnalysis(request: AnalysisRequest): Promise<BusinessAnalysisResult> {
  let lastError: Error | null = null;

  // Get anonymous tracking headers
  const anonymousHeaders = await getAnonymousHeaders();

  // Begin a correlation context for this analysis run. Every logger.* call
  // and every Sentry event between here and the end of the request will
  // carry the same `request_id`, and the edge function will echo it back.
  const requestId = startRequestContext();
  logger.info('Analysis request started', { metadata: { request_id: requestId } });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        logger.info(`Retry attempt ${attempt}/${MAX_RETRIES}`);
        await sleep(RETRY_DELAY * attempt);
      }

      const { data, error } = await supabase.functions.invoke<AnalysisAPIResponse>('analyze-business', {
        headers: requestHeaders(anonymousHeaders),
        body: {
          idea: request.idea.trim(),
          location: request.location.trim(),
          ...(request.financial_inputs && { financial_inputs: request.financial_inputs }),
          ...(request.financial_inputs?.selected_industry && { selected_industry: request.financial_inputs.selected_industry }),
          ...(request.documents && request.documents.length > 0 && { documents: request.documents }),
          ...(request.analysis_depth && { analysis_depth: request.analysis_depth }),
        },
      });

      if (error) {
        // Try to parse the response body for structured error messages (e.g., 400 validation errors)
        const status = error.context?.status;
        if (status === 400) {
          // Parse the body to get the user-friendly error message from the edge function
          let body: any = {};
          try {
            const rawBody = error.context?.body;
            if (typeof rawBody === 'string') {
              body = JSON.parse(rawBody);
            } else if (rawBody && typeof rawBody === 'object') {
              body = rawBody;
            }
          } catch {}
          
          const code = body.code || 'VALIDATION_ERROR';
          const message = body.error || 'Invalid request';
          const hint = body.hint ? ` ${body.hint}` : '';
          throw new Error(`${code}: ${message}${hint}`);
        }

        // Check for rate limit error in the response
        if (error.message?.includes('429') || status === 429) {
          const errorData = error.context?.body || {};
          const retryAfter = errorData.details?.retry_after_seconds || 60;
          const minutes = Math.ceil(retryAfter / 60);
          
          // Provide context-aware message
          const reason = errorData.details?.reason;
          let message = `Too many requests. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
          if (reason === 'device_limit') {
            message = `Free analysis limit reached. Sign in for more analyses or try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
          } else if (reason === 'ip_limit') {
            message = `Too many requests from your network. Sign in to continue or try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
          } else if (reason === 'duplicate_submission') {
            message = 'This exact analysis was already performed recently. Try a different idea or location.';
          }
          
          throw new Error(`RATE_LIMIT_EXCEEDED: ${message}`);
        }
        throw new Error(error.message || 'Failed to invoke analysis function');
      }

      if (!data) {
        throw new Error('Empty response from server');
      }

      // Handle rate limit response from edge function
      if ('code' in data && (data.code === 'RATE_LIMIT_EXCEEDED' || data.code === 'ANONYMOUS_LIMIT_EXCEEDED')) {
        const details = (data as any).details || {};
        const retryAfter = details.retry_after_seconds || 60;
        const minutes = Math.ceil(retryAfter / 60);
        
        const reason = details.reason;
        let message = `Too many requests. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
        if (reason === 'device_limit') {
          message = `Free analysis limit reached. Sign in for more analyses or try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
        } else if (reason === 'ip_limit') {
          message = `Too many requests from your network. Sign in to continue or try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
        } else if (reason === 'duplicate_submission') {
          message = 'This exact analysis was already performed recently. Try a different idea or location.';
        }
        
        throw new Error(`RATE_LIMIT_EXCEEDED: ${message}`);
      }

      // Spec §09.2 — quota / tier-gate envelope returned with HTTP 402.
      // We surface it as a typed error so React-Query consumers can route
      // the user to /pricing instead of showing a generic failure.
      if ('error' in data && ((data as any).error === 'QUOTA_EXCEEDED' || (data as any).error === 'TIER_GATE')) {
        const d = data as unknown as Record<string, unknown>;
        const message = (d.message as string) || 'Upgrade required to continue.';
        const upgradeUrl = (d.upgrade_url as string) || '/pricing';
        throw new Error(`TIER_GATE: ${message} | upgrade_url=${upgradeUrl}`);
      }

      if (!data.success || !data.data) {
        throw new Error(data.error || 'Analysis failed');
      }

      return data.data;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.error(`Analysis attempt ${attempt + 1} failed:`, lastError.message);
      
      // Don't retry for validation errors, invalid input, or rate limit errors
      if (lastError.message.includes('VALIDATION') || 
          lastError.message.includes('validation') ||
          lastError.message.includes('RATE_LIMIT') ||
          lastError.message.includes('INVALID_BUSINESS_IDEA')) {
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
    return { valid: false, error: 'Please enter a business idea' };
  }
  if (trimmed.length < 10) {
    return { valid: false, error: 'Minimum 10 characters required' };
  }
  if (trimmed.length > 5000) {
    return { valid: false, error: 'Maximum 5,000 characters allowed' };
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [/<script/i, /javascript:/i, /<iframe/i];
  if (suspiciousPatterns.some(p => p.test(trimmed))) {
    return { valid: false, error: 'Invalid characters detected' };
  }
  
  return { valid: true };
}

export function validateLocation(location: string): { valid: boolean; error?: string } {
  const trimmed = location.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Please enter a location' };
  }
  if (trimmed.length < 2) {
    return { valid: false, error: 'Minimum 2 characters required' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Maximum 100 characters allowed' };
  }
  
  return { valid: true };
}
