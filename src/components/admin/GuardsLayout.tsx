import { ReactNode, ComponentType } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  FileWarning,
  UserCircle,
  LogOut,
  Shield,
  BellDot,
  NotebookPen,
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

const ANOTACOES_LABEL = 'Anotacoes';
const PERFIL_LABEL = 'Perfil';

const moveNavItemBeforeLabel = (items: NavItem[], itemLabel: string, beforeLabel: string) => {
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

const navItems: NavItem[] = [
  { icon: HouseIcon, label: 'Dashboard', path: '/admin/perfil-guardas/guarda-municipal/dashboard' },
  { icon: FileWarning, label: 'IROs', path: '/admin/perfil-guardas/guarda-municipal/iros' },
  { icon: NotebookPen, label: 'Anotacoes', path: '/admin/perfil-guardas/guarda-municipal/anotacoes' },
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

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const visibleNavItems = moveNavItemBeforeLabel(navItems, ANOTACOES_LABEL, PERFIL_LABEL);
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
  const activeItem = visibleNavItems.find((item) => isActive(item.path));

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

        <nav className="flex-1 space-y-1 px-3 py-5">
          {visibleNavItems.map((item) => {
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
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/92 backdrop-blur-xl lg:hidden pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
            <GuardaLogo />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Guarda Municipal</p>
              <div className="flex items-center gap-2">
                <h1 className="truncate text-[17px] font-black tracking-[-0.03em] text-slate-900">
                  {activeItem?.label || 'Painel'}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <Shield className="h-3 w-3" />
                  ativo
                </span>
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <BellDot className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 pb-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-slate-600">
                {profile?.name || 'Guarda Municipal'}
              </p>
              <p className="text-[11px] text-slate-400">Área pessoal protegida</p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-600 shadow-[0_8px_18px_-16px_rgba(15,23,42,0.35)] active:scale-[0.98]"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </header>

        <main className="native-app-scroll flex-1 px-3 py-3 pb-[calc(6.4rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-5 lg:p-8">
          <div className="mx-auto w-full max-w-5xl">
          {children}
          </div>
        </main>
      </div>

      {/* ─── Mobile bottom tab bar ─── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/70 bg-white/90 px-3 pb-[calc(0.7rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl shadow-[0_-14px_32px_-26px_rgba(15,23,42,0.28)] lg:hidden">
        <div className="mx-auto grid max-w-5xl grid-cols-5 gap-2 rounded-[24px] bg-white/90 p-1.5 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.3)] ring-1 ring-slate-200/70">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
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

          <button
            onClick={handleLogout}
            className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-[18px] px-1 py-2.5 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-center rounded-xl p-1.5">
              <LogOut className="h-5 w-5 text-slate-400" />
            </div>
            <span className="text-[10px] font-bold text-slate-400">Sair</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
