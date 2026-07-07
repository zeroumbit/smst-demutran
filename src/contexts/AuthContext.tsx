import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import type { AdminProfile, PapelUsuario } from '@/types/admin';
import { maskCpf } from '@/lib/masks';

interface AuthContextType {
  user: AdminProfile | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  profile: AdminProfile | null;
  papel: PapelUsuario | null;
  setorId: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isGuarda: boolean;
  canAccessAdmin: boolean;
  hasPapel: (...papeis: PapelUsuario[]) => boolean;
  canManageSector: (targetSetorId?: string | null) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserProfile(): Promise<AdminProfile | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_profile');

    if (error) {
      console.error('Erro ao carregar perfil administrativo:', error.message);
    }

    if (data) {
      const profile = data as AdminProfile;
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.app_metadata?.modulos) {
          profile.modulos = userData.user.app_metadata.modulos;
        }
      } catch {
        // silent — sessão pode expirar, mas o perfil já foi carregado
      }
      return profile;
    }

    let isGuarda = false;
    try {
      const { data: r } = await supabase.rpc('is_guarda');
      isGuarda = !!r;
    } catch {
      try {
        const { data: gu } = await supabase
          .from('guardas_usuarios')
          .select('id')
          .eq('usuario_id', (await supabase.auth.getUser()).data?.user?.id || '')
          .maybeSingle();
        isGuarda = !!gu;
      } catch {
        // silent
      }
    }
    if (isGuarda) {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email || '';
      let guardaNome = 'Guarda Municipal';
      let guardaSetorId: string | null = null;
      let aceitouLeiIroAt: string | null = null;
      try {
        const { data: guardaPerfil } = await supabase.rpc('buscar_guarda_por_usuario', { p_usuario_id: userData?.user?.id || '' });
        if (guardaPerfil) {
          guardaNome = (guardaPerfil as any).nome || guardaNome;
          aceitouLeiIroAt = (guardaPerfil as any).aceitou_lei_iro_at || null;
        }
      } catch {
        try {
          const { data: gu } = await supabase
            .from('guardas_usuarios')
            .select('guarda_id')
            .eq('usuario_id', userData?.user?.id || '')
            .maybeSingle();
          if (gu?.guarda_id) {
            const { data: gm } = await supabase
              .from('guardas_municipais')
              .select('nome, aceitou_lei_iro_at')
              .eq('id', gu.guarda_id)
              .single();
            if (gm) {
              guardaNome = (gm as any).nome || guardaNome;
              aceitouLeiIroAt = (gm as any).aceitou_lei_iro_at || null;
            }
          }
        } catch {
          // silent
        }
      }
      try {
        const { data: sid } = await supabase.rpc('get_guarda_municipal_setor_id');
        if (sid) guardaSetorId = sid as string;
      } catch {
        try {
          const { data: setorData } = await supabase
            .from('setores')
            .select('id')
            .eq('slug', 'guarda-municipal')
            .maybeSingle();
          if (setorData) guardaSetorId = (setorData as any).id;
        } catch {
          // silent
        }
      }
      return {
        user_id: userData?.user?.id || '',
        email,
        name: guardaNome,
        papel: null,
        perfil_id: null,
        setor_id: guardaSetorId,
        setor_nome: 'Guarda Municipal',
        setor_slug: 'guarda-municipal',
        ativo: true,
        legacy_admin: false,
        aceitou_lei_iro_at: aceitouLeiIroAt,
      };
    }

    return null;
  } catch (error) {
    console.error('Erro inesperado ao carregar perfil administrativo:', error);
    return null;
  }
}

export function getDashboardUrl(profile: AdminProfile | null): string {
  if (!profile?.setor_slug || profile.papel === 'super_admin') return '/admin/dashboard';
  return `/admin/dashboard/${profile.setor_slug}`;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AdminProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const refreshProfile = async () => {
    const profile = await fetchUserProfile();
    setUser(profile);
  };

  useEffect(() => {
    let isMounted = true;

    const processSession = async (hasSession: boolean) => {
      if (!isMounted) {
        return;
      }

      if (hasSession) {
        const profile = await fetchUserProfile();
        if (isMounted) {
          setUser(profile);
        }
      } else if (isMounted) {
        setUser(null);
      }

      if (isMounted) {
        setIsLoading(false);
      }
    };

    const checkInitialSession = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      await processSession(!!session?.user);
    };

    void checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Evita bloquear o ciclo interno do Supabase Auth com awaits no callback.
      window.setTimeout(() => {
        void processSession(!!session?.user);
      }, 0);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error.message);
      toast({
        title: 'Erro ao fazer login',
        description: 'E-mail ou senha incorretos.',
        variant: 'destructive',
      });
      return false;
    }

    if (!data?.user) {
      return false;
    }

    const profile = await fetchUserProfile();

    if (!profile) {
      await supabase.auth.signOut();
      setUser(null);
      toast({
        title: 'Acesso não autorizado',
        description: 'Usuário não encontrado. Verifique seu e-mail.',
        variant: 'destructive',
      });
      return false;
    }

    const isGuardUser = !profile.papel && !profile.legacy_admin;

    if (isGuardUser) {
      setUser(profile);
      toast({
        title: 'Login realizado!',
        description: `Bem-vindo, ${profile.name?.split(' ')[0] || 'Guarda'}!`,
      });
      navigate('/admin/perfil-guardas/guarda-municipal/dashboard');
      return true;
    }

    if (!profile?.papel && !profile?.legacy_admin) {
      await supabase.auth.signOut();
      setUser(null);
      toast({
        title: 'Acesso não autorizado',
        description: 'Seu usuário autenticado ainda não possui perfil administrativo ativo.',
        variant: 'destructive',
      });
      return false;
    }

    setUser(profile);
    toast({
      title: 'Login realizado!',
      description: 'Bem-vindo ao painel administrativo.',
    });

    navigate(getDashboardUrl(profile));
    return true;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error.message);
    }

    setUser(null);
    navigate('/admin/login');
    toast({
      title: 'Logout realizado',
      description: 'Você saiu do sistema.',
    });
  };

  const papel = user?.papel ?? null;
  const isSuperAdmin = papel === 'super_admin' || !!user?.legacy_admin;
  const isAdmin = isSuperAdmin || papel === 'gestor' || papel === 'admin_setor';
  const isGuarda = !!user && !papel && !user?.legacy_admin;
  const canAccessAdmin = !!user && (isAdmin || papel === 'tecnico') && !isGuarda;

  const hasPapel = (...papeis: PapelUsuario[]) => {
    if (!user?.papel) {
      return false;
    }

    if (isSuperAdmin && papeis.includes('super_admin')) {
      return true;
    }

    return papeis.includes(user.papel);
  };

  const canManageSector = (targetSetorId?: string | null) => {
    if (isSuperAdmin) {
      return true;
    }

    if (!user?.setor_id || !targetSetorId) {
      return false;
    }

    return user.setor_id === targetSetorId && (user.papel === 'gestor' || user.papel === 'admin_setor');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        isLoading,
        profile: user,
        papel,
        setorId: user?.setor_id ?? null,
        isAdmin,
        isSuperAdmin,
        isGuarda,
        canAccessAdmin,
        hasPapel,
        canManageSector,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
