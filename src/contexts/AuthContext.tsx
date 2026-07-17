import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import type { AdminProfile, PapelUsuario } from '@/types/admin';
import { maskCpf } from '@/lib/masks';

const LEI_IRO_ACCEPTED_KEY_PREFIX = 'lei-iro-accepted:';

const getLeiIroAcceptedStorageKey = (userId: string) => `${LEI_IRO_ACCEPTED_KEY_PREFIX}${userId}`;

const readLeiIroAccepted = (userId?: string | null): string | null => {
  if (!userId || typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(getLeiIroAcceptedStorageKey(userId));
  } catch {
    return null;
  }
};

const persistLeiIroAccepted = (userId?: string | null, acceptedAt?: string | null): void => {
  if (!userId || !acceptedAt || typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(getLeiIroAcceptedStorageKey(userId), acceptedAt);
  } catch {
    // silent
  }
};

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
  temGuarda: boolean;
  canAccessAdmin: boolean;
  hasPapel: (...papeis: PapelUsuario[]) => boolean;
  canManageSector: (targetSetorId?: string | null) => boolean;
  refreshProfile: () => Promise<void>;
  markLeiIroAccepted: (acceptedAt?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function buildGuardaProfile(userId: string, email: string): Promise<AdminProfile | null> {
  let guardaNome = '';
  let guardaSetorId: string | null = null;
  let aceitouLeiIroAt: string | null = null;

  // Primeiro, tenta carregar o nome de exibição/apelido dos metadados da conta auth do Supabase
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.name) {
      guardaNome = user.user_metadata.name;
    }
  } catch {
    // silent fallback
  }

  try {
    const { data: guardaPerfil } = await supabase.rpc('buscar_guarda_por_usuario', { p_usuario_id: userId });
    if (guardaPerfil) {
      if (!guardaNome) {
        guardaNome = (guardaPerfil as any).nome || 'Guarda Municipal';
      }
      aceitouLeiIroAt = (guardaPerfil as any).aceitou_lei_iro_at || null;
    }
  } catch {
    try {
      const { data: gu } = await supabase
        .from('guardas_usuarios')
        .select('guarda_id')
        .eq('usuario_id', userId)
        .maybeSingle();
      if (gu?.guarda_id) {
        const { data: gm } = await supabase
          .from('guardas_municipais')
          .select('nome, aceitou_lei_iro_at')
          .eq('id', gu.guarda_id)
          .single();
        if (gm) {
          if (!guardaNome) {
            guardaNome = (gm as any).nome || 'Guarda Municipal';
          }
          aceitouLeiIroAt = (gm as any).aceitou_lei_iro_at || null;
        }
      }
    } catch {
      // silent
    }
  }

  if (!guardaNome) {
    guardaNome = 'Guarda Municipal';
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
    user_id: userId,
    email,
    name: guardaNome,
    papel: null,
    perfil_id: null,
    setor_id: guardaSetorId,
    setor_nome: 'Guarda Municipal',
    setor_slug: 'guarda-municipal',
    ativo: true,
    legacy_admin: false,
    aceitou_lei_iro_at: aceitouLeiIroAt || readLeiIroAccepted(userId),
  };
}

async function fetchUserProfile(): Promise<AdminProfile | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_profile');

    if (error) {
      console.error('Erro ao carregar perfil administrativo:', error.message);
    }

    if (data) {
      const profile = data as AdminProfile;
      const { data: userData } = await supabase.auth.getUser();
      const authUser = userData?.user;
      const authUserId = authUser?.id || profile.user_id;
      const authUserEmail = authUser?.email || profile.email || '';

      try {
        if (authUser?.app_metadata?.modulos) {
          profile.modulos = authUser.app_metadata.modulos;
        }
      } catch {
        // silent — sessão pode expirar, mas o perfil já foi carregado
      }

      let guardaVinculado = false;
      try {
        const { data: gu } = await supabase
          .from('guardas_usuarios')
          .select('id')
          .eq('usuario_id', authUserId)
          .maybeSingle();
        guardaVinculado = !!gu;
        (profile as any).tem_guarda = guardaVinculado;
      } catch {
        (profile as any).tem_guarda = false;
      }

      if (!profile.papel && !profile.legacy_admin && guardaVinculado && authUserId) {
        return await buildGuardaProfile(authUserId, authUserEmail);
      }

      // Admin que tambem e guarda: verificar registro em guardas_usuarios
      if (profile.papel) {
        try {
          const { data: gu } = await supabase
            .from('guardas_usuarios')
            .select('id')
            .eq('usuario_id', profile.user_id)
            .maybeSingle();
          (profile as any).tem_guarda = !!gu;
        } catch {
          (profile as any).tem_guarda = false;
        }
      } else {
        (profile as any).tem_guarda = false;
      }

      // Enriquecer com dados de aceite da lei IRO para todos os guardas (comuns ou admins vinculados)
      const isUserGuarda = (!profile.papel && !profile.legacy_admin) || (profile as any).tem_guarda;
      if (isUserGuarda) {
        try {
          const { data: guardaPerfil } = await supabase.rpc('buscar_guarda_por_usuario', { p_usuario_id: profile.user_id });
          if (guardaPerfil) {
            (profile as any).aceitou_lei_iro_at = (guardaPerfil as any).aceitou_lei_iro_at || null;
          }
        } catch {
          // silent
        }

        if (!profile.aceitou_lei_iro_at) {
          profile.aceitou_lei_iro_at = readLeiIroAccepted(profile.user_id);
        } else {
          persistLeiIroAccepted(profile.user_id, profile.aceitou_lei_iro_at);
        }
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
      return await buildGuardaProfile(userData?.user?.id || '', userData?.user?.email || '');
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

  const markLeiIroAccepted = (acceptedAt?: string) => {
    const timestamp = acceptedAt ?? new Date().toISOString();
    setUser((currentUser) => {
      if (!currentUser) {
        return currentUser;
      }

      persistLeiIroAccepted(currentUser.user_id, timestamp);

      return {
        ...currentUser,
        aceitou_lei_iro_at: timestamp,
      };
    });
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
  const temGuarda = isGuarda || !!(user as any)?.tem_guarda;
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
        temGuarda,
        canAccessAdmin,
        hasPapel,
        canManageSector,
        refreshProfile,
        markLeiIroAccepted,
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
