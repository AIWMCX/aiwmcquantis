// An anonymous report exists only in the visitor's browser, so sharing its URL
// sends a dead "Analysis not found" link. Share actions must ask to save first.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const info = vi.fn();
vi.mock('sonner', () => ({ toast: { info: (...a: unknown[]) => info(...a), success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

import { ShareRail } from '@/components/result/ShareRail';

describe('ShareRail for anonymous reports', () => {
  beforeEach(() => {
    info.mockReset();
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it('Copy link asks to save instead of copying a dead link', async () => {
    const onSave = vi.fn();
    render(<ShareRail url="https://x/r/1" title="t" analysisId="1" isAuthenticated={false} showSave onSave={onSave} />);
    fireEvent.click(screen.getByLabelText('Copy link'));
    await Promise.resolve();
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith('Save this report free to share it', expect.objectContaining({ action: expect.objectContaining({ label: 'Save free' }) }));
    (info.mock.calls[0][1] as { action: { onClick: () => void } }).action.onClick();
    expect(onSave).toHaveBeenCalled();
  });

  it('a signed-in user still copies the link', async () => {
    render(<ShareRail url="https://x/r/1" title="t" analysisId="1" isAuthenticated />);
    fireEvent.click(screen.getByLabelText('Copy link'));
    await new Promise((r) => setTimeout(r, 0));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://x/r/1');
    expect(info).not.toHaveBeenCalled();
  });
});
