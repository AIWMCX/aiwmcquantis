import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useAdmin() {
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isContentAdmin, setIsContentAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (authLoading) return;

      if (!user) {
        setIsAdmin(false);
        setIsContentAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        // Auto-claim admin role if the signed-in email is on the allowlist
        // (beltovbogdan / jeltovbogdan / legal@aiwmcquantis.com).
        await supabase.rpc('claim_admin_if_allowlisted');
        // Auto-claim the scoped Content Studio/Autoposter role if the
        // signed-in email is on that separate, narrower allowlist
        // (AIWMCSRM / jjbalaganvasya). Full admins already have this
        // surface via isAdmin; this only matters for the scoped-only pair.
        await supabase.rpc('claim_content_admin_if_allowlisted');

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['admin', 'content_admin']);

        const roles = new Set((data ?? []).map((r) => r.role));
        setIsAdmin(!error && roles.has('admin'));
        setIsContentAdmin(!error && (roles.has('admin') || roles.has('content_admin')));
      } catch {
        setIsAdmin(false);
        setIsContentAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminRole();
  }, [user, authLoading]);

  return { isAdmin, isContentAdmin, isLoading: isLoading || authLoading };
}
