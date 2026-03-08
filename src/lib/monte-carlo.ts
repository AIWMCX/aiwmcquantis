/**
 * MONTE CARLO SIMULATION ENGINE
 * 
 * Browser-based probabilistic forecasting using seeded PRNG.
 * All arithmetic uses QuantisMath for precision safety.
 * 
 * @module MonteCarlo
 * @version 1.0.0
 */

import { QuantisMath } from './quantis-math';

// ========== INTERFACES ==========

export interface MonteCarloParam {
  name: string;
  baseValue: number;
  minValue: number;
  maxValue: number;
  distribution: 'uniform' | 'normal' | 'triangular';
}

export interface MonteCarloConfig {
  iterations: number;
  params: MonteCarloParam[];
  outputFn: (params: Record<string, number>) => number;
  seed?: number;
  storeSamples?: boolean;
  target?: number;
}

export interface MonteCarloResult {
  iterations: number;
  mean: number;
  median: number;
  stdDev: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
  min: number;
  max: number;
  probabilityPositive: number;
  probabilityExceedsTarget?: number;
  histogram: { bucket: number; count: number; pct: number }[];
  rawSamples?: number[];
}

// ========== SEEDED PRNG (Mulberry32) ==========

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ========== DISTRIBUTION SAMPLERS ==========

/** Box-Muller transform for normal distribution */
function sampleNormal(rand: () => number, mean: number, stdDev: number): number {
  let u1 = rand();
  let u2 = rand();
  // Avoid log(0)
  while (u1 === 0) u1 = rand();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

/** Inverse CDF for triangular distribution */
function sampleTriangular(rand: () => number, min: number, peak: number, max: number): number {
  const u = rand();
  const range = max - min;
  if (range === 0) return min;
  const fc = (peak - min) / range;
  if (u < fc) {
    return min + Math.sqrt(u * range * (peak - min));
  }
  return max - Math.sqrt((1 - u) * range * (max - peak));
}

/** Uniform distribution */
function sampleUniform(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}

function sampleParam(rand: () => number, param: MonteCarloParam): number {
  switch (param.distribution) {
    case 'normal': {
      const stdDev = (param.maxValue - param.minValue) / 6;
      const raw = sampleNormal(rand, param.baseValue, stdDev);
      // Clamp to bounds
      return Math.max(param.minValue, Math.min(param.maxValue, raw));
    }
    case 'triangular':
      return sampleTriangular(rand, param.minValue, param.baseValue, param.maxValue);
    case 'uniform':
    default:
      return sampleUniform(rand, param.minValue, param.maxValue);
  }
}

// ========== HISTOGRAM ==========

function buildHistogram(samples: number[], bucketCount: number = 20): MonteCarloResult['histogram'] {
  if (samples.length === 0) return [];
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const range = max - min;
  if (range === 0) {
    return [{ bucket: QuantisMath.toNumber(QuantisMath.from(min), 2), count: samples.length, pct: 100 }];
  }
  const bucketWidth = range / bucketCount;
  const counts = new Array(bucketCount).fill(0);

  for (const s of samples) {
    let idx = Math.floor((s - min) / bucketWidth);
    if (idx >= bucketCount) idx = bucketCount - 1;
    counts[idx]++;
  }

  return counts.map((count, i) => ({
    bucket: QuantisMath.toNumber(QuantisMath.from(min + (i + 0.5) * bucketWidth), 2),
    count,
    pct: QuantisMath.toNumber(QuantisMath.percentage(count, samples.length), 2),
  }));
}

// ========== CHUNKED PROCESSING ==========

function yieldToMain(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

// ========== MAIN ENGINE ==========

export async function runMonteCarlo(config: MonteCarloConfig): Promise<MonteCarloResult> {
  const iterations = Math.max(1, Math.min(10000, config.iterations || 1000));
  const seed = config.seed ?? Date.now();
  const rand = mulberry32(seed);
  const CHUNK_SIZE = 500;

  const samples: number[] = [];
  let positiveCount = 0;
  let exceedsTargetCount = 0;

  for (let i = 0; i < iterations; i++) {
    // Yield every chunk
    if (i > 0 && i % CHUNK_SIZE === 0) {
      await yieldToMain();
    }

    // Sample all params
    const paramValues: Record<string, number> = {};
    for (const param of config.params) {
      paramValues[param.name] = sampleParam(rand, param);
    }

    // Run output function
    const output = config.outputFn(paramValues);
    samples.push(output);

    if (output > 0) positiveCount++;
    if (config.target !== undefined && output > config.target) exceedsTargetCount++;
  }

  // Compute statistics using QMath
  const r = (v: number) => QuantisMath.toNumber(QuantisMath.from(v), 2);

  const result: MonteCarloResult = {
    iterations,
    mean: r(QuantisMath.toNumber(QuantisMath.mean(samples), 2)),
    median: r(QuantisMath.toNumber(QuantisMath.median(samples), 2)),
    stdDev: r(QuantisMath.toNumber(QuantisMath.standardDeviation(samples), 2)),
    p10: r(QuantisMath.toNumber(QuantisMath.percentile(samples, 10), 2)),
    p25: r(QuantisMath.toNumber(QuantisMath.percentile(samples, 25), 2)),
    p75: r(QuantisMath.toNumber(QuantisMath.percentile(samples, 75), 2)),
    p90: r(QuantisMath.toNumber(QuantisMath.percentile(samples, 90), 2)),
    min: r(Math.min(...samples)),
    max: r(Math.max(...samples)),
    probabilityPositive: r(QuantisMath.toNumber(QuantisMath.percentage(positiveCount, iterations), 2)),
    histogram: buildHistogram(samples),
  };

  if (config.target !== undefined) {
    result.probabilityExceedsTarget = r(QuantisMath.toNumber(QuantisMath.percentage(exceedsTargetCount, iterations), 2));
  }

  if (config.storeSamples) {
    result.rawSamples = samples.map(s => r(s));
  }

  return result;
}

// ========== UTILITIES ==========

/** Estimate runtime in ms for progress indicators */
export function estimateRuntime(iterations: number, paramCount: number): number {
  // Heuristic: ~0.005ms per iteration per param + overhead
  return Math.round(iterations * paramCount * 0.005 + 50);
}

/** Generate time-series corridor data for revenue/profit charts */
export function generateCorridorData(
  result: MonteCarloResult,
  months: number
): {
  month: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
}[] {
  const data: ReturnType<typeof generateCorridorData> = [];

  // Use median as base, scale corridor proportionally over months
  // Apply compound growth from month 1 to `months`
  const monthlyGrowthRate = result.median > 0 ? 0.02 : -0.01; // 2% monthly growth assumption

  for (let m = 1; m <= months; m++) {
    const growthFactor = Math.pow(1 + monthlyGrowthRate, m - 1);
    const scale = (v: number) => QuantisMath.toNumber(QuantisMath.multiply(v, growthFactor), 2);

    data.push({
      month: m,
      p10: scale(result.p10),
      p25: scale(result.p25),
      median: scale(result.median),
      p75: scale(result.p75),
      p90: scale(result.p90),
    });
  }

  return data;
}
