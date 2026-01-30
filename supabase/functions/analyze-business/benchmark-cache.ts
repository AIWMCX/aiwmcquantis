/**
 * BENCHMARK CACHING LAYER
 * 
 * In-memory cache for industry benchmarks to reduce database load
 * - TTL-based expiration
 * - Automatic refresh on cache miss
 * - Memory-efficient storage
 * 
 * Cache Strategy:
 * - Cache all benchmarks on first request
 * - TTL: 1 hour (benchmarks rarely change)
 * - Falls back to hardcoded on cache miss + DB failure
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ========== CACHE CONFIGURATION ==========

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const LOCATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ========== CACHE STORAGE ==========

interface CacheEntry<T> {
  data: T;
  expiry: number;
  fetchedAt: string;
}

// In-memory caches
const benchmarkCache: Map<string, CacheEntry<DatabaseBenchmarkRecord>> = new Map();
const locationCache: Map<string, CacheEntry<LocationDataRecord>> = new Map();

// Cache metadata
let allBenchmarksCached = false;
let allBenchmarksCacheExpiry = 0;
let allLocationsCached = false;
let allLocationsCacheExpiry = 0;

// ========== TYPES ==========

export interface DatabaseBenchmarkRecord {
  id: string;
  industry_id: string;
  industry_name: string;
  region: string | null;
  keywords: string[] | null;
  cogs_percent_min: number | null;
  cogs_percent_max: number | null;
  cogs_percent_avg: number | null;
  gross_margin_min: number | null;
  gross_margin_max: number | null;
  gross_margin_avg: number | null;
  net_margin_min: number | null;
  net_margin_max: number | null;
  net_margin_avg: number | null;
  cac_min: number | null;
  cac_max: number | null;
  cac_typical: number | null;
  ltv_min: number | null;
  ltv_max: number | null;
  ltv_typical: number | null;
  ltv_cac_ratio_min: number | null;
  ltv_cac_ratio_max: number | null;
  average_check_min: number | null;
  average_check_max: number | null;
  orders_per_client: number | null;
  client_lifetime_months: number | null;
  salaries_fixed: number | null;
  rent_fixed: number | null;
  utilities_fixed: number | null;
  other_fixed: number | null;
  market_size_usd: number | null;
  growth_rate_percent: number | null;
  competition_level: string | null;
  confidence_score: number | null;
  sample_size: number | null;
  source: string | null;
  additional_metrics: Record<string, unknown> | null;
}

export interface LocationDataRecord {
  id: string;
  city_id: string;
  city: string;
  country: string;
  region: string;
  salary_multiplier: number;
  rent_multiplier: number;
  utility_multiplier: number;
  overall_cost_index: number;
  keywords: string[] | null;
}

export interface CacheStats {
  benchmarkCacheSize: number;
  locationCacheSize: number;
  allBenchmarksCached: boolean;
  allLocationsCached: boolean;
  benchmarkCacheExpiry: string | null;
  locationCacheExpiry: string | null;
}

// ========== CACHE OPERATIONS ==========

/**
 * Get all benchmarks from cache or fetch from database
 */
export async function getCachedBenchmarks(
  supabase: SupabaseClient
): Promise<DatabaseBenchmarkRecord[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (allBenchmarksCached && allBenchmarksCacheExpiry > now) {
    console.log(`[CACHE HIT] Returning ${benchmarkCache.size} benchmarks from cache`);
    return Array.from(benchmarkCache.values()).map(entry => entry.data);
  }
  
  // Cache miss or expired - fetch from database
  console.log('[CACHE MISS] Fetching benchmarks from database');
  
  try {
    const { data, error } = await supabase
      .from('industry_benchmarks')
      .select('*');
    
    if (error) {
      console.error('Database benchmark fetch error:', error.message);
      
      // Return stale cache if available
      if (benchmarkCache.size > 0) {
        console.log('[CACHE STALE] Returning stale benchmarks due to DB error');
        return Array.from(benchmarkCache.values()).map(entry => entry.data);
      }
      return [];
    }
    
    if (data && data.length > 0) {
      // Update cache
      benchmarkCache.clear();
      const fetchedAt = new Date().toISOString();
      const expiry = now + CACHE_TTL_MS;
      
      for (const record of data) {
        benchmarkCache.set(record.industry_id, {
          data: record,
          expiry,
          fetchedAt,
        });
      }
      
      allBenchmarksCached = true;
      allBenchmarksCacheExpiry = expiry;
      
      console.log(`[CACHE POPULATED] Cached ${data.length} benchmarks, expires in 1 hour`);
    }
    
    return data || [];
  } catch (err) {
    console.error('Benchmark cache error:', err);
    
    // Return stale cache if available
    if (benchmarkCache.size > 0) {
      console.log('[CACHE STALE] Returning stale benchmarks due to exception');
      return Array.from(benchmarkCache.values()).map(entry => entry.data);
    }
    return [];
  }
}

/**
 * Get a specific benchmark by industry ID from cache
 */
export function getCachedBenchmarkById(industryId: string): DatabaseBenchmarkRecord | null {
  const entry = benchmarkCache.get(industryId);
  
  if (entry && entry.expiry > Date.now()) {
    return entry.data;
  }
  
  return null;
}

/**
 * Get all location data from cache or fetch from database
 */
export async function getCachedLocationData(
  supabase: SupabaseClient
): Promise<LocationDataRecord[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (allLocationsCached && allLocationsCacheExpiry > now) {
    console.log(`[CACHE HIT] Returning ${locationCache.size} locations from cache`);
    return Array.from(locationCache.values()).map(entry => entry.data);
  }
  
  // Cache miss or expired - fetch from database
  console.log('[CACHE MISS] Fetching location data from database');
  
  try {
    const { data, error } = await supabase
      .from('location_data')
      .select('*');
    
    if (error) {
      console.error('Database location fetch error:', error.message);
      
      // Return stale cache if available
      if (locationCache.size > 0) {
        console.log('[CACHE STALE] Returning stale locations due to DB error');
        return Array.from(locationCache.values()).map(entry => entry.data);
      }
      return [];
    }
    
    if (data && data.length > 0) {
      // Update cache
      locationCache.clear();
      const fetchedAt = new Date().toISOString();
      const expiry = now + LOCATION_CACHE_TTL_MS;
      
      for (const record of data) {
        locationCache.set(record.city_id, {
          data: record,
          expiry,
          fetchedAt,
        });
      }
      
      allLocationsCached = true;
      allLocationsCacheExpiry = expiry;
      
      console.log(`[CACHE POPULATED] Cached ${data.length} locations, expires in 24 hours`);
    }
    
    return data || [];
  } catch (err) {
    console.error('Location cache error:', err);
    
    // Return stale cache if available
    if (locationCache.size > 0) {
      console.log('[CACHE STALE] Returning stale locations due to exception');
      return Array.from(locationCache.values()).map(entry => entry.data);
    }
    return [];
  }
}

/**
 * Invalidate the benchmark cache (call after updates)
 */
export function invalidateBenchmarkCache(): void {
  benchmarkCache.clear();
  allBenchmarksCached = false;
  allBenchmarksCacheExpiry = 0;
  console.log('[CACHE INVALIDATED] Benchmark cache cleared');
}

/**
 * Invalidate the location cache (call after updates)
 */
export function invalidateLocationCache(): void {
  locationCache.clear();
  allLocationsCached = false;
  allLocationsCacheExpiry = 0;
  console.log('[CACHE INVALIDATED] Location cache cleared');
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats(): CacheStats {
  return {
    benchmarkCacheSize: benchmarkCache.size,
    locationCacheSize: locationCache.size,
    allBenchmarksCached,
    allLocationsCached,
    benchmarkCacheExpiry: allBenchmarksCacheExpiry > 0 
      ? new Date(allBenchmarksCacheExpiry).toISOString() 
      : null,
    locationCacheExpiry: allLocationsCacheExpiry > 0 
      ? new Date(allLocationsCacheExpiry).toISOString() 
      : null,
  };
}

/**
 * Warm up the cache by pre-fetching all data
 * Call this on function cold start for best performance
 */
export async function warmUpCache(supabase: SupabaseClient): Promise<void> {
  console.log('[CACHE WARMUP] Starting cache warm-up');
  const startTime = Date.now();
  
  // Fetch both in parallel
  await Promise.all([
    getCachedBenchmarks(supabase),
    getCachedLocationData(supabase),
  ]);
  
  const latency = Date.now() - startTime;
  console.log(`[CACHE WARMUP] Complete in ${latency}ms - Benchmarks: ${benchmarkCache.size}, Locations: ${locationCache.size}`);
}
