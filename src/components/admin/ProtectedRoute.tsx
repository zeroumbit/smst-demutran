import { Navigate, useParams, useLocation } from 'react-router-dom';
import { useAuth, getDashboardUrl } from '@/contexts/AuthContext';
import type { PapelUsuario } from '@/types/admin';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedPapeis?: PapelUsuario[];
  requiredSetorSlug?: string;
  allowSuperAdmin?: boolean;
  requireGuarda?: boolean;
  requireGraduacao?: boolean;
  allowGuardaIroManagement?: boolean;
}

export const ProtectedRoute = ({
  children,
  allowedPapeis,
  requiredSetorSlug,
  allowSuperAdmin = true,
  requireGuarda,
  requireGraduacao,
  allowGuardaIroManagement = false,
}: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, canAccessAdmin, hasPapel, isSuperAdmin, profile, isGuarda, temGuarda } = useAuth();
  const { setorSlug } = useParams<{ setorSlug?: string }>();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="mobile-safe-screen flex items-center justify-center">
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

  if (requireGraduacao && !isSuperAdmin) {
    const temGraduacao = !!profile?.graduacao_id;
    if (!temGraduacao) {
      return <Navigate to={getDashboardUrl(profile)} replace />;
    }
  }

  if (requireGuarda) {
    const isChefeComGraduacao =
      (profile?.papel === 'gestor' || profile?.papel === 'admin_setor') &&
      !!profile?.graduacao_id;

    if (!isGuarda && !temGuarda && !isChefeComGraduacao) {
      return <Navigate to={getDashboardUrl(profile)} replace />;
    }

    const isGuardaDeFato = isGuarda || temGuarda || profile?.setor_slug === 'guarda-municipal';
    if (isGuardaDeFato && !profile?.aceitou_lei_iro_at && location.pathname !== '/admin/perfil-guardas/guarda-municipal/dashboard') {
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

    const hasGuardaIroManagementAccess =
      allowGuardaIroManagement &&
      requiredSetorSlug === 'guarda-municipal' &&
      profile?.can_manage_guarda_iros === true;

    if (!isSuperAdmin && profile?.setor_slug !== requiredSetorSlug && !hasGuardaIroManagementAccess) {
      return <Navigate to={getDashboardUrl(profile)} replace />;
    }
  }

  return <>{children}</>;
};
