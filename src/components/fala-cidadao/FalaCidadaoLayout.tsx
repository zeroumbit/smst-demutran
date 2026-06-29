import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquareText, Search, ClipboardList } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const navItems = [
  { href: '/fala-cidadao/nova-solicitacao', label: 'Nova Solicitacao', icon: MessageSquareText },
  { href: '/fala-cidadao/acompanhar', label: 'Acompanhar Protocolo', icon: Search },
  { href: '/fala-cidadao/minhas-solicitacoes', label: 'Minhas Solicitacoes', icon: ClipboardList },
];

export function FalaCidadaoLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <div className="h-16" />
      <section className="border-b border-slate-200 bg-[linear-gradient(120deg,_#0f172a_0%,_#1d4ed8_55%,_#fde68a_160%)] text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-100/70">Canal Oficial</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.07em] sm:text-5xl">Fala Cidadao</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-sky-50 sm:text-base">
            Registre problemas urbanos, acompanhe seu protocolo e converse com a Prefeitura de forma simples e rastreavel.
          </p>
        </div>
      </section>

      <section className="sticky top-16 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </section>

      <main>{children}</main>
      <Footer />
    </div>
  );
}

