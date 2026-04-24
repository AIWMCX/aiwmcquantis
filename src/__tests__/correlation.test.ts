import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/sentry', () => ({
  captureError: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
  Sentry: { setTag: vi.fn() },
}));

import {
  startRequestContext,
  endRequestContext,
  getRequestId,
  requestHeaders,
  REQUEST_ID_HEADER,
} from '@/lib/correlation';

describe('correlation', () => {
  beforeEach(() => endRequestContext());

  it('generates a fresh ID when none is provided', () => {
    const id = startRequestContext();
    expect(id).toMatch(/^q_[a-z0-9]+_[a-z0-9]+$/);
    expect(getRequestId()).toBe(id);
  });

  it('respects an explicit ID', () => {
    const id = startRequestContext('q_explicit_42');
    expect(id).toBe('q_explicit_42');
  });

  it('only adds the header while a context is active', () => {
    expect(requestHeaders()[REQUEST_ID_HEADER]).toBeUndefined();
    const id = startRequestContext();
    expect(requestHeaders()[REQUEST_ID_HEADER]).toBe(id);
    endRequestContext();
    expect(requestHeaders()[REQUEST_ID_HEADER]).toBeUndefined();
  });

  it('merges extra headers without losing the request id', () => {
    startRequestContext('q_x');
    const h = requestHeaders({ 'X-Foo': '1' });
    expect(h).toMatchObject({ 'X-Foo': '1', [REQUEST_ID_HEADER]: 'q_x' });
  });
});
