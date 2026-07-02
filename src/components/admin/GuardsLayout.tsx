import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  FileWarning,
  UserCircle,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import guardaLogo from '@/guarda.png';

interface GuardsLayoutProps {
  children: ReactNode;
}

type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
};

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/perfil-guardas/guarda-municipal/dashboard' },
  { icon: FileWarning, label: 'IROs', path: '/admin/perfil-guardas/guarda-municipal/iros' },
  { icon: UserCircle, label: 'Perfil', path: '/admin/perfil-guardas/guarda-municipal/perfil' },
];

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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-5">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <img src={guardaLogo} alt="Guarda" className="h-full w-full object-contain p-1.5" />
          </div>
          <div>
            <span className="block text-lg font-bold tracking-[-0.04em] text-slate-900">
              Guarda Municipal
            </span>
            {profile?.name && (
              <span className="text-xs text-slate-500">{profile.name}</span>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
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

        <div className="border-t border-slate-200 p-3">
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

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md lg:px-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2 rounded-xl border-slate-200 lg:hidden"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </header>

        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
