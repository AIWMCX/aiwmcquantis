/**
 * useApiKeys — manage PRO-only API keys.
 *
 * - List: SELECT (RLS scoped to auth.uid()).
 * - Create: invokes `create-api-key` edge function (returns the plaintext key
 *   exactly once; only the SHA-256 hash + key_prefix are stored).
 * - Revoke: soft-delete by toggling `is_active=false`.
 * - Hard delete: DELETE row (RLS allows owner only).
 *
 * Plaintext key is NEVER persisted in client state across mounts.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { logger } from '@/lib/logger';

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[] | null;
  last_used_at: string | null;
  usage_count: number | null;
  rate_limit_per_hour: number | null;
  is_active: boolean | null;
  expires_at: string | null;
  created_at: string;
}

export interface CreatedApiKey extends ApiKey {
  /** Full secret returned ONCE on creation. */
  plaintext_key: string;
}

export interface UseApiKeysResult {
  keys: ApiKey[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createKey: (name: string) => Promise<CreatedApiKey>;
  revokeKey: (id: string) => Promise<void>;
  deleteKey: (id: string) => Promise<void>;
}

export function useApiKeys(): UseApiKeysResult {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    if (!user) {
      setKeys([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('api_keys')
        .select(
          'id, name, key_prefix, scopes, last_used_at, usage_count, rate_limit_per_hour, is_active, expires_at, created_at',
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setKeys((data ?? []) as ApiKey[]);
    } catch (e) {
      logger.error('[useApiKeys] fetch failed', e);
      setError(e instanceof Error ? e.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const createKey = useCallback(
    async (name: string): Promise<CreatedApiKey> => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Label is required');
      if (trimmed.length > 64) throw new Error('Label too long (max 64 chars)');

      const { data, error: err } = await supabase.functions.invoke('create-api-key', {
        body: { name: trimmed },
      });
      if (err) throw err;
      if (!data?.plaintext_key || !data?.id) {
        throw new Error('Server did not return a key');
      }
      await fetchKeys();
      return data as CreatedApiKey;
    },
    [fetchKeys],
  );

  const revokeKey = useCallback(
    async (id: string) => {
      const { error: err } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', id);
      if (err) throw err;
      await fetchKeys();
    },
    [fetchKeys],
  );

  const deleteKey = useCallback(
    async (id: string) => {
      const { error: err } = await supabase.from('api_keys').delete().eq('id', id);
      if (err) throw err;
      await fetchKeys();
    },
    [fetchKeys],
  );

  return { keys, loading, error, refetch: fetchKeys, createKey, revokeKey, deleteKey };
}
