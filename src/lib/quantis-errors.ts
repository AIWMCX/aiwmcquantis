import { logger } from '@/lib/logger';
/**
 * QUANTIS MATH-LAYER ERROR CODES
 * 
 * QE-series codes for precision math operations.
 * Every QMath failure maps to one of these codes.
 */

export interface QuantisErrorCode {
  code: string;
  name: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  recoverable: boolean;
}

export const QUANTIS_ERRORS: Record<string, QuantisErrorCode> = {
  'QE-001': {
    code: 'QE-001',
    name: 'InvalidInput',
    message: 'Input value is NaN, Infinity, or unparseable — sanitized to 0',
    severity: 'warning',
    recoverable: true,
  },
  'QE-002': {
    code: 'QE-002',
    name: 'DivisionByZero',
    message: 'Division by zero attempted — returned 0',
    severity: 'warning',
    recoverable: true,
  },
  'QE-003': {
    code: 'QE-003',
    name: 'ArrayLengthMismatch',
    message: 'Values and weights arrays differ in length — returned 0',
    severity: 'error',
    recoverable: true,
  },
  'QE-004': {
    code: 'QE-004',
    name: 'InsufficientData',
    message: 'Dataset too small for requested statistical operation — returned 0',
    severity: 'warning',
    recoverable: true,
  },
  'QE-005': {
    code: 'QE-005',
    name: 'ConfidenceBelowThreshold',
    message: 'Confidence score is below acceptable threshold for this operation',
    severity: 'warning',
    recoverable: true,
  },
  'QE-006': {
    code: 'QE-006',
    name: 'BenchmarkOutOfRange',
    message: 'Benchmark value falls outside expected distribution range',
    severity: 'warning',
    recoverable: true,
  },
  'QE-007': {
    code: 'QE-007',
    name: 'ModelConsensusFailure',
    message: 'Dual-engine outputs diverged beyond acceptable agreement threshold',
    severity: 'error',
    recoverable: false,
  },
  'QE-008': {
    code: 'QE-008',
    name: 'StaleData',
    message: 'Benchmark or location data is older than freshness threshold',
    severity: 'info',
    recoverable: true,
  },
} as const;

/** Get a QE error by code */
export function getQuantisError(code: string): QuantisErrorCode | undefined {
  return QUANTIS_ERRORS[code];
}

/** Log a QE warning to console with structured data */
export function warnQE(code: string, context?: Record<string, unknown>): void {
  const err = QUANTIS_ERRORS[code];
  if (!err) return;
  logger.warn(`[${err.code}] ${err.name}: ${err.message}`, context ?? '');
}
