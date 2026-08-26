import { useCallback, useState } from 'react';

/**
 * GTM-audit item #13 (2026-08-26, Q3/Q8, "Where We Start #2"): confirmed via
 * a real-code investigation agent that report_integrity === 'BLOCK' only
 * changed the PDF's verdict text/color (usePdfExport.ts) -- the export
 * button itself had no gating, so a user could freely generate and
 * download a BLOCK-status report with no confirmation step at all. This
 * hook makes export require an explicit "export anyway" confirmation
 * whenever the analysis is integrity-blocked, closing the exact gap the
 * CashMatch AI incident exposed (a failed check must never look like a
 * silent, normal export).
 */
export function useIntegrityGatedExport(reportIntegrity: string | null | undefined, doExport: () => void | Promise<void>) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const requestExport = useCallback(() => {
    if (reportIntegrity === 'BLOCK') {
      setConfirmOpen(true);
      return;
    }
    void doExport();
  }, [reportIntegrity, doExport]);

  const confirmAndExport = useCallback(() => {
    setConfirmOpen(false);
    void doExport();
  }, [doExport]);

  return { confirmOpen, setConfirmOpen, requestExport, confirmAndExport };
}
