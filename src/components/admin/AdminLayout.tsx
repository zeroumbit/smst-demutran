import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationDropdown } from '@/components/admin/NotificationDropdown';
import type { ModuloSistema } from '@/types/admin';
import { supabase } from '@/lib/supabase';
import {
  Newspaper,
  Calendar,
  Image,
  Users,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Building2,
  FileText,
  ImageIcon,
  CarFront,
  Accessibility,
  FileWarning,
  UserCircle2,
  ChevronDown,
  ChevronRight,
  Search,
  Moon,
  IdCard,
  Settings2,
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

type MenuItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path?: string;
  disabled?: boolean;
  allowedPapeis?: Array<'super_admin' | 'gestor' | 'admin_setor' | 'tecnico'>;
  children?: MenuItem[];
};

const defaultMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
  { icon: CarFront, label: 'Veiculos', path: '/admin/demutran/veiculos', allowedPapeis: ['super_admin', 'gestor', 'admin_setor'] },
  { icon: IdCard, label: 'Concessionarios', path: '/admin/demutran/concessionarios', allowedPapeis: ['super_admin', 'gestor', 'admin_setor'] },
  { icon: Accessibility, label: 'Credenciais', path: '/admin/demutran/credenciais', allowedPapeis: ['super_admin', 'gestor', 'admin_setor'] },
  { icon: FileWarning, label: 'Recursos', path: '/admin/demutran/recursos', allowedPapeis: ['super_admin', 'gestor', 'admin_setor'] },
  { icon: CarFront, label: 'Frota Municipal', path: '/admin/demutran/frota', allowedPapeis: ['super_admin', 'gestor', 'admin_setor'] },
  { icon: FileText, label: 'Documentos', path: '/admin/documentos', allowedPapeis: ['super_admin', 'gestor', 'admin_setor'] },
  { icon: Building2, label: 'Setores', path: '/admin/setores', allowedPapeis: ['super_admin'] },
  { icon: ImageIcon, label: 'Midias', path: '/admin/midias', allowedPapeis: ['super_admin', 'gestor', 'admin_setor'] },
  { icon: Users, label: 'Usuarios', path: '/admin/usuarios', allowedPapeis: ['super_admin', 'gestor'] },
  { icon: Settings2, label: 'Configuracoes', path: '/admin/configuracoes', allowedPapeis: ['super_admin', 'gestor'] },
  { icon: UserCircle2, label: 'Perfil', path: '/admin/perfil', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
];

const demutranMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/demutran/dashboard', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
  { icon: CarFront, label: 'Veiculos', path: '/admin/demutran/veiculos', allowedPapeis: ['super_admin', 'gestor', 'admin_setor'] },
  { icon: IdCard, label: 'Concessionarios', path: '/admin/demutran/concessionarios', allowedPapeis: ['super_admin', 'gestor', 'admin_setor'] },
  { icon: Accessibility, label: 'Credenciais', path: '/admin/demutran/credenciais', allowedPapeis: ['super_admin', 'gestor', 'admin_setor'] },
  { icon: FileWarning, label: 'Recursos', path: '/admin/demutran/recursos', allowedPapeis: ['super_admin', 'gestor', 'admin_setor'] },
  { icon: CarFront, label: 'Frota Municipal', path: '/admin/demutran/frota', allowedPapeis: ['super_admin', 'gestor', 'admin_setor'] },
  { icon: FileText, label: 'Documentos', path: '/admin/demutran/documentos', allowedPapeis: ['super_admin', 'gestor', 'admin_setor'] },
  { icon: Building2, label: 'Setores', path: '/admin/setores', allowedPapeis: ['super_admin'] },
  { icon: ImageIcon, label: 'Midias', path: '/admin/demutran/midias', allowedPapeis: ['super_admin', 'gestor', 'admin_setor'] },
  { icon: Users, label: 'Usuarios', path: '/admin/usuarios', allowedPapeis: ['super_admin', 'gestor'] },
  { icon: Settings2, label: 'Configuracoes', path: '/admin/configuracoes', allowedPapeis: ['super_admin', 'gestor'] },
  { icon: UserCircle2, label: 'Perfil', path: '/admin/perfil', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
];

const moduloItemMap: Record<string, ModuloSistema> = {
  Veiculos: 'veiculos',
  Concessionarios: 'concessionarios',
  Credenciais: 'credenciais',
  Recursos: 'recursos',
  'Frota Municipal': 'frota',
  Documentos: 'documentos',
  Midias: 'midias',
};

const papelLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  gestor: 'Gestor',
  admin_setor: 'Admin Setor',
  tecnico: 'Tecnico',
};

type GlobalSearchRow = {
  modulo: string;
  tabela: string;
  registro_id: string;
  titulo: string;
  subtitulo: string;
  rota: string;
};

const moduloLabelMap: Record<string, string> = {
  veiculos: 'Veiculos',
  concessionarios: 'Concessionarios',
  credenciais: 'Credenciais',
  recursos: 'Recursos',
  frota: 'Frota Municipal',
  midias: 'Midias',
  noticias: 'Noticias',
  eventos: 'Eventos',
  documentos: 'Documentos',
};

const moduloIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  veiculos: CarFront,
  concessionarios: IdCard,
  credenciais: Accessibility,
  recursos: FileWarning,
  frota: CarFront,
  midias: ImageIcon,
  noticias: Newspaper,
  eventos: Calendar,
  documentos: FileText,
};

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [globalResults, setGlobalResults] = useState<GlobalSearchRow[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout, isAuthenticated, isLoading, hasPapel, isSuperAdmin } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && location.pathname !== '/admin/login') {
      navigate('/admin/login');
    }
  }, [isAuthenticated, isLoading, navigate, location.pathname]);

  useEffect(() => {
    const term = searchQuery.trim();
    if (term.length < 2) {
      setGlobalResults([]);
      setIsSearchingGlobal(false);
      return;
    }

    setIsSearchingGlobal(true);
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc('buscar_global_admin', {
          _termo: term,
          _limite_por_modulo: 5,
        });
        setGlobalResults((data as GlobalSearchRow[]) ?? []);
        if (error) setGlobalResults([]);
      } catch {
        setGlobalResults([]);
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handler = (event: CustomEvent) => {
      const notif = event.detail;
      if (notif?.link) navigate(notif.link);
    };
    window.addEventListener('notification-click', handler as EventListener);
    return () => window.removeEventListener('notification-click', handler as EventListener);
  }, [navigate]);

  const groupedResults = useMemo(() => {
    const groups = new Map<string, GlobalSearchRow[]>();
    for (const row of globalResults) {
      const existing = groups.get(row.modulo) ?? [];
      existing.push(row);
      groups.set(row.modulo, existing);
    }
    return groups;
  }, [globalResults]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && location.pathname !== '/admin/login') {
      navigate('/admin/login');
    }
  }, [isAuthenticated, isLoading, navigate, location.pathname]);

  const isDemutranContext =
    location.pathname.startsWith('/admin/demutran') ||
    (!isSuperAdmin && profile?.setor_slug === 'demutran');

  const visibleMenuItems = useMemo(() => {
    const sourceMenuItems = isDemutranContext
      ? demutranMenuItems
      : defaultMenuItems;

    const userModulos = profile?.modulos;
    const hasModulosRestricted = !isSuperAdmin && userModulos && userModulos.length > 0;

    const filterItem = (item: MenuItem): MenuItem | null => {
      if (item.path?.startsWith('/admin/demutran/')) {
        if (profile?.setor_slug && profile.setor_slug !== 'demutran' && !isSuperAdmin) {
          return null;
        }
      }

      if (item.path === '/admin/configuracoes') {
        if (!isSuperAdmin && (!profile?.setor_slug || profile.setor_slug !== 'demutran')) {
          return null;
        }
      }

      if (item.children) {
        const filteredChildren = item.children
          .map(filterItem)
          .filter(Boolean) as MenuItem[];
        if (filteredChildren.length === 0) return null;
        return { ...item, children: filteredChildren };
      }

      if (!item.allowedPapeis?.length) {
        return item;
      }

      if (hasModulosRestricted) {
        const modulo = moduloItemMap[item.label];
        if (modulo) {
          return userModulos!.includes(modulo) ? item : null;
        }
      }

      if (isSuperAdmin && item.allowedPapeis.includes('super_admin')) {
        return item;
      }

      return hasPapel(...item.allowedPapeis) ? item : null;
    };

    return sourceMenuItems
      .map(filterItem)
      .filter(Boolean) as MenuItem[];
  }, [hasPapel, isDemutranContext, isSuperAdmin, profile?.setor_slug, profile?.papel, profile?.modulos]);

  useEffect(() => {
    const autoExpand: Record<string, boolean> = {};
    visibleMenuItems.forEach((item) => {
      if (item.children) {
        const isChildActive = item.children.some(
          (child) => location.pathname === child.path
        );
        if (isChildActive) {
          autoExpand[item.label] = true;
        }
      }
    });
    setExpandedMenus((prev) => ({ ...prev, ...autoExpand }));
  }, [location.pathname, visibleMenuItems]);

  const toggleExpand = (label: string) => {
    setExpandedMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const searchableItems = useMemo(() => {
    const seen = new Set<string>();
    const flat: { label: string; path: string }[] = [];
    const walk = (items: MenuItem[]) => {
      for (const item of items) {
        if (item.path && !item.disabled && !seen.has(item.path)) {
          seen.add(item.path);
          flat.push({ label: item.label, path: item.path });
        }
        if (item.children) walk(item.children);
      }
    };

    const userModulos = profile?.modulos;
    const hasModulosRestricted = !isSuperAdmin && userModulos && userModulos.length > 0;

    const filterByPapel = (items: MenuItem[]): MenuItem[] =>
      items
        .map((item) => {
          if (item.children) {
            const filtered = filterByPapel(item.children);
            if (filtered.length === 0) return null;
            return { ...item, children: filtered };
          }
          if (!item.allowedPapeis?.length) return item;
          if (hasModulosRestricted) {
            const modulo = moduloItemMap[item.label];
            if (modulo) {
              return userModulos!.includes(modulo) ? item : null;
            }
          }
          if (isSuperAdmin && item.allowedPapeis.includes('super_admin')) return item;
          return hasPapel(...item.allowedPapeis) ? item : null;
        })
        .filter(Boolean) as MenuItem[];

    walk(filterByPapel(defaultMenuItems));
    walk(filterByPapel(demutranMenuItems));
    return flat;
  }, [hasPapel, isSuperAdmin, profile?.papel, profile?.modulos]);

  const filteredSearchItems = searchQuery.trim()
    ? searchableItems.filter((item) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  if (!isAuthenticated || isLoading) {
    return null;
  }

  const profileLabel = profile?.papel ? papelLabels[profile.papel] : 'Sem perfil';

  const renderNavItem = (item: MenuItem, isSubItem = false) => {
    const Icon = item.icon;
    const isActive = item.path ? location.pathname === item.path : false;
    const hasChildren = Boolean(item.children?.length);
    const isExpanded = expandedMenus[item.label] ?? (hasChildren && isActive);

    const baseClasses = `group flex items-center px-4 py-3 text-sm font-medium rounded-2xl transition-all ${
      isActive && !hasChildren
        ? 'bg-brand-50 text-brand-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
    } ${isSubItem ? 'ml-6 px-3 py-2.5 text-[13px]' : ''}`;

    if (item.disabled) {
      return (
        <div key={item.label} className={`flex items-center px-4 py-3 text-sm font-medium rounded-2xl text-slate-300 cursor-not-allowed ${isSubItem ? 'ml-6' : ''}`}>
          <Icon className="mr-3 h-5 w-5 shrink-0" />
          <span className="flex items-center">
            {item.label}
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-brand-600">
              em breve
            </span>
          </span>
        </div>
      );
    }

    if (hasChildren) {
      return (
        <div key={item.label}>
          <button
            onClick={() => toggleExpand(item.label)}
            className={`w-full ${baseClasses}`}
          >
            <Icon className={`mr-3 h-5 w-5 shrink-0 ${isActive && !hasChildren ? 'text-brand-600' : 'text-slate-400 group-hover:text-brand-500'}`} />
            <span className="flex-1 text-left">{item.label}</span>
            {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          </button>
          {isExpanded && item.children && (
            <div className="mt-1 space-y-1">
              {item.children.map((child) => renderNavItem(child, true))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.path}
        to={item.path!}
        onClick={() => setSidebarOpen(false)}
        className={baseClasses}
      >
        <Icon className={`mr-3 h-5 w-5 shrink-0 ${isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-brand-500'}`} />
        {item.label}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-grow flex-col overflow-y-auto pt-4">
      <div className="mb-6 flex items-center border-b border-slate-200 px-6 pb-6">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_25px_-18px_rgba(15,23,42,0.22)]">
          <img src="/images/demutran.png" alt="Logo do Demutran" className="h-full w-full object-contain p-1.5" />
        </div>
        <div className="ml-4">
          <span className="block whitespace-nowrap text-[1.65rem] font-bold tracking-[-0.04em] text-slate-900">
            Demutran
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-600">
              {profile?.nome ? profile.nome.split(' ')[0] : 'Caninde'}
            </span>
            {isSuperAdmin && (
              <Badge className="rounded-full bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold px-2 py-0">
                Super Admin
              </Badge>
            )}
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {visibleMenuItems.map((item) => renderNavItem(item))}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <aside className="hidden border-r border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:flex lg:w-[285px] lg:flex-col">
        {sidebarContent}
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative flex w-full max-w-xs flex-1 flex-col bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-4">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6 text-slate-700" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col lg:pl-[285px]">
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md lg:px-6">
          <button
            type="button"
            className="rounded-xl p-2 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6 text-slate-700" />
          </button>

          <div className="hidden flex-1 lg:block relative">
            <div className="flex max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar paginas ou registros..."
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none border-none"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              />
            </div>
            {showSearchResults && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 max-w-md rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden z-50">
                {filteredSearchItems.length > 0 && (
                  <>
                    <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/80 border-b border-slate-100">
                      Paginas
                    </div>
                    {filteredSearchItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => {
                          setSearchQuery('');
                          setShowSearchResults(false);
                        }}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0"
                      >
                        <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </>
                )}

                {groupedResults.size > 0 && (
                  <>
                    <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/80 border-b border-slate-100">
                      Registros encontrados
                    </div>
                    {Array.from(groupedResults.entries()).map(([modulo, rows]) => {
                      const Icon = moduloIconMap[modulo] || Search;
                      return (
                        <div key={modulo}>
                          <div className="flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-semibold text-slate-500 bg-slate-50/50 border-b border-slate-50">
                            <Icon className="h-3 w-3" />
                            {moduloLabelMap[modulo] || modulo}
                          </div>
                          {rows.map((row) => (
                            <Link
                              key={row.registro_id}
                              to={row.rota}
                              onClick={() => {
                                setSearchQuery('');
                                setShowSearchResults(false);
                              }}
                              className="flex flex-col gap-0.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0"
                            >
                              <span className="font-medium text-slate-800">{row.titulo}</span>
                              {row.subtitulo && (
                                <span className="text-xs text-slate-400 truncate">{row.subtitulo}</span>
                              )}
                            </Link>
                          ))}
                        </div>
                      );
                    })}
                  </>
                )}

                {filteredSearchItems.length === 0 && groupedResults.size === 0 && !isSearchingGlobal && (
                  <div className="px-4 py-5 text-center">
                    <p className="text-sm text-slate-400">Nenhum resultado encontrado</p>
                    <p className="text-xs text-slate-300 mt-1">Tente termos como "documentos", "veiculos" ou "noticias"</p>
                  </div>
                )}

                {isSearchingGlobal && groupedResults.size === 0 && (
                  <div className="px-4 py-5 text-center">
                    <p className="text-sm text-slate-400">Buscando...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 md:flex">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Monitoramento ativo</span>
            </div>

            <button className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-[0_8px_22px_-18px_rgba(15,23,42,0.28)] lg:flex">
              <Moon className="h-4 w-4" />
            </button>

            <NotificationDropdown userId={profile?.user_id} />

            {profile?.setor_nome && !isDemutranContext && (
              <div className="hidden md:flex items-center gap-2">
                <Badge className="rounded-full border-slate-200 bg-white text-slate-600" variant="outline">{profile.setor_nome}</Badge>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2 rounded-xl border-slate-200 bg-white"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
