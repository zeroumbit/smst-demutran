import { ReactNode, ComponentType, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminNotifications } from '@/hooks/use-admin-notifications';
import { Button } from '@/components/ui/button';
import {
  FileWarning,
  UserCircle,
  LogOut,
  Shield,
  NotebookPen,
  ClipboardList,
  CalendarDays,
  X,
} from 'lucide-react';
import guardaLogo from '@/guarda.png';

interface GuardsLayoutProps {
  children: ReactNode;
  hideBack?: boolean;
}

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

type NavItem = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  path: string;
};

const FISCALIZACAO_LABEL = 'Fiscalizacao';

const adminNavItems: NavItem[] = [
  { icon: HouseIcon, label: 'Home', path: '/admin/perfil-guardas/guarda-municipal/dashboard' },
  { icon: NotebookPen, label: 'Anotacoes', path: '/admin/perfil-guardas/guarda-municipal/anotacoes' },
];

const pessoalNavItems: NavItem[] = [
  { icon: FileWarning, label: 'IROs', path: '/admin/perfil-guardas/guarda-municipal/iros' },
  { icon: CalendarDays, label: 'Escalas', path: '/admin/perfil-guardas/guarda-municipal/escalas' },
  { icon: ClipboardList, label: 'Fiscalizacao', path: '/admin/perfil-guardas/guarda-municipal/fiscalizacao/infracoes' },
  { icon: UserCircle, label: 'Perfil', path: '/admin/perfil-guardas/guarda-municipal/perfil' },
];

const GuardaLogo = () => (
  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <img src={guardaLogo} alt="Guarda" className="h-full w-full object-contain p-1" />
  </div>
);

export const GuardsLayout = ({ children }: GuardsLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, profile } = useAuth();
  useAdminNotifications(profile?.user_id);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const allNavItems = [...adminNavItems, ...pessoalNavItems];
  const mobileNavItems = allNavItems.filter(item => item.label !== FISCALIZACAO_LABEL);
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
  const [menuModalOpen, setMenuModalOpen] = useState(false);

  const renderMobileModalLink = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={() => setMenuModalOpen(false)}
        className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
          active
            ? 'bg-brand-50 text-brand-700'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-slate-900">
      {/* ─── Desktop sidebar ─── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white/95 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-3 border-b border-slate-200/80 px-5 py-5">
          <GuardaLogo />
          <div className="min-w-0">
            <span className="block truncate text-lg font-bold text-slate-900">
              Guarda Municipal
            </span>
            {profile?.name && (
              <span className="block truncate text-xs font-medium text-slate-400">{profile.name.split(' ')[0]}</span>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <span className="block px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Administrativos
          </span>
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                  active
                    ? 'bg-brand-50 text-brand-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <span className="mt-4 block px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Pessoal
          </span>
          {pessoalNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                  active
                    ? 'bg-brand-50 text-brand-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200/80 p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 rounded-2xl text-slate-500 hover:bg-red-50 hover:text-red-600"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
          </Button>
        </div>
      </aside>

      {/* ─── Main content ─── */}
      <div className="flex min-h-screen flex-col lg:pl-64">

        <main className="native-app-scroll flex-1 px-3 pb-[calc(6.4rem+env(safe-area-inset-bottom))] pt-[max(env(safe-area-inset-top),0.75rem)] sm:px-4 sm:py-5 lg:p-8">
          <div className="mx-auto w-full max-w-5xl">
          {children}
          </div>
        </main>
      </div>

      {/* ─── Mobile bottom tab bar ─── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-[calc(0.7rem+env(safe-area-inset-bottom))] pt-2 lg:hidden pointer-events-none">
        <div className="mx-auto grid max-w-5xl grid-cols-5 gap-2 rounded-[24px] bg-white/90 p-1.5 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.3)] ring-1 ring-slate-200/70 backdrop-blur-xl pointer-events-auto">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            if (item.label === 'Perfil') {
              return (
                <button
                  key={item.path}
                  onClick={() => setMenuModalOpen(true)}
                  className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-[18px] px-1 py-2.5 transition-all active:scale-[0.98] ${
                    active ? 'bg-brand-50/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]' : ''
                  }`}
                >
                  <div className={`flex items-center justify-center rounded-xl p-1.5 transition-colors ${
                    active ? 'bg-white shadow-[0_8px_18px_-14px_rgba(37,99,235,0.55)]' : ''
                  }`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${
                      active ? 'text-brand-600' : 'text-slate-400'
                    }`}>
                      <path d="M4 5h16"/>
                      <path d="M4 12h16"/>
                      <path d="M4 19h16"/>
                    </svg>
                  </div>
                  <span className={`max-w-full truncate text-[10px] font-bold ${
                    active ? 'text-brand-600' : 'text-slate-400'
                  }`}>
                    Menu
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-[18px] px-1 py-2.5 transition-all active:scale-[0.98] ${
                  active ? 'bg-brand-50/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]' : ''
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <div className={`flex items-center justify-center rounded-xl p-1.5 transition-colors ${
                  active ? 'bg-white shadow-[0_8px_18px_-14px_rgba(37,99,235,0.55)]' : ''
                }`}>
                  <Icon className={`h-5 w-5 ${
                    active ? 'text-brand-600' : 'text-slate-400'
                  }`} />
                </div>
                <span className={`max-w-full truncate text-[10px] font-bold ${
                  active ? 'text-brand-600' : 'text-slate-400'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ─── Mobile menu modal ─── */}
      {menuModalOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white lg:hidden animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <GuardaLogo />
              <span className="text-lg font-bold text-slate-900">Guarda Municipal</span>
            </div>
            <button
              onClick={() => setMenuModalOpen(false)}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            <span className="block px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Administrativos
            </span>
            {adminNavItems.map((item) => renderMobileModalLink(item))}
            <span className="mt-4 block px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Pessoal
            </span>
            {pessoalNavItems.map((item) => renderMobileModalLink(item))}
          </nav>

          <div className="border-t border-slate-200 p-4">
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
    </div>
  );
};
