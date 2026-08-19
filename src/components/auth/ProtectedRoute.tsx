import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  // Scoped gate: full admins pass automatically; AIWMCSRM@gmail.com and
  // jjbalaganvasya@gmail.com pass via the separate content_admin role
  // without gaining requireAdmin routes. See useAdmin()/is_content_admin_allowlisted().
  requireContentAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false, requireContentAdmin = false }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isAdmin, isContentAdmin, isLoading: adminLoading } = useAdmin();

  const needsRoleCheck = requireAdmin || requireContentAdmin;

  // Show loading state while checking authentication
  if (authLoading || (needsRoleCheck && adminLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth page if not authenticated
  if (!isAuthenticated) {
    // Store the attempted URL for redirect after login
    const returnUrl = location.pathname + location.search;
    return <Navigate to={`/auth?returnUrl=${encodeURIComponent(returnUrl)}`} replace />;
  }

  // Redirect non-admin users trying to access admin routes
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/app" replace />;
  }

  // Redirect users with neither full admin nor the scoped content_admin role
  if (requireContentAdmin && !isContentAdmin) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
