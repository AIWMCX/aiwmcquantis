/**
 * Benchmark Upload Service
 * Handles uploading benchmarks to the manage-benchmarks edge function
 */

import { supabase } from "@/integrations/supabase/client";
import { BenchmarkRecord, chunkArray } from "@/utils/kerryDataTransformer";

export interface UploadProgress {
  current: number;
  total: number;
  successful: number;
  failed: number;
  status: 'idle' | 'uploading' | 'complete' | 'error';
  currentChunk: number;
  totalChunks: number;
}

export interface UploadResult {
  success: boolean;
  inserted: number;
  updated: number;
  failed: number;
  errors: string[];
}

export interface BenchmarkStats {
  totalRecords: number;
  industries: { industry_id: string; industry_name: string }[];
}

const DEFAULT_BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function invokeWithRetry(
  action: string,
  data: unknown,
  adminKey: string,
  retries = MAX_RETRIES
): Promise<{ data: unknown; error: Error | null }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data: responseData, error } = await supabase.functions.invoke('manage-benchmarks', {
        body: { action, data },
        headers: { 'x-admin-key': adminKey },
      });
      
      if (error) {
        throw error;
      }
      
      return { data: responseData, error: null };
    } catch (err) {
      console.error(`Attempt ${attempt}/${retries} failed:`, err);
      
      if (attempt === retries) {
        return { data: null, error: err as Error };
      }
      
      await sleep(RETRY_DELAY * attempt);
    }
  }
  
  return { data: null, error: new Error('Max retries exceeded') };
}

export async function uploadBenchmarks(
  records: BenchmarkRecord[],
  adminKey: string,
  batchSize = DEFAULT_BATCH_SIZE,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const chunks = chunkArray(records, batchSize);
  const errors: string[] = [];
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalFailed = 0;
  
  const progress: UploadProgress = {
    current: 0,
    total: records.length,
    successful: 0,
    failed: 0,
    status: 'uploading',
    currentChunk: 0,
    totalChunks: chunks.length,
  };
  
  onProgress?.(progress);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    progress.currentChunk = i + 1;
    
    const { data, error } = await invokeWithRetry('upload', chunk, adminKey);
    
    if (error) {
      errors.push(`Chunk ${i + 1}: ${error.message}`);
      totalFailed += chunk.length;
      progress.failed += chunk.length;
    } else {
      const result = data as { inserted?: number; updated?: number; failed?: number; errors?: string[] };
      totalInserted += result.inserted || 0;
      totalUpdated += result.updated || 0;
      totalFailed += result.failed || 0;
      
      if (result.errors && result.errors.length > 0) {
        errors.push(...result.errors.map(e => `Chunk ${i + 1}: ${e}`));
      }
      
      progress.successful += (result.inserted || 0) + (result.updated || 0);
      progress.failed += result.failed || 0;
    }
    
    progress.current = Math.min((i + 1) * batchSize, records.length);
    onProgress?.(progress);
    
    // Small delay between chunks to avoid overwhelming the server
    if (i < chunks.length - 1) {
      await sleep(100);
    }
  }
  
  progress.status = errors.length > 0 && totalInserted + totalUpdated === 0 ? 'error' : 'complete';
  onProgress?.(progress);
  
  return {
    success: errors.length === 0,
    inserted: totalInserted,
    updated: totalUpdated,
    failed: totalFailed,
    errors,
  };
}

export async function clearBenchmarks(adminKey: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await invokeWithRetry('clear', null, adminKey, 1);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  const result = data as { success?: boolean; message?: string };
  return { success: result.success ?? true };
}

export async function getBenchmarkStats(adminKey: string): Promise<{ stats?: BenchmarkStats; error?: string }> {
  const { data, error } = await invokeWithRetry('stats', null, adminKey, 1);
  
  if (error) {
    return { error: error.message };
  }
  
  const result = data as { count?: number; sample?: { industry_id: string; industry_name: string }[] };
  
  return {
    stats: {
      totalRecords: result.count || 0,
      industries: result.sample || [],
    },
  };
}
