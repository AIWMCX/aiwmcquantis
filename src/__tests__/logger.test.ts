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
    const hist = logger.getHistory();
    const last = hist[hist.length - 1];
    expect(last?.context?.metadata).toMatchObject({ foo: 'bar', n: 1 });
  });

  it('keeps a real LogContext shape intact', () => {
    logger.info('hello', { component: 'X', metadata: { a: 1 } });
    const hist = logger.getHistory();
    const last = hist[hist.length - 1];
    expect(last?.context?.component).toBe('X');
    expect(last?.context?.metadata).toMatchObject({ a: 1 });
  });

  it('stamps every entry with the active request_id', () => {
    const id = startRequestContext('q_test_123');
    logger.warn('with id');
    const hist = logger.getHistory();
    const last = hist[hist.length - 1];
    expect(last?.context?.metadata?.request_id).toBe(id);
  });

  it('does NOT call Sentry in dev mode', () => {
    logger.error('dev-only', new Error('x'));
    expect(captureError).not.toHaveBeenCalled();
  });

  // The Logger now reads `import.meta.env.DEV` lazily via a getter, so we can
  // flip the prod gate per-test by stubbing the env.
  describe('prod path (DEV=false)', () => {
    beforeEach(() => {
      vi.stubEnv('DEV', false);
    });
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('forwards Error instances to Sentry.captureError', () => {
      const err = new Error('boom');
      logger.error('something failed', err);
      expect(captureError).toHaveBeenCalledTimes(1);
      expect(captureError).toHaveBeenCalledWith(err, undefined);
      expect(captureMessage).not.toHaveBeenCalled();
    });

    it('forwards non-Error rejections to Sentry.captureMessage', () => {
      logger.error('weird rejection', { code: 'EBAD', value: 42 });
      expect(captureMessage).toHaveBeenCalledTimes(1);
      expect(captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('weird rejection'),
        'error'
      );
      expect(captureError).not.toHaveBeenCalled();
    });
  });
});
