import { supabase } from "@/integrations/supabase/client";

type Severity = 'info' | 'warning' | 'error' | 'critical';

interface LogEntry {
  analysis_id: string;
  user_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  severity: Severity;
}

const BASELINE_MS = 15_000; // 15s baseline SLA
const BATCH_FLUSH_MS = 2_000;
const BATCH_MAX_SIZE = 20;

class QuantisLogger {
  private static instance: QuantisLogger;
  private buffer: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private userId: string | null = null;

  private constructor() {}

  static getInstance(): QuantisLogger {
    if (!QuantisLogger.instance) {
      QuantisLogger.instance = new QuantisLogger();
    }
    return QuantisLogger.instance;
  }

  private async resolveUserId(): Promise<string | null> {
    if (this.userId) return this.userId;
    try {
      const { data } = await supabase.auth.getUser();
      this.userId = data.user?.id ?? null;
    } catch {
      this.userId = null;
    }
    return this.userId;
  }

  /** Reset cached user (call on sign-out) */
  clearUser(): void {
    this.userId = null;
  }

  // ── Public logging methods ──

  logAnalysisStart(analysisId: string, params: Record<string, unknown>, userId?: string): void {
    if (userId) this.userId = userId;
    this._enqueue(analysisId, 'analysis_start', { params }, 'info');
  }

  logBenchmarkUsed(analysisId: string, industry: string, param: string, version: number, source: string): void {
    this._enqueue(analysisId, 'benchmark_used', { industry, param, version, source }, 'info');
  }

  logGeoCalibration(analysisId: string, geoSlug: string, coefficients: Record<string, number>): void {
    this._enqueue(analysisId, 'geo_calibration', { geoSlug, coefficients }, 'info');
  }

  logReconciliationEvent(analysisId: string, check: Record<string, unknown>): void {
    const severity: Severity = (check as any).passed === false ? 'warning' : 'info';
    this._enqueue(analysisId, 'reconciliation_check', check, severity);
  }

  logValidationWarning(analysisId: string, code: string, field: string, message: string): void {
    this._enqueue(analysisId, 'validation_warning', { code, field, message }, 'warning');
  }

  logAIConsensus(analysisId: string, consensusScore: number, method: string, latencyMs: number): void {
    this._enqueue(analysisId, 'ai_consensus', { consensusScore, method, latencyMs }, 'info');
  }

  logAnalysisComplete(analysisId: string, durationMs: number, confidence: number, reconciled: boolean): void {
    this._enqueue(analysisId, 'analysis_complete', { durationMs, confidence, reconciled }, 'info');

    // Performance guard — SLA check
    if (durationMs > BASELINE_MS * 1.2) {
      this._enqueue(analysisId, 'performance_warning', {
        code: 'QE-PERF-001',
        message: `Duration ${durationMs}ms exceeds SLA baseline (${BASELINE_MS}ms) by ${Math.round(((durationMs / BASELINE_MS) - 1) * 100)}%`,
        durationMs,
        baselineMs: BASELINE_MS,
      }, 'warning');
    }
  }

  logError(analysisId: string, errorCode: string, context: Record<string, unknown>): void {
    this._enqueue(analysisId, 'engine_error', { code: errorCode, ...context }, 'error');
  }

  // ── Internal batching ──

  private _enqueue(analysisId: string, eventType: string, payload: Record<string, unknown>, severity: Severity): void {
    this.buffer.push({
      analysis_id: analysisId,
      user_id: null, // resolved at flush
      event_type: eventType,
      payload,
      severity,
    });

    if (this.buffer.length >= BATCH_MAX_SIZE) {
      this._flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this._flush(), BATCH_FLUSH_MS);
    }
  }

  private async _flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.buffer.length === 0) return;

    const batch = [...this.buffer];
    this.buffer = [];

    const userId = await this.resolveUserId();

    const rows = batch.map(entry => ({
      analysis_id: entry.analysis_id,
      event_type: entry.event_type,
      payload: entry.payload as Record<string, unknown> & { [key: string]: string | number | boolean | null },
      severity: entry.severity,
      user_id: entry.user_id || userId || undefined,
    }));

    try {
      const { error } = await supabase.from('analysis_logs').insert(rows);
      if (error) {
        console.error('[QuantisLogger] Persist failed:', error.message);
        // Re-enqueue on failure (once)
        this.buffer.push(...batch);
      }
    } catch (err) {
      console.error('[QuantisLogger] Persist exception:', err);
    }
  }

  /** Force flush any buffered logs (call before page unload) */
  async flush(): Promise<void> {
    await this._flush();
  }
}

export const quantisLogger = QuantisLogger.getInstance();
