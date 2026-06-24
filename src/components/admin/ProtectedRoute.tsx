import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { PapelUsuario } from '@/types/admin';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedPapeis?: PapelUsuario[];
  requiredSetorSlug?: string;
  allowSuperAdmin?: boolean;
}

export const ProtectedRoute = ({
  children,
  allowedPapeis,
  requiredSetorSlug,
  allowSuperAdmin = true,
}: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, canAccessAdmin, hasPapel, isSuperAdmin, profile } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!canAccessAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  if (allowedPapeis?.length) {
    const isAllowed = isSuperAdmin
      ? allowSuperAdmin && allowedPapeis.includes('super_admin')
      : hasPapel(...allowedPapeis);

    if (!isAllowed) {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  if (requiredSetorSlug) {
    if (isSuperAdmin && !allowSuperAdmin) {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (!isSuperAdmin && profile?.setor_slug !== requiredSetorSlug) {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
