import { useEffect, useState } from 'react';
import { Calendar, ImageIcon, Newspaper, Users, Images } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

const MidiasDashboard = () => {
  const [stats, setStats] = useState<Record<string, number>>({
    noticias: 0,
    eventos: 0,
    galeria: 0,
    equipe: 0,
    banners: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      const [noticias, eventos, galeria, equipe, banners] = await Promise.all([
        supabase.from('noticias').select('id', { count: 'exact', head: true }),
        supabase.from('eventos').select('id', { count: 'exact', head: true }),
        supabase.from('galeria_fotos').select('id', { count: 'exact', head: true }),
        supabase.from('equipe').select('id', { count: 'exact', head: true }),
        supabase.from('banners').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        noticias: noticias.count ?? 0,
        eventos: eventos.count ?? 0,
        galeria: galeria.count ?? 0,
        equipe: equipe.count ?? 0,
        banners: banners.count ?? 0,
      });
      setLoading(false);
    };

    loadStats();
  }, []);

  const cards = [
    { title: 'Noticias', value: stats.noticias, icon: Newspaper, href: '/admin/noticias' },
    { title: 'Eventos', value: stats.eventos, icon: Calendar, href: '/admin/eventos' },
    { title: 'Galeria', value: stats.galeria, icon: ImageIcon, href: '/admin/galeria' },
    { title: 'Banners', value: stats.banners, icon: Images, href: '/admin/demutran/midias/banners' },
    { title: 'Equipe', value: stats.equipe, icon: Users, href: '/admin/equipe' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Midias</h1>
          <p className="mt-1 text-muted-foreground">
            Visao geral do conteudo publicado no sistema.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <a key={card.title} href={card.href}>
                <Card className="border-2 border-border transition hover:border-primary hover:shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                        <p className="text-3xl font-bold text-foreground mt-1">
                          {loading ? '-' : card.value}
                        </p>
                      </div>
                      <Icon className="h-10 w-10 text-primary/40" />
                    </div>
                  </CardContent>
                </Card>
              </a>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
};

export default MidiasDashboard;
