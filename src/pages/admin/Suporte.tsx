import { Mail, MessageSquare, Info, LifeBuoy, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { GuardsLayout } from '@/components/admin/GuardsLayout';
import { Button } from '@/components/ui/button';

export default function SuportePage() {
  const { profile } = useAuth();
  const location = useLocation();
  const isGuarda = location.pathname.includes('/perfil-guardas/guarda-municipal');

  const handleWhatsAppClick = () => {
    const phoneNumber = '5585997277128';
    const message = 'Preciso de suporte para a Secretaria de Segurança pública de Canindé';
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleEmailClick = () => {
    const email = 'suporte@site-smst.com';
    const subject = 'Solicitação de Suporte - SMST Canindé';
    const body = `Olá, preciso de suporte.\n\nNome: ${profile?.name || ''}\nSetor: ${profile?.setor_nome || ''}\nPapel: ${profile?.papel || ''}\n\nDescrição detalhada do problema:\n`;
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
  };

  const content = (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="rounded-[24px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_46%,_#2563eb_100%)] md:rounded-[34px]">
        <div className="space-y-4 px-4 pb-5 pt-6 md:space-y-6 md:px-6 md:pb-6 md:pt-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-sky-100/70 md:text-[11px]">
                Atendimento
              </p>
              <h1 className="mt-2 text-xl font-black tracking-[-0.05em] text-white sm:text-2xl md:mt-3 md:text-[32px] md:tracking-[-0.07em] lg:text-[38px]">
                Suporte Técnico
              </h1>
              <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-white/80 md:mt-2 md:text-[14px] md:leading-6">
                Precisa de ajuda com o sistema? Escolha o canal de suporte ideal de acordo com a urgência do seu problema.
              </p>
            </div>
            <div className="mt-2 hidden shrink-0 sm:block md:mt-3">
              <div className="rounded-[18px] bg-white/15 p-3.5 text-white backdrop-blur-sm">
                <LifeBuoy className="h-6 w-6 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Info Warning */}
      <div className="flex items-start gap-4 rounded-[24px] border border-blue-100 bg-blue-50/50 p-5 shadow-sm">
        <Info className="h-6 w-6 shrink-0 text-blue-600 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-blue-900">Instruções Importantes</h4>
          <p className="text-xs text-blue-700 leading-relaxed">
            Ao abrir qualquer chamado de suporte, certifique-se de informar seu <strong>Nome Completo</strong> e descrever o <strong>problema de forma detalhada</strong>. Explique o que estava fazendo, o que aconteceu e, se possível, envie prints de tela para agilizar a solução.
          </p>
        </div>
      </div>

      {/* Support Cards Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* WhatsApp Card */}
        <div className="flex flex-col justify-between rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-emerald-50 text-emerald-600 shadow-inner">
                <MessageSquare className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Urgência Máxima
              </span>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900">Suporte por WhatsApp</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Abra um chamado por aqui somente se for algo que necessita de <strong>correção instantânea</strong>, que precisa ser resolvido em no máximo <strong>24 horas</strong>.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Button
              onClick={handleWhatsAppClick}
              className="w-full gap-2 rounded-xl bg-emerald-600 font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98] transition-all"
            >
              Iniciar Chat no WhatsApp
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* E-mail Card */}
        <div className="flex flex-col justify-between rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-blue-50 text-blue-600 shadow-inner">
                <Mail className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                Não Emergencial
              </span>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900">Suporte por E-mail</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Abra um suporte por esse meio caso seu problema não seja emergência e possa esperar por no mínimo <strong>48 horas</strong>.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Button
              onClick={handleEmailClick}
              className="w-full gap-2 rounded-xl bg-slate-900 font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-[0.98] transition-all"
            >
              Enviar E-mail de Suporte
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isGuarda) {
    return <GuardsLayout>{content}</GuardsLayout>;
  }

  return <AdminLayout>{content}</AdminLayout>;
}
