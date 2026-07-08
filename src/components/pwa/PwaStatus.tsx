import { useState } from 'react';
import { Download, WifiOff, Zap, Shield, Globe, X } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

const features = [
  { icon: Zap, text: 'Carregamento instantâneo' },
  { icon: Shield, text: 'Notificações em tempo real' },
  { icon: Globe, text: 'Funciona offline' },
];

export function PwaStatus() {
  const { installPrompt, isOnline, install } = usePWA();
  const [installDismissed, setInstallDismissed] = useState(false);

  const showInstall = installPrompt && !installDismissed;

  if (!showInstall && isOnline) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Install prompt */}
      {showInstall && (
        <>
          {/* Mobile: Bottom Sheet */}
          <div className="md:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity duration-300"
              onClick={() => setInstallDismissed(true)}
            />
            {/* Sheet */}
            <div className="absolute bottom-0 left-0 right-0 pointer-events-auto animate-slide-up">
              <div className="relative mx-auto w-full max-w-[400px] rounded-t-[28px] bg-white px-6 pb-8 pt-5 shadow-[0_-8px_40px_rgba(0,0,0,0.12)]">
                <div className="mx-auto mb-6 h-1 w-9 rounded-full bg-slate-200" />
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-[22px] bg-gradient-to-br from-blue-600 to-blue-700 p-3 shadow-lg shadow-blue-200">
                    <img
                      src="/images/logo.png"
                      alt="Logo da Secretaria"
                      className="h-full w-full rounded-2xl bg-white object-contain p-2"
                    />
                  </div>
                  <h2 className="text-[22px] font-bold tracking-[-0.02em] text-slate-900">
                    Instalar <span className="text-blue-600">SMST</span>
                  </h2>
                  <p className="mt-1.5 text-sm leading-5 text-slate-500">
                    Instale o aplicativo para ter acesso rápido a todos os serviços da Secretaria de Segurança, diretamente da sua tela inicial.
                  </p>
                </div>
                <div className="mx-auto mt-6 grid gap-2.5">
                  {features.map((feature) => (
                    <div key={feature.text} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <feature.icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{feature.text}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-col gap-2">
                  <button
                    onClick={install}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all active:scale-[0.98] hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4" />
                    Instalar aplicativo
                  </button>
                  <button
                    onClick={() => setInstallDismissed(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 active:scale-[0.98]"
                  >
                    Agora não
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop: Horizontal Bar */}
          <div className="hidden md:block">
            <div className="absolute bottom-6 left-1/2 w-full max-w-[920px] -translate-x-1/2 px-4 pointer-events-auto">
              <div className="relative grid grid-cols-[auto,minmax(0,1fr),auto] items-center gap-x-4 gap-y-3 rounded-[26px] border border-slate-200/70 bg-white/95 px-6 py-5 shadow-[0_16px_36px_rgba(0,0,0,0.08)] backdrop-blur-md transition-all duration-300 hover:shadow-[0_20px_48px_rgba(0,0,0,0.12)]">
                <div className="row-span-2 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-2 shadow-md shadow-blue-100">
                  <img
                    src="/images/logo.png"
                    alt="Logo da Secretaria"
                    className="h-full w-full rounded-xl bg-white object-contain p-1.5"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-snug text-slate-900">
                    Instalar <span className="text-blue-600 font-extrabold">SMST</span>
                  </p>
                  <p className="text-[13px] leading-5 text-slate-500">
                    Acesso rápido a todos os serviços
                  </p>
                </div>
                <div className="row-span-2 flex items-center gap-2 self-center justify-self-end pl-2">
                  <button
                    onClick={install}
                    className="flex min-w-[118px] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-md active:scale-[0.96]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Instalar
                  </button>
                  <button
                    onClick={() => setInstallDismissed(true)}
                    className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Fechar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="col-start-2 flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200/80 pt-3 text-[13px] leading-5 text-slate-500">
                  {features.map((feature) => (
                    <div
                      key={feature.text}
                      className="inline-flex min-w-0 items-center gap-2 whitespace-nowrap"
                    >
                      <feature.icon className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                      <span>{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Offline Banner */}
      {!isOnline && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
          <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white/95 px-5 py-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm text-sm text-slate-600">
            <WifiOff className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="font-medium">Modo offline — dados podem estar desatualizados</span>
          </div>
        </div>
      )}
    </div>
  );
}
