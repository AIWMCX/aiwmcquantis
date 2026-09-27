import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Client } from '@/types/analysis';
import { logger } from '@/lib/logger';

/**
 * Client workspace (Stage 5): the user's own Client business-entity rows
 * (public.clients — see supabase/migrations/20260927050000_clients_table.sql).
 * Reuses the exact `supabase` client and auth pattern useAnalysisHistory()
 * already uses; no new data layer.
 */
export function useClients() {
  const { user, isAuthenticated } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setClients([]);
      setIsLoaded(true);
      return;
    }
    const { data, error } = await supabase
      .from('clients' as any)
      .select('*')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch clients:', error);
    } else {
      setClients((data ?? []) as unknown as Client[]);
    }
    setIsLoaded(true);
  }, [isAuthenticated, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createClient = useCallback(
    async (input: { name: string; industry?: string; location?: string }): Promise<Client | null> => {
      if (!isAuthenticated || !user) return null;
      const trimmedName = input.name.trim();
      if (!trimmedName) return null;

      const { data, error } = await supabase
        .from('clients' as any)
        .insert({
          owner_user_id: user.id,
          name: trimmedName,
          industry: input.industry || null,
          location: input.location || null,
        } as any)
        .select('*')
        .single();

      if (error || !data) {
        logger.error('Failed to create client:', error);
        return null;
      }

      const created = data as unknown as Client;
      setClients((prev) => [created, ...prev]);
      return created;
    },
    [isAuthenticated, user],
  );

  const getClient = useCallback((id: string) => clients.find((c) => c.id === id), [clients]);

  return { clients, isLoaded, isAuthenticated, refresh, createClient, getClient };
}
