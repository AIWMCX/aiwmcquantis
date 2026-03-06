import { supabase } from '@/integrations/supabase/client';
import type { AnalysisRequest, BusinessAnalysisResult } from '@/types/analysis';

/**
 * Calls the analyze-business edge function for full business analysis.
 */
export async function generateAnalysis(request: AnalysisRequest): Promise<BusinessAnalysisResult> {
  try {
    console.log("🚀 Starting Quantis analysis engine...");

    const { data, error } = await supabase.functions.invoke('analyze-business', {
      body: request,
    });

    if (error) {
      // Check for specific error codes in the response
      if (error.message?.includes('429') || error.message?.includes('RATE_LIMIT')) {
        throw new Error(`RATE_LIMIT_EXCEEDED: ${error.message}`);
      }
      throw new Error(error.message || 'Analysis failed');
    }

    if (!data) {
      throw new Error('No data returned from analysis engine');
    }

    return data as BusinessAnalysisResult;
  } catch (error) {
    console.error("Quantis Engine Error:", error);
    throw error instanceof Error ? error : new Error('Analysis engine timeout');
  }
}

export const validateIdea = (idea: string) =>
  idea.trim().length >= 10
    ? { valid: true }
    : { valid: false, error: "Minimum 10 characters required" };

export const validateLocation = (loc: string) =>
  loc.trim().length >= 2
    ? { valid: true }
    : { valid: false, error: "Minimum 2 characters required" };
