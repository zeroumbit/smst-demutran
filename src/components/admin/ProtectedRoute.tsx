import { Navigate, useParams, useLocation } from 'react-router-dom';
import { useAuth, getDashboardUrl } from '@/contexts/AuthContext';
import type { PapelUsuario } from '@/types/admin';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedPapeis?: PapelUsuario[];
  requiredSetorSlug?: string;
  allowSuperAdmin?: boolean;
  requireGuarda?: boolean;
}

export const ProtectedRoute = ({
  children,
  allowedPapeis,
  requiredSetorSlug,
  allowSuperAdmin = true,
  requireGuarda,
}: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, canAccessAdmin, hasPapel, isSuperAdmin, profile, isGuarda, temGuarda } = useAuth();
  const { setorSlug } = useParams<{ setorSlug?: string }>();
  const location = useLocation();

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

  // Validação dinâmica do setorSlug da URL para evitar invasão de outros setores
  if (setorSlug && !isSuperAdmin) {
    if (profile?.setor_slug !== setorSlug) {
      return <Navigate to={getDashboardUrl(profile)} replace />;
    }
  }

  if (requireGuarda) {
    if (!isGuarda && !temGuarda) {
      return <Navigate to={getDashboardUrl(profile)} replace />;
    }
    if (!profile?.aceitou_lei_iro_at && location.pathname !== '/admin/perfil-guardas/guarda-municipal/dashboard') {
      return <Navigate to="/admin/perfil-guardas/guarda-municipal/dashboard" replace />;
    }
    return <>{children}</>;
  }

  if (!canAccessAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  if (allowedPapeis?.length) {
    const isAllowed = isSuperAdmin
      ? allowSuperAdmin && allowedPapeis.includes('super_admin')
      : hasPapel(...allowedPapeis) || (profile?.papel === 'tecnico' && !!profile?.modulos?.length);

    if (!isAllowed) {
      return <Navigate to={getDashboardUrl(profile)} replace />;
    }
  }

  if (requiredSetorSlug) {
    if (isSuperAdmin && !allowSuperAdmin) {
      return <Navigate to={getDashboardUrl(profile)} replace />;
    }

    if (!isSuperAdmin && profile?.setor_slug !== requiredSetorSlug) {
      return <Navigate to={getDashboardUrl(profile)} replace />;
    }
  }

  return <>{children}</>;
};
