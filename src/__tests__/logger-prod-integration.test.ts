/**
 * Prod-mode logger integration test
 * ---------------------------------
 * Verifies the browser logger's production routing end-to-end:
 *   - non-debug logs become Sentry breadcrumbs
 *   - Error instances route to captureError
 *   - warnings route to captureMessage
 *   - request_id is preserved in Sentry metadata
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/sentry', () => ({
  captureError: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
  Sentry: { setTag: vi.fn() },
}));

import { logger } from '@/lib/logger';
import { addBreadcrumb, captureError, captureMessage } from '@/lib/sentry';
import { endRequestContext, startRequestContext } from '@/lib/correlation';

describe('logger prod-mode Sentry routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('DEV', false);
    logger.clearHistory();
    startRequestContext('q_prod_logger_e2e');
  });

  afterEach(() => {
    endRequestContext();
    vi.unstubAllEnvs();
  });

  it('routes warn/error to Sentry with correlation metadata', () => {
    logger.warn('quota nearing limit', {
      component: 'BillingGate',
      metadata: { plan: 'plus' },
    });

    expect(addBreadcrumb).toHaveBeenCalledWith(
      'quota nearing limit',
      'BillingGate',
      expect.objectContaining({ plan: 'plus', request_id: 'q_prod_logger_e2e' })
    );
    expect(captureMessage).toHaveBeenCalledWith('[WARN] quota nearing limit', 'warning');

    const err = new Error('gateway timeout');
    logger.error('analysis failed', err, {
      component: 'AnalyzeButton',
      metadata: { model: 'gemini' },
    });

    expect(captureError).toHaveBeenCalledWith(
      err,
      expect.objectContaining({
        component: 'AnalyzeButton',
        metadata: expect.objectContaining({ model: 'gemini', request_id: 'q_prod_logger_e2e' }),
      })
    );
    const history = logger.getHistory();
    expect(history[history.length - 1]?.context?.metadata?.request_id).toBe('q_prod_logger_e2e');
  });
});