import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquareText, Search, ClipboardList } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const navItems = [
  { href: '/fala-cidadao/nova-solicitacao', label: 'Nova Solicitacao', icon: MessageSquareText },
  { href: '/fala-cidadao/minhas-solicitacoes', label: 'Minhas Solicitacoes', icon: ClipboardList },
];

export function FalaCidadaoLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <div className="h-16" />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
