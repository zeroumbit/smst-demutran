import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationDropdown } from '@/components/admin/NotificationDropdown';
import type { ModuloSistema } from '@/types/admin';
import { supabase } from '@/lib/supabase';
import type { ComponentType } from 'react';
import guardaLogo from '@/guarda.png';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { adminOnboardingSteps } from '@/components/onboarding/onboardingSteps';
import {
  Newspaper,
  Calendar,
  Users,
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
  ChevronLeft,
  Search,
  Moon,
  Sun,
  IdCard,
  Settings2,
  MessageSquareText,
  BarChart3,
  Shield,
  NotebookPen,
  ClipboardList,
  Wrench,
  CalendarDays,
  LifeBuoy,
} from 'lucide-react';

const HouseIcon: ComponentType<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
    <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);

interface AdminLayoutProps {
  children: ReactNode;
  backPath?: string;
  backLabel?: string;
}

type MenuItem = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  path?: string;
  disabled?: boolean;
  allowedPapeis?: Array<'super_admin' | 'gestor' | 'admin_setor' | 'tecnico'>;
  children?: MenuItem[];
};

const ANOTACOES_LABEL = 'Anotacoes';
const PERFIL_LABEL = 'Perfil';

const moveMenuItemBeforeLabel = (items: MenuItem[], itemLabel: string, beforeLabel: string) => {
  const fromIndex = items.findIndex((item) => item.label === itemLabel);
  const toIndex = items.findIndex((item) => item.label === beforeLabel);

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return items;
  }

  const reordered = [...items];
  const [movedItem] = reordered.splice(fromIndex, 1);
  const adjustedTargetIndex = reordered.findIndex((item) => item.label === beforeLabel);
  reordered.splice(adjustedTargetIndex, 0, movedItem);
  return reordered;
};

const defaultMenuItems: MenuItem[] = [
  { icon: HouseIcon, label: 'Dashboard', path: '/admin/dashboard', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
  { icon: MessageSquareText, label: 'Fala Cidadao', path: '/admin/fala-cidadao', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
  { icon: FileWarning, label: 'IRO', path: '/admin/dashboard/:setorSlug/iro', allowedPapeis: ['gestor', 'admin_setor'] },
  { icon: NotebookPen, label: 'Anotacoes', path: '/admin/anotacoes', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
  { icon: BarChart3, label: 'Relatorios', path: '/admin/relatorios', allowedPapeis: ['super_admin'] },
  { icon: CarFront, label: 'Veiculos', path: '/admin/demutran/veiculos', allowedPapeis: ['gestor', 'admin_setor'] },
  { icon: IdCard, label: 'Concessionarios', path: '/admin/demutran/concessionarios', allowedPapeis: ['gestor', 'admin_setor'] },
  { icon: Accessibility, label: 'Credenciais', path: '/admin/demutran/credenciais', allowedPapeis: ['gestor', 'admin_setor'] },
  { icon: FileWarning, label: 'Recursos', path: '/admin/demutran/recursos', allowedPapeis: ['gestor', 'admin_setor'] },
  { icon: CarFront, label: 'Frota Municipal', path: '/admin/demutran/frota', allowedPapeis: ['gestor', 'admin_setor'] },
  { icon: FileText, label: 'Documentos', path: '/admin/documentos', allowedPapeis: ['gestor', 'admin_setor'] },
  { icon: Building2, label: 'Setores', path: '/admin/setores', allowedPapeis: ['super_admin'] },
  { icon: Shield, label: 'Guardas', path: '/admin/guardas/guarda-municipal', allowedPapeis: ['super_admin'] },
  { icon: ImageIcon, label: 'Midias', path: '/admin/midias', allowedPapeis: ['gestor', 'admin_setor'] },
  { icon: Settings2, label: 'Configuracoes', path: '/admin/configuracoes-demutran', allowedPapeis: ['gestor'] },
  { icon: Settings2, label: 'Config. Guarda', path: '/admin/configuracoes-guarda-municipal', allowedPapeis: ['super_admin'] },
  { icon: Users, label: 'Usuarios', path: '/admin/usuarios', allowedPapeis: ['super_admin', 'gestor'] },
  { icon: UserCircle2, label: 'Perfil', path: '/admin/perfil', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
];

const demutranMenuItems: MenuItem[] = [
  { icon: HouseIcon, label: 'Dashboard', path: '/admin/dashboard/demutran', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
  { icon: MessageSquareText, label: 'Fala Cidadao', path: '/admin/fala-cidadao/demutran', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
  { icon: FileWarning, label: 'IRO', path: '/admin/dashboard/:setorSlug/iro', allowedPapeis: ['gestor', 'admin_setor'] },
  { icon: NotebookPen, label: 'Anotacoes', path: '/admin/anotacoes/demutran', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
  { icon: BarChart3, label: 'Relatorios', path: '/admin/relatorios', allowedPapeis: ['super_admin'] },
  { icon: CarFront, label: 'Veiculos', path: '/admin/demutran/veiculos', allowedPapeis: ['gestor', 'admin_setor'] },
  { icon: IdCard, label: 'Concessionarios', path: '/admin/demutran/concessionarios', allowedPapeis: ['gestor', 'admin_setor'] },
  { icon: Accessibility, label: 'Credenciais', path: '/admin/demutran/credenciais', allowedPapeis: ['gestor', 'admin_setor'] },
  { icon: FileWarning, label: 'Recursos', path: '/admin/demutran/recursos', allowedPapeis: ['gestor', 'admin_setor'] },
  { icon: CarFront, label: 'Frota Municipal', path: '/admin/demutran/frota', allowedPapeis: ['gestor', 'admin_setor'] },
  { icon: FileText, label: 'Documentos', path: '/admin/documentos/demutran', allowedPapeis: ['gestor', 'admin_setor'] },
  { icon: Building2, label: 'Setores', path: '/admin/setores', allowedPapeis: ['super_admin'] },
  { icon: ImageIcon, label: 'Midias', path: '/admin/midias/demutran', allowedPapeis: ['gestor', 'admin_setor'] },
  { icon: Settings2, label: 'Configuracoes', path: '/admin/configuracoes-demutran', allowedPapeis: ['gestor'] },
  { icon: Users, label: 'Usuarios', path: '/admin/usuarios/demutran', allowedPapeis: ['super_admin', 'gestor'] },
  { icon: UserCircle2, label: 'Perfil', path: '/admin/perfil/demutran', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
];

const guardaMenuItems: MenuItem[] = [
  { icon: HouseIcon, label: 'Dashboard', path: '/admin/dashboard/guarda-municipal', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
  { icon: FileWarning, label: 'IROs', path: '/admin/iros/guarda-municipal', allowedPapeis: ['gestor', 'admin_setor', 'tecnico'] },
  { icon: MessageSquareText, label: 'Fala Cidadao', path: '/admin/fala-cidadao/guarda-municipal', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
  { icon: Shield, label: 'Guardas', path: '/admin/guardas/guarda-municipal', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
  { icon: CarFront, label: 'Frota da Guarda', path: '/admin/guardas/guarda-municipal/frota', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
  { icon: Users, label: 'Equipes', path: '/admin/guardas/guarda-municipal/equipes', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
  { icon: ImageIcon, label: 'Midias', path: '/admin/midias/guarda-municipal', allowedPapeis: ['gestor', 'admin_setor'] },
  { icon: Settings2, label: 'Configuracoes', path: '/admin/configuracoes-guarda-municipal', allowedPapeis: ['super_admin', 'gestor', 'admin_setor'] },
  { icon: Users, label: 'Usuarios', path: '/admin/usuarios/guarda-municipal', allowedPapeis: ['super_admin', 'gestor'] },
  { icon: FileWarning, label: 'Minhas IROs', path: '/admin/iros/guarda-municipal/minhas-iro', allowedPapeis: ['gestor', 'admin_setor', 'tecnico'] },
  { icon: ClipboardList, label: 'Fiscalizacao', path: '/admin/fiscalizacao/infracoes', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
  { icon: CalendarDays, label: 'Escalas', path: '/admin/guardas/guarda-municipal/escalas', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
  { icon: NotebookPen, label: 'Anotacoes', path: '/admin/anotacoes/guarda-municipal', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
  { icon: UserCircle2, label: 'Perfil', path: '/admin/perfil/guarda-municipal', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
];

const guardaBottomNavItems: MenuItem[] = [
  { icon: HouseIcon, label: 'Home', path: '/admin/dashboard/guarda-municipal', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
  { icon: FileWarning, label: 'IROs', path: '/admin/iros/guarda-municipal', allowedPapeis: ['gestor', 'admin_setor', 'tecnico'] },
  { icon: CalendarDays, label: 'Escala', path: '/admin/guardas/guarda-municipal/escalas', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
  { icon: Users, label: 'Equipes', path: '/admin/guardas/guarda-municipal/equipes', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
  { icon: NotebookPen, label: 'Anotacoes', path: '/admin/anotacoes/guarda-municipal', allowedPapeis: ['super_admin', 'gestor', 'admin_setor', 'tecnico'] },
];

const moduloItemMap: Record<string, ModuloSistema> = {
  Veiculos: 'veiculos',
  Concessionarios: 'concessionarios',
  Credenciais: 'credenciais',
  Recursos: 'recursos',
  'Frota Municipal': 'frota',
  Documentos: 'documentos',
  Midias: 'midias',
  Fiscalizacao: 'fiscalizacao',
  Escalas: 'guarda_escalas',
  'Frota da Guarda': 'guarda_frota',
  Frota: 'guarda_frota',
  Equipes: 'guarda_equipes',
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
  fiscalizacao: ClipboardList,
  guarda_escalas: CalendarDays,
  guarda_frota: CarFront,
  frota_guarda: CarFront,
  guarda_equipes: Users,
  manutencoes: Wrench,
};

export const AdminLayout = ({ children, backPath, backLabel }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [globalResults, setGlobalResults] = useState<GlobalSearchRow[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const searchRequestRef = useRef(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { profile, logout, isAuthenticated, isLoading, hasPapel, isSuperAdmin } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && location.pathname !== '/admin/login') {
      navigate('/admin/login');
    }
  }, [isAuthenticated, isLoading, navigate, location.pathname]);

  useEffect(() => {
    const term = searchQuery.trim();
    const requestId = ++searchRequestRef.current;
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
        if (requestId !== searchRequestRef.current) return;
        setGlobalResults(error ? [] : ((data as GlobalSearchRow[]) ?? []));
      } catch {
        if (requestId !== searchRequestRef.current) return;
        setGlobalResults([]);
      } finally {
        if (requestId === searchRequestRef.current) {
          setIsSearchingGlobal(false);
        }
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

  const sectorContext = useMemo(() => {
    if (isSuperAdmin) return null;
    const slug = profile?.setor_slug;
    const segments = location.pathname.split('/');
    if (slug === 'guarda-municipal' || segments.includes('guarda-municipal')) return 'guarda-municipal';
    if (slug === 'demutran' || segments.includes('demutran')) return 'demutran';
    return null;
  }, [isSuperAdmin, profile?.setor_slug, location.pathname]);

  const sectorLogo = useMemo(() => {
    if (isSuperAdmin) return '/images/logo.png';
    if (sectorContext === 'guarda-municipal') return guardaLogo;
    return '/images/demutran.png';
  }, [isSuperAdmin, sectorContext]);

  const sectorLabel = useMemo(() => {
    if (isSuperAdmin) return 'SMST';
    if (sectorContext === 'guarda-municipal') return 'Guarda';
    return 'Demutran';
  }, [isSuperAdmin, sectorContext]);

  const sectorBadge = useMemo(() => {
    if (isSuperAdmin) return 'Super Admin';
    return null;
  }, [isSuperAdmin]);

  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setOnboardingLoading(true);

    // Fallback do localStorage para evitar que o onboarding abra repetidamente em caso de falha no banco
    const localConcluido = localStorage.getItem('admin_onboarding_concluido');
    if (localConcluido === 'true') {
      setOnboardingOpen(false);
      setOnboardingLoading(false);
      return;
    }

    void (async () => {
      try {
        const { data, error } = await supabase.rpc('get_minha_onboarding_etapa');
        if (cancelled) return;
        if (error) {
          console.warn('Erro ao carregar etapa de onboarding do banco:', error.message);
          setOnboardingOpen(false);
          return;
        }
        const etapa = (data as { tipo?: string; etapa?: number | null } | null)?.etapa;
        if (etapa == null) setOnboardingOpen(true);
      } finally {
        if (!cancelled) setOnboardingLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleOnboardingFinish = useCallback(async () => {
    setOnboardingOpen(false);
    localStorage.setItem('admin_onboarding_concluido', 'true');
    try {
      const { error } = await supabase.rpc('set_minha_onboarding_etapa', { p_etapa: adminOnboardingSteps.length });
      if (error) {
        console.error('Erro ao salvar etapa de onboarding no banco:', error.message);
      }
    } catch (e) {
      console.error('Erro de conexão ao salvar onboarding:', e);
    }
  }, []);

  const visibleMenuItems = useMemo(() => {
    const sourceMenuItems = sectorContext === 'guarda-municipal'
      ? guardaMenuItems
      : sectorContext === 'demutran'
        ? demutranMenuItems
        : defaultMenuItems;

    const userModulos = profile?.modulos;
    const hasModulosRestricted = !isSuperAdmin && userModulos && userModulos.length > 0;

    const filterItem = (item: MenuItem): MenuItem | null => {
      const mappedItem = { ...item };
      if (mappedItem.path && mappedItem.path.includes(':setorSlug') && profile?.setor_slug) {
        mappedItem.path = mappedItem.path.replace(':setorSlug', profile.setor_slug);
      }

      if (mappedItem.path?.startsWith('/admin/demutran/')) {
        if (profile?.setor_slug && profile.setor_slug !== 'demutran' && !isSuperAdmin) {
          return null;
        }
      }

      if (mappedItem.path?.startsWith('/admin/guarda-municipal/')) {
        if (profile?.setor_slug && profile.setor_slug !== 'guarda-municipal' && !isSuperAdmin) {
          return null;
        }
      }

      if (mappedItem.path === '/admin/configuracoes-demutran') {
        if (!isSuperAdmin && (!profile?.setor_slug || profile.setor_slug !== 'demutran')) {
          return null;
        }
      }

      if (mappedItem.path === '/admin/configuracoes-guarda-municipal') {
        if (!isSuperAdmin && (!profile?.setor_slug || profile.setor_slug !== 'guarda-municipal')) {
          return null;
        }
        if (isSuperAdmin) return mappedItem;
      }

      if (mappedItem.children) {
        const filteredChildren = mappedItem.children
          .map(filterItem)
          .filter(Boolean) as MenuItem[];
        if (filteredChildren.length === 0) return null;
        return { ...mappedItem, children: filteredChildren };
      }

      if (!mappedItem.allowedPapeis?.length) {
        return mappedItem;
      }

      if (hasModulosRestricted) {
        const modulo = moduloItemMap[mappedItem.label];
        if (modulo) {
          return userModulos!.includes(modulo) ? mappedItem : null;
        }
      }

      if (isSuperAdmin && mappedItem.allowedPapeis.includes('super_admin')) {
        return mappedItem;
      }

      return hasPapel(...mappedItem.allowedPapeis) ? mappedItem : null;
    };

    const filteredMenuItems = sourceMenuItems
      .map(filterItem)
      .filter(Boolean) as MenuItem[];

    if (sectorContext !== 'guarda-municipal') {
      let items = moveMenuItemBeforeLabel(filteredMenuItems, ANOTACOES_LABEL, PERFIL_LABEL);
      items = moveMenuItemBeforeLabel(items, 'Midias', PERFIL_LABEL);
      return items;
    }
    return filteredMenuItems;
  }, [hasPapel, sectorContext, isSuperAdmin, profile?.setor_slug, profile?.modulos]);

  const visibleBottomNavItems = useMemo(() => {
    return guardaBottomNavItems.filter((item) => {
      if (!item.allowedPapeis?.length) return true;
      if (item.allowedPapeis.includes('super_admin') && isSuperAdmin) return true;
      return hasPapel(...item.allowedPapeis);
    });
  }, [hasPapel, isSuperAdmin]);

  const showSectionSplit = sectorContext === 'guarda-municipal' || sectorContext === 'demutran';
  const guardaPessoalLabels = new Set(['Minhas IROs', 'Escalas', 'Fiscalizacao', 'Anotacoes', 'Perfil']);
  const demutranPessoalLabels = new Set(['Anotacoes', 'Perfil']);
  const pessoalLabels = sectorContext === 'demutran' ? demutranPessoalLabels : guardaPessoalLabels;
  const adminMenuItems = useMemo(
    () => showSectionSplit ? visibleMenuItems.filter(item => !pessoalLabels.has(item.label)) : visibleMenuItems,
    [visibleMenuItems, showSectionSplit, pessoalLabels],
  );
  const pessoalMenuItems = useMemo(
    () => showSectionSplit ? visibleMenuItems.filter(item => pessoalLabels.has(item.label)) : [],
    [visibleMenuItems, showSectionSplit, pessoalLabels],
  );

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
    walk(filterByPapel(guardaMenuItems));
    return flat;
  }, [hasPapel, isSuperAdmin, profile?.modulos]);

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
    } ${isSubItem ? 'ml-6 px-3 py-2.5 text-[13px]' : ''} ${!isSubItem && sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:mx-2' : ''}`;

    if (item.disabled) {
      return (
        <div key={item.label} className={`flex items-center px-4 py-3 text-sm font-medium rounded-2xl text-slate-300 cursor-not-allowed ${isSubItem ? 'ml-6' : ''} ${sidebarCollapsed && !isSubItem ? 'lg:justify-center lg:px-0 lg:mx-2' : ''}`}>
          <Icon className={`${sidebarCollapsed && !isSubItem ? 'lg:mx-auto' : 'mr-3'} h-5 w-5 shrink-0`} />
          <span className={`flex items-center ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
            {item.label}
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-brand-600">
              em breve
            </span>
          </span>
        </div>
      );
    }

    if (hasChildren) {
      if (sidebarCollapsed) {
        return (
          <div key={item.label} className={`${baseClasses} cursor-default`}>
            <Icon className="lg:mx-auto h-5 w-5 shrink-0 text-slate-400" />
          </div>
        );
      }
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
        onClick={() => { setSidebarOpen(false); setMenuModalOpen(false); }}
        className={baseClasses}
      >
        <Icon className={`${sidebarCollapsed ? 'lg:mx-auto' : 'mr-3'} h-5 w-5 shrink-0 ${isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-brand-500'}`} />
        <span className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-grow flex-col overflow-y-auto pt-4">
      <div className={`mb-6 flex items-center border-b border-slate-200 pb-6 ${sidebarCollapsed ? 'justify-center px-0' : 'px-6'}`}>
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_25px_-18px_rgba(15,23,42,0.22)]">
          <img
            src={sectorLogo as string}
            alt={sectorLabel}
            className="h-full w-full object-contain p-1.5"
          />
        </div>
        <div className={`ml-4 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
          <span className="block whitespace-nowrap text-[1.65rem] font-bold tracking-[-0.04em] text-slate-900">
            {sectorLabel}
          </span>
          {sectorBadge && (
            <Badge className="rounded-full bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold px-2 py-0">
              {sectorBadge}
            </Badge>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {showSectionSplit && !sidebarCollapsed && (
          <span className="block px-4 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Administrativos
          </span>
        )}
        {adminMenuItems.map((item) => renderNavItem(item))}
        {showSectionSplit && !sidebarCollapsed && pessoalMenuItems.length > 0 && (
          <span className="mt-4 block px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Pessoal
          </span>
        )}
        {pessoalMenuItems.map((item) => renderNavItem(item))}
        {!sidebarCollapsed && (
          <span className="mt-4 block px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Suporte
          </span>
        )}
        {renderNavItem({
          icon: LifeBuoy,
          label: 'Suporte',
          path: '/admin/suporte',
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex w-full items-center justify-center rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <aside className={`hidden border-r border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:flex lg:flex-col ${sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-[285px]'}`}>
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

      <div className={`flex flex-1 flex-col ${sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[285px]'}`}>
        <header className="sticky top-0 z-10 hidden h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md lg:flex lg:px-6">
        <div className="flex items-center gap-2">
          {backPath ? (
            <button
              onClick={() => navigate(backPath)}
              className="rounded-xl p-2 hover:bg-slate-100 transition-colors"
              title={backLabel || 'Voltar'}
            >
              <ChevronLeft className="h-6 w-6 text-slate-700" />
            </button>
          ) : (
            <button
              type="button"
              className="rounded-xl p-2 hover:bg-slate-100 lg:hidden transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6 text-slate-700" />
            </button>
          )}
        </div>

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

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-[0_8px_22px_-18px_rgba(15,23,42,0.28)] transition-colors hover:bg-slate-100 lg:flex dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <NotificationDropdown userId={profile?.user_id} />

            {profile?.setor_nome && !sectorContext && (
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

        <main className={`flex-1 p-4 lg:p-8 ${sectorContext === 'guarda-municipal' ? 'pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:pb-8' : ''}`}>
          {children}
        </main>
      </div>

      {sectorContext === 'guarda-municipal' && visibleBottomNavItems.length > 0 && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex min-h-[4.75rem] items-stretch border-t border-slate-200/80 bg-white shadow-[0_-2px_20px_-8px_rgba(15,23,42,0.12)] lg:hidden pb-[env(safe-area-inset-bottom)]">
          {visibleBottomNavItems.map((item) => {
            const Icon = item.icon!;
            const active = item.path ? (location.pathname === item.path || location.pathname.startsWith(item.path + '/')) : false;
            return (
              <Link
                key={item.path}
                to={item.path!}
                className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 transition-colors"
                aria-current={active ? 'page' : undefined}
              >
                <div className={`flex items-center justify-center rounded-xl p-1.5 transition-colors ${active ? 'bg-brand-50' : ''}`}>
                  <Icon className={`h-5 w-5 ${active ? 'text-brand-600' : 'text-slate-400'}`} />
                </div>
                <span className={`max-w-full truncate text-[10px] font-bold ${active ? 'text-brand-600' : 'text-slate-400'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setMenuModalOpen(true)}
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 transition-colors"
          >
            <div className="flex items-center justify-center rounded-xl p-1.5">
              <Menu className="h-5 w-5 text-slate-400" />
            </div>
            <span className="text-[10px] font-bold text-slate-400">Menu</span>
          </button>
        </nav>
      )}

      {menuModalOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white lg:hidden animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 pb-4 pt-[calc(max(env(safe-area-inset-top),1rem)+0.5rem)] bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <img src={guardaLogo as string} alt="Guarda" className="h-full w-full object-contain p-1" />
              </div>
              <span className="text-lg font-bold text-slate-900">Guarda Municipal</span>
            </div>
            <button
              onClick={() => setMenuModalOpen(false)}
              className="rounded-xl p-2 hover:bg-slate-100 transition-colors"
            >
              <X className="h-6 w-6 text-slate-700" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {showSectionSplit && (
              <span className="block px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Administrativos
              </span>
            )}
            {adminMenuItems.map((item) => renderNavItem(item))}
            {showSectionSplit && pessoalMenuItems.length > 0 && (
              <span className="mt-4 block px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Pessoal
              </span>
            )}
            {pessoalMenuItems.map((item) => renderNavItem(item))}
            <span className="mt-4 block px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Suporte
            </span>
            {renderNavItem({
              icon: LifeBuoy,
              label: 'Suporte',
              path: '/admin/suporte',
            })}
          </nav>

          <div className="border-t border-slate-200 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-slate-50">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      )}

      {onboardingOpen && !onboardingLoading && (
        <OnboardingWizard
          steps={adminOnboardingSteps}
          totalSteps={adminOnboardingSteps.length}
          onFinish={handleOnboardingFinish}
        />
      )}
    </div>
  );
};
