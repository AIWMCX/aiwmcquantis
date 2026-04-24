/**
 * Logger migration tests
 * ----------------------
 * Verifies that the typed logger:
 *   1. Normalizes arbitrary 2nd args into structured metadata
 *   2. Stamps every entry with the active correlation ID
 *   3. Forwards Errors to Sentry's captureError
 *   4. Forwards non-Error rejections to Sentry's captureMessage
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock sentry BEFORE importing logger so the module picks up the mocks.
vi.mock('@/lib/sentry', () => ({
  captureError: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
  Sentry: { setTag: vi.fn() },
}));

import { logger } from '@/lib/logger';
import { captureError, captureMessage } from '@/lib/sentry';
import { startRequestContext, endRequestContext } from '@/lib/correlation';

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    endRequestContext();
  });
  afterEach(() => endRequestContext());

  it('normalizes a plain object 2nd arg into metadata', () => {
    logger.info('hello', { foo: 'bar', n: 1 });
    const last = logger.getHistory().at(-1);
    expect(last?.context?.metadata).toMatchObject({ foo: 'bar', n: 1 });
  });

  it('keeps a real LogContext shape intact', () => {
    logger.info('hello', { component: 'X', metadata: { a: 1 } });
    const last = logger.getHistory().at(-1);
    expect(last?.context?.component).toBe('X');
    expect(last?.context?.metadata).toMatchObject({ a: 1 });
  });

  it('stamps every entry with the active request_id', () => {
    const id = startRequestContext('q_test_123');
    logger.warn('with id');
    const last = logger.getHistory().at(-1);
    expect(last?.context?.metadata?.request_id).toBe(id);
  });

  it('forwards Error instances to Sentry.captureError', () => {
    // Force prod path
    const realDev = (import.meta as any).env.DEV;
    (import.meta as any).env.DEV = false;
    const err = new Error('boom');
    logger.error('failed', err);
    expect(captureError).toHaveBeenCalledWith(err, expect.any(Object));
    (import.meta as any).env.DEV = realDev;
  });

  it('forwards non-Error rejections to Sentry.captureMessage', () => {
    const realDev = (import.meta as any).env.DEV;
    (import.meta as any).env.DEV = false;
    logger.error('weird', { not: 'an-error' });
    expect(captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR] weird'),
      'error'
    );
    (import.meta as any).env.DEV = realDev;
  });

  it('does NOT call Sentry in dev mode', () => {
    (import.meta as any).env.DEV = true;
    logger.error('dev-only', new Error('x'));
    expect(captureError).not.toHaveBeenCalled();
  });
});
