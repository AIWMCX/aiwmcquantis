import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type DocSignalType =
  | 'downloaded'
  | 'shared'
  | 'rated'
  | 'regenerated'
  | 'section_edited'
  | 'resulted_in_meeting';

export function useDocSignals() {
  const { user } = useAuth();

  const recordSignal = useCallback(
    async (
      documentId: string | null,
      signalType: DocSignalType,
      signalValue?: number,
      context?: Record<string, unknown>,
    ) => {
      if (!user) return;
      // Fire-and-forget — don't block UI
      supabase
        .from('doc_performance_signals')
        .insert([{
          document_id: documentId,
          user_id: user.id,
          signal_type: signalType,
          signal_value: signalValue ?? null,
          context: (context ?? {}) as unknown as Record<string, unknown>,
        }])
        .then(({ error }) => {
          if (error) console.warn('Signal recording failed:', error.message);
        });
    },
    [user],
  );

  return { recordSignal };
}
