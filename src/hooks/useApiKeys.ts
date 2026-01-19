import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  usage_count: number;
  rate_limit_per_hour: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface ApiKeyCreateResult {
  id: string;
  key: string; // Full key, only shown once
  prefix: string;
}

interface UseApiKeysReturn {
  apiKeys: ApiKey[];
  loading: boolean;
  creating: boolean;
  error: string | null;
  createApiKey: (name: string, scopes?: string[]) => Promise<ApiKeyCreateResult | null>;
  revokeApiKey: (keyId: string) => Promise<void>;
  toggleApiKey: (keyId: string, isActive: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}

// Generate a secure random API key
function generateApiKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const base64 = btoa(String.fromCharCode(...array));
  // Make URL-safe and add prefix
  return 'qnts_' + base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Hash the API key using SHA-256
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useApiKeys(): UseApiKeysReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApiKeys = useCallback(async () => {
    if (!user) {
      setApiKeys([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setApiKeys(data || []);
    } catch (err) {
      console.error('Error fetching API keys:', err);
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const createApiKey = async (
    name: string,
    scopes: string[] = ['analyze']
  ): Promise<ApiKeyCreateResult | null> => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to create an API key',
        variant: 'destructive',
      });
      return null;
    }

    try {
      setCreating(true);
      setError(null);

      // Generate key and hash
      const fullKey = generateApiKey();
      const keyPrefix = fullKey.substring(0, 12); // qnts_xxx...
      const keyHash = await hashApiKey(fullKey);

      const { data, error: insertError } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          name,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          scopes,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      await fetchApiKeys();

      toast({
        title: 'API Key Created',
        description: 'Save this key now - it will not be shown again!',
      });

      return {
        id: data.id,
        key: fullKey,
        prefix: keyPrefix,
      };
    } catch (err) {
      console.error('Error creating API key:', err);
      const message = err instanceof Error ? err.message : 'Failed to create API key';
      setError(message);
      toast({
        title: 'Creation Failed',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setCreating(false);
    }
  };

  const revokeApiKey = async (keyId: string) => {
    if (!user) return;

    try {
      const { error: deleteError } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setApiKeys((prev) => prev.filter((key) => key.id !== keyId));

      toast({
        title: 'API Key Revoked',
        description: 'The API key has been permanently deleted',
      });
    } catch (err) {
      console.error('Error revoking API key:', err);
      toast({
        title: 'Revoke Failed',
        description: err instanceof Error ? err.message : 'Failed to revoke API key',
        variant: 'destructive',
      });
    }
  };

  const toggleApiKey = async (keyId: string, isActive: boolean) => {
    if (!user) return;

    try {
      const { error: updateError } = await supabase
        .from('api_keys')
        .update({ is_active: isActive })
        .eq('id', keyId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setApiKeys((prev) =>
        prev.map((key) =>
          key.id === keyId ? { ...key, is_active: isActive } : key
        )
      );

      toast({
        title: isActive ? 'API Key Activated' : 'API Key Deactivated',
        description: isActive
          ? 'The API key is now active'
          : 'The API key has been deactivated',
      });
    } catch (err) {
      console.error('Error toggling API key:', err);
      toast({
        title: 'Update Failed',
        description: err instanceof Error ? err.message : 'Failed to update API key',
        variant: 'destructive',
      });
    }
  };

  return {
    apiKeys,
    loading,
    creating,
    error,
    createApiKey,
    revokeApiKey,
    toggleApiKey,
    refetch: fetchApiKeys,
  };
}
