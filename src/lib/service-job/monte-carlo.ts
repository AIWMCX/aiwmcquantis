/**
 * Service Job Quoting — self-contained Monte Carlo runner.
 *
 * Decision (see RECON.md §4): we ship a local pure runner rather than wrapping
 * `src/lib/monte-carlo.ts::runMonteCarlo`. The existing engine is async/chunked
 * and parametric (`MonteCarloParam[]` + single `outputFn(params)`), which makes
 * variable-length scope-item loops and Bernoulli revisit events awkward to
 * express. The signature here matches the Prompt-2 contract exactly:
 *   runMC(sampler, iterations) -> { samples, mean, stddev, percentile, probabilityBelow }
 *
 * Pure functions only. No I/O, no globals, no module-level mutable state.
 */

// ---------- Seeded PRNG (Mulberry32) ----------

/** Returns a deterministic pseudo-random generator in [0, 1). */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Distribution samplers (pure, take a rand fn) ----------

/** Inverse-CDF triangular sampler with peak `mode` in [min, max]. */
export function triangular(
  rand: () => number,
  min: number,
  mode: number,
  max: number,
): number {
  const u = rand();
  const range = max - min;
  if (range === 0) return min;
  const fc = (mode - min) / range;
  if (u < fc) return min + Math.sqrt(u * range * (mode - min));
  return max - Math.sqrt((1 - u) * range * (max - mode));
}

/** Box-Muller normal sampler. sigma is the standard deviation. */
export function normal(rand: () => number, mean: number, sigma: number): number {
  let u1 = rand();
  const u2 = rand();
  if (u1 === 0) u1 = 1e-12;
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * sigma;
}

/** Bernoulli trial returning 1 with probability p, else 0. */
export function bernoulli(rand: () => number, p: number): 0 | 1 {
  return rand() < p ? 1 : 0;
}

// ---------- Runner ----------

export interface MCStats {
  iterations: number;
  samples: number[];
  mean: number;
  stddev: number;
  /** Quantile in [0, 100]. */
  percentile(p: number): number;
  /** Empirical P(X <= threshold). */
  probabilityBelow(threshold: number): number;
}

export interface RunMCOptions {
  /** Optional seed for deterministic test runs. */
  seed?: number;
}

/**
 * Run `iterations` independent samples from `sampler` and compute basic stats.
 * `sampler` is invoked with a `rand` fn so deterministic seeding propagates.
 */
export function runMC(
  sampler: (rand: () => number) => number,
  iterations: number,
  options: RunMCOptions = {},
): MCStats {
  if (!Number.isFinite(iterations) || iterations < 1) {
    throw new Error('runMC: iterations must be a positive finite number');
  }
  const n = Math.floor(iterations);
  const rand = options.seed !== undefined ? mulberry32(options.seed) : Math.random;

  const samples = new Array<number>(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = sampler(rand);
    samples[i] = v;
    sum += v;
  }
  const mean = sum / n;

  let sqSum = 0;
  for (let i = 0; i < n; i++) {
    const d = samples[i] - mean;
    sqSum += d * d;
  }
  const stddev = n > 1 ? Math.sqrt(sqSum / (n - 1)) : 0;

  // Cache one sorted copy for percentile / probabilityBelow queries.
  let sortedCache: number[] | null = null;
  const sorted = () => {
    if (!sortedCache) sortedCache = [...samples].sort((a, b) => a - b);
    return sortedCache;
  };

  const percentile = (p: number): number => {
    if (!Number.isFinite(p)) return NaN;
    const arr = sorted();
    if (arr.length === 0) return NaN;
    const clamped = Math.max(0, Math.min(100, p));
    const rank = (clamped / 100) * (arr.length - 1);
    const lo = Math.floor(rank);
    const hi = Math.ceil(rank);
    if (lo === hi) return arr[lo];
    const w = rank - lo;
    return arr[lo] * (1 - w) + arr[hi] * w;
  };

  const probabilityBelow = (threshold: number): number => {
    const arr = sorted();
    // Binary search for first index > threshold; count of values <= threshold.
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (arr[mid] <= threshold) lo = mid + 1;
      else hi = mid;
    }
    return lo / arr.length;
  };

  return { iterations: n, samples, mean, stddev, percentile, probabilityBelow };
}
