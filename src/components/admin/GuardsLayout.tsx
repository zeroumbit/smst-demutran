import { ReactNode, ComponentType } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  FileWarning,
  UserCircle,
  LogOut,
  Shield,
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

const navItems: NavItem[] = [
  { icon: HouseIcon, label: 'Dashboard', path: '/admin/perfil-guardas/guarda-municipal/dashboard' },
  { icon: FileWarning, label: 'IROs', path: '/admin/perfil-guardas/guarda-municipal/iros' },
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

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      {/* ─── Desktop sidebar ─── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white/95 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-3 border-b border-slate-200/80 px-5 py-5">
          <GuardaLogo />
          <div>
            <span className="block text-lg font-bold tracking-[-0.04em] text-slate-900">
              Guarda Municipal
            </span>
            {profile?.name && (
              <span className="text-xs font-medium text-slate-400">{profile.name.split(' ')[0]}</span>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          {navItems.map((item) => {
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
        <main className="flex-1 p-4 pb-24 lg:p-8 lg:pb-8">
          {children}
        </main>
      </div>

      {/* ─── Mobile bottom tab bar ─── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center border-t border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-[0_-2px_20px_-8px_rgba(15,23,42,0.12)] lg:hidden pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors"
            >
              <div className={`flex items-center justify-center rounded-xl p-1.5 transition-colors ${
                active ? 'bg-brand-50' : ''
              }`}>
                <Icon className={`h-5 w-5 ${
                  active ? 'text-brand-600' : 'text-slate-400'
                }`} />
              </div>
              <span className={`text-[10px] font-bold tracking-tight ${
                active ? 'text-brand-600' : 'text-slate-400'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Logout button on mobile */}
        <button
          onClick={handleLogout}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors"
        >
          <div className="flex items-center justify-center rounded-xl p-1.5">
            <LogOut className="h-5 w-5 text-slate-400" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-slate-400">Sair</span>
        </button>
      </nav>
    </div>
  );
};
