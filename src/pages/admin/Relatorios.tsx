import { BarChart3, FileText, Building2, Users } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';

const Relatorios = () => {
  return (
    <AdminLayout>
      <div className="space-y-8 p-1">
        <section className="rounded-[32px] border border-slate-200/70 bg-[linear-gradient(118deg,_#17233c_0%,_#6c778c_48%,_#dfe7f5_100%)] shadow-[0_28px_60px_-34px_rgba(15,23,42,0.55)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-5 px-6 py-8 text-white lg:px-8 lg:py-9">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-white/80" />
                <h1 className="text-[28px] font-black tracking-[-0.06em] sm:text-[34px]">
                  Relatorios
                </h1>
              </div>
              <p className="max-w-2xl text-[15px] leading-relaxed text-white/70">
                Visualize dados consolidados de todos os setores da secretaria. 
                Relatorios de veiculos, IROs, patrulhas ROPE, GMAM e muito mais.
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-4">
          {[
            { label: 'Veiculos', value: '—', helper: 'Apreensoes e liberacoes', icon: FileText },
            { label: 'IROs', value: '—', helper: 'Indicadores de ocorrencias', icon: FileText },
            { label: 'Patrulhas ROPE', value: '—', helper: 'ROPE e GMAM', icon: Building2 },
            { label: 'Usuarios por setor', value: '—', helper: 'Distribuicao da equipe', icon: Users },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_22px_-18px_rgba(15,23,42,0.28)]"
            >
              <div className="flex items-center justify-between">
                <card.icon className="h-5 w-5 text-slate-400" />
              </div>
              <p className="mt-6 text-[13px] font-bold uppercase tracking-[0.08em] text-slate-500">
                {card.label}
              </p>
              <p className="mt-1 text-[32px] font-black tracking-[-0.05em] text-slate-900">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-slate-400">{card.helper}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_8px_22px_-18px_rgba(15,23,42,0.28)]">
          <BarChart3 className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-bold text-slate-700">Relatorios detalhados em breve</h3>
          <p className="mt-2 text-sm text-slate-400">
            Esta pagina exibira graficos, tabelas e exportacao de dados 
            com filtros por setor, periodo e tipo de relatorio.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Relatorios;
