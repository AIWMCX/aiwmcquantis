/**
 * GTM-audit item #13 (2026-08-26, Q3/Q8, "Where We Start #2"): confirmed via
 * a real-code investigation agent that report_integrity === 'BLOCK' only
 * changed the PDF's verdict text/color -- the export button itself had no
 * gating, so a user could freely generate and download a BLOCK-status
 * report with zero confirmation. useIntegrityGatedExport() requires an
 * explicit "export anyway" step whenever the analysis is integrity-blocked.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIntegrityGatedExport } from '../hooks/useIntegrityGatedExport';

describe('useIntegrityGatedExport', () => {
  it('exports immediately when report_integrity is not BLOCK', () => {
    const doExport = vi.fn();
    const { result } = renderHook(() => useIntegrityGatedExport('PASS', doExport));

    act(() => result.current.requestExport());

    expect(doExport).toHaveBeenCalledTimes(1);
    expect(result.current.confirmOpen).toBe(false);
  });

  it('exports immediately when report_integrity is undefined (no integrity field at all)', () => {
    const doExport = vi.fn();
    const { result } = renderHook(() => useIntegrityGatedExport(undefined, doExport));

    act(() => result.current.requestExport());

    expect(doExport).toHaveBeenCalledTimes(1);
  });

  it('does NOT export and opens the confirm dialog when report_integrity is BLOCK', () => {
    const doExport = vi.fn();
    const { result } = renderHook(() => useIntegrityGatedExport('BLOCK', doExport));

    act(() => result.current.requestExport());

    expect(doExport).not.toHaveBeenCalled();
    expect(result.current.confirmOpen).toBe(true);
  });

  it('exports and closes the dialog only after explicit confirmAndExport()', () => {
    const doExport = vi.fn();
    const { result } = renderHook(() => useIntegrityGatedExport('BLOCK', doExport));

    act(() => result.current.requestExport());
    expect(doExport).not.toHaveBeenCalled();

    act(() => result.current.confirmAndExport());
    expect(doExport).toHaveBeenCalledTimes(1);
    expect(result.current.confirmOpen).toBe(false);
  });
});
