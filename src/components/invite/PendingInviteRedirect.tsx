import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { pendingInvite } from '@/lib/invites';

/**
 * After any sign-in path (email, Google, email confirmation link), send an
 * invitee who arrived through /invite/<token> back to that page so the Pro
 * month is activated. Once per token per browser session, so a failing
 * redemption can never trap someone in a redirect loop.
 */
export function PendingInviteRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || !isAuthenticated || location.pathname.startsWith('/invite/')) return;
    const token = pendingInvite();
    if (!token) return;
    const key = `quantis_invite_redirected_${token}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch { /* ignore */ }
    navigate(`/invite/${token}`, { replace: true });
  }, [isAuthenticated, isLoading, location.pathname, navigate]);

  return null;
}
