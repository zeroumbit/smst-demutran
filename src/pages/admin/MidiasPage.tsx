import { useEffect, useState } from 'react';
import { Calendar, FileText, ImageIcon, Images, Newspaper, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminLayout } from '@/components/admin/AdminLayout';
import BannerManagement from '@/components/admin/BannerManagement';
import { supabase } from '@/lib/supabase';
import Noticias from './Noticias';
import Eventos from './Eventos';
import Galeria from './Galeria';
import Equipe from './Equipe';
import DemutranConteudos from './DemutranConteudos';

const tabs = [
  { value: 'noticias', label: 'Noticias', icon: Newspaper },
  { value: 'eventos', label: 'Eventos', icon: Calendar },
  { value: 'galeria', label: 'Galeria', icon: ImageIcon },
  { value: 'banners', label: 'Banners', icon: Images },
  { value: 'equipe', label: 'Equipe', icon: Users },
  { value: 'conteudos', label: 'Conteudos', icon: FileText },
];

const MidiasPage = () => {
  const [counts, setCounts] = useState({ noticias: 0, eventos: 0, galeria: 0, banners: 0, equipe: 0 });

  useEffect(() => {
    const loadCounts = async () => {
      const [noticiasRes, eventosRes, galeriaRes, bannersRes, equipeRes] = await Promise.all([
        supabase.from('noticias').select('id', { count: 'exact', head: true }),
        supabase.from('eventos').select('id', { count: 'exact', head: true }),
        supabase.from('galeria_fotos').select('id', { count: 'exact', head: true }),
        supabase.from('banners').select('id', { count: 'exact', head: true }),
        supabase.from('equipe').select('id', { count: 'exact', head: true }),
      ]);

      setCounts({
        noticias: noticiasRes.count ?? 0,
        eventos: eventosRes.count ?? 0,
        galeria: galeriaRes.count ?? 0,
        banners: bannersRes.count ?? 0,
        equipe: equipeRes.count ?? 0,
      });
    };

    loadCounts();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="rounded-2xl bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_46%,_#2563eb_100%)] md:rounded-[34px]">
          <div className="space-y-4 px-4 pb-4 pt-5 md:space-y-6 md:px-6 md:pb-5 md:pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-sky-100/70 md:text-[11px]">Gestao de conteudo</p>
                <h1 className="mt-2 text-xl font-black tracking-[-0.05em] text-white sm:text-2xl md:mt-3 md:text-[32px] md:tracking-[-0.07em] lg:text-[38px]">Midias</h1>
                <p className="mt-1.5 hidden max-w-xl text-[13px] leading-5 text-white md:block md:mt-2 md:text-[14px] md:leading-6">
                  Gerencie todo o conteudo do sistema em um so lugar.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <SummaryCard title="Noticias" value={counts.noticias} subtitle="Publicacoes cadastradas" icon={Newspaper} />
              <SummaryCard title="Eventos" value={counts.eventos} subtitle="Eventos registrados" icon={Calendar} />
              <SummaryCard title="Galeria" value={counts.galeria} subtitle="Fotos na galeria" icon={ImageIcon} />
              <SummaryCard title="Banners" value={counts.banners} subtitle="Banners ativos" icon={Images} />
              <SummaryCard title="Equipe" value={counts.equipe} subtitle="Membros cadastrados" icon={Users} />
            </div>
          </div>
        </section>

        <Tabs defaultValue="noticias" className="space-y-6">
          <TabsList className="w-full flex-wrap h-auto gap-1 bg-transparent p-0 justify-start">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="noticias">
            <Noticias layout={false} />
          </TabsContent>
          <TabsContent value="eventos">
            <Eventos layout={false} />
          </TabsContent>
          <TabsContent value="galeria">
            <Galeria layout={false} />
          </TabsContent>
          <TabsContent value="banners">
            <BannerManagement />
          </TabsContent>
          <TabsContent value="equipe">
            <Equipe layout={false} />
          </TabsContent>
          <TabsContent value="conteudos">
            <DemutranConteudos layout={false} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: typeof Newspaper;
}) {
  return (
    <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">{title}</p>
          <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{value}</p>
          <p className="mt-0.5 text-[13px] leading-5 text-white/70">{subtitle}</p>
        </div>
        <div className="shrink-0 rounded-[18px] bg-white/15 p-3 text-white backdrop-blur-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default MidiasPage;
